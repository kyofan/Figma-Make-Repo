import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface GazeIndicatorProps {
  isActive: boolean;
}

export const GazeIndicator: React.FC<GazeIndicatorProps> = ({ isActive }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', updateMousePosition);
    
    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
    };
  }, []);
  
  if (!isActive) return null;
  
  return (
    <motion.div 
      className="fixed pointer-events-none z-50"
      style={{
        left: mousePosition.x,
        top: mousePosition.y,
        translateX: '-50%',
        translateY: '-50%'
      }}
      initial={{ scale: 0.8, opacity: 0.5 }}
      animate={{ 
        scale: [0.8, 1.2, 0.8],
        opacity: [0.3, 0.6, 0.3]
      }}
      transition={{ 
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      {/* Inner ring with glow effect */}
      <div className="w-5 h-5 rounded-full border border-blue-300/70 bg-blue-400/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
      
      {/* Outer ring animation */}
      <div className="absolute inset-0 w-5 h-5 rounded-full border border-blue-200/50 animate-ping" />
    </motion.div>
  );
};