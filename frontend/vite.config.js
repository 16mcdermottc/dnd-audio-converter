import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/api/, ''), // Don't rewrite, backend uses /api prefix for chat
      },
      '/graphql': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      // Proxy other backend routes
      '/sessions': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/personas': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/highlights': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/moments': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/upload_session': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/import_session_text': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/reupload_session': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
})
