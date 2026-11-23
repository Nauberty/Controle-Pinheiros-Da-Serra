import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativa: funciona em qualquer endereço
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1200,
    sourcemap: false, // nunca publicar o "mapa" que permitiria reconstruir o código original
    minify: true, // código compactado e ilegível
  },
});
