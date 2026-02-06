import React, { useMemo } from 'react';
import { motion, MotionValue, useMotionTemplate, useTransform } from 'motion/react';

interface FoveatedOverlayProps {
    gazeX: MotionValue<number>;
    gazeY: MotionValue<number>;
    depthZ: number; // Approx -1 (far) to 1 (close)
    enabled: boolean;
}

export const FoveatedOverlay: React.FC<FoveatedOverlayProps> = ({
    gazeX,
    gazeY,
    depthZ,
    enabled
}) => {
    // Calculate radius based on depth
    const radius = useMemo(() => {
        const baseRadius = 300; // Increased base radius as requested
        const clampedZ = Math.max(-1.5, Math.min(1.5, depthZ));
        const scaleFactor = 1 - (clampedZ * 0.4);
        return baseRadius * scaleFactor;
    }, [depthZ]);

    // Use MotionTemplate for performant style updates without React renders
    // We create the gradient string dynamically based on the MotionValues
    const maskImage = useMotionTemplate`radial-gradient(circle at ${gazeX}px ${gazeY}px, transparent ${radius}px, black ${radius + 150}px)`;

    if (!enabled) return null;

    return (
        <motion.div
            className="fixed inset-0 pointer-events-none z-[9000]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                maskImage: maskImage,
                WebkitMaskImage: maskImage,
                // Add a subtle vignette to darken the periphery
                background: 'radial-gradient(circle at 50% 50%, transparent 50%, rgba(0,0,0,0.2) 100%)'
            }}
        />
    );
};
