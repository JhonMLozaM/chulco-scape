import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // 👈 ¡ESTO ES LO CRÍTICO! Obliga a Vite a usar rutas relativas (./assets) para que Electron y Android encuentren los archivos.
  build: {
    outDir: 'www', // Obligatorio para que Capacitor encuentre los archivos compilados
    assetsInlineLimit: 0, // Evita que Vite transforme audios o sprites pequeños en código base64
  }
});