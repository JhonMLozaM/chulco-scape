import Phaser from 'phaser';

export default class Jugador extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, playerData) {
    // Usamos 'skin_default' como fallback inicial
    super(scene, x, y, 'skin_default');
    
    const data = playerData || {};
    this.playerData = { 
      ...data,
      moneda: data.moneda || 0,
      dinero: data.dinero || 0,
      deudaActual: data.deudaActual !== undefined ? data.deudaActual : 400,
      accesorioEquipado: data.accesorioEquipado || 'skin_default'
    };

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.body.setSize(this.width * 0.7, this.height * 0.7);
    this.body.setOffset(this.width * 0.15, this.height * 0.2);

    const nivelVelocidad = this.playerData.mejoras?.velocidad || 1;
    this.velocidadBase = 300 + (nivelVelocidad * 30);
    this.scene = scene;
  }

  moverHaciaPuntero(pointer) {
    if (!pointer.isDown) return;
    this.scene.physics.moveToObject(this, pointer, this.velocidadBase);
    this.setFlipX(pointer.x < this.x);
  }

  frenar() {
    if (this.body) this.body.reset(this.x, this.y);
  }

  update() {
    if (!this.body) return;
  }

  destroy() {
    super.destroy();
  }
}