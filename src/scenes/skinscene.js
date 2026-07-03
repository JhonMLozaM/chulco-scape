import Phaser from 'phaser';
import {
  obtenerCatalogoSkins,
  equiparSkinEnFirebase,
  adquirirAccesorioEstetico,
  obtenerDatosJugador,
  comprarEncebollados
} from '../services/firebase.js';
import { TiendaPago } from '../services/tiendapago.js';
import { getT } from '../i18n.js';

export default class SkinScene extends Phaser.Scene {
  constructor() {
    super('SkinScene');
    this.playerData = {
      skinsDesbloqueadas: [],
      accesorioEquipado: null,
      moneda: 0,
      dinero: 0
    };
    this.seccionActual = 'apariencias';
    this.scrollLimit = -600;
  }

  obtenerSaldo() {
    return this.playerData.moneda ?? 0;
  }

  async create() {
    const { width, height } = this.scale;

    const cachedPlayer = this.registry.get('playerData');
    const equippedPantalla = cachedPlayer?.pantallaCargaEquipada || 'pantalla_default';
    const catalogoSkins = this.registry.get('catalogoSkins') || [];
    const itemPantalla = catalogoSkins.find(item => item.id === equippedPantalla);
    const textureKey = itemPantalla ? (itemPantalla.imagen || itemPantalla.id) : 'fondo_nivel1';

    this.lang = this.registry.get('language') || 'es';
    const T = getT(this.lang);

    const loadingBg = this.add.image(width / 2, height / 2, textureKey)
        .setDisplaySize(width, height)
        .setDepth(999);
    const loadingOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4)
        .setDepth(999);
    const loadingText = this.add.text(width / 2, height / 2, T.skinsCargando, { 
        font: 'bold 44px Arial', fill: '#ffffff', stroke: '#000000', strokeThickness: 6
    }).setOrigin(0.5).setDepth(1000);

    try {
      const [catalogo, player] = await Promise.all([
        obtenerCatalogoSkins(),
        obtenerDatosJugador()
      ]);

      this.catalogoSkins = catalogo;
      this.playerData = player || {
        skinsDesbloqueadas: [],
        accesorioEquipado: null,
        moneda: 0,
        dinero: 0
      };

      this.registry.set('playerData', this.playerData);
      this.registry.set('catalogoSkins', this.catalogoSkins);

      loadingBg.destroy();
      loadingOverlay.destroy();
      loadingText.destroy();
    } catch (e) {
      console.error("Error al cargar datos:", e);
      loadingBg.destroy();
      loadingOverlay.destroy();
      loadingText.setText("Error al cargar la tienda. Intenta de nuevo.");
      return;
    }

    // Cambiar música en tiempo real si es necesario
    const keyMusica = this.playerData?.musicaEquipada || 'musica_ambiente';
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

    this.cameras.main.setBackgroundColor('#1c1a22');

    // Fondo contenedor de objetos (-5% de ancho y de alto)
    const mainBg = this.add.image(width / 2, height / 2, 'contenedor_objetos');
    mainBg.setDisplaySize(width * 0.95, height+150);
    mainBg.setDepth(0);

    // Recuperamos sección activa de la memoria de Phaser
    this.seccionActual = this.registry.get('skinSeccionActual') || 'apariencias';

    // UI Superior Estática (Altura extendida a 185 para alojar pestañas)
    const barHeight = 185;
    const uiLayer = this.add.container(0, 0).setScrollFactor(0).setDepth(10);

