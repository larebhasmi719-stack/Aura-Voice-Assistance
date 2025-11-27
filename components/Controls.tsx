import React from 'react';
import { ConnectionState } from '../types';

interface ControlsProps {
  connectionState: ConnectionState;
  onConnect: () => void;
  onDisconnect: () => void;
}

const Controls: React.FC<ControlsProps> = ({ connectionState, onConnect, onDisconnect }) => {
  const isConnected = connectionState === ConnectionState.CONNECTED;
  const isConnecting = connectionState === ConnectionState.CONNECTING;

  return (
    <div className="z-30 flex flex-col items-center justify-center">
      <button
        onClick={isConnected ? onDisconnect : onConnect}
        disabled={isConnecting}
        className={`
          relative group flex items-center justify-center
          w-24 h-24 rounded-full border-2 transition-all duration-500
          ${isConnected 
            ? 'border-red-500 shadow-[0_0_30px_#ef4444] bg-red-900/20' 
            : 'border-cyan-400 shadow-[0_0_30px_#22d3ee] bg-cyan-900/20 hover:scale-105'
          }
          ${isConnecting ? 'cursor-wait shadow-[0_0_50px_#22d3ee]' : ''}
        `}
      >
        {/* Icon inside button */}
        <div className={`text-2xl font-bold transition-all duration-300 ${isConnected ? 'text-red-400' : 'text-cyan-400'}`}>
           {isConnecting ? '...' : (isConnected ? 'STOP' : 'START')}
        </div>
        
        {/* Spinning border ring */}
        <div className={`absolute inset-[-4px] rounded-full border border-dashed border-opacity-40 pointer-events-none 
            ${isConnected ? 'border-red-500 animate-spin-slow' : 'border-cyan-400'}
            ${isConnecting ? 'animate-spin' : 'animate-spin-slow'}
            `}>
        </div>
      </button>
    </div>
  );
};

export default Controls;