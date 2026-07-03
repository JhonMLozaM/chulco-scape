import Phaser from 'phaser';
import { config } from './config.js';
import { Publicidad } from './services/publicidad.js';

// Inicializar gestor de anuncios publicitarios
Publicidad.iniciar();

// Importación de todas las escenas del juego
import BootScene from './scenes/bootscene.js';
import HomeScene from './scenes/homescene.js';
import MenuScene from './scenes/menuscene.js';
import LevelSelectScene from './scenes/levelselectscene.js'; // ← MODIFICACIÓN: Importación de la nueva escena selector de mapas
import GameScene from './scenes/gamescene.js';
import ShopScene from './scenes/shopscene.js';
import SkinScene from './scenes/skinscene.js';
import SeasonPassScene from './scenes/seasonpassscene.js';
import RankedScene from './scenes/rankedscene.js';
import ConfigScene from './scenes/configscene.js';

/**
 * El Cerebro del Proyecto:
 * Combinamos la configuración de hardware/físicas con la lista
 * ordenada de escenas que controlarán el flujo del juego.
 */
const juegoConfig = {
  ...config, // Copia todas las propiedades de src/config.js (físicas, resolución, escala)
  scene: [
    BootScene,         // 1. Carga los assets de audio y sprites ecuatorianos
    HomeScene,         // Pantalla de inicio y login
    MenuScene,         // 2. Pantalla de inicio, menú de navegación
    LevelSelectScene,  // 3. MODIFICACIÓN: Selección de Mapa (Bahía / Centro / Iñaquito)
    GameScene,         // 4. Fase 1: La Huida (Survival en el mapa seleccionado)
    ShopScene,         // 5. Fase 2: La Negociación (Pagar deuda/Mejoras)
    SeasonPassScene,    // 6. El Pase del Chulla (Progreso y monetización premium)
    SkinScene,           // 7. Tienda y seleccionador de skins dentro del juego
    RankedScene,
    ConfigScene
  ]
};

// Inicialización global del videojuego dentro del contenedor del index.html
const game = new Phaser.Game(juegoConfig);

// Exportamos la instancia por si necesitamos acceder al core desde los servicios móviles
export default game;