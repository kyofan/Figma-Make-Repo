import React, { useMemo } from 'react';
import { motion } from 'motion/react';

interface FoveatedOverlayProps {
    gazeX: number;
    gazeY: number;
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
    // Closer (higher Z) -> Smaller radius
    // Farther (lower Z) -> Larger radius
    const radius = useMemo(() => {
        const baseRadius = 200;
        // depthZ is roughly -1 to 1.
        // We clamp it to avoid extreme values.
        const clampedZ = Math.max(-1.5, Math.min(1.5, depthZ));

        // Formula:
        // Z=1 (close) -> factor ~0.6 -> radius 120
        // Z=-1 (far) -> factor ~1.4 -> radius 280
        const scaleFactor = 1 - (clampedZ * 0.4);
        return baseRadius * scaleFactor;
    }, [depthZ]);

    if (!enabled) return null;

    return (
        <motion.div
            className="fixed inset-0 pointer-events-none z-[9000]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
                // We use a CSS mask to punch a hole in the blurred layer
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                maskImage: `radial-gradient(circle at ${gazeX}px ${gazeY}px, transparent ${radius}px, black ${radius + 100}px)`,
                WebkitMaskImage: `radial-gradient(circle at ${gazeX}px ${gazeY}px, transparent ${radius}px, black ${radius + 100}px)`,
                // Add a subtle vignette to darken the periphery
                background: 'radial-gradient(circle at 50% 50%, transparent 50%, rgba(0,0,0,0.2) 100%)'
            }}
        />
    );
};
