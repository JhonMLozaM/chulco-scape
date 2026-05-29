import Phaser from 'phaser';

export default class ControlesMobile {
  constructor(scene) {
    this.scene = scene;
    this.vistaAncho = scene.cameras.main.width;
    this.vistaAlto = scene.cameras.main.height;

    this.joystickX = 150;
    this.joystickY = this.vistaAlto - 150;
    this.joystickRadioBase = 80;
    this.joystickActivo = false;
    this.pointerJoystickId = null;

    this.init();
  }

  init() {
    // Joystick Base
    this.joystickBase = this.scene.add.circle(this.joystickX, this.joystickY, this.joystickRadioBase, 0xffffff, 0.2)
      .setScrollFactor(0).setDepth(150);

    // Joystick Palanca
    this.joystickPalanca = this.scene.add.circle(this.joystickX, this.joystickY, 35, 0x0095ff, 0.7)
      .setScrollFactor(0).setDepth(151);

    // Botón de Disparo
    this.botonDisparoX = this.vistaAncho - 150;
    this.botonDisparoY = this.vistaAlto - 150;
    this.botonDisparoRadio = 55;

    this.botonDisparoBase = this.scene.add.circle(this.botonDisparoX, this.botonDisparoY, this.botonDisparoRadio, 0xff3333, 0.5)
      .setScrollFactor(0).setDepth(150);

    this.textoBotonDisparo = this.scene.add.text(this.botonDisparoX, this.botonDisparoY, '🔥', { font: 'bold 40px Arial', fill: '#ffffff' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(151);

    // Eventos de entrada táctil
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
    this.scene.input.on('pointermove', this.handlePointerMove, this);
    this.scene.input.on('pointerup', this.handlePointerUp, this);
  }

  handlePointerDown(pointer) {
    if (this.scene.enPeriodoTradeo) return;

    const distBoton = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.botonDisparoX, this.botonDisparoY);
    if (distBoton <= this.botonDisparoRadio) {
      this.scene.dispararEnMovil();
      return;
    }

    if (!this.joystickActivo && pointer.x < this.vistaAncho / 2) {
      this.joystickActivo = true;
      this.pointerJoystickId = pointer.id;
      this.actualizarPosicionJoystick(pointer);
    }
  }

  handlePointerMove(pointer) {
    if (this.joystickActivo && pointer.id === this.pointerJoystickId && !this.scene.enPeriodoTradeo) {
      this.actualizarPosicionJoystick(pointer);
    }
  }

  handlePointerUp(pointer) {
    if (this.joystickActivo && pointer.id === this.pointerJoystickId) {
      this.joystickActivo = false;
      this.pointerJoystickId = null;
      this.joystickPalanca.setPosition(this.joystickX, this.joystickY);
      if (this.scene.jugador) this.scene.jugador.frenar();
    }
  }

  actualizarPosicionJoystick(pointer) {
    const distancia = Phaser.Math.Distance.Between(this.joystickX, this.joystickY, pointer.x, pointer.y);
    const angulo = Phaser.Math.Angle.Between(this.joystickX, this.joystickY, pointer.x, pointer.y);

    if (distancia <= this.joystickRadioBase) {
      this.joystickPalanca.setPosition(pointer.x, pointer.y);
    } else {
      const limiteX = this.joystickX + Math.cos(angulo) * this.joystickRadioBase;
      const limiteY = this.joystickY + Math.sin(angulo) * this.joystickRadioBase;
      this.joystickPalanca.setPosition(limiteX, limiteY);
    }

    const factorIntensidad = Math.min(distancia / this.joystickRadioBase, 1);
    const destinoSimuladoX = this.scene.jugador.x + Math.cos(angulo) * 200 * factorIntensidad;
    const destinoSimuladoY = this.scene.jugador.y + Math.sin(angulo) * 200 * factorIntensidad;

    this.scene.jugador.moverHaciaPuntero({ x: destinoSimuladoX, y: destinoSimuladoY, isDown: true });
  }

  destroy() {
    // Método de limpieza para evitar fugas de eventos al cambiar de escena
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.scene.input.off('pointermove', this.handlePointerMove, this);
    this.scene.input.off('pointerup', this.handlePointerUp, this);
  }
}