import React from 'react';
import { X, Download, ZoomIn, ExternalLink } from 'lucide-react';
import { useChat } from '../../context/ChatContext';

export const ImageLightbox: React.FC = () => {
  const { activeLightboxImage, setActiveLightboxImage } = useChat();

  if (!activeLightboxImage) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in"
      onClick={() => setActiveLightboxImage(null)}
    >
      <div className="absolute top-4 right-4 flex items-center space-x-2 z-50">
        <a
          href={activeLightboxImage}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors"
          title="Open original in new tab"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
        <a
          href={activeLightboxImage}
          download
          onClick={(e) => e.stopPropagation()}
          className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors"
          title="Download image"
        >
          <Download className="w-4 h-4" />
        </a>
        <button
          onClick={() => setActiveLightboxImage(null)}
          className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-rose-600 text-slate-200 hover:text-white transition-colors"
          title="Close (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div
        className="max-w-4xl max-h-[85vh] p-2 flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={activeLightboxImage}
          alt="Enlarged preview"
          className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-slate-800 ring-1 ring-white/10"
        />
      </div>
    </div>
  );
};
