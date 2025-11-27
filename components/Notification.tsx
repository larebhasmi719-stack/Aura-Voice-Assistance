import React, { useEffect } from 'react';

interface NotificationProps {
  message: string;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-full max-w-sm px-4">
       <div className="relative bg-deep-900/90 border border-cyan-500 px-8 py-6 rounded-lg shadow-[0_0_50px_rgba(34,211,238,0.5)] backdrop-blur-xl animate-float">
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400"></div>
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400"></div>
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400"></div>
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400"></div>
          
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-cyan-400 tracking-[0.3em] font-bold uppercase">System Command</span>
            </div>
            <span className="text-xl md:text-2xl text-white font-bold tracking-widest uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] break-words w-full">
                {message}
            </span>
            <div className="h-0.5 w-32 bg-gradient-to-r from-transparent via-cyan-500 to-transparent mt-2"></div>
          </div>
       </div>
    </div>
  );
};

export default Notification;