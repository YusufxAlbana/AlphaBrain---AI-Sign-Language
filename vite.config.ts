import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@tensorflow/tfjs': '@tensorflow/tfjs/dist/tf.js',
    },
  },
  optimizeDeps: {
    // Only bundle TensorFlow - MediaPipe is loaded from CDN
    include: ['@tensorflow/tfjs', '@tensorflow-models/knn-classifier'],
    exclude: ['@mediapipe/hands', '@mediapipe/drawing_utils', '@mediapipe/camera_utils'],
  },
  build: {
    rollupOptions: {
      // Treat MediaPipe packages as external - they come from CDN
      external: ['@mediapipe/hands', '@mediapipe/drawing_utils', '@mediapipe/camera_utils'],
    },
  },
})
