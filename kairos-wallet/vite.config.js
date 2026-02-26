import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': '/src',
    }
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'zustand'],
          crypto: ['ethers'],
          ui: ['framer-motion', 'lucide-react'],
          walletconnect: ['@walletconnect/web3wallet', '@walletconnect/utils']
        }
      }
    }
  }
});
