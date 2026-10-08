import React from 'react';

export const Badge = ({ children, variant = 'emerald', className = '', pulse = false }) => {
  const variants = {
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    cyan: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    rose: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    slate: 'bg-slate-700/40 text-slate-300 border-slate-600/30',
    purple: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium 
        border backdrop-blur-md transition-all
        ${variants[variant] || variants.emerald}
        ${pulse ? 'animate-pulse' : ''}
        ${className}
      `}
    >
      {pulse && (
        <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0 animate-ping" />
      )}
      {children}
    </span>
  );
};
