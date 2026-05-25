import Phaser from 'phaser';

export const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'game-container',
  
  scale: {
    mode: Phaser.Scale.FIT, // Escala el juego automáticamente para llenar la pantalla del celular
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  
  physics: {
    default: 'arcade', // Físicas ligeras ideales para el survival de oleadas
    arcade: {
      gravity: { y: 0 }, // Vista aérea (Top-Down): No necesitamos gravedad cayendo hacia abajo
      debug: false // Cambiar a true durante el desarrollo para ver las cajas de colisión en verde
    }
  },

  // 🛠️ ADICIÓN 1: Optimización de Renderizado para dispositivos móviles
  render: {
    antialias: true,       // Suaviza los bordes de las imágenes (ideal para ilustraciones de la Bahía)
    pixelArt: false,       // Déjalo en false a menos que decidas usar un estilo retro pixelado
    powerPreference: 'high-performance' // Fuerza al celular a usar el procesador gráfico más rápido
  },

  // 🛠️ ADICIÓN 2: Habilitar Multitouch (Punteros activos)
  input: {
    activePointers: 3      // Permite hasta 3 dedos simultáneos. Clave para moverte con el joystick y disparar bolones al mismo tiempo
  }
};