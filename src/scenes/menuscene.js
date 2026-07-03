import Phaser from 'phaser';
import { actualizarDeuda, auth } from '../services/firebase.js';
import { getT } from '../i18n.js';

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const playerData = this.registry.get('playerData');
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const lang = this.registry.get('language') || 'es';
    const T = getT(lang);

    // Configuración de texto para botones usando traducciones globales
    const idioma = {
      jugar: T.menuJugar,
      pase: T.menuPase,
      tienda: T.menuTienda,
      skins: T.menuSkins,
      config: T.menuConfig,
      scores: T.menuScores
    };

    // 1. Fondo
    this.add.image(width / 2, height / 2, 'fondo_menu').setDisplaySize(width, height);

    // 2. Control Seguro de Música Ambiental
    const keyMusica = playerData?.musicaEquipada || 'musica_ambiente';
    
    // Detener cualquier otra pista de música que no sea la equipada
    this.sound.getAll().forEach(snd => {
      if (snd.key && snd.key.startsWith('musica_') && snd.key !== keyMusica) {
        snd.stop();
      }
    });

    let musica = this.sound.get(keyMusica);
    if (!musica) {
      musica = this.sound.add(keyMusica, { loop: true, volume: 0.5 });
      musica.play();
    } else if (!musica.isPlaying) {
      musica.play();
    }

    // ==========================================
    // 3. TARJETA DE PERFIL (superior izquierda)
    // ==========================================
    const cardW = 260; // 30% más grande en width
    const cardH = 135; // la mitad de height
    const cardX = cardW / 2 + 50;
    const cardY = cardH / 2 + 25 ;

    // Fondo de la tarjeta usando contenedor_skin
    this.add.image(cardX, cardY, 'contenedor_skin').setDisplaySize(cardW, cardH);

    // Avatar del jugador (usa la skin equipada de fallback, o la foto real de Google/FB) - LADO IZQUIERDO
    let accesorioKey = playerData?.accesorioEquipado || 'skin_default';
    if (accesorioKey === 'skin_base' || !this.textures.exists(accesorioKey)) {
      accesorioKey = 'skin_default';
    }
    const avatarImg = this.add.image(cardX - cardW / 2 + 75, cardY, accesorioKey).setDisplaySize(80, 80);

    // Carga de avatar dinámico con HTML Image (CORS & Phaser loader safe)
    const avatarUrl = playerData?.avatarUrl;
    if (avatarUrl && avatarUrl.trim() !== "") {
      const textureKey = `avatar_${playerData.uid || 'guest'}`;
      if (this.textures.exists(textureKey)) {
        avatarImg.setTexture(textureKey);
        avatarImg.setDisplaySize(80, 80);
      } else {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          if (this.textures && this.textures.exists(textureKey)) {
            this.textures.remove(textureKey);
          }
          if (this.textures && avatarImg && avatarImg.active) {
            this.textures.addImage(textureKey, img);
            avatarImg.setTexture(textureKey);
            avatarImg.setDisplaySize(80, 80);
          }
        };
        img.onerror = () => {
          console.warn("Error al cargar avatar por URL. Usando fallback.");
        };
        img.src = avatarUrl;
      }
    }

    // GRUPO DE 3 FILAS - LADO DERECHO
    const infoX = cardX - cardW / 2 + 125;

    // Fila 1: Nick del jugador
    const nickTexto = playerData?.nick || 'Jugador';
    this.add.text(infoX, cardY - 28, nickTexto, {
      fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold',
      fill: '#ffffff', stroke: '#000000', strokeThickness: 4,
      align: 'left', wordWrap: { width: cardW - 130 }
    }).setOrigin(0, 0.5);

    // Fila 2: Nivel
    const nivel = playerData?.paseNivel || 1;
    this.add.text(infoX, cardY, `Lvl. ${nivel}`, {
      fontFamily: 'Arial', fontSize: '22px', fontStyle: 'bold',
      fill: '#d5c23b', stroke: '#000000', strokeThickness: 4
    }).setOrigin(0, 0.5);

    // Fila 3: XP acumulada
    const xpActual = playerData?.paseXP || 0;
    this.add.text(infoX, cardY + 28, `${xpActual} XP`, {
      fontFamily: 'Arial', fontSize: '16px', fontStyle: 'bold',
      fill: '#ffffff', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0, 0.5);

    // Dinero y deuda: doble de tamaño de íconos (56x56) y textos más grandes (26px)
    const iconX = cardX - 60;
    const textX = cardX - 20;

    const badgeY = cardY + cardH / 2 + 45;
    this.add.image(iconX, badgeY, 'dinero').setDisplaySize(56, 56);
    this.add.text(textX, badgeY, `$${playerData?.dinero ?? 0}`, {
      fontFamily: 'Arial', fontSize: '26px', fontStyle: 'bold',
      fill: '#ffcc00', stroke: '#000000', strokeThickness: 4
    }).setOrigin(0, 0.5);

    const deudaY = badgeY + 68;
    this.add.image(iconX, deudaY, 'deuda').setDisplaySize(56, 56);
    this.add.text(textX, deudaY, `$${playerData?.deudaActual ?? 0}`, {
      fontFamily: 'Arial', fontSize: '26px', fontStyle: 'bold',
      fill: '#ff4444', stroke: '#000000', strokeThickness: 4
    }).setOrigin(0, 0.5);


    // Título Principal
    this.add.text(width / 2, height * 0.15, T.menuTitulo, {
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
          this.scene.start('ConfigScene');
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

    // ==========================================
    // 8. BOTÓN DE CERRAR SESIÓN (LADO INFERIOR IZQUIERDO)
    // ==========================================
    this.add.image(width / 13, height - 80, 'boton_signout')
      .setDisplaySize(125, 125)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', async () => {
        try {
          await auth.signOut();
          this.registry.set('playerData', null);
          this.scene.start('HomeScene');
        } catch (error) {
          console.error("Error al cerrar sesión:", error);
        }
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