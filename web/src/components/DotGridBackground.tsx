import React from 'react';
import { motion } from 'framer-motion';

export const DotGridBackground: React.FC = () => {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-white">
      {/* Soft gradient aura behind the viewport */}
      <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-50/70 blur-3xl" />
      <div className="absolute top-1/2 -left-40 h-[600px] w-[600px] rounded-full bg-slate-100/70 blur-3xl" />
      <div className="absolute -bottom-40 right-1/4 h-[500px] w-[500px] rounded-full bg-emerald-50/40 blur-3xl" />

      {/* Animated SVG Dot Grid */}
      <motion.svg
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.35 }}
        transition={{ duration: 1 }}
        className="h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="dot-grid-pattern"
            width="28"
            height="28"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1.2" fill="#94a3b8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dot-grid-pattern)" />
      </motion.svg>
    </div>
  );
};

export default DotGridBackground;
