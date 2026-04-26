import { PathTracer } from './renderer.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Load Taichi script dynamically as requested
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/taichi.js/dist/taichi.umd.js';
    
    script.onload = async () => {
        try {
            const tracer = new PathTracer('result_canvas');
            await tracer.init();
            await tracer.run();
        } catch (err) {
            console.error('Failed to initialize Path Tracer:', err);
        }
    };
    
    document.head.appendChild(script);
});
