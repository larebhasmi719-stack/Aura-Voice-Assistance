import React, { useEffect } from 'react';
import { SearchResult } from '../types';

interface SearchResultsProps {
  sources: SearchResult[];
  onClose: () => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({ sources, onClose }) => {
  
  useEffect(() => {
    if (!sources || sources.length === 0) return;
    const timer = setTimeout(() => {
      onClose();
    }, 20000); // Auto-close after 20 seconds
    return () => clearTimeout(timer);
  }, [sources, onClose]);
  
  if (!sources || sources.length === 0) return null;

  return (
    <div className="fixed top-24 right-4 z-40 w-64 animate-float">
      {/* Holographic Container */}
      <div className="relative bg-deep-800/90 backdrop-blur-xl border border-purple-500/50 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(217,70,239,0.3)]">
        
        {/* Header */}
        <div className="flex justify-between items-center px-3 py-2 bg-purple-900/30 border-b border-purple-500/30">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-bold text-purple-200 tracking-widest uppercase">
              DATA // FOUND
            </span>
          </div>
          <button 
            onClick={onClose}
            className="text-purple-400 hover:text-white text-lg leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* List */}
        <div className="p-3 max-h-60 overflow-y-auto custom-scrollbar">
          <ul className="space-y-2">
            {sources.map((source, index) => (
              <li key={index} className="group">
                <a 
                  href={source.uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block p-2 rounded bg-purple-500/10 hover:bg-purple-500/20 border border-transparent hover:border-purple-500/40 transition-all duration-300"
                >
                  <div className="text-xs text-purple-100 font-medium truncate group-hover:text-white">
                    {source.title}
                  </div>
                  <div className="text-[10px] text-purple-400/70 truncate mt-0.5 font-mono">
                    {new URL(source.uri).hostname}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Decorative Footer */}
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-70"></div>
      </div>
    </div>
  );
};

export default SearchResults;