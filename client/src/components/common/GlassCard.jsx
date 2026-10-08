import React from 'react';
import { motion } from 'framer-motion';

export const GlassCard = ({ children, className = '', hoverGlow = false, onClick, ...props }) => {
  return (
    <motion.div
      whileHover={hoverGlow ? { y: -2, transition: { duration: 0.2 } } : undefined}
      onClick={onClick}
      className={`
        bg-slate-900/70 dark:bg-slate-900/60 
        backdrop-blur-xl border border-white/10 dark:border-white/5 
        rounded-2xl shadow-xl shadow-black/20 
        ${hoverGlow ? 'hover:border-emerald-500/30 hover:shadow-glow-emerald transition-all duration-300' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </motion.div>
  );
};
