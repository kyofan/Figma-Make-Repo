import React from "react";
import { motion, MotionValue, useTransform, useSpring } from "motion/react";

export type BackgroundType = "original" | "bg" | "bg1" | "parallax";

interface BackgroundManagerProps {
  type: BackgroundType;
  headX: MotionValue<number>;
  headY: MotionValue<number>;
}

export const BackgroundManager: React.FC<BackgroundManagerProps> = ({
  type,
  headX,
  headY,
}) => {
  // Smooth the raw input
  const smoothX = useSpring(headX, { stiffness: 100, damping: 20 });
  const smoothY = useSpring(headY, { stiffness: 100, damping: 20 });

  // Transform to pixel offset
  const parallaxX = useTransform(smoothX, (value) => value * 50);
  const parallaxY = useTransform(smoothY, (value) => value * -50);

  if (type === "original") {
    return (
      <>
        {/* visionOS-style background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-800 via-gray-900 to-black z-0" />

        {/* Subtle particle/light effect in background */}
        <div className="absolute inset-0 z-0 opacity-20">
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-48 h-48 rounded-full bg-gradient-to-r from-blue-400/30 to-purple-400/30 blur-3xl"
              initial={{
                x: Math.random() * 100 - 50 + "%",
                y: Math.random() * 100 - 50 + "%",
                scale: Math.random() * 0.5 + 0.5,
              }}
              animate={{
                x: [
                  Math.random() * 100 - 50 + "%",
                  Math.random() * 100 - 50 + "%",
                  Math.random() * 100 - 50 + "%",
                ],
                y: [
                  Math.random() * 100 - 50 + "%",
                  Math.random() * 100 - 50 + "%",
                  Math.random() * 100 - 50 + "%",
                ],
              }}
              transition={{
                duration: 20 + Math.random() * 30,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </>
    );
  }

  // Parallax Mode
  if (type === "parallax") {
    return (
      <div className="absolute inset-0 z-0 overflow-hidden bg-black">
        <motion.div
            className="absolute inset-[-5%] w-[110%] h-[110%]"
            style={{
                x: parallaxX,
                y: parallaxY
            }}
        >
             <img
                src="media/bg.webp"
                alt="Background"
                className="w-full h-full object-cover opacity-80"
            />
        </motion.div>

        {/* Vignette / Glass Reflection effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none mix-blend-overlay" />
        <div className="absolute inset-0 bg-black/40" />
      </div>
    );
  }

  const imageSrc = type === "bg" ? "media/bg.webp" : "media/bg1.webp";

  return (
    <div className="absolute inset-0 z-0">
      <motion.img
        key={imageSrc}
        src={imageSrc}
        alt="Background"
        className="w-full h-full object-cover"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      />
      <div className="absolute inset-0 bg-black/60" />{" "}
      {/* Darker overlay for better text contrast */}
    </div>
  );
};
