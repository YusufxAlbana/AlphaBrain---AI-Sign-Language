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
    include: ['@tensorflow/tfjs', '@tensorflow-models/knn-classifier', '@mediapipe/hands', '@mediapipe/drawing_utils'],
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
})
