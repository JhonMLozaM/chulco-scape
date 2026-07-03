import Phaser from 'phaser';
import { obtenerDatosJugador, actualizarPerfil } from '../services/firebase.js';
import { getT } from '../i18n.js';
import { Keyboard } from '@capacitor/keyboard';

// ── Estilos reutilizables ──────────────────────────────────────────────────────
const S = {
  titulo: { fontFamily: 'Arial', fontSize: '48px', fontStyle: 'bold', fill: '#ffffff', stroke: '#000000', strokeThickness: 6 },
  etiqueta: { fontFamily: 'Arial', fontSize: '22px', fontStyle: 'bold', fill: '#000000' },
  valor: { fontFamily: 'Arial', fontSize: '20px', fontStyle: 'bold', fill: '#ffffff', stroke: '#000000', strokeThickness: 3 },
  input: { fontFamily: 'Arial', fontSize: '20px', fill: '#000000' },
  notif: { fontFamily: 'Arial', fontSize: '26px', fontStyle: 'bold', fill: '#ffffff', stroke: '#000000', strokeThickness: 4 }
};

const TEXTOS = {
  es: {
    titulo: 'CONFIGURACIÓN',
    tabConfig: 'AJUSTES',
    tabPerfil: 'MI PERFIL',
    idioma: 'Idioma',
    musica: 'Sonido / Música',
    controles: 'Controles',
    calidad: 'Gráficos',
    encendido: 'ACTIVADO',
    apagado: 'DESACTIVADO',
    teclado: 'TECLADO',
    tactil: 'TÁCTIL',
    alto: 'ALTA CALIDAD',
    bajo: 'RENDIMIENTO',
    // Perfil
    nick: 'Nick / Apodo',
    nombre: 'Nombre completo',
    correo: 'Correo electrónico',
    telefono: 'Teléfono',
    fechaNacimiento: 'Fecha de nacimiento',
    guardar: '✅  GUARDAR',
    editar: '✏️  EDITAR',
    exito: '✅ ¡Perfil actualizado!',
    error: '❌ Error al guardar',
    sinDatos: 'Sin datos',
    uid: 'ID de usuario (solo lectura)',
    nivel: 'Nivel de juego',
    xp: 'XP acumulada',
    volver: '← VOLVER',
    aceptar: 'ACEPTAR',
    cancelar: 'CANCELAR',
    valorActual: 'Valor actual:',
    vacio: 'vacío',
    modalInstruccion: '✏️ Escribe el nuevo valor y presiona ENTER o usa los botones'
  },
  en: {
    titulo: 'SETTINGS',
    tabConfig: 'SETTINGS',
    tabPerfil: 'MY PROFILE',
    idioma: 'Language',
    musica: 'Sound / Music',
    controles: 'Controls',
    calidad: 'Graphics',
    encendido: 'ENABLED',
    apagado: 'DISABLED',
    teclado: 'KEYBOARD',
    tactil: 'TOUCH',
    alto: 'HIGH QUALITY',
    bajo: 'PERFORMANCE',
    nick: 'Nickname',
    nombre: 'Full name',
    correo: 'Email',
    telefono: 'Phone',
    fechaNacimiento: 'Date of birth',
    guardar: '✅  SAVE',
    editar: '✏️  EDIT',
    exito: '✅ Profile updated!',
    error: '❌ Save error',
    sinDatos: 'No data',
    uid: 'User ID (read-only)',
    nivel: 'Game level',
    xp: 'Accumulated XP',
    volver: '← BACK',
    aceptar: 'ACCEPT',
    cancelar: 'CANCEL',
    valorActual: 'Current value:',
    vacio: 'empty',
    modalInstruccion: '✏️ Enter the new value and press ENTER or use the buttons'
  }
};

export default class ConfigScene extends Phaser.Scene {
  constructor() {
    super('ConfigScene');
    this.lang = 'es';
    this.tabActual = 'config';
    this.playerData = null;
    this.camposEditados = {};
    this.modoEdicion = false;
  }

  async create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    Keyboard.setResizeMode({ mode: 'none' });
    this.lang = this.registry.get('language') || 'es';
    this.tabActual = this.registry.get('configTab') || 'config';

    // Merge global i18n into local T object for backward compatibility
    const globalT = getT(this.lang);
    const T = {
      titulo: globalT.configTitulo,
      tabConfig: globalT.configTabConfig,
      tabPerfil: globalT.configTabPerfil,
      idioma: globalT.configIdioma,
      controles: globalT.configControles,
      calidad: globalT.configCalidad,
      encendido: globalT.configEncendido,
      apagado: globalT.configApagado,
      teclado: globalT.configTeclado,
      tactil: globalT.configTactil,
      alto: globalT.configAlto,
      bajo: globalT.configBajo,
      nick: globalT.configNick,
      nombre: globalT.configNombre,
      correo: globalT.configCorreo,
      telefono: globalT.configTelefono,
      fechaNacimiento: globalT.configFechaNacimiento,
      guardar: globalT.configGuardar,
      editar: globalT.configEditar,
      exito: globalT.configExito,
      error: globalT.configError,
      sinDatos: globalT.configSinDatos,
      uid: globalT.configUid,
      nivel: globalT.configNivel,
      xp: globalT.configXp,
      volver: globalT.configVolver,
      aceptar: globalT.configAceptar,
      cancelar: globalT.configCancelar,
      valorActual: globalT.configValorActual,
      vacio: globalT.configVacio,
      modalInstruccion: globalT.configModalInstruccion
    };

    this.cameras.main.setBackgroundColor('#1c1a22');

    // Fondo contenedor_objetos (-5% de ancho y de alto)
    const configBg = this.add.image(width / 2, height / 2, 'contenedor_objetos');
    configBg.setDisplaySize(width * 0.95, height );
    configBg.setDepth(0);

    // ── TÍTULO ─────────────────────────────────────────────────────────────
    this.add.text(width / 2, 70, T.titulo, S.titulo).setOrigin(0.5);

    // ── PESTAÑAS ────────────────────────────────────────────────────────────
    const tabs = [
      { id: 'config', label: T.tabConfig },
      { id: 'perfil', label: T.tabPerfil }
    ];
    const tabW = 260;
    const tabH = 52;
    const tabGap = 20;
    const totalTabW = tabW * tabs.length + tabGap * (tabs.length - 1);
    const tabStartX = width / 2 - totalTabW / 2 + tabW / 2;
    const tabY = 130;

    tabs.forEach((tab, i) => {
      const tx = tabStartX + i * (tabW + tabGap);
      const isActive = this.tabActual === tab.id;

      const bg = this.add.graphics();
      const col = isActive ? 0xd5c23b : 0x3a3548;
      const stroke = isActive ? 0xffffff : 0x5a5568;
      bg.fillStyle(col, 1);
      bg.lineStyle(2, stroke, 1);
      bg.fillRoundedRect(tx - tabW / 2, tabY - tabH / 2, tabW, tabH, 10);
      bg.strokeRoundedRect(tx - tabW / 2, tabY - tabH / 2, tabW, tabH, 10);
      bg.setInteractive(new Phaser.Geom.Rectangle(tx - tabW / 2, tabY - tabH / 2, tabW, tabH), Phaser.Geom.Rectangle.Contains);

      this.add.text(tx, tabY, tab.label, {
        fontFamily: 'Arial', fontSize: '20px', fontStyle: 'bold',
        fill: isActive ? '#000000' : '#cccccc', stroke: isActive ? 'transparent' : '#000000', strokeThickness: 2
      }).setOrigin(0.5);

      bg.on('pointerdown', () => {
        if (this.tabActual !== tab.id) {
          this.registry.set('configTab', tab.id);
          this.scene.restart();
        }
      });
      bg.on('pointerover', () => { if (!isActive) bg.setAlpha(0.75); });
      bg.on('pointerout', () => { bg.setAlpha(1); });
    });

    // ── ÁREA DE CONTENIDO ──────────────────────────────────────────────────
    const contentY = tabY + tabH / 2 + 20;
    const contentH = height - contentY - 140;

    if (this.tabActual === 'config') {
      this.renderTabConfig(width, contentY, contentH, T);
    } else {
      // Cargar datos antes de renderizar el perfil
      try {
        const datos = await obtenerDatosJugador();
        this.playerData = datos;
        this.registry.set('playerData', datos);
      } catch (e) {
        this.playerData = this.registry.get('playerData') || {};
      }
      this.renderTabPerfil(width, contentY, contentH, T);
    }

    // ── BOTÓN VOLVER ────────────────────────────────────────────────────────
    this.add.image(width / 15, height - 80, 'boton_volver')
      .setDisplaySize(125, 125)
      .setScrollFactor(0)
      .setDepth(11)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.registry.set('configTab', 'config');
        this.scene.start('MenuScene');
      });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // TAB: CONFIGURACIÓN
  // ────────────────────────────────────────────────────────────────────────────
  renderTabConfig(width, startY, panelH, T) {
    const rows = [
      { id: 'idioma', label: T.idioma },
      { id: 'controles', label: T.controles },
      { id: 'calidad', label: T.calidad }
    ];

    const rowH = 72;
    const gap = 18;
    const totalH = rowH * rows.length + gap * (rows.length - 1);
    let y = startY + (panelH - totalH) / 2 + rowH / 2;

    rows.forEach(row => {
      const rowW = width - 200;
      const rxStart = 100;

      // Fondo fila dorado estilo RankedScene
      const rowBg = this.add.graphics();
      rowBg.fillStyle(0xd5c23b, 0.92);
      rowBg.lineStyle(2, 0xffffff, 0.6);
      rowBg.fillRoundedRect(rxStart, y - rowH / 2, rowW, rowH, 10);
      rowBg.strokeRoundedRect(rxStart, y - rowH / 2, rowW, rowH, 10);

      this.add.text(rxStart + 30, y, row.label.toUpperCase(), S.etiqueta).setOrigin(0, 0.5);

      // Valor / botón
      const btnW = 240;
      const btnH = rowH - 18;
      const btnX = width - 100 - 30 - btnW / 2;

      let valorTexto = '';
      let btnColor = 0x88ff88;

      if (row.id === 'idioma') {
        valorTexto = this.lang === 'es' ? '🇪🇨 ESPAÑOL' : '🇺🇸 ENGLISH';
        btnColor = 0x4488ff;
      } else if (row.id === 'controles') {
        const ctrl = this.registry.get('controls') || 'keyboard';
        valorTexto = ctrl === 'keyboard' ? T.teclado : T.tactil;
        btnColor = 0x0095ff;
      } else if (row.id === 'calidad') {
        const gr = this.registry.get('graphics') || 'high';
        valorTexto = gr === 'high' ? T.alto : T.bajo;
        btnColor = gr === 'high' ? 0xffcc00 : 0x999999;
      }

      const btn = this.add.graphics();
      btn.fillStyle(btnColor, 1);
      btn.lineStyle(2, 0x000000, 1);
      btn.fillRoundedRect(btnX - btnW / 2, y - btnH / 2, btnW, btnH, 8);
      btn.strokeRoundedRect(btnX - btnW / 2, y - btnH / 2, btnW, btnH, 8);
      btn.setInteractive(new Phaser.Geom.Rectangle(btnX - btnW / 2, y - btnH / 2, btnW, btnH), Phaser.Geom.Rectangle.Contains);

      this.add.text(btnX, y, valorTexto, {
        fontFamily: 'Arial', fontSize: '17px', fontStyle: 'bold', fill: '#111111', align: 'center'
      }).setOrigin(0.5);

      btn.on('pointerdown', () => {
        if (row.id === 'idioma') {
          this.lang = this.lang === 'es' ? 'en' : 'es';
          this.registry.set('language', this.lang);
        } else if (row.id === 'controles') {
          const ctrl = this.registry.get('controls') || 'keyboard';
          this.registry.set('controls', ctrl === 'keyboard' ? 'touch' : 'keyboard');
        } else if (row.id === 'calidad') {
          const gr = this.registry.get('graphics') || 'high';
          this.registry.set('graphics', gr === 'high' ? 'low' : 'high');
        }
        this.scene.restart();
      });

      btn.on('pointerover', () => { btn.setAlpha(0.8); });
      btn.on('pointerout', () => { btn.setAlpha(1); });

      y += rowH + gap;
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // TAB: PERFIL
  // ────────────────────────────────────────────────────────────────────────────
  renderTabPerfil(width, startY, panelH, T) {
    const pd = this.playerData || {};
    const uid = pd.uid || '';

    // Layout: izquierda = avatar + stats, derecha = campos editables
    const avatarX = 250;
    const avatarY = startY + 130;
    const formX = 450;
    const formW = width - formX - 80;

    // ── Tarjeta de avatar (contenedor_skin) ────────────────────────────────
    const cardW = 260;
    const cardH = 280;
    const cardImg = this.add.image(avatarX, startY + cardH / 2 + 30, 'contenedor_objetos').setDisplaySize(cardW, cardH);

    // Círculo de avatar (usa sprite equipado de fallback, o la foto real de Google/FB)
    let accesorioKey = pd.accesorioEquipado || 'skin_default';
    if (accesorioKey === 'skin_base' || !this.textures.exists(accesorioKey)) {
      accesorioKey = 'skin_default';
    }
    const avatar = this.add.image(avatarX, startY + 115, accesorioKey).setDisplaySize(100, 100);

    // Carga de avatar dinámico con HTML Image (CORS & Phaser loader safe)
    const avatarUrl = pd.avatarUrl;
    if (avatarUrl && avatarUrl.trim() !== "") {
      const textureKey = `avatar_${pd.uid || 'guest'}`;
      if (this.textures.exists(textureKey)) {
        avatar.setTexture(textureKey);
        avatar.setDisplaySize(100, 100);
      } else {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          if (this.textures && this.textures.exists(textureKey)) {
            this.textures.remove(textureKey);
          }
          if (this.textures && avatar && avatar.active) {
            this.textures.addImage(textureKey, img);
            avatar.setTexture(textureKey);
            avatar.setDisplaySize(100, 100);
          }
        };
        img.onerror = () => {
          console.warn("Error al cargar avatar por URL en Config. Usando fallback.");
        };
        img.src = avatarUrl;
      }
    }

    // Nivel y XP
    const nivel = pd.paseNivel || 1;
    const xp = pd.paseXP || 0;

    this.add.text(avatarX, startY + 190, `Nvl. ${nivel}`, {
      fontFamily: 'Arial', fontSize: '28px', fontStyle: 'bold', fill: '#ffffff', stroke: '#000000', strokeThickness: 5
    }).setOrigin(0.5);

    this.add.text(avatarX, startY + 225, `${xp} XP`, {
      fontFamily: 'Arial', fontSize: '20px', fontStyle: 'bold', fill: '#d5c23b', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5);

    // Nick mostrado
    const nickMostrado = pd.nick || 'Jugador Anónimo';
    this.add.text(avatarX, startY + 250, nickMostrado, {
      fontFamily: 'Arial', fontSize: '24px', fontStyle: 'bold', fill: '#ffffff', stroke: '#000000', strokeThickness: 3,
      align: 'center', wordWrap: { width: cardW - 20 }
    }).setOrigin(0.5);

    // ── Formulario de campos editables ─────────────────────────────────────
    const campos = [
      { key: 'nick', label: T.nick, valor: pd.nick || '' },
      { key: 'nombre', label: T.nombre, valor: pd.nombre || '' },
      { key: 'correo', label: T.correo, valor: pd.correo || '' },
      { key: 'telefono', label: T.telefono, valor: pd.telefono || '' },
      { key: 'fechaNacimiento', label: T.fechaNacimiento, valor: pd.fechaNacimiento || '' }
    ];

    const fieldH = 58;
    const fieldGap = 12;
    const totalFH = (campos.length * fieldH + (campos.length - 1) * fieldGap) - 25;
    let fy = startY + 40;

    // Guardamos referencias a los textos de valor para actualizarlos
    this.textosValor = {};
    this.camposEditados = {};
    this.modoEdicion = false;

    campos.forEach(campo => {
      // Etiqueta
      this.add.text(formX, fy, campo.label.toUpperCase(), {
        fontFamily: 'Arial', fontSize: '15px', fontStyle: 'bold', fill: '#d5c23b', stroke: '#000000', strokeThickness: 2
      });

      // Fondo del campo
      const fieldBg = this.add.graphics();
      fieldBg.fillStyle(0x3a3548, 1);
      fieldBg.lineStyle(2, 0x6a6578, 1);
      fieldBg.fillRoundedRect(formX, fy + 20, formW, 34, 6);
      fieldBg.strokeRoundedRect(formX, fy + 20, formW, 34, 6);

      // Texto de valor (editable simulado)
      const valTxt = this.add.text(formX + 12, fy + 37, campo.valor || `(${T.sinDatos})`, {
        fontFamily: 'Arial', fontSize: '19px', fill: campo.valor ? '#ffffff' : '#888888', stroke: '#000000', strokeThickness: 2
      }).setOrigin(0, 0.5);
      this.textosValor[campo.key] = { txtObj: valTxt, valorActual: campo.valor };

      // Zona interactiva para editar
      const hitZone = this.add.zone(formX + formW / 2, fy + 37, formW, 34).setInteractive({ useHandCursor: true });
      hitZone.on('pointerdown', () => this.abrirModalEdicion(campo, formW, T));

      fy += fieldH + fieldGap;
    });

    // UID (solo lectura)
    this.add.text(formX, fy + 4, T.uid.toUpperCase(), {
      fontFamily: 'Arial', fontSize: '13px', fill: '#666666'
    });
    this.add.text(formX, fy + 22, uid, {
      fontFamily: 'Arial', fontSize: '14px', fill: '#555555', fontStyle: 'italic'
    });

    // ── Botón Guardar ──────────────────────────────────────────────────────
    const btnSaveW = 280;
    const btnSaveH = 54;
    const btnSaveX = formX + formW / 2;
    const btnSaveY = fy + 60;

    const btnSaveBg = this.add.graphics();
    btnSaveBg.fillStyle(0x22cc66, 1);
    btnSaveBg.lineStyle(2, 0xffffff, 1);
    btnSaveBg.fillRoundedRect(btnSaveX - btnSaveW / 2, btnSaveY - btnSaveH / 2, btnSaveW, btnSaveH, 10);
    btnSaveBg.strokeRoundedRect(btnSaveX - btnSaveW / 2, btnSaveY - btnSaveH / 2, btnSaveW, btnSaveH, 10);
    btnSaveBg.setInteractive(new Phaser.Geom.Rectangle(btnSaveX - btnSaveW / 2, btnSaveY - btnSaveH / 2, btnSaveW, btnSaveH), Phaser.Geom.Rectangle.Contains);

    this.add.text(btnSaveX, btnSaveY, T.guardar, {
      fontFamily: 'Arial', fontSize: '22px', fontStyle: 'bold', fill: '#000000'
    }).setOrigin(0.5);

    btnSaveBg.on('pointerover', () => { btnSaveBg.setAlpha(0.8); });
    btnSaveBg.on('pointerout', () => { btnSaveBg.setAlpha(1); });
    btnSaveBg.on('pointerdown', async () => {
      if (Object.keys(this.camposEditados).length === 0) {
        this.mostrarNotificacion('No hay cambios que guardar', '#888888');
        return;
      }
      try {
        const ok = await actualizarPerfil(this.camposEditados);
        if (ok) {
          const datos = await obtenerDatosJugador();
          if (datos) this.registry.set('playerData', datos);
          this.mostrarNotificacion(T.exito, '#22cc66');
          this.time.delayedCall(1200, () => this.scene.restart());
        } else {
          this.mostrarNotificacion(T.error, '#cc2222');
        }
      } catch (e) {
        this.mostrarNotificacion(T.error, '#cc2222');
      }
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Modal de edición de campo
  // ────────────────────────────────────────────────────────────────────────────
  abrirModalEdicion(campo, formW, T) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Fondo oscuro
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
      .setDepth(200).setInteractive();

    const panelW = 600;
    const panelH = 320;
    const px = width / 2;
    const py = height / 2;

    // Panel modal con imagen de contenedor_skin
    const panelBg = this.add.image(px, py, 'contenedor_objetos')
      .setDisplaySize(panelW, panelH)
      .setDepth(201);

    const titleTxt = this.add.text(px, py - panelH / 2 + 75, campo.label.toUpperCase(), {
      fontFamily: 'Arial', fontSize: '22px', fontStyle: 'bold', fill: '#d5c23b', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(202);

    // Indicación de prompt
    const valorActual = this.camposEditados[campo.key] ?? (this.textosValor[campo.key]?.valorActual || '');
    const promptTxt = this.add.text(px, py - 50, `${T.valorActual} "${valorActual || T.vacio}"`, {
      fontFamily: 'Arial', fontSize: '16px', fill: '#aaaaaa', stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(202);

    const instrTxt = this.add.text(px, py - 30, T.modalInstruccion, {
      fontFamily: 'Arial', fontSize: '16px', fill: '#ffffff', stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(202);

    // Botón Cancelar
    const btnCancelW = 180;
    const btnCancelH = 44;
    const btnCancelX = px - 110;
    const btnCancelY = py + 100;

    const btnCancelBg = this.add.graphics().setDepth(201);
    btnCancelBg.fillStyle(0xff6666, 1);
    btnCancelBg.lineStyle(2, 0xffffff, 1);
    btnCancelBg.fillRoundedRect(btnCancelX - btnCancelW / 2, btnCancelY - btnCancelH / 2, btnCancelW, btnCancelH, 8);
    btnCancelBg.strokeRoundedRect(btnCancelX - btnCancelW / 2, btnCancelY - btnCancelH / 2, btnCancelW, btnCancelH, 8);
    btnCancelBg.setInteractive(new Phaser.Geom.Rectangle(btnCancelX - btnCancelW / 2, btnCancelY - btnCancelH / 2, btnCancelW, btnCancelH), Phaser.Geom.Rectangle.Contains);

    const btnCancelTxt = this.add.text(btnCancelX, btnCancelY, T.cancelar, {
      fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold', fill: '#000000'
    }).setOrigin(0.5).setDepth(202);

    btnCancelBg.on('pointerover', () => btnCancelBg.setAlpha(0.8));
    btnCancelBg.on('pointerout', () => btnCancelBg.setAlpha(1));
    btnCancelBg.on('pointerdown', () => cancelar());

    // Botón Aceptar
    const btnAcceptW = 180;
    const btnAcceptH = 44;
    const btnAcceptX = px + 110;
    const btnAcceptY = py + 100;

    const btnAcceptBg = this.add.graphics().setDepth(201);
    btnAcceptBg.fillStyle(0x22cc66, 1);
    btnAcceptBg.lineStyle(2, 0xffffff, 1);
    btnAcceptBg.fillRoundedRect(btnAcceptX - btnAcceptW / 2, btnAcceptY - btnAcceptH / 2, btnAcceptW, btnAcceptH, 8);
    btnAcceptBg.strokeRoundedRect(btnAcceptX - btnAcceptW / 2, btnAcceptY - btnAcceptH / 2, btnAcceptW, btnAcceptH, 8);
    btnAcceptBg.setInteractive(new Phaser.Geom.Rectangle(btnAcceptX - btnAcceptW / 2, btnAcceptY - btnAcceptH / 2, btnAcceptW, btnAcceptH), Phaser.Geom.Rectangle.Contains);

    const btnAcceptTxt = this.add.text(btnAcceptX, btnAcceptY, T.aceptar, {
      fontFamily: 'Arial', fontSize: '18px', fontStyle: 'bold', fill: '#000000'
    }).setOrigin(0.5).setDepth(202);

    btnAcceptBg.on('pointerover', () => btnAcceptBg.setAlpha(0.8));
    btnAcceptBg.on('pointerout', () => btnAcceptBg.setAlpha(1));
    btnAcceptBg.on('pointerdown', () => confirmar());

    // --- ELEMENTOS DOM DE ENTRADA DE TEXTO ---
    let nuevoValor = valorActual;

    const domContainer = document.createElement('div');
    domContainer.id = 'modal-dom-input-container';
    document.body.appendChild(domContainer);

    const updateDOMPosition = () => {
      const rect = this.game.canvas.getBoundingClientRect();
      const scaleX = rect.width / 1280;
      const scaleY = rect.height / 720;
      const scaleMin = Math.min(scaleX, scaleY);

      domContainer.style.position = 'fixed';
      domContainer.style.left = `${rect.left + (px - 220) * scaleX}px`;
      domContainer.style.top = `${rect.top + (py - 7) * scaleY}px`;
      domContainer.style.width = `${440 * scaleX}px`;
      domContainer.style.height = `${44 * scaleY}px`;
      domContainer.style.zIndex = '1000';

      const fontSize = Math.max(10, Math.floor(18 * scaleMin));
      const borderRadius = Math.max(2, Math.floor(6 * scaleMin));
      const borderSize = Math.max(1, Math.floor(2 * scaleMin));

      domContainer.querySelectorAll('input, select').forEach(el => {
        el.style.fontSize = `${fontSize}px`;
        el.style.borderRadius = `${borderRadius}px`;
        el.style.borderWidth = `${borderSize}px`;
      });
    };
    updateDOMPosition();
    window.addEventListener('resize', updateDOMPosition);

    const applyInputStyle = (el) => {
      el.style.backgroundColor = '#3a3548';
      el.style.border = '2px solid #6a6578';
      el.style.color = '#ffffff';
      el.style.fontFamily = 'Arial, sans-serif';
      el.style.outline = 'none';
      el.style.boxSizing = 'border-box';
      el.style.width = '100%';
      el.style.height = '100%';
      el.style.colorScheme = 'dark';
      el.style.transition = 'border-color 0.2s';
      
      el.addEventListener('focus', () => {
        el.style.borderColor = '#d5c23b';
      });
      el.style.padding = '0 10px';
      el.addEventListener('blur', () => {
        el.style.borderColor = '#6a6578';
      });
    };

    if (campo.key === 'telefono') {
      domContainer.style.display = 'flex';
      domContainer.style.gap = '10px';

      const select = document.createElement('select');
      select.style.flex = '4';
      applyInputStyle(select);
      select.style.padding = '0 8px';

      const PAISES = [
        { code: 'EC', name: 'Ecuador', prefix: '+593', emoji: '🇪🇨' },
        { code: 'CO', name: 'Colombia', prefix: '+57', emoji: '🇨🇴' },
        { code: 'PE', name: 'Perú', prefix: '+51', emoji: '🇵🇪' },
        { code: 'VE', name: 'Venezuela', prefix: '+58', emoji: '🇻🇪' },
        { code: 'CL', name: 'Chile', prefix: '+56', emoji: '🇨🇱' },
        { code: 'AR', name: 'Argentina', prefix: '+54', emoji: '🇦🇷' },
        { code: 'MX', name: 'México', prefix: '+52', emoji: '🇲🇽' },
        { code: 'US', name: 'United States', prefix: '+1', emoji: '🇺🇸' },
        { code: 'ES', name: 'España', prefix: '+34', emoji: '🇪🇸' }
      ];

      PAISES.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.prefix;
        opt.textContent = `${p.emoji} ${p.prefix}`;
        opt.style.backgroundColor = '#3a3548';
        opt.style.color = '#ffffff';
        select.appendChild(opt);
      });

      const phoneInput = document.createElement('input');
      phoneInput.type = 'tel';
      phoneInput.maxLength = 9;
      phoneInput.placeholder = '987654321';
      phoneInput.style.flex = '6';
      applyInputStyle(phoneInput);
      phoneInput.style.padding = '0 12px';

      let prefixActual = '+593';
      let restoTelefono = valorActual;
      for (const p of PAISES) {
        if (valorActual.startsWith(p.prefix)) {
          prefixActual = p.prefix;
          restoTelefono = valorActual.slice(p.prefix.length);
          break;
        }
      }

      select.value = prefixActual;
      phoneInput.value = restoTelefono.replace(/\D/g, '');

      domContainer.appendChild(select);
      domContainer.appendChild(phoneInput);

      nuevoValor = select.value + phoneInput.value;

      const syncValue = () => {
        phoneInput.value = phoneInput.value.replace(/\D/g, '');
        nuevoValor = select.value + phoneInput.value;
      };

      select.addEventListener('change', syncValue);
      phoneInput.addEventListener('input', syncValue);

    } else if (campo.key === 'fechaNacimiento') {
      const dateInput = document.createElement('input');
      dateInput.type = 'date';
      applyInputStyle(dateInput);
      dateInput.style.padding = '0 12px';

      const parseToYYYYMMDD = (val) => {
        if (!val) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
        const parts = val.split(/[\/\-]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
          }
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        return '';
      };

      dateInput.value = parseToYYYYMMDD(valorActual);
      domContainer.appendChild(dateInput);

      nuevoValor = dateInput.value;
      dateInput.addEventListener('input', () => {
        nuevoValor = dateInput.value;
      });

    } else {
      const textInput = document.createElement('input');
      textInput.type = 'text';
      textInput.value = valorActual;
      applyInputStyle(textInput);
      textInput.style.padding = '0 12px';

      domContainer.appendChild(textInput);

      nuevoValor = textInput.value;
      textInput.addEventListener('input', () => {
        nuevoValor = textInput.value;
      });
    }

    const handleDOMKeydown = (e) => {
      if (e.key === 'Enter') {
        confirmar();
      } else if (e.key === 'Escape') {
        cancelar();
      }
    };
    domContainer.addEventListener('keydown', handleDOMKeydown);

    const onKeydown = (evt) => {
      if (evt.keyCode === 27) { // ESC - cancelar
        cancelar();
      } else if (evt.keyCode === 13) { // Enter - confirmar
        confirmar();
      }
    };
    this.input.keyboard.on('keydown', onKeydown);

    const limpiar = () => {
      this.input.keyboard.off('keydown', onKeydown);
      window.removeEventListener('resize', updateDOMPosition);
      if (domContainer && domContainer.parentNode) {
        domContainer.parentNode.removeChild(domContainer);
      }
      overlay.destroy();
      panelBg.destroy();
      titleTxt.destroy();
      promptTxt.destroy();
      instrTxt.destroy();
      btnCancelBg.destroy();
      btnCancelTxt.destroy();
      btnAcceptBg.destroy();
      btnAcceptTxt.destroy();
    };

    const confirmar = () => {
      this.camposEditados[campo.key] = nuevoValor;
      // Actualizar el texto visual del campo en el formulario
      if (this.textosValor[campo.key]) {
        this.textosValor[campo.key].txtObj.setText(nuevoValor || `(${T.sinDatos})`);
        this.textosValor[campo.key].txtObj.setStyle({ fill: nuevoValor ? '#ffffff' : '#888888' });
      }
      limpiar();
    };

    const cancelar = () => { limpiar(); };
  }

  mostrarNotificacion(mensaje, colorFondo) {
    const width = this.cameras.main.width;
    const txt = this.add.text(width / 2, 200, mensaje, {
      ...S.notif, backgroundColor: colorFondo, padding: { x: 24, y: 12 }, align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(300);
    this.time.delayedCall(2500, () => txt.destroy());
  }
}
