# Spatial Text Editor Prototype: VisionOS Interactions on the Web

**A web-based experiment exploring spatial computing interactions—without the headset.**

This project simulates the magical interaction model of VisionOS (Eye Tracking + Hand Gestures + Voice) directly in the browser using standard webcams. It combines real-time computer vision with intelligent voice command processing to create a futuristic text editing experience.

## 🔗 Live Demo
**[Try it here: https://ky.yth.tw/](https://ky.yth.tw/)**
*(Special thanks to **Yi-Tang Huang** for hosting and support)*

---

## 🚀 The Concept
As spatial computing (AR/VR) becomes more prevalent, our interaction paradigms are shifting from "Point & Click" to **"Look & Speak."** This prototype proves that these rich, multimodal interactions can be built today using standard web technologies, making them accessible to anyone with a laptop.

### Core Interaction Loop
1.  **Lift your hand to Select**: Lift your right hand to move the cursor. Hover on the words you want to change.
    *(Note: "Look to Select" will be introduced in v3.0, where your eyes act as the cursor.)*
2.  **Pinch and hold to voice-replace**: A simple hand gesture confirms your intent, separating "selection" from "action" to prevent accidental clicks (the Midas Touch problem).
3.  **Speak to Edit**: Voice is not just for dictation—it's for command. Hold a pinch and speak to contextually replace words.

---

## ✨ Key Features

### 1. Multimodal Input System
The system fuses three distinct input streams in real-time:
-   **Eye Tracking (Gaze):** Uses `WebGazer.js` to track where you are looking on the screen.
-   **Hand Tracking (Gesture):** Uses `MediaPipe` to detect pinch gestures for clicking and holding.
-   **Voice Command (Intent):** Uses the Web Speech API for low-latency transcription.

### 2. Intelligent Semantic Editing
Unlike standard dictation, this editor understands context. It analyzes the sentence structure to perform smart replacements.
*   **Context-Aware**: If you select "Monday" and say "tomorrow", the system automatically removes the preposition "on" if it's no longer needed.
*   **Grammar Correction**: It handles articles, prepositions, and temporal modifiers automatically so you can speak naturally.

### 3. Immersive "Mixed Reality" Environments
To simulate the feeling of a headset, the application renders 3D environments using **Gaussian Splatting**.
*   **Head-Coupled Parallax**: The 3D scene adjusts based on your head position (tracked via webcam), creating a "window into a virtual world" effect on your flat 2D screen.
*   **Foveated Rendering**: Simulates human vision by keeping the area you're looking at sharp while blurring the periphery, increasing immersion and focus.

---

## 🛠 Hardware & Setup
**No VR headset required.**

*   **Camera**: A standard webcam is required for hand and face tracking.
*   **Optimization**: The Mixed Reality mode and tracking parameters are specifically calibrated for **MacBook Webcams**, though other high-quality webcams will work.
*   **Environment**: Good lighting is essential for accurate computer vision tracking.

---

## 💻 Running Locally

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/spatial-text-editor.git
    cd spatial-text-editor
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Start the development server**
    ```bash
    npm run dev
    ```

4.  **Open in Browser**
    Navigate to `http://localhost:5173` (or the port shown in your terminal).

---

## 🏗 Technical Stack

*   **Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/)
*   **Computer Vision**:
    *   [MediaPipe Tasks Vision](https://developers.google.com/mediapipe/solutions/vision) (Hand & Face Tracking)
    *   [WebGazer.js](https://webgazer.cs.brown.edu/) (Eye Tracking)
*   **3D Rendering**:
    *   [Three.js](https://threejs.org/)
    *   [Gaussian Splats 3D](https://github.com/mkkellogg/GaussianSplats3D) (Photorealistic 3D Scenes)
*   **Animation**: [Motion](https://motion.dev/) (formerly Framer Motion)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)

---

*For a detailed user guide on gestures and settings, please see [InteractionGuide.md](./InteractionGuide.md).*
