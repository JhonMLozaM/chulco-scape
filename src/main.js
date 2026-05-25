import Phaser from 'phaser';
import { config } from './config.js';

// Importación de todas las escenas del juego
import BootScene from './scenes/bootscene.js';
import MenuScene from './scenes/menuscene.js';
import GameScene from './scenes/gamescene.js';
import ShopScene from './scenes/shopscene.js';
import SeasonPassScene from './scenes/seasonpassscene.js';

/**
 * El Cerebro del Proyecto:
 * Combinamos la configuración de hardware/físicas con la lista
 * ordenada de escenas que controlarán el flujo del juego.
 */
const juegoConfig = {
  ...config, // Copia todas las propiedades de src/config.js (físicas, resolución, escala)
  scene: [
    BootScene,       // 1. Carga los assets de audio y sprites ecuatorianos
    MenuScene,       // 2. Pantalla de inicio, menú de navegación
    GameScene,       // 3. Fase 1: La Huida (Survival en la Bahía/Iñaquito)
    ShopScene,       // 4. Fase 2: La Negociación (Pagar deuda/Mejoras)
    SeasonPassScene  // 5. El Pase del Chulla (Progreso y monetización premium)
  ]
};

// Inicialización global del videojuego dentro del contenedor del index.html
const game = new Phaser.Game(juegoConfig);

// Exportamos la instancia por si necesitamos acceder al core desde los servicios móviles
export default game;