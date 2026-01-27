import React from "react";
import { motion } from "motion/react";

interface SpaceKeyProps {
  active: boolean;
}

export const SpaceKey: React.FC<SpaceKeyProps> = ({ active }) => {
  return (
    <motion.div
      className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 px-16 py-1.5 rounded-xl ${
        active
          ? "bg-blue-500/30 border-blue-400/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
          : "bg-white/10 border-white/20"
      } backdrop-blur-xl border transition-all duration-300`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.8 }}
    >
      <span className="text-white/80 text-xs font-light">space</span>
    </motion.div>
  );
};

export default SpaceKey;
