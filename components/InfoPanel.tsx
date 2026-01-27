import React from 'react';
import { motion } from 'motion/react';

export const InfoPanel: React.FC = () => {
  return (
    <motion.div 
      className="absolute top-6 right-6 w-80 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-5 text-white/90 shadow-lg"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      <h3 className="text-lg font-light mb-3">Look to Select, Speak to Refine</h3>
      <p className="text-sm text-white/70 font-light mb-4">
        This prototype demonstrates a new paradigm for text input in spatial computing that combines:
      </p>
      <ul className="text-sm space-y-3">
        <li className="flex items-start">
          <span className="inline-block w-5 h-5 rounded-full bg-blue-500/20 border border-blue-400/50 mr-3 flex-shrink-0 mt-0.5 shadow-[0_0_8px_rgba(59,130,246,0.2)]"></span>
          <span className="text-white/80 font-light"><strong className="font-normal">Eye tracking</strong> (simulated with mouse hover)</span>
        </li>
        <li className="flex items-start">
          <span className="inline-block w-5 h-5 rounded-full bg-green-500/20 border border-green-400/50 mr-3 flex-shrink-0 mt-0.5 shadow-[0_0_8px_rgba(74,222,128,0.2)]"></span>
          <span className="text-white/80 font-light"><strong className="font-normal">Voice commands</strong> (press space to activate)</span>
        </li>
        <li className="flex items-start">
          <span className="inline-block w-5 h-5 rounded-full bg-purple-500/20 border border-purple-400/50 mr-3 flex-shrink-0 mt-0.5 shadow-[0_0_8px_rgba(168,85,247,0.2)]"></span>
          <span className="text-white/80 font-light"><strong className="font-normal">Contextual understanding</strong> (grammar correction)</span>
        </li>
      </ul>
    </motion.div>
  );
};