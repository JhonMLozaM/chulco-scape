import Phaser from 'phaser';

/**
 * CLASE CHULQUERO (EL COBRADOR EN MOTO)
 * Encapsula la Inteligencia Artificial de persecución, escalado de dificultad y ciclo de daño.
 */
export default class Chulquero extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene - La escena activa de Phaser (GameScene)
   * @param {number} x - Posición inicial en X
   * @param {number} y - Posición inicial en Y
   * @param {number} tiempoRestante - Tiempo actual de la ronda para calcular la dificultad
   */
  constructor(scene, x, y, tiempoRestante) {
    // Inicializamos el Sprite nativo con la textura de la moto cargada en BootScene
    super(scene, x, y, 'chulquero_moto');

    // Añadimos la entidad a la escena y al motor físico Arcade
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // --- CONFIGURACIÓN FÍSICA Y DE HITBOX ---
    this.setCollideWorldBounds(true);
    
    // Ajustamos el tamaño del Hitbox para que se adapte perfectamente al cuerpo de la moto,
    // evitando colisiones fantasma en las ruedas o los bordes traseros del sprite.
    this.body.setSize(this.width * 0.8, this.height * 0.7);
    this.body.setOffset(this.width * 0.1, this.height * 0.15);
    
    // Color de depuración de la colisión en amarillo
    this.body.debugBodyColor = 0xffff00;

    // --- DIFICULTAD ESCALABLE (Mecánica Progresiva) ---
    // Calculamos cuánto tiempo ha transcurrido en la ronda (la ronda dura 180 segundos)
    const tiempoTranscurrido = 180 - tiempoRestante;

    // A medida que pasa el tiempo, los nuevos Chulqueros que aparecen son más rápidos y resistentes
    this.velocidadBase = 180 + (tiempoTranscurrido * 0.5); 
    this.vidaMax = 1 + Math.floor(tiempoTranscurrido / 60); // Aumenta 1 punto de vida cada minuto
    this.vidaActual = this.vidaMax;

    // Guardamos la referencia de la escena para interactuar con el jugador
    this.scene = scene;

    // Pequeño feedback visual de entrada: un ligero destello rojo al spawnear
    this.setTint(0xffcccc);
    this.scene.time.addEvent({
      delay: 200,
      callback: () => { this.clearTint(); }
    });
  }

  /**
   * INTELIGENCIA ARTIFICIAL (IA):
   * Calcula de forma matemática el vector de dirección para perseguir activamente la posición del comerciante.
   * Debe ser invocado dentro del bucle update() de la escena.
   * @param {Phaser.GameObjects.Sprite} jugador - Instancia del jugador a perseguir
   */
  perseguirJugador(jugador) {
    // Si el Chulquero o el jugador ya no tienen cuerpo rígido activo (por ejemplo, al morir), salimos
    if (!this.body || !jugador || !jugador.body) return;

    // Phaser calcula internamente los componentes de velocidad X e Y para ir directo al objetivo
    this.scene.physics.moveToObject(this, jugador, this.velocidadBase);

    // EFECTO ESPEJO (FlipX): Voltea el sprite dependiendo de si avanza a la izquierda o derecha
    if (this.body.velocity.x < 0) {
      this.setFlipX(true); // Mirando a la izquierda
    } else if (this.body.velocity.x > 0) {
      this.setFlipX(false); // Mirando a la derecha
    }
  }

  /**
   * Aplica daño al chulquero cuando es impactado por un proyectil (bolón o humita).
   * @param {number} cantidadDanio - Puntos de daño del proyectil (basado en mejoras de la tienda)
   * @returns {boolean} Retorna true si el enemigo murió debido al golpe, false si sobrevive.
   */
  recibirDanio(cantidadDanio) {
    if (!this.body) return false;

    this.vidaActual -= cantidadDanio;

    // Feedback visual inmediato: se pinta momentáneamente de rojo brillante por el impacto
    this.setTint(0xff0000);
    this.scene.time.addEvent({
      delay: 150,
      callback: () => { if (this.body) this.clearTint(); }
    });

    // Si se queda sin vida, es destruido completamente
    if (this.vidaActual <= 0) {
      this.destroy();
      return true; // Confirmamos el deceso para que la escena otorgue XP
    } else {
      // Si sobrevive, sufre un pequeño empujón hacia atrás (Knockback) en el eje vertical
      this.y -= 35;
      return false;
    }
  }
}