import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, readdirSync, existsSync } from 'fs';

// Plugin to copy extension static files after build
function copyExtensionFiles() {
  return {
    name: 'copy-extension-files',
    closeBundle() {
      const dist = resolve(__dirname, 'dist');
      const pub = resolve(__dirname, 'public');

      // Copy manifest, background, inpage
      for (const f of ['manifest.json', 'background.js', 'inpage.js']) {
        copyFileSync(resolve(pub, f), resolve(dist, f));
      }

      // Copy icons
      const iconSrc = resolve(pub, 'icons');
      const iconDst = resolve(dist, 'icons');
      if (existsSync(iconSrc)) {
        mkdirSync(iconDst, { recursive: true });
        for (const f of readdirSync(iconSrc)) {
          copyFileSync(resolve(iconSrc, f), resolve(iconDst, f));
        }
      }

      console.log('✓ Extension files copied to dist/');
    },
  };
}

export default defineConfig({
  plugins: [react(), copyExtensionFiles()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        manualChunks: {
          vendor: ['react', 'react-dom', 'zustand'],
          crypto: ['ethers'],
        },
      },
    },
    sourcemap: false,
    minify: 'esbuild',
    target: 'chrome102',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
