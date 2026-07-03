import Phaser from 'phaser';

export default class Jugador extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, playerData) {
    const data = playerData || {};
    const equipped = data.accesorioEquipado || 'skin_default';
    const isBase = equipped === 'skin_default' || equipped === 'skin_base';

    let texture = 'skin_default';
    let frame = undefined;

    if (isBase) {
      texture = 'vagabundo';
      frame = 'frame_000';
    } else {
      texture = scene.textures.exists(equipped) ? equipped : 'skin_default';
    }

    super(scene, x, y, texture, frame);
    
    this.playerData = { 
      ...data,
      moneda: data.moneda || 0,
      dinero: data.dinero || 0,
      deudaActual: data.deudaActual !== undefined ? data.deudaActual : 400,
      accesorioEquipado: equipped
    };

    this.isBase = isBase;
    this.isDying = false;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);

    if (isBase) {
      // 1. Crear animaciones si no existen
      if (!scene.anims.exists('vagabundo_idle')) {
        scene.anims.create({
          key: 'vagabundo_idle',
          frames: scene.anims.generateFrameNames('vagabundo', {
            prefix: 'frame_',
            start: 0,
            end: 7,
            zeroPad: 3
          }),
          frameRate: 10,
          repeat: -1
        });
      }

      if (!scene.anims.exists('vagabundo_correr')) {
        scene.anims.create({
          key: 'vagabundo_correr',
          frames: scene.anims.generateFrameNames('vagabundo', {
            prefix: 'frame_',
            start: 8,
            end: 15,
            zeroPad: 3
          }),
          frameRate: 12,
          repeat: -1
        });
      }

      if (!scene.anims.exists('vagabundo_correr_disparar')) {
        scene.anims.create({
          key: 'vagabundo_correr_disparar',
          frames: scene.anims.generateFrameNames('vagabundo', {
            prefix: 'frame_',
            start: 16,
            end: 23,
            zeroPad: 3
          }),
          frameRate: 12,
          repeat: -1
        });
      }

      if (!scene.anims.exists('vagabundo_morir')) {
        scene.anims.create({
          key: 'vagabundo_morir',
          frames: scene.anims.generateFrameNames('vagabundo', {
            prefix: 'frame_',
            start: 24,
            end: 31,
            zeroPad: 3
          }),
          frameRate: 8,
          repeat: 0
        });
      }

      this.play('vagabundo_idle');
      
      // Hacer al personaje más grueso (el doble de ancho que antes: 50 -> 100)
      this.setDisplaySize(100, 130);
      
      // Importar dinámicamente el tamaño del frame más pequeño del spritesheet para la colisión
      const textureObj = scene.textures.get('vagabundo');
      let minW = Infinity;
      let minH = Infinity;
      if (textureObj) {
        textureObj.getFrameNames().forEach(name => {
          const f = textureObj.get(name);
          if (f && f.width > 0 && f.width < minW) {
            minW = f.width;
            minH = f.height;
          }
        });
      }
      
      // Si por alguna razón no se encuentran frames válidos, usar un fallback seguro
      if (minW === Infinity) {
        minW = 404;
        minH = 928;
      }

      // Configurar el cuerpo físico con el tamaño del frame más pequeño
      this.body.setSize(minW, minH);
      
      // Alinear el hitbox exactamente al centro del frame de 920x944
      this.body.setOffset((920 - minW) / 2, (944 - minH) / 2);
    } else {
      this.setDisplaySize(95, 95);
      this.body.setSize(this.width * 0.7, this.height * 0.7);
      this.body.setOffset(this.width * 0.15, this.height * 0.2);
    }

    // Color de depuración de la colisión en azul
    this.body.debugBodyColor = 0x0000ff;

    const nivelVelocidad = this.playerData.mejoras?.velocidad || 1;
    this.velocidadBase = 300 + (nivelVelocidad * 30);
    this.scene = scene;
  }

  moverHaciaPuntero(pointer) {
    if (this.isDying) return;
    if (!pointer.isDown) return;
    this.scene.physics.moveToObject(this, pointer, this.velocidadBase);
  }

  frenar() {
    if (this.body) this.body.reset(this.x, this.y);
  }

  update() {
    if (!this.body) return;

    if (this.isBase) {
      // Usar las dimensiones del frame más pequeño
      const minW = 404;
      const minH = 928;

      if (this.isDying) {
        // Al morir, centrar la colisión en la parte inferior (bottom)
        this.body.setSize(minW, minH);
        this.body.setOffset((920 - minW) / 2, 944 - minH);
        return;
      }

      const velocityX = this.body.velocity.x;
      const velocityY = this.body.velocity.y;
      const isMoving = Math.abs(velocityX) > 10 || Math.abs(velocityY) > 10;
      
      // Determinar si está disparando (último disparo en menos de 300ms)
      const isShooting = (this.scene.time.now - this.scene.ultimoDisparo) < 300;

      // Voltear textura a la izquierda/derecha según la dirección del movimiento
      if (velocityX < -10) {
        this.setFlipX(true);
      } else if (velocityX > 10) {
        this.setFlipX(false);
      }

      // Asegurar tamaño físico constante
      this.body.setSize(minW, minH);

      // Centrar el cuadro de colisión con respecto al frame visual
      const originalWidth = 920;
      const characterWidth = 440; // El ancho real ocupado por el personaje en el lienzo
      
      if (this.flipX) {
        // Si está volteado (mira a la izquierda), el sprite visual está a la derecha del lienzo de 920
        const posXFlipped = originalWidth - characterWidth;
        this.body.setOffset(posXFlipped + (characterWidth - minW) / 2, (944 - minH) / 2);
      } else {
        // Si no está volteado (mira a la derecha), el sprite visual está a la izquierda (x = 0)
        this.body.setOffset((characterWidth - minW) / 2, (944 - minH) / 2);
      }

      if (isMoving) {
        if (isShooting) {
          if (this.anims.currentAnim?.key !== 'vagabundo_correr_disparar') {
            this.play('vagabundo_correr_disparar');
          }
        } else {
          if (this.anims.currentAnim?.key !== 'vagabundo_correr') {
            this.play('vagabundo_correr');
          }
        }
      } else {
        if (this.anims.currentAnim?.key !== 'vagabundo_idle') {
          this.play('vagabundo_idle');
        }
      }
    }
  }

  destroy() {
    super.destroy();
  }
}