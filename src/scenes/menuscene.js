import Phaser from 'phaser';
import { actualizarDeuda } from '../services/firebase.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const playerData = this.registry.get('playerData');
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Configuración de texto para botones e idiomas
    const idioma = {
      jugar: '¡JUGAR!',
      pase: 'PASE DE\nBATALLA',
      tienda: 'MEJORAR\nPERSONAJE',
      skins: '🎭 SKINS\nPREMIUM',
      config: '⚙️ AJUSTES',
      scores: '🏆 TOP ALTOS\nPUNTAJES'
    };

    // 1. Fondo
    this.add.image(width / 2, height / 2, 'fondo_menu').setDisplaySize(width, height);

    // 2. Control Seguro de Música Ambiental
    let musica = this.sound.get('musica_ambiente');
    if (!musica) {
      musica = this.sound.add('musica_ambiente', { loop: true, volume: 0.5 });
      musica.play();
    }

    // ==========================================
    // 3. HUD IZQUIERDO (Estadísticas optimizadas con imágenes)
    // ==========================================
    const hudX = 80;
    const sfxSize = 40; // Tamaño en px para los iconos del HUD

    // --- SECCIÓN: DINERO ACTUAL ---
    this.add.text(hudX, 40, 'Dinero actual:', {
      font: 'bold 20px Arial', fill: '#ffffff', stroke: '#000000', strokeThickness: 3
    });
    // Icono de la bolsa de dinero cargada desde BootScene como 'dinero'
    this.add.image(hudX + 20, 85, 'dinero').setDisplaySize(sfxSize, sfxSize);
    // Texto del valor
    this.crearTextoHUD(hudX + 55, 70, `$${playerData ? playerData.dinero : 0}`, '#ffcc00');


    // --- SECCIÓN: DEUDA A PAGAR ---
    this.add.text(hudX, 130, 'Deuda a pagar:', {
      font: 'bold 20px Arial', fill: '#ffffff', stroke: '#000000', strokeThickness: 3
    });
    // Icono de la alarma roja cargada desde BootScene como 'deuda'
    this.add.image(hudX + 20, 175, 'deuda').setDisplaySize(sfxSize, sfxSize);
    // Texto del valor
    this.crearTextoHUD(hudX + 55, 160, `$${playerData ? playerData.deudaActual : 0}`, '#ff3333');


    // Título Principal
    this.add.text(width / 2, height * 0.15, '¡CHULKO-SKAPE!', {
      font: 'bold 64px Arial', fill: '#ffffff', align: 'center', stroke: '#000000', strokeThickness: 8
    }).setOrigin(0.5);


    // ==========================================
    // 4. BLOQUE CENTRAL (BOTONES CLÁSICOS)
    // ==========================================
    const btnWidth = 400;
    const btnHeight = 150; 
    const startY = height * 0.35;
    const gap = 175;

    this.crearBotonImagen(width / 2, startY, 'boton_jugar', idioma.jugar, btnWidth, btnHeight, 0)
      .on('pointerdown', () => this.scene.start('LevelSelectScene'));

    this.crearBotonImagen(width / 2, startY + gap, 'boton_pasebatalla', idioma.pase, btnWidth, btnHeight, 0)
      .on('pointerdown', () => this.scene.start('SeasonPassScene'));

    this.crearBotonImagen(width / 2, startY + (gap * 2), 'boton_mejoras', idioma.tienda, btnWidth, btnHeight, 0)
      .on('pointerdown', () => this.scene.start('ShopScene'));


    // ==========================================
    // 5. NUEVOS BOTONES LATERALES (LADO DERECHO)
    // ==========================================
    const sideBtnWidth = 100;
    const sideBtnHeight = 100;
    const rightX = width - 100;

    // --- Botón de Skins Premium ---
    this.crearBotonImagen(rightX, startY - 175, 'boton_skin', '', sideBtnWidth, sideBtnHeight, 0)
      .on('pointerdown', () => this.scene.start('SkinScene'));

    // --- Botón de Control de Música On/Off ---
    const texturaInicialMusica = this.sound.mute ? 'boton_nosonido' : 'boton_sonido';
    const btnMusicaContainer = this.crearBotonImagen(rightX, startY + gap + 100, texturaInicialMusica, '', sideBtnWidth, sideBtnHeight, 0);
    
    btnMusicaContainer.on('pointerdown', () => {
        this.sound.mute = !this.sound.mute;
        const nuevaTextura = this.sound.mute ? 'boton_sonido' : 'boton_nosonido';
        btnMusicaContainer.setTexture(nuevaTextura);
        btnMusicaContainer.setDisplaySize(sideBtnWidth, sideBtnHeight);
    });

    // --- Botón de Configuración ---
    this.crearBotonImagen(rightX, startY + (gap * 2) + 50, 'boton_config', '', sideBtnWidth, sideBtnHeight, 0)
      .on('pointerdown', () => {
          console.log("Abriendo panel de configuración...");
      });


    // ==========================================
    // 6. BOTÓN SUPERIOR DERECHO (LEADERBOARD / RANKING)
    // ==========================================
    const btnScore = this.crearBotonImagen(width - 250, 75, 'boton_ranked', '', 100, 100, 0);
    btnScore.setTint(0xffcc00); 
    btnScore.on('pointerdown', () => this.scene.start('RankedScene'));


    // ==========================================
    // 7. TEMPORIZADOR DE INTERESES (FIREBASE)
    // ==========================================
    this.time.addEvent({
        delay: 120000, 
        callback: async () => {
            try {
                await actualizarDeuda(10); 
                console.log("El Chulquero ha sumado intereses...");
            } catch (error) {
                console.error("Error al actualizar deuda:", error);
            }
        },
        loop: true
    });

    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  crearTextoHUD(x, y, text, color) {
    return this.add.text(x, y, text, {
      font: 'bold 36px Arial', fill: color, stroke: '#000000', strokeThickness: 4
    });
  }

  crearBotonImagen(x, y, texture, texto, w, h, offsetText) {
    const container = this.add.container(x, y);

    const boton = this.add.image(0, 0, texture)
      .setDisplaySize(w, h)
      .setInteractive({ useHandCursor: true });

    const textoBtn = this.add.text(offsetText, 0, texto, {
      font: 'bold 24px Arial', 
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 5,
      align: 'center'
    }).setOrigin(0.5);

    textoBtn.setWordWrapWidth(w - 30); 
    container.add([boton, textoBtn]);

    boton.on('pointerover', () => boton.setTint(0xcccccc));
    boton.on('pointerout', () => boton.clearTint());

    boton.parentContainer = container;

    return boton;
  }
}