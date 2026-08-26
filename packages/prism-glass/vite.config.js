import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Library build: ships ONLY a minified bundle (no sourcemaps, no src).
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/index.js',
      formats: ['es', 'cjs'],
      fileName: (f) => (f === 'es' ? 'prism-glass.js' : 'prism-glass.cjs'),
    },
    sourcemap: false,
    minify: 'oxc',
    rollupOptions: {
      external: [
        'react', 'react-dom', 'react/jsx-runtime',
        'three', '@react-three/fiber', '@react-three/drei', 'maath',
      ],
    },
  },
})
