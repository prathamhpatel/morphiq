import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // dev: resolve the package to its source so the demo consumes it
      // exactly the way a published install would.
      '@morphiq/prism-glass': fileURLToPath(
        new URL('./packages/prism-glass/src/index.js', import.meta.url)
      ),
    },
  },
})
