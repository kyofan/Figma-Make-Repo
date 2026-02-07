import React, { useMemo } from 'react';
import { motion, MotionValue, useMotionTemplate, useTransform } from 'motion/react';

interface FoveatedOverlayProps {
    gazeX: MotionValue<number>;
    gazeY: MotionValue<number>;
    depthZ: number; // Approx -1 (far) to 1 (close)
    enabled: boolean;
    baseRadius: number; // New prop for user adjustment
}

export const FoveatedOverlay: React.FC<FoveatedOverlayProps> = ({
    gazeX,
    gazeY,
    depthZ,
    enabled,
    baseRadius
}) => {
    // Calculate radius based on depth
    const radius = useMemo(() => {
        // depthZ is roughly -1 to 1.
        // We clamp it to avoid extreme values.
        const clampedZ = Math.max(-1.5, Math.min(1.5, depthZ));

        // Formula:
        // Z=1 (close) -> factor ~0.6 -> smaller radius
        // Z=-1 (far) -> factor ~1.4 -> larger radius
        const scaleFactor = 1 - (clampedZ * 0.4);
        return baseRadius * scaleFactor;
    }, [depthZ, baseRadius]);

    // Use MotionTemplate for performant style updates without React renders
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
