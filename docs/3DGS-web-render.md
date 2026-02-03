# 3D Gaussian Splatting (3DGS) Web Rendering

## Overview

This document explains how Gaussian Splatting rendering was implemented in this React/Vite application. It serves as a reference for future developers and AI agents.

---

## Rendering Library

**Library Used:** `@mkkellogg/gaussian-splats-3d`  
**Version:** `^0.4.6`  
**GitHub:** https://github.com/mkkellogg/GaussianSplats3D

> [!IMPORTANT]
> This library is **NOT** a Three.js addon. It creates its own renderer, scene, and camera internally. It cannot be embedded inside a React Three Fiber (`@react-three/fiber`) scene.

### Why This Library?
- Handles `.ply` and `.splat` file formats
- Built-in orbit controls
- Supports progressive loading
- Works in browsers (unlike CUDA-based renderers)

---

## Critical Architecture Decision

### ❌ Failed Approach: React Three Fiber Integration
We initially tried using `@react-three/drei`'s `<Splat>` component and wrapping the library in an R3F context. This **failed** because:

1. The library's `Viewer` class creates its own `THREE.WebGLRenderer`
2. R3F also manages its own renderer
3. Two renderers fighting causes blank screens or silent failures

### ✅ Working Approach: Standalone Viewer
The `StandaloneSplatViewer.tsx` component:
- Creates its own `<div>` container (not a `<canvas>`)
- Lets the library manage everything (renderer, camera, controls)
- Overlays on top of the React UI

```tsx
// The library creates its own canvas inside this div
<div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
```

---

## Safe Mode (Critical for Localhost)

### The Problem
Modern browsers require **Cross-Origin Isolation** headers to use `SharedArrayBuffer`:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Without these headers (common in dev servers), the library's worker-based rendering **hangs silently**.

### The Solution
Disable features that require `SharedArrayBuffer`:

```javascript
const viewer = new GaussianSplats3D.Viewer({
    useWorker: false,           // No web workers
    gpuAcceleratedSort: false,  // CPU sorting instead
    sharedMemoryForWorkers: false
});
```

> [!WARNING]
> Safe Mode is **slower** (~30-50% performance hit) but necessary for local development without proper COOP/COEP headers.

---

## Camera Configuration

### Coordinate System
The library uses a **right-handed** Y-up coordinate system, same as Three.js.

### Flipping the Camera
The Livingroom splat was captured with an inverted orientation. To correct:

```javascript
{
    cameraUp: [0, -1, 0],  // Flip Y-axis to correct upside-down model
    initialCameraPosition: [0.46, 0.40, 0.35],
    initialCameraLookAt: [0.76, 0.58, -0.29]
}
```

**Explanation:**
- `cameraUp: [0, -1, 0]` tells the camera "up" is actually "down" in world space
- This effectively flips the rendered image 180° without modifying the model

### How Camera Coords Were Found
1. Load the model in `splat-test.html`
2. Orbit around until the view looks correct
3. Copy coordinates from the live camera display
4. Paste into `StandaloneSplatViewer.tsx`

---

## File Format

**Primary Format:** `.ply` (Point Cloud format)  
**File:** `public/Livingroom-in-Taipei.ply`

The file was NOT modified. It's a standard 3DGS PLY export containing:
- 3D positions for each splat
- Covariance matrices (ellipsoid shape)
- Spherical harmonics (color/lighting)
- Opacity values

> [!NOTE]
> There's also a `.spz` (compressed) variant, but we use `.ply` for broader compatibility.

---

## Head Tracking Integration

The viewer's camera is updated based on head position from the `FaceTrackingManager`:

```javascript
useEffect(() => {
    if (!headX || !headY) return;
    
    const unsubX = headX.on('change', updateCamera);
    const unsubY = headY.on('change', updateCamera);
    
    function updateCamera() {
        const camX = baseCameraRef.current.x + headX.get() * parallaxStrength;
        const camY = baseCameraRef.current.y + headY.get() * parallaxStrength;
        // Apply to viewer.camera
    }
}, [headX, headY]);
```

**Key Points:**
- Base camera position is stored in a ref (doesn't change)
- Head offset is added on top of base position
- `parallaxStrength` controls how much the scene moves

---

## Component Hierarchy

```
main.tsx
  └── BackgroundManager.tsx
        └── (type === "livingroom")
              └── StandaloneSplatViewer.tsx
                    └── GaussianSplats3D.Viewer (internal)
```

---

## Troubleshooting Guide

| Symptom | Cause | Fix |
|---------|-------|-----|
| Blank white screen | Renderer conflict with R3F | Use standalone viewer |
| Hangs indefinitely | SharedArrayBuffer disabled | Use Safe Mode |
| Model upside-down | Wrong camera orientation | Set `cameraUp: [0, -1, 0]` |
| Wrong viewpoint | Incorrect camera coords | Use splat-test.html to find coords |
| "Module not found" | Missing types | Add `.d.ts` shim file |

---

## Files Created/Modified

| File | Purpose |
|------|---------|
| `components/StandaloneSplatViewer.tsx` | Main viewer component |
| `src/types/gaussian-splats-3d.d.ts` | TypeScript declarations |
| `components/BackgroundManager.tsx` | Routes to viewer |
| `public/Livingroom-in-Taipei.ply` | Splat data (75MB) |

---

## Future Improvements

1. **Enable GPU sorting in production** - Add COOP/COEP headers to production server
2. **Preload splat data** - Load in background before user switches to livingroom
3. **Multiple splat scenes** - Support loading different environments
4. **LOD system** - Load lower quality first, then refine

---

## References

- [3D Gaussian Splatting Paper](https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/)
- [GaussianSplats3D Library](https://github.com/mkkellogg/GaussianSplats3D)
- [SharedArrayBuffer Requirements](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer#security_requirements)
