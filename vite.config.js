import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'www', // Obligatorio para que Capacitor encuentre los archivos compilados
    assetsInlineLimit: 0, // Evita que Vite transforme audios o sprites pequeños en código base64
  }
});