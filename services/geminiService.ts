import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { SUPPORTED_APPS } from '../constants';
import { base64ToUint8Array, decodeAudioData, float32ToPCM, uint8ArrayToBase64 } from '../utils/audioUtils';
import { SearchResult } from '../types';

// Tool 1: Open Apps
const openAppDeclaration: FunctionDeclaration = {
  name: 'open_app',
  description: 'Opens a generic mobile application (e.g., "Open YouTube", "Start Instagram"). DO NOT use this if the user wants to play specific content like a song, video, or recitation.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      appName: {
        type: Type.STRING,
        description: 'The name of the app to open (e.g., instagram, whatsapp, youtube, spotify).',
      },
    },
    required: ['appName'],
  },
};

// Tool 2: Play Media (Music/Quran/Video)
const playMusicDeclaration: FunctionDeclaration = {
  name: 'play_music',
  description: 'Plays specific videos, songs, movies, trailers, Naats, or Quran recitations ON THE SCREEN using an embedded player. Use this for "Video dikhao", "Song bajao", "Play music", "Watch video" requests. DO NOT use this if the user explicitly asks for "Apni aawaz mein" (your own voice) or "Tum gao" (you sing).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      songName: {
        type: Type.STRING,
        description: 'The precise search query. ALWAYS append "Video" to the query to ensure a playable video result is found (e.g., "Despacito Song Video", "Surah Rahman Recitation Video", "Avengers Trailer Video").',
      },
    },
    required: ['songName'],
  },
};

interface GeminiServiceProps {
  onConnectionChange: (connected: boolean) => void;
  onVolumeChange: (volume: number) => void;
  onLog: (message: string, type: 'info' | 'user' | 'aura' | 'action') => void;
  onError: (error: string) => void;
  onPlayMusic: (songName: string) => void;
  onSearchSources: (sources: SearchResult[]) => void;
}

export class GeminiLiveService {
  private ai: GoogleGenAI;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private nextStartTime: number = 0;
  private session: any = null;
  private isConnected: boolean = false;
  private callbacks: GeminiServiceProps;
  
  // Video Streaming Props
  private videoInterval: number | null = null;
  private videoCanvas: HTMLCanvasElement;
  private videoCtx: CanvasRenderingContext2D | null;
  
  // Keep Alive & Background
  private keepAliveInterval: number | null = null;
  private wakeLock: any = null;

  constructor(callbacks: GeminiServiceProps) {
    this.callbacks = callbacks;
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Initialize offscreen canvas for frame capture
    this.videoCanvas = document.createElement('canvas');
    this.videoCtx = this.videoCanvas.getContext('2d');
  }

