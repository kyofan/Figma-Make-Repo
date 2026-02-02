import React, { Suspense, useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  useGLTF,
  Splat,
  Environment,
  PerspectiveCamera,
  Grid,
  Box,
  Torus,
  Float,
} from "@react-three/drei";
import { MotionValue } from "motion/react";
import * as THREE from "three";

// Props
interface Three3DSceneProps {
  headX: MotionValue<number>;
  headY: MotionValue<number>;
  smoothingEnabled: boolean;
  renderMode?: "gltf" | "splat"; // Default to gltf
}

// Camera Controller Component
const CameraController = ({
  headX,
  headY,
}: {
  headX: MotionValue<number>;
  headY: MotionValue<number>;
}) => {
  const { camera } = useThree();
  const initialPos = useRef(new THREE.Vector3(0, 0, 5));

  useEffect(() => {
    initialPos.current.copy(camera.position);
  }, []);

  useFrame(() => {
    // Read current motion values
    const x = headX.get();
    const y = headY.get();

    // Map -1..1 to camera movement range (e.g., +/- 1 unit)
    // Invert X because moving head right should move camera right?
    // Let's test: Head Right -> Camera Right -> View shifts left relative to object. Correct.
    const moveRange = 2.0;

    // Smooth interpolation (frame-based) if needed, but the MotionValue itself might be smoothed.
    // Since we handle smoothing in BackgroundManager via useSpring, we can just read values here.

    // We update position
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, x * moveRange, 0.1);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, y * moveRange, 0.1);

    // Look at center to create correct parallax pivot
    camera.lookAt(0, 0, 0);
  });

  return null;
};

// Default Placeholder Scene (if no GLTF)
const DefaultScene = () => {
  return (
    <group>
      <Grid
        position={[0, -2, 0]}
        args={[20, 20]}
        cellColor="#ffffff"
        sectionColor="#ffffff"
        fadeDistance={10}
        fadeStrength={1}
      />
      <Float speed={2} rotationIntensity={1} floatIntensity={1}>
        <Box position={[-2, 0, 0]} args={[1, 1, 1]}>
          <meshStandardMaterial color="hotpink" />
        </Box>
      </Float>
      <Float speed={3} rotationIntensity={1.5} floatIntensity={1}>
        <Torus position={[2, 0, -2]} args={[0.8, 0.2, 16, 32]}>
          <meshStandardMaterial color="cyan" />
        </Torus>
      </Float>
       <Float speed={1.5} rotationIntensity={0.5} floatIntensity={2}>
        <Box position={[0, 1, -3]} args={[0.5, 3, 0.5]} rotation={[0,0,0.5]}>
           <meshStandardMaterial color="orange" emissive="orange" emissiveIntensity={0.5} />
        </Box>
      </Float>

      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
    </group>
  );
};

// GLTF Loader Component
const ModelLoader = ({ url }: { url: string }) => {
  // Catch errors if file doesn't exist
  const [error, setError] = useState(false);

  // We wrap useGLTF in a try/catch block conceptually, but hooks can't be wrapped.
  // Instead we use `useGLTF.preload` or just handle the error boundary.
  // For simplicity, we'll try to load. If it fails, the ErrorBoundary above should catch it?
  // R3F doesn't have a built-in simple "try load" hook.

  // Workaround: We will assume the file exists for the prototype.
  // To make it robust, we should probably check if it exists or use a fallback.
  // I will just use the DefaultScene if the URL is "placeholder".

  if (url === "placeholder") return <DefaultScene />;

  const { scene } = useGLTF(url);
  return <primitive object={scene} scale={1} />;
};

// Main Component
export const Three3DScene: React.FC<Three3DSceneProps> = ({
  headX,
  headY,
  renderMode = "gltf",
}) => {
  return (
    <div className="w-full h-full">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={50} />
        <CameraController headX={headX} headY={headY} />

        <Suspense fallback={null}>
            {renderMode === "gltf" && (
                // We point to a file that might not exist yet.
                // Users should place 'scene.glb' in 'public/models/'.
                // For now, I'll default to the internal scene to avoid crashing until they do.
                // I will add a toggle or logic to check.
                // Let's use the DefaultScene by default for the demo.
                <DefaultScene />
                // To use real GLTF: <ModelLoader url="/models/scene.glb" />
            )}

            {renderMode === "splat" && (
                // Sample splat URL or local file
                 <Splat src="https://antimatter15.com/splat/nike.splat" />
                 // User can replace with "/models/room.splat"
            )}

            <Environment preset="city" />
        </Suspense>
      </Canvas>

      {/* Instructions Overlay */}
      <div className="absolute bottom-12 right-4 text-xs text-white/30 text-right pointer-events-none">
        {renderMode === "gltf" ? "3D GLTF Mode" : "Gaussian Splat Mode"}
      </div>
    </div>
  );
};
