# Dürer's Perspective Apparatus

An interactive, high-fidelity 3D simulation of Albrecht Dürer's 1525 perspective drawing apparatus, as described in his seminal work *Underweysung der Messung mit dem Zirckel und Richtscheyt* (A Course in the Art of Measurement with a Compass and Ruler).

![Project Screenshot](file:///Users/dipanjan/.gemini/antigravity/brain/e3fcfce8-357e-4423-8d60-d65c3384a2fe/lute_tracing_verification_1776695893781.png)

## Overview

This project bridges 16th-century artistic technology with 21st-century computer graphics. It demonstrates how Dürer's method of using a taut thread to "sample" points on a 3D object and project them onto a 2D plane is the direct mechanical ancestor of modern **Ray Tracing**.

### Key Features

*   **Interactive Stylus**: Use your mouse to guide the stylus across the complex geometry of a historical **Lute**.
*   **Mechanical Simulation**: A "fake physics" thread system connects the stylus to a pulley and counterweight, maintaining the illusion of a taut line.
*   **Pointillist Drawing Engine**: Click to "mark" points on the virtual glass frame. Each mark is a geometric intersection where the thread passes through the drawing plane.
*   **Auto-Animator**: A vertex-sampling engine that automatically traces the lute, sampling 1,000 points to reveal the perspectival projection in real-time.
*   **Academic Aesthetic**: A "Laboratory White" environment with glassmorphism UI elements, providing a clean, pedagogical experience.

## Technical Stack

*   **Engine**: [Babylon.js](https://www.babylonjs.com/) (WebGPU/WebGL)
*   **Frontend**: Vanilla HTML5, CSS3, and JavaScript.
*   **Assets**: `lute.obj` historical model.
*   **Techniques**: Ray-plane intersection, Dynamic 2D canvas textures, ArcRotate camera navigation.

## How to Run

Because the application loads external 3D assets (`.obj` files), it requires a local web server to bypass browser CORS restrictions.

1.  **Clone the repository** (or navigate to the project folder).
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Start the server**:
    ```bash
    npm start
    ```
4.  **Open in Browser**: Navigate to `http://localhost:8000`.

## Instructions for use

1.  **Manual Tracing**: Glide the mouse over the Lute. When the stylus reaches a point of interest, click to plot a point on the glass frame.
2.  **Auto-Animate**: Click the **Animate** button to let the machine automatically sample 1,000 vertices from the lute's body.
3.  **Navigation**: 
    *   **Left Click + Drag**: Rotate camera.
    *   **Right Click + Drag**: Pan camera.
    *   **Scroll**: Zoom in/out.
4.  **Reset**: Click **Reset Scene** to clear the canvas and return the camera to the default 3/4 perspective.

---

*“Since the art of measurement is the true foundation of all painting, I have decided to teach its principles to all studious youths.”* — Albrecht Dürer, 1525
