import React, { useState, useRef, useEffect } from 'react';
import { ConnectionState, LogEntry, SearchResult } from './types';
import { GeminiLiveService } from './services/geminiService';
import Visualizer from './components/Visualizer';
import Controls from './components/Controls';
import MusicPlayer from './components/MusicPlayer';
import SearchResults from './components/SearchResults';

// Camera Icon SVG
const CameraIcon = ({ active }: { active: boolean }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill={active ? "currentColor" : "none"} 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={`w-6 h-6 ${active ? 'text-red-500' : 'text-cyan-400'}`}
  >
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2-2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const App: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [volume, setVolume] = useState(0);
  const [currentSong, setCurrentSong] = useState<string | null>(null);
  const [searchSources, setSearchSources] = useState<SearchResult[]>([]);
  
  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  const serviceRef = useRef<GeminiLiveService | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Wake Lock Re-acquisition on Visibility Change
  useEffect(() => {
    const handleVisibilityChange = async () => {
       if (document.visibilityState === 'visible' && connectionState === ConnectionState.CONNECTED && 'wakeLock' in navigator) {
           try {
              // Try to re-request Wake Lock if we came back to foreground and lost it
              await (navigator as any).wakeLock.request('screen');
           } catch (e) {
               console.log("WakeLock re-request failed", e);
           }
       }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [connectionState]);

  const addLog = (message: string, type: LogEntry['type']) => {
    setLogs(prev => [...prev.slice(-6), { timestamp: Date.now(), message, type }]); 
  };

  const handleConnect = async () => {
    setConnectionState(ConnectionState.CONNECTING);
    addLog("Initializing Neural Interface...", "info");

    const service = new GeminiLiveService({
      onConnectionChange: (connected) => {
        setConnectionState(connected ? ConnectionState.CONNECTED : ConnectionState.DISCONNECTED);
      },
      onVolumeChange: (vol) => {
        setVolume(vol);
      },
      onLog: (msg, type) => {
        addLog(msg, type);
      },
      onError: (err) => {
        addLog(err, 'info');
        setConnectionState(ConnectionState.ERROR);
      },
      onPlayMusic: (songName) => {
        setCurrentSong(songName);
      },
      onSearchSources: (sources) => {
        setSearchSources(sources);
      }
    });

    serviceRef.current = service;
    await service.connect();
    
    // If camera was already on before connecting, start streaming immediately
    if (isCameraActive && videoRef.current) {
        service.startVideoStream(videoRef.current);
    }
  };

  const handleDisconnect = () => {
    if (serviceRef.current) {
      serviceRef.current.disconnect();
      serviceRef.current = null;
    }
    setSearchSources([]);
    // Note: We don't turn off the camera here to allow user to keep preview open if they want, 
    // or we can turn it off. Let's keep it open but stop streaming logic (handled in service.disconnect)
  };

  const toggleCamera = async () => {
    if (isCameraActive) {
      // Turn OFF
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
        videoStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsCameraActive(false);
      serviceRef.current?.stopVideoStream();
      addLog("Vision Module Deactivated", "info");
    } else {
      // Turn ON
      try {
        addLog("Activating Optical Sensors...", "info");
        // CRITICAL: Audio is NOT set to false explicitly anymore to avoid conflicts, 
        // but we rely on getUserMedia defaults which usually doesn't grab audio unless requested.
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' }
            // Note: Not requesting audio here ensures we don't conflict with GeminiService audio
        });
        videoStreamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play();
              // If we are already connected to Gemini, start sending frames
              if (connectionState === ConnectionState.CONNECTED && serviceRef.current) {
                  serviceRef.current.startVideoStream(videoRef.current);
              }
          };
        }
        setIsCameraActive(true);
      } catch (e) {
        addLog("Camera access denied or failed.", "info");
        console.error(e);
      }
    }
  };

  return (
    <div className="relative w-full h-screen bg-deep-900 text-white overflow-hidden flex flex-col items-center justify-center">
      
      {/* 1. Global Effects */}
      <div className="scanline"></div>
      
      {/* Camera Preview Layer (Behind UI, Above Background) */}
      <video 
        ref={videoRef}
        autoPlay 
        playsInline 
        muted 
        className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-500 ${isCameraActive ? 'opacity-100' : 'opacity-0'}`}
      />
      
      {/* Dark Overlay when camera is active to make UI readable */}
      <div className={`absolute inset-0 bg-black/60 z-10 pointer-events-none transition-opacity duration-500 ${isCameraActive ? 'opacity-60' : 'opacity-100 bg-gradient-to-b from-transparent via-transparent to-deep-900'}`}></div>

      {/* 2. Main Center Content */}
      <div className="relative z-30 flex flex-col items-center justify-center w-full max-w-md h-full">
        
        {/* Camera Toggle Button (Top Right) */}
        <button 
          onClick={toggleCamera}
          className="absolute top-6 right-6 p-3 rounded-full bg-deep-800/80 border border-cyan-500/50 hover:bg-cyan-900/50 backdrop-blur-md transition-all active:scale-95 z-50 shadow-[0_0_15px_rgba(34,211,238,0.3)]"
        >
          <CameraIcon active={isCameraActive} />
        </button>

        {/* Visualizer Background for Button (Hidden when camera is active to reduce clutter) */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] z-0 pointer-events-none transition-opacity duration-500 ${isCameraActive ? 'opacity-30' : 'opacity-100'}`}>
           <Visualizer 
            active={connectionState === ConnectionState.CONNECTED} 
            volume={volume} 
          />
        </div>

        {/* Start Button Container - Moves to bottom when camera is active */}
        <div className={`transition-all duration-500 ease-in-out z-50 ${isCameraActive ? 'absolute bottom-12 left-1/2 -translate-x-1/2' : 'relative'}`}>
          <Controls 
            connectionState={connectionState} 
            onConnect={handleConnect} 
            onDisconnect={handleDisconnect} 
          />
        </div>

        {/* Overlays */}
        <MusicPlayer 
          songName={currentSong} 
          onClose={() => setCurrentSong(null)} 
        />
        
        <SearchResults
          sources={searchSources}
          onClose={() => setSearchSources([])}
        />
      </div>

    </div>
  );
};

export default App;