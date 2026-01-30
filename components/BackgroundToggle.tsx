import React from "react";
import { motion } from "motion/react";
import { BackgroundType } from "./BackgroundManager";

interface BackgroundToggleProps {
  currentType: BackgroundType;
  onTypeChange: (type: BackgroundType) => void;
}

const options: { label: string; value: BackgroundType }[] = [
  { label: "Classic (VR)", value: "original" },
  { label: "Workspace (MR)", value: "bg" },
  { label: "Nightlife (AR)", value: "bg1" },
  { label: "Parallax", value: "parallax" },
];

export const BackgroundToggle: React.FC<BackgroundToggleProps> = ({
  currentType,
  onTypeChange,
}) => {
  return (
    <div className="flex p-1 bg-white/10 backdrop-blur-3xl rounded-full border border-white/10 shadow-2xl relative overflow-hidden">
      {options.map((option) => {
        const isActive = currentType === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onTypeChange(option.value)}
            className={`relative px-4 py-1.5 text-sm font-medium transition-colors duration-200 rounded-full whitespace-nowrap outline-none
              ${isActive ? "text-white" : "text-white/50 hover:text-white/80"}`}
          >
            {isActive && (
              <motion.div
                layoutId="bg-toggle-pill"
                className="absolute inset-0 bg-white/20 backdrop-blur-md rounded-full border border-white/20 shadow-sm"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
};