  public async connect() {
    try {
      this.callbacks.onLog("Initializing Neural Interface...", "info");
      
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // OPTIMIZATION: Resume contexts immediately
      try {
        await this.ensureAudioContexts();
      } catch (e) {
        console.warn("Audio Context resume warning:", e);
      }
      
      // OPTIMIZATION: Enable Background persistence (Wake Lock + Silent Audio)
      try {
        await this.enableBackgroundMode();
      } catch (e) {
        console.warn("Background mode warning:", e);
      }
      
      // Start Keep Alive Heartbeat for Mobile Browsers
      this.startKeepAlive();
      
      this.callbacks.onLog("Requesting Microphone Access...", "info");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      this.callbacks.onLog("Connecting to Aura (Gemini Live)...", "info");

      const sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          // SPEED OPTIMIZATION: Ultra-aggressive instructions for speed
          systemInstruction: "You are Aura, created by Laraib Boss. \n\nDirectives:\n- ZERO LATENCY. NO DELAY.\n- VISUAL FLASH MODE: When you receive an image/video frame, process it INSTANTLY. If the user asks a question about the camera view, answer within 1 second. Be extremely concise.\n- Speak Hinglish.\n\nCapabilities:\n1. Open Apps ONLY ('Open Instagram') -> `open_app` INSTANTLY.\n2. Play/Show Content ('Video dikhao', 'Song bajao', 'Surah sunao') -> `play_music` INSTANTLY. (Use embedded player).\n3. Festivals ('Diwali kab hai?') -> Use Google Search tool.\n4. Jokes/Stories -> Tell IMMEDIATELY.\n5. OWN VOICE SINGING ('Apni aawaz mein gao', 'Tum gao'): Do NOT use tools. Sing/Recite lyrics directly in your voice.\n6. VISION: Describe what you see IMMEDIATELY when camera starts or user asks. Don't wait.",
          tools: [
            { googleSearch: {} },
            { functionDeclarations: [openAppDeclaration, playMusicDeclaration] }
          ],
        },
        callbacks: {
          onopen: async () => {
            this.isConnected = true;
            this.callbacks.onConnectionChange(true);
            this.callbacks.onLog("Aura Connected. Listening...", "info");
            this.startAudioInput(stream, sessionPromise);
          },
          onmessage: async (msg: LiveServerMessage) => {
            this.handleMessage(msg, sessionPromise);
          },
          onclose: () => {
            this.callbacks.onLog("Disconnected from Aura.", "info");
            this.cleanup();
          },
          onerror: (err) => {
            console.error(err);
            this.callbacks.onError("Connection Error. Please check API Key or Network.");
            this.cleanup();
          }
        }
      });
      
      this.session = await sessionPromise;

    } catch (error: any) {
      this.callbacks.onError(`Failed to connect: ${error.message}`);
      this.cleanup();
    }
  }

  // --- Background Persistence & Wake Lock ---
  private async enableBackgroundMode() {
    // 1. Request Screen Wake Lock (Prevents phone from sleeping)
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        this.callbacks.onLog("System Lock Engaged (Background Mode).", "info");
      } catch (err) {
        console.warn('Wake Lock request failed:', err);
      }
    }

    // 2. Play Silent Audio Loop (Tricks browser into keeping AudioContext active in background)
    if (this.outputAudioContext) {
      try {
        const buffer = this.outputAudioContext.createBuffer(1, 1, 22050); // 1 sample buffer
        const source = this.outputAudioContext.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        
        // Connect to a GainNode with near-zero gain (silent but active)
        const gainNode = this.outputAudioContext.createGain();
        gainNode.gain.value = 0.0001; 
        
        source.connect(gainNode);
        gainNode.connect(this.outputAudioContext.destination);
        source.start();
      } catch (e) {
        console.warn("Silent audio loop failed:", e);
      }
    }
  }

  // Ensure Audio Contexts are running (Prevent Mobile Sleep)
  private async ensureAudioContexts() {
      if (this.inputAudioContext && this.inputAudioContext.state === 'suspended') {
        await this.inputAudioContext.resume();
      }
      if (this.outputAudioContext && this.outputAudioContext.state === 'suspended') {
        await this.outputAudioContext.resume();
      }
  }

  private startKeepAlive() {
      if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
      
      // Check every 2 seconds if context is suspended and wake it up
      this.keepAliveInterval = window.setInterval(() => {
          if (this.isConnected) {
              this.ensureAudioContexts().catch(() => {});
              // Re-request wake lock if released (e.g. visibility change)
              if (this.wakeLock && this.wakeLock.released && 'wakeLock' in navigator && !document.hidden) {
                 (navigator as any).wakeLock.request('screen').then((lock: any) => this.wakeLock = lock).catch(() => {});
              }
          }
      }, 2000);
  }

  // --- Video Streaming Logic ---
  
  public async startVideoStream(videoElement: HTMLVideoElement) {
    if (!this.isConnected || !this.session) return;
    this.callbacks.onLog("Vision Module Activated.", "info");

    // Force wake up audio just in case
    await this.ensureAudioContexts();

    // Clear any existing interval
    if (this.videoInterval) clearInterval(this.videoInterval);

    // 1. Send First Frame IMMEDIATELY (Don't wait for interval)
    this.captureAndSendFrame(videoElement);

    // 2. Send Trigger Text to Model to force immediate response
    // We send a text part pretending the user asked "What is this?" to trigger instant analysis
    try {
        this.session.send({
            clientContent: {
                turns: [{
                    role: 'user',
                    parts: [{ text: "Camera is active. Describe what you see INSTANTLY in Hinglish. Do not wait." }]
                }],
                turnComplete: true
            }
        });
    } catch (e) {
        console.warn("Failed to send text trigger", e);
    }

    // 3. Start Interval for continuous vision
    // SPEED OPTIMIZATION: Send frames @ 5 FPS (every 200ms) for instant visual reaction
    this.videoInterval = window.setInterval(() => {
        this.captureAndSendFrame(videoElement);
    }, 200); 
  }

  public stopVideoStream() {
    if (this.videoInterval) {
        clearInterval(this.videoInterval);
        this.videoInterval = null;
        this.callbacks.onLog("Vision Module Deactivated.", "info");
    }
  }

  private captureAndSendFrame(videoElement: HTMLVideoElement) {
      if (!this.videoCtx || !this.session) return;

      const width = 640; 
      const height = videoElement.videoHeight / (videoElement.videoWidth / width);
      
      this.videoCanvas.width = width;
      this.videoCanvas.height = height;

      this.videoCtx.drawImage(videoElement, 0, 0, width, height);
      // OPTIMIZATION: Lower JPEG quality to 0.4 for faster transmission
      const base64Data = this.videoCanvas.toDataURL('image/jpeg', 0.4).split(',')[1];

      this.session.sendRealtimeInput({
          media: {
              mimeType: 'image/jpeg',
              data: base64Data
          }
      });
  }

  // -----------------------------

  private startAudioInput(stream: MediaStream, sessionPromise: Promise<any>) {
    if (!this.inputAudioContext) return;

    this.inputSource = this.inputAudioContext.createMediaStreamSource(stream);
    
    // SPEED OPTIMIZATION: Buffer size reduced from 4096 to 2048 to halve input latency
    this.processor = this.inputAudioContext.createScriptProcessor(2048, 1, 1);

    this.processor.onaudioprocess = (e) => {
      if (!this.isConnected) return;
      
      const inputData = e.inputBuffer.getChannelData(0);
      
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      this.callbacks.onVolumeChange(rms * 5);

      const pcmInt16 = float32ToPCM(inputData);
      const uint8Buffer = new Uint8Array(pcmInt16.buffer);
      const base64Data = uint8ArrayToBase64(uint8Buffer);

      sessionPromise.then(session => {
        session.sendRealtimeInput({
          media: {
            mimeType: 'audio/pcm;rate=16000',
            data: base64Data
          }
        });
      });
    };

    this.inputSource.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage, sessionPromise: Promise<any>) {
    // 1. Handle Function Calls
    if (message.toolCall) {
      for (const fc of message.toolCall.functionCalls) {
        let result = "Done";
        
        if (fc.name === 'open_app') {
          const appName = (fc.args as any).appName?.toLowerCase().trim();
          this.callbacks.onLog(`Command: Open ${appName}`, "action");
          result = this.executeOpenApp(appName);
        } else if (fc.name === 'play_music') {
          const songName = (fc.args as any).songName;
          this.callbacks.onLog(`Playing: ${songName}`, "action");
          this.callbacks.onPlayMusic(songName);
          result = `Playing ${songName} on screen.`;
        }

        const session = await sessionPromise;
        session.sendToolResponse({
          functionResponses: {
            id: fc.id,
            name: fc.name,
            response: { result: result }
          }
        });
      }
    }

    // 2. Handle Grounding Metadata (Search Results)
    const groundingMetadata = (message.serverContent as any)?.groundingMetadata;
    if (groundingMetadata?.groundingChunks) {
      const sources: SearchResult[] = groundingMetadata.groundingChunks
        .map((chunk: any) => ({
          title: chunk.web?.title || 'Web Source',
          uri: chunk.web?.uri
        }))
        .filter((s: SearchResult) => s.uri);
      
      if (sources.length > 0) {
        this.callbacks.onLog(`Found ${sources.length} sources`, "aura");
        this.callbacks.onSearchSources(sources);
      }
    }

    // 3. Handle Audio Output
    const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioData && this.outputAudioContext) {
      const audioBuffer = await decodeAudioData(
        base64ToUint8Array(audioData),
        this.outputAudioContext,
        24000,
        1
      );

      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputAudioContext.destination);
      
      const currentTime = this.outputAudioContext.currentTime;
      if (this.nextStartTime < currentTime) {
        this.nextStartTime = currentTime;
      }
      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
    }
  }

  private executeOpenApp(appName: string): string {
    const appConfig = SUPPORTED_APPS[appName];
    
    if (appConfig) {
      this.callbacks.onLog(`Opening ${appConfig.name}...`, "info");
      
      // Strategy: Try the Deep Link (App Scheme) first.
      // If the app is installed, it should launch.
      window.location.href = appConfig.scheme;

      // SPEED OPTIMIZATION: Faster fallback to web (800ms)
      setTimeout(() => {
        if (document.visibilityState === 'visible') {
           this.callbacks.onLog(`App not detected, using web fallback...`, "info");
           window.location.href = appConfig.fallback;
        }
      }, 800);

      return `Opening ${appConfig.name}`;
    } else {
      this.callbacks.onLog(`App '${appName}' not found in registry.`, "info");
      return `Could not find app ${appName}.`;
    }
  }

  public disconnect() {
    this.stopVideoStream();
    this.isConnected = false;
    
    if (this.keepAliveInterval) {
        clearInterval(this.keepAliveInterval);
        this.keepAliveInterval = null;
    }
    
    if (this.wakeLock) {
        this.wakeLock.release().then(() => {
            this.wakeLock = null;
        });
    }

    this.callbacks.onConnectionChange(false);
    this.cleanup();
  }

  private cleanup() {
    if (this.inputSource) {
      this.inputSource.disconnect();
      this.inputSource = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.inputAudioContext) {
      this.inputAudioContext.close();
      this.inputAudioContext = null;
    }
    if (this.outputAudioContext) {
      this.outputAudioContext.close();
      this.outputAudioContext = null;
    }
    this.nextStartTime = 0;
  }
}
