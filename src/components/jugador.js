import Phaser from 'phaser';

/**
 * CLASE JUGADOR (EL COMERCIANTE DE LA BAHÍA)
 * * Centraliza las físicas, el movimiento táctil y los cosméticos del personaje.
 */
export default class Jugador extends Phaser.Physics.Arcade.Sprite {
  /**
   * @param {Phaser.Scene} scene - La escena activa de Phaser (GameScene)
   * @param {number} x - Posición inicial en X
   * @param {number} y - Posición inicial en Y
   * @param {Object} playerData - Datos globales del jugador desde Firebase/Registry
   */
  constructor(scene, x, y, playerData) {
    // Inicializamos el Sprite base de Phaser con la textura base del comerciante
    super(scene, x, y, 'vendedor');

    // Añadimos físicamente este objeto a la escena y a su motor de físicas Arcade
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // --- CONFIGURACIÓN DE FÍSICAS NATIVAS ---
    this.setCollideWorldBounds(true); // Evita que el comerciante se salga del lienzo móvil
    
    // Ajustamos la caja de colisión (Hitbox) para que sea un poco más pequeña que el sprite.
    // Esto hace que el juego se sienta más "justo" y responsivo al esquivar las motos.
    this.body.setSize(this.width * 0.7, this.height * 0.7);
    this.body.setOffset(this.width * 0.15, this.height * 0.2);

    // --- MEJORAS Y ESTADÍSTICAS ---
    const nivelVelocidad = playerData.mejoras?.velocidad || 1;
    // La velocidad base aumenta dinámicamente según el nivel comprado en la tienda
    this.velocidadBase = 300 + (nivelVelocidad * 30);

    // --- GESTIÓN DE SKINS/ACCESORIOS COSMÉTICOS ---
    this.skinEquipada = playerData.accesorioEquipado || 'sombrero_paja_toquilla_base';
    
    // Creamos una imagen flotante que represente visualmente el accesorio (sombrero o máscara)
    this.accesorioVisual = scene.add.image(this.x, this.y - 45, this.skinEquipada);
    // Aseguramos que la skin siempre se renderice por encima del comerciante (Profundidad de capas)
    this.accesorioVisual.setDepth(this.depth + 1);

    // Guardamos la referencia de la escena para usarla en los métodos de actualización
    this.scene = scene;
  }

  /**
   * Controla el desplazamiento suave del personaje hacia las coordenadas de un toque táctil.
   * @param {Phaser.Input.Pointer} pointer - El puntero o dedo activo en la pantalla táctil
   */
  moverHaciaPuntero(pointer) {
    // Si el dedo está levantado o no está activo, no hacemos nada
    if (!pointer.isDown) return;

    // Phaser calcula vectorialmente el ángulo y mueve el cuerpo rígido de forma fluida
    this.scene.physics.moveToObject(this, pointer, this.velocidadBase);

    // VOLTEAR TEXTURA (FlipX): Cambia la orientación del sprite según la dirección en X
    // Si la posición del dedo está a la izquierda del comerciante, lo voltea
    if (pointer.x < this.x) {
      this.setFlipX(true);
    } else if (pointer.x > this.x) {
      this.setFlipX(false);
    }
  }

  /**
   * Frena por completo el vector de movimiento del comerciante cuando se quita el dedo.
   */
  frenar() {
    if (this.body) {
      this.body.reset(this.x, this.y);
    }
  }

  /**
   * Método de ciclo de vida indispensable. Debe ejecutarse en el update() de GameScene.
   * Sincroniza la posición de los cosméticos con las físicas del cuerpo.
   */
  update() {
    // Si el cuerpo rígido fue destruido (Fin de partida), detenemos el seguimiento
    if (!this.body) return;

    // Hace que el sombrero o máscara siga milimétricamente la cabeza del comerciante
    this.accesorioVisual.x = this.x;
    this.accesorioVisual.y = this.y - 45;

    // El accesorio copia también el efecto espejo horizontal del personaje
    this.accesorioVisual.flipX = this.flipX;
  }

  /**
   * Limpieza de memoria (Memory Management). Previene fugas de rendimiento en el móvil.
   */
  destroy() {
    // Al eliminar al jugador de la partida, borramos también el gráfico del sombrero de la RAM
    if (this.accesorioVisual) {
      this.accesorioVisual.destroy();
    }
    super.destroy();
  }
}