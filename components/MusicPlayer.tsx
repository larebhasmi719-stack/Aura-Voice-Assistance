import React, { useEffect } from 'react';

interface MusicPlayerProps {
  songName: string | null;
  onClose: () => void;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ songName, onClose }) => {
  
  useEffect(() => {
    if (!songName) return;
    const timer = setTimeout(() => {
      onClose();
    }, 20000); // Auto-close after 20 seconds
    return () => clearTimeout(timer);
  }, [songName, onClose]);

  if (!songName) return null;

  // Optimized YouTube Embed
  // listType=search plays the first relevant video
  // mute=0 ensures audio is ON
  // autoplay=1 starts immediately
  // playsinline=1 keeps it in the div on mobile
  const searchUrl = `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(songName)}&autoplay=1&mute=0&controls=1&playsinline=1&modestbranding=1&iv_load_policy=3`;

  return (
    <div className="fixed inset-x-0 bottom-12 mx-auto w-[90%] max-w-md z-40 animate-float">
      {/* Holographic Container */}
      <div className="relative bg-deep-800/90 backdrop-blur-xl border border-cyan-500/50 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.4)]">
        
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-2 bg-cyan-900/30 border-b border-cyan-500/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-bold text-cyan-300 tracking-widest uppercase truncate max-w-[200px]">
              Now Playing: {songName}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="text-cyan-500 hover:text-red-400 text-xl font-bold px-2 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Video Player (16:9 Aspect Ratio) */}
        <div className="relative pt-[56.25%] bg-black">
          <iframe 
            src={searchUrl}
            className="absolute top-0 left-0 w-full h-full"
            title="Aura Music Player"
            allow="accelerometer; autoplay *; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          ></iframe>
        </div>

        {/* Decorative Footer */}
        <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500 animate-pulse"></div>
      </div>
    </div>
  );
};

export default MusicPlayer;