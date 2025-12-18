import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxier toutes les requêtes /api vers le backend
      '/api': {
        target: 'https://127.0.0.1:8443',
        changeOrigin: true,
        secure: false, // Accepter les certificats SSL auto-signés
      },
      // Proxier toutes les requêtes /avatars vers le backend
      '/avatars': {
        target: 'https://127.0.0.1:8443',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