    // Contenedor de cabecera con color hex #0053CA, ancho al 80% y con su punto más alto en y = 0
    const headerBgW = width * 0.8;
    const headerBgH = 178; // Cubre hasta la parte inferior de las pestañas
    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x1f6ede, 1);
    headerBg.fillRoundedRect(width / 2 - headerBgW / 2, 0, headerBgW, headerBgH, { tl: 0, tr: 0, bl: 16, br: 16 });
    headerBg.strokeRoundedRect(width / 2 - headerBgW / 2, 0, headerBgW, headerBgH, { tl: 0, tr: 0, bl: 16, br: 16 });
    uiLayer.add(headerBg);

    // Título
    uiLayer.add(this.add.text(width / 2, 50, T.skinsTitulo, {
        fontFamily: 'Arial', fontSize: '42px', fontStyle: 'bold',
        fill: '#ffffff', stroke: '#000000', strokeThickness: 5
    }).setOrigin(0.5));

    // Línea de saldo: texto + número + icono en un contenedor centrado
    const estiloInfo = { fontFamily: 'Arial', fontSize: '20px', fontStyle: 'bold', fill: '#ffffff', stroke: '#000000', strokeThickness: 3 };
    const txtBase = this.add.text(0, 0, `${T.skinsInfoPago}  |  ${this.obtenerSaldo()} `, estiloInfo).setOrigin(0, 0.5);
    const iconoEnc = this.add.image(txtBase.width + 11, 0, 'encebollado').setDisplaySize(22, 22).setOrigin(0.5);
    
    // Botón "+" para compras premium
    const btnMas = this.add.text(txtBase.width + 32, 0, '➕', {
      fontFamily: 'Arial', fontSize: '22px', fontStyle: 'bold', fill: '#00ff66', stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    btnMas.on('pointerdown', () => this.abrirTiendaPremium());

    const rowW = txtBase.width + 45;
    this.txtSaldoReferencia = txtBase;
    const rowContainer = this.add.container(width / 2 - rowW / 2, 98, [txtBase, iconoEnc, btnMas]);
    uiLayer.add(rowContainer);

    // ── PESTAÑAS / TABS SUPERIORES ──────────────────────────────────────────
    const tabs = [
      { id: 'apariencias', label: T.skinsTabApariencias },
      { id: 'pantallas_carga', label: T.skinsTabPantallas },
      { id: 'musica', label: T.skinsTabMusica },
      { id: 'disparos', label: T.skinsTabDisparos }
    ];

    const tabW = 180;
    const tabH = 45;
    const tabGap = 15;
    const totalTabsW = (tabW * tabs.length) + (tabGap * (tabs.length - 1));
    const startTabX = ((width - totalTabsW) / 2 + tabW / 2);

    tabs.forEach((tab, index) => {
      const tabX = startTabX + index * (tabW + tabGap);
      const tabY = 142;

      const isSelected = this.seccionActual === tab.id;
      const bgColor = isSelected ? 0xd5c23b : 0x003d99; // Azul profundo a juego con la cabecera
      const strokeColor = isSelected ? 0xffffff : 0x4d94ff; // Borde más suave para contraste
      const fillTextColor = isSelected ? '#000000' : '#ffffff';

      const bg = this.add.graphics();
      bg.fillStyle(bgColor, 1);
      bg.lineStyle(2, strokeColor, 1);
      bg.fillRoundedRect(tabX - tabW / 2, tabY - tabH / 2, tabW, tabH, 8);
      bg.strokeRoundedRect(tabX - tabW / 2, tabY - tabH / 2, tabW, tabH, 8);
      bg.setInteractive(new Phaser.Geom.Rectangle(tabX - tabW / 2, tabY - tabH / 2, tabW, tabH), Phaser.Geom.Rectangle.Contains);

      const txt = this.add.text(tabX, tabY, tab.label, {
        fontFamily: 'Arial',
        fontSize: '18px',
        fontStyle: 'bold',
        fill: fillTextColor
      }).setOrigin(0.5);

      bg.on('pointerdown', () => {
        if (this.seccionActual !== tab.id) {
          this.seccionActual = tab.id;
          this.registry.set('skinSeccionActual', tab.id);
          this.registry.set('scrollPosSkins', 0); // reset scroll
          this.scene.restart();
        }
      });

      bg.on('pointerover', () => {
        if (!isSelected) {
          bg.clear();
          bg.fillStyle(0x1a75ff, 1); // Brillo azul al pasar mouse
          bg.lineStyle(2, 0x80b3ff, 1);
          bg.fillRoundedRect(tabX - tabW / 2, tabY - tabH / 2, tabW, tabH, 8);
          bg.strokeRoundedRect(tabX - tabW / 2, tabY - tabH / 2, tabW, tabH, 8);
        }
      });

      bg.on('pointerout', () => {
        if (!isSelected) {
          bg.clear();
          bg.fillStyle(bgColor, 1);
          bg.lineStyle(2, strokeColor, 1);
          bg.fillRoundedRect(tabX - tabW / 2, tabY - tabH / 2, tabW, tabH, 8);
          bg.strokeRoundedRect(tabX - tabW / 2, tabY - tabH / 2, tabW, tabH, 8);
        }
      });

      uiLayer.add([bg, txt]);
    });

    // Contenedor del Scroll de Ítems
    this.container = this.add.container(0, this.registry.get('scrollPosSkins') || 0).setDepth(5);

    // Renderizar la grilla de ítems de la pestaña actual
    this.renderGrid(width, height, barHeight);

    // Entrada de scroll con rueda del ratón
    this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
      this.container.y = Phaser.Math.Clamp(this.container.y - deltaY * 0.5, this.scrollLimit, 0);
      this.registry.set('scrollPosSkins', this.container.y);
    });

    // Botón Volver
    this.add.image(width / 15, height - 80, 'boton_volver')
      .setDisplaySize(125, 125)
      .setScrollFactor(0)
      .setDepth(11)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.registry.set('scrollPosSkins', 0);
        this.scene.start('MenuScene');
      });
  }

  renderGrid(width, height, barHeight) {
    const boxWidth = 300;
    const boxHeight = 340;
    const gapX = 50;
    const gapY = 50;
    const startY = barHeight + 165; // Inicia debajo del header
    const cols = Math.max(1, Math.floor((width - gapX) / (boxWidth + gapX)));
    const totalAnchoGrid = (cols * boxWidth) + ((cols - 1) * gapX);
    const startX = (width - totalAnchoGrid) / 2 + (boxWidth / 2);

    // Filtrar catálogo por el tipo de la pestaña seleccionada
    const itemsFiltrados = (this.catalogoSkins || []).filter(item => item.tipo === this.seccionActual);

    itemsFiltrados.forEach((item, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + (col * (boxWidth + gapX));
      const y = startY + (row * (boxHeight + gapY));
      this.crearTarjetaSkin(x, y, item, boxWidth, boxHeight);
    });

    // Calcular el límite dinámico del scroll
    const rows = Math.ceil(itemsFiltrados.length / cols);
    const totalGridHeight = startY + (rows * (boxHeight + gapY));
    const visibleHeight = height - barHeight;
    this.scrollLimit = Math.min(0, -(totalGridHeight - visibleHeight - 80));
  }

  crearTarjetaSkin(x, y, skinData, w, h) {
    const T = getT(this.lang || 'es');
    const listaDesbloqueadas = this.playerData?.skinsDesbloqueadas || [];
    
    // Un ítem está desbloqueado si su precio es 0, o está explícitamente en la lista
    const estaDesbloqueada = skinData.precioReal === 0 || listaDesbloqueadas.includes(skinData.id);
    
    // Determinar si el ítem actual está equipado según su tipo
    let esEquipada = false;
    if (this.seccionActual === 'apariencias') {
      esEquipada = (this.playerData?.accesorioEquipado === skinData.id || 
                    (!this.playerData?.accesorioEquipado && skinData.id === 'skin_default'));
    } else if (this.seccionActual === 'pantallas_carga') {
      esEquipada = (this.playerData?.pantallaCargaEquipada === skinData.id ||
                    (!this.playerData?.pantallaCargaEquipada && skinData.id === 'pantalla_default'));
    } else if (this.seccionActual === 'musica') {
      esEquipada = (this.playerData?.musicaEquipada === skinData.id ||
                    (!this.playerData?.musicaEquipada && skinData.id === 'musica_ambiente'));
    } else if (this.seccionActual === 'disparos') {
      esEquipada = (this.playerData?.disparoEquipado === skinData.id ||
                    (!this.playerData?.disparoEquipado && skinData.id === 'disparo_bolon'));
    }

    const precio = skinData.precioReal || 0;

    const group = this.add.container(x, y);
    const fondoImg = this.add.image(0, 0, 'contenedor_skin');
    fondoImg.setDisplaySize(w, h);
    group.add(fondoImg);

    const skinIcon = this.add.image(0, -40, skinData.imagen || skinData.id);
    skinIcon.setDisplaySize(140, 140);
    group.add(skinIcon);

    const txtNombre = this.add.text(0, 50, skinData.nombre, {
      font: 'bold 24px Arial', fill: '#ffffff', align: 'center', wordWrap: { width: w - 20 }
    }).setOrigin(0.5);
    group.add(txtNombre);

    const btnY = 120;
    const tinteColor = estaDesbloqueada ? (esEquipada ? 0x88ff88 : 0xff6666) : 0xe0b3ff;
    const btnImg = this.add.image(0, btnY, 'boton_precio').setDisplaySize(w - 150, 50).setTint(tinteColor).setInteractive({ useHandCursor: true });
    group.add(btnImg);

    if (estaDesbloqueada) {
      let textoBtn = esEquipada ? T.skinsBtnEquipado : T.skinsBtnEquipar;
      const txtBtn = this.add.text(0, btnY, textoBtn, { font: 'bold 20px Arial', fill: '#111111' }).setOrigin(0.5);
      group.add(txtBtn);
    } else {
      const txtBtn = this.add.text(0, btnY, `${precio}`, { font: 'bold 20px Arial', fill: '#111111' }).setOrigin(0, 0.5);
      const iconSize = 25;
      const spacing = 8;
      const totalWidth = txtBtn.width + spacing + iconSize;
      txtBtn.x = -(totalWidth / 2);
      group.add(txtBtn);

      const iconMoneda = this.add.image(-(totalWidth / 2) + txtBtn.width + spacing + (iconSize / 2), btnY, 'encebollado').setDisplaySize(iconSize, iconSize);
      group.add(iconMoneda);
    }

    btnImg.on('pointerdown', async () => {
      if (estaDesbloqueada) {
        await equiparSkinEnFirebase(skinData.id, this.seccionActual);
        
        // Obtener datos actualizados de la nube y guardarlos en el registro
        const playerActualizado = await obtenerDatosJugador();
        if (playerActualizado) {
          this.playerData = playerActualizado;
          this.registry.set('playerData', this.playerData);
        }
        
        this.scene.restart();
      } else {
        const playerActualizado = await obtenerDatosJugador();
        if (playerActualizado) {
          this.playerData = playerActualizado;
          this.registry.set('playerData', this.playerData);
        }

        if (this.obtenerSaldo() >= precio) {
          this.mostrarConfirmacion(skinData, precio);
        } else {
          this.mostrarNotificacion(T.skinsFondosInsuficientes, '#ff0000');
        }
      }
    });

    this.container.add(group);
  }

  mostrarConfirmacion(skinData, precio) {
    const T = getT(this.lang || 'es');
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const modalBg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8).setScrollFactor(0).setDepth(100);
    const panel = this.add.container(width / 2, height / 2).setDepth(101).setScrollFactor(0);
    
    // premium contenedor_objetos background
    panel.add(this.add.image(0, 0, 'contenedor_objetos').setDisplaySize(460, 280));
    
    panel.add(this.add.text(0, -50, `${T.skinsConfirmar}${precio}?`, { 
      fontFamily: 'Arial', fontSize: '26px', fontStyle: 'bold', fill: '#ffffff', stroke: '#000000', strokeThickness: 5, align: 'center'
    }).setOrigin(0.5));

    // Confirm button using standard style
    const btnSi = this.add.image(-90, 60, 'boton_precio').setDisplaySize(140, 50).setInteractive({ useHandCursor: true });
    btnSi.setTint(0x88ff88);
    btnSi.on('pointerdown', async () => {
      modalBg.destroy();
      panel.destroy();
      this.mostrarNotificacion(T.skinsProcesando, '#333333');

      const exito = await adquirirAccesorioEstetico(skinData.id, precio);
      if (exito) {
        this.mostrarNotificacion(T.skinsPagoExitoso, '#00ff00');
        
        // Actualizar registro
        const playerActualizado = await obtenerDatosJugador();
        if (playerActualizado) {
          this.registry.set('playerData', playerActualizado);
        }
        
        this.time.delayedCall(1200, () => this.scene.restart());
      } else {
        this.mostrarNotificacion(T.skinsError, '#ff0000');
      }
    });
    panel.add(btnSi);
    panel.add(this.add.text(-90, 60, T.skinsSi, { fontFamily: 'Arial', fontSize: '20px', fontStyle: 'bold', fill: '#000000' }).setOrigin(0.5));

    // Cancel button using standard style
    const btnNo = this.add.image(90, 60, 'boton_precio').setDisplaySize(140, 50).setInteractive({ useHandCursor: true });
    btnNo.setTint(0xff6666);
    btnNo.on('pointerdown', () => {
      modalBg.destroy();
      panel.destroy();
      this.mostrarNotificacion(T.skinsPagoCancelado, '#ff6666');
    });
    panel.add(btnNo);
    panel.add(this.add.text(90, 60, T.skinsNo, { fontFamily: 'Arial', fontSize: '20px', fontStyle: 'bold', fill: '#ffffff', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5));

    // Animation entry for confirmation panel
    panel.setScale(0);
    this.tweens.add({
      targets: panel,
      scaleX: 1,
      scaleY: 1,
      duration: 250,
      ease: 'Back.easeOut'
    });
  }

  mostrarNotificacion(mensaje, colorFondo) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const container = this.add.container(width / 2, height / 2).setScrollFactor(0).setDepth(200);

    const panel = this.add.image(0, 0, 'contenedor_objetos')
      .setDisplaySize(480, 240);
    container.add(panel);

    const txt = this.add.text(0, 0, mensaje, {
      fontFamily: 'Arial', 
      fontSize: '28px', 
      fontStyle: 'bold', 
      fill: '#ffffff', 
      align: 'center', 
      stroke: '#000000', 
      strokeThickness: 5,
      wordWrap: { width: 420 }
    }).setOrigin(0.5);
    container.add(txt);

    // Animation entry
    container.setScale(0);
    this.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      duration: 250,
      ease: 'Back.easeOut'
    });

    this.time.delayedCall(2200, () => {
      if (this.sys.isActive()) {
        this.tweens.add({
          targets: container,
          scaleX: 0,
          scaleY: 0,
          duration: 200,
          ease: 'Back.easeIn',
          onComplete: () => container.destroy()
        });
      }
    });
  }

  abrirTiendaPremium() {
    const { width, height } = this.scale;
    const T = getT(this.lang);

    // 1. Fondo oscuro bloqueador
    const modalBg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8)
      .setDepth(200)
      .setInteractive();

    // 2. Contenedor del panel
    const storeContainer = this.add.container(width / 2, height / 2).setDepth(201);

    const panel = this.add.image(0, 0, 'contenedor_objetos')
      .setDisplaySize(720, 520);
    storeContainer.add(panel);

    // Título de la Tienda
    const txtTitulo = this.add.text(0, -220, "TIENDA DE ENCEBOLLADOS", {
      fontFamily: 'Arial', fontSize: '38px', fontStyle: 'bold', fill: '#ffcc00', stroke: '#000000', strokeThickness: 5
    }).setOrigin(0.5);
    storeContainer.add(txtTitulo);

    // Subtítulo
    const txtSub = this.add.text(0, -170, "Elige un paquete premium para recargar tu cuenta", {
      fontFamily: 'Arial', fontSize: '18px', fill: '#ffffff'
    }).setOrigin(0.5);
    storeContainer.add(txtSub);

    // Definición de paquetes premium
    const paquetes = [
      { id: 'pack_100', cantidad: 100, precio: 0.99, desc: 'Básico', x: -200, scale: 0.7 },
      { id: 'pack_500', cantidad: 500, precio: 3.99, desc: 'Recomendado', x: 0, scale: 1.0, popular: true },
      { id: 'pack_1000', cantidad: 1000, precio: 6.99, desc: 'Súper Ahorro', x: 200, scale: 1.3 }
    ];

    paquetes.forEach(pack => {
      // Contenedor individual de cada paquete
      const packCard = this.add.container(pack.x, 0);

      // Fondo de la tarjeta
      const cardBg = this.add.image(0, 0, 'contenedor_skin')
        .setDisplaySize(180, 240)
        .setInteractive({ useHandCursor: true });
      packCard.add(cardBg);

      // Destacar si es popular
      if (pack.popular) {
        cardBg.setTint(0xffee77);
      }

      // Nombre del paquete / cantidad
      const txtCant = this.add.text(0, -90, `${pack.cantidad}`, {
        fontFamily: 'Arial', fontSize: '32px', fontStyle: 'bold', fill: '#ffffff', stroke: '#000000', strokeThickness: 4
      }).setOrigin(0.5);
      const txtEncLabel = this.add.text(0, -60, "Encebollados", {
        fontFamily: 'Arial', fontSize: '14px', fill: '#ffffff'
      }).setOrigin(0.5);
      packCard.add([txtCant, txtEncLabel]);

      // Imagen Encebollado
      const imgEnc = this.add.image(0, -10, 'encebollado').setScale(pack.scale/7);
      packCard.add(imgEnc);

      // Etiqueta de descripción
      const txtDesc = this.add.text(0, 40, pack.desc, {
        fontFamily: 'Arial', fontSize: '12px', fontStyle: 'bold', fill: pack.popular ? '#ffcc00' : '#bbbbbb'
      }).setOrigin(0.5);
      packCard.add(txtDesc);

      // Botón comprar
      const btnBuy = this.add.image(0, 85, 'boton_precio').setDisplaySize(140, 40).setInteractive({ useHandCursor: true });
      btnBuy.setTint(0x00ff66);
      
      const txtPrice = this.add.text(0, 85, `$${pack.precio}`, {
        fontFamily: 'Arial', fontSize: '16px', fontStyle: 'bold', fill: '#000000'
      }).setOrigin(0.5);
      packCard.add([btnBuy, txtPrice]);

      // Al dar click en la tarjeta o el botón, abrir pasarela
      cardBg.on('pointerdown', () => this.abrirCheckoutPasarela(pack, modalBg, storeContainer));
      btnBuy.on('pointerdown', () => this.abrirCheckoutPasarela(pack, modalBg, storeContainer));

      storeContainer.add(packCard);
    });

    // Botón Volver
    const btnVolver = this.add.image(0, 210, 'boton_volver').setDisplaySize(160, 45).setInteractive({ useHandCursor: true });
    btnVolver.on('pointerdown', () => {
      modalBg.destroy();
      storeContainer.destroy();
    });
    storeContainer.add(btnVolver);

    // Animación de entrada
    storeContainer.setScale(0);
    this.tweens.add({
      targets: storeContainer,
      scaleX: 1,
      scaleY: 1,
      duration: 250,
      ease: 'Back.easeOut'
    });
  }

  abrirCheckoutPasarela(pack, parentModalBg, parentContainer) {
    // Crear un overlay HTML flotante por encima del juego para renderizar los métodos de pago
    const checkoutDivId = 'checkout-payment-overlay';
    let overlay = document.getElementById(checkoutDivId);
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.id = checkoutDivId;
    overlay.style.position = 'fixed';
    overlay.style.top = '50%';
    overlay.style.left = '50%';
    overlay.style.transform = 'translate(-50%, -50%)';
    overlay.style.width = '340px';
    overlay.style.zIndex = '10000';
    overlay.style.background = '#15161c';
    overlay.style.border = '3px solid #ffcc00';
    overlay.style.borderRadius = '12px';
    overlay.style.boxShadow = '0 10px 25px rgba(0,0,0,0.8)';
    overlay.style.padding = '25px';
    overlay.style.color = '#ffffff';
    overlay.style.fontFamily = 'Arial, sans-serif';
    overlay.style.textAlign = 'center';

    overlay.innerHTML = `
      <div style="font-size: 20px; font-weight: bold; margin-bottom: 10px; color: #ffcc00;">PAGO SEGURO</div>
      <div style="font-size: 14px; margin-bottom: 20px; color: #ccc;">
        Cargando compra de <strong>${pack.cantidad} Encebollados</strong> por <strong>$${pack.precio}</strong>
      </div>
      
      <!-- Contenedor del Botón de Google Pay -->
      <button id="gpay-btn-checkout" style="
        width: 100%;
        background: #000000;
        color: #ffffff;
        border: 1px solid #444;
        border-radius: 6px;
        padding: 12px;
        font-weight: bold;
        font-size: 15px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        margin-bottom: 12px;
        transition: background 0.2s;
      ">
        <span style="font-family: 'Product Sans', Arial, sans-serif; font-size: 16px; font-weight: 500;">Pagar con Google Pay</span>
      </button>

      <!-- Div de Botón de PayPal Smart -->
      <div id="paypal-smart-container" style="min-height: 50px; margin-bottom: 20px;"></div>

      <button id="checkout-cancel-btn" style="
        width: 100%;
        background: #333;
        color: #fff;
        border: none;
        border-radius: 6px;
        padding: 10px;
        font-weight: bold;
        cursor: pointer;
        font-size: 13px;
      ">
        CANCELAR
      </button>
    `;

    document.body.appendChild(overlay);

    const cerrarCheckout = () => {
      if (overlay) overlay.remove();
    };

    // Callback de éxito cuando se completa el pago
    const procesarExito = async (detalles) => {
      cerrarCheckout();
      parentModalBg.destroy();
      parentContainer.destroy();

      // Mostrar cargando
      const loading = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, "Procesando recarga...", {
        font: "bold 28px Arial", fill: "#ffcc00"
      }).setOrigin(0.5).setDepth(300);

      try {
        // Guardar saldo comprado en Firestore
        const result = await comprarEncebollados(pack.cantidad);
        
        // Actualizar datos locales
        this.playerData = result;
        this.registry.set('playerData', this.playerData);

        // Actualizar saldo del header
        const T = getT(this.lang);
        if (this.txtSaldoReferencia) {
          this.txtSaldoReferencia.setText(`${T.skinsInfoPago}  |  ${this.obtenerSaldo()} `);
        }

        loading.destroy();
        this.mostrarNotificacion(`🎉 ¡Felicidades! Se agregaron ${pack.cantidad} encebollados a tu saldo.`, "#00ff66");
      } catch (err) {
        console.error("Error al actualizar saldo en base de datos:", err);
        loading.destroy();
        this.mostrarNotificacion("❌ Error de acreditación. Contacta a soporte.", "#ff3333");
      }
    };

    // Registrar cancelador
    document.getElementById('checkout-cancel-btn').addEventListener('click', () => {
      cerrarCheckout();
      this.mostrarNotificacion(T.skinsPagoCancelado || "Operación cancelada", "#ff6666");
    });

    // Registrar Google Pay Action
    document.getElementById('gpay-btn-checkout').addEventListener('click', () => {
      TiendaPago.procesarGooglePay(pack.precio, procesarExito);
    });

    // Cargar y renderizar el Smart Button de PayPal
    TiendaPago.cargarYRenderizarPayPal('paypal-smart-container', pack.precio, procesarExito);
  }
}