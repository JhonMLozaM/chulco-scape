/**
 * i18n.js — Traducciones globales del proyecto Chulco-Scape
 * Uso: import { getT } from '../i18n.js';
 *      const T = getT(this.registry.get('language') || 'es');
 *
 * NOTAS:
 *  - El título de la liga ranked (LIGA: ...) NO se traduce (excepción explícita).
 *  - Los títulos del pase de batalla NO se traducen (excepción explícita).
 */

export const TRANSLATIONS = {
  es: {
    // ── MENÚ PRINCIPAL ──────────────────────────────────────────
    menuJugar: '¡JUGAR!',
    menuPase: 'PASE DE\nBATALLA',
    menuTienda: 'MEJORAR\nPERSONAJE',
    menuSkins: '🎭 SKINS\nPREMIUM',
    menuConfig: '⚙️ AJUSTES',
    menuScores: '🏆 TOP ALTOS\nPUNTAJES',
    menuTitulo: '¡CHULKO-SKAPE!',

    // ── NIVEL / SELECCIÓN ────────────────────────────────────────
    selDestino: 'SELECCIONAR NIVEL',
    selEmpezar: '¡EMPEZAR!',
    selVolver: '← VOLVER AL MENÚ',

    // ── TIENDA / SHOP ────────────────────────────────────────────
    shopTitulo: 'TIENDA MEJORAS',
    shopAbonarDeuda: '💸 Abonar Deuda',
    shopDeudaActual: 'Deuda actual: $',
    shopVelocidad: '🏃 Velocidad (Nvl ',
    shopDescVelocidad: 'Camina más rápido',
    shopDanio: '🔥 Daño Bolón (Nvl ',
    shopDescDanio: 'Derriba motos',
    shopIrSkins: '🎭 TIENDA SKINS (PREMIUM)',
    shopErrorDinero: '¡No tienes dinero suficiente\nGil y Chiro!',
    shopExitoMejora: '✅ Mejora adquirida',
    shopExitoDeuda: '📉 Deuda reducida',
    shopCargando: 'Cargando billetera...',

    // ── SKINS ────────────────────────────────────────────────────
    skinsTitulo: '¡DISFRACES!',
    skinsInfoPago: 'Puedes elegir el disfraz de tu personaje.',
    skinsBtnEquipar: 'EQUIPAR',
    skinsBtnEquipado: 'EQUIPADO',
    skinsBtnComprar: 'COMPRAR ',
    skinsProcesando: '💳 Conectando con la tienda...',
    skinsPagoExitoso: '🎉 ¡Compra exitosa!',
    skinsPagoCancelado: '❌ Operación cancelada.',
    skinsError: '❌ Error al procesar.',
    skinsConfirmar: '¿Comprar por ',
    skinsSi: 'SÍ',
    skinsNo: 'NO',
    skinsFondosInsuficientes: '❌ Fondos insuficientes',
    skinsCargando: 'Cargando tienda...',
    skinsTabApariencias: 'Apariencias',
    skinsTabPantallas: 'Pantallas Carga',
    skinsTabMusica: 'Música',
    skinsTabDisparos: 'Disparos',

    // ── RANKED ───────────────────────────────────────────────────
    // NOTA: El título "LIGA: ..." NO se traduce (excepción del usuario)
    rankedVecindario: 'Vecindario:',
    rankedReinicia: 'Se reinicia en',
    rankedDias: 'días',
    rankedPremios: '🌟 ¡Premios cada semana! 🌟',
    rankedCargando: 'Cargando rivales del vecindario...',
    rankedTu: '¡TÚ! (Vendedor Estrella)',
    rankedComerciantePre: 'Comerciante #',
    rankedAlerta: '🍲 ¡Liga finalizada,\nencebollados servidos! 🍲',
    rankedAceptar: 'ACEPTAR',

    // ── SEASON PASS ──────────────────────────────────────────────
    // NOTA: "PASE DEL CHULLA" y "Temporada 1: El Escape de la Bahía" NO se traducen
    paseCargando: 'Cargando Pase...',
    paseGratis: 'GRATIS',
    pasePremium: '⭐ PREMIUM',
    paseAdquirido: 'ADQUIRIDO',
    pasePremiumActivo: '⭐ Pase Premium Activo ⭐',
    paseComprarPremium: '¡Pase Premium!',
    paseNoEncebollados: '¡No tienes suficientes encebollados!',
    paseNoDinero: '¡No tienes suficiente dinero!',
    paseConfirmarTitulo: '¿CONFIRMAR COMPRA\nDEL PASE PREMIUM?',
    paseConfirmarCosto: 'Costo: 1000 encebollados',
    paseCancelar: 'CANCELAR',
    paseAceptar: 'ACEPTAR',
    paseSemana: 'SEMANA',
    paseSemanaLock: '🔒 (Próximamente)',

    // ── CONFIG ───────────────────────────────────────────────────
    configTitulo: 'CONFIGURACIÓN',
    configTabConfig: 'AJUSTES',
    configTabPerfil: 'MI PERFIL',
    configIdioma: 'Idioma',
    configControles: 'Controles',
    configCalidad: 'Gráficos',
    configEncendido: 'ACTIVADO',
    configApagado: 'DESACTIVADO',
    configTeclado: 'TECLADO',
    configTactil: 'TÁCTIL',
    configAlto: 'ALTA CALIDAD',
    configBajo: 'RENDIMIENTO',
    configNick: 'Nick / Apodo',
    configNombre: 'Nombre completo',
    configCorreo: 'Correo electrónico',
    configTelefono: 'Teléfono',
    configFechaNacimiento: 'Fecha de nacimiento',
    configGuardar: '✅  GUARDAR',
    configEditar: '✏️  EDITAR',
    configExito: '✅ ¡Perfil actualizado!',
    configError: '❌ Error al guardar',
    configSinDatos: 'Sin datos',
    configUid: 'ID de usuario (solo lectura)',
    configNivel: 'Nivel de juego',
    configXp: 'XP acumulada',
    configVolver: '← VOLVER',
    configAceptar: 'ACEPTAR',
    configCancelar: 'CANCELAR',
    configValorActual: 'Valor actual:',
    configVacio: 'vacío',
    configModalInstruccion: '✏️ Escribe el nuevo valor y presiona ENTER o usa los botones',

    // ── GAME ─────────────────────────────────────────────────────
    gameOleada: 'Oleada',
    gameContinuar: 'CONTINUAR',
    gameChulqueroAtrapo: '¡EL CHULQUERO TE ATRAPÓ!',
    gameVentas: '💰 Ventas: $',
    gameCargando: 'Cargando datos...',
    gamePausado: 'JUEGO PAUSADO',
    gameSalirMenu: 'SALIR AL MENÚ',
  },

  en: {
    // ── MAIN MENU ────────────────────────────────────────────────
    menuJugar: 'PLAY!',
    menuPase: 'BATTLE\nPASS',
    menuTienda: 'UPGRADE\nCHARACTER',
    menuSkins: '🎭 PREMIUM\nSKINS',
    menuConfig: '⚙️ SETTINGS',
    menuScores: '🏆 TOP\nSCORES',
    menuTitulo: '¡CHULKO-SKAPE!',

    // ── LEVEL SELECT ─────────────────────────────────────────────
    selDestino: 'SELECT LEVEL',
    selEmpezar: 'START!',
    selVolver: '← BACK TO MENU',

    // ── SHOP ─────────────────────────────────────────────────────
    shopTitulo: 'UPGRADE SHOP',
    shopAbonarDeuda: '💸 Pay Debt',
    shopDeudaActual: 'Current debt: $',
    shopVelocidad: '🏃 Speed (Lvl ',
    shopDescVelocidad: 'Walk faster',
    shopDanio: '🔥 Ball Damage (Lvl ',
    shopDescDanio: 'Knocks down bikes',
    shopIrSkins: '🎭 SKINS SHOP (PREMIUM)',
    shopErrorDinero: 'Not enough money!',
    shopExitoMejora: '✅ Upgrade purchased',
    shopExitoDeuda: '📉 Debt reduced',
    shopCargando: 'Loading wallet...',

    // ── SKINS ─────────────────────────────────────────────────────
    skinsTitulo: 'COSTUMES!',
    skinsInfoPago: 'Choose your character costume.',
    skinsBtnEquipar: 'EQUIP',
    skinsBtnEquipado: 'EQUIPPED',
    skinsBtnComprar: 'BUY ',
    skinsProcesando: '💳 Connecting to shop...',
    skinsPagoExitoso: '🎉 Purchase successful!',
    skinsPagoCancelado: '❌ Operation cancelled.',
    skinsError: '❌ Error processing.',
    skinsConfirmar: 'Buy for ',
    skinsSi: 'YES',
    skinsNo: 'NO',
    skinsFondosInsuficientes: '❌ Insufficient funds',
    skinsCargando: 'Loading shop...',
    skinsTabApariencias: 'Appearances',
    skinsTabPantallas: 'Loading Screens',
    skinsTabMusica: 'Music',
    skinsTabDisparos: 'Shots',

    // ── RANKED ───────────────────────────────────────────────────
    // NOTE: The "LIGA: ..." title is NOT translated (user exception)
    rankedVecindario: 'Neighborhood:',
    rankedReinicia: 'Resets in',
    rankedDias: 'days',
    rankedPremios: '🌟 Prizes every week! 🌟',
    rankedCargando: 'Loading neighborhood rivals...',
    rankedTu: 'YOU! (Star Seller)',
    rankedComerciantePre: 'Merchant #',
    rankedAlerta: '🍲 League ended,\ntreats served! 🍲',
    rankedAceptar: 'ACCEPT',

    // ── SEASON PASS ───────────────────────────────────────────────
    // NOTE: "PASE DEL CHULLA" and "Temporada 1: ..." are NOT translated
    paseCargando: 'Loading Pass...',
    paseGratis: 'FREE',
    pasePremium: '⭐ PREMIUM',
    paseAdquirido: 'CLAIMED',
    pasePremiumActivo: '⭐ Premium Pass Active ⭐',
    paseComprarPremium: 'Premium Pass!',
    paseNoEncebollados: 'Not enough encebollados!',
    paseNoDinero: 'Not enough money!',
    paseConfirmarTitulo: 'CONFIRM PURCHASE\nOF PREMIUM PASS?',
    paseConfirmarCosto: 'Cost: 1000 encebollados',
    paseCancelar: 'CANCEL',
    paseAceptar: 'ACCEPT',
    paseSemana: 'WEEK',
    paseSemanaLock: '🔒 (Coming soon)',

    // ── CONFIG ────────────────────────────────────────────────────
    configTitulo: 'SETTINGS',
    configTabConfig: 'SETTINGS',
    configTabPerfil: 'MY PROFILE',
    configIdioma: 'Language',
    configControles: 'Controls',
    configCalidad: 'Graphics',
    configEncendido: 'ENABLED',
    configApagado: 'DISABLED',
    configTeclado: 'KEYBOARD',
    configTactil: 'TOUCH',
    configAlto: 'HIGH QUALITY',
    configBajo: 'PERFORMANCE',
    configNick: 'Nickname',
    configNombre: 'Full name',
    configCorreo: 'Email',
    configTelefono: 'Phone',
    configFechaNacimiento: 'Date of birth',
    configGuardar: '✅  SAVE',
    configEditar: '✏️  EDIT',
    configExito: '✅ Profile updated!',
    configError: '❌ Save error',
    configSinDatos: 'No data',
    configUid: 'User ID (read-only)',
    configNivel: 'Game level',
    configXp: 'Accumulated XP',
    configVolver: '← BACK',
    configAceptar: 'ACCEPT',
    configCancelar: 'CANCEL',
    configValorActual: 'Current value:',
    configVacio: 'empty',
    configModalInstruccion: '✏️ Enter the new value and press ENTER or use the buttons',

    // ── GAME ──────────────────────────────────────────────────────
    gameOleada: 'Wave',
    gameContinuar: 'CONTINUE',
    gameChulqueroAtrapo: 'THE LOAN SHARK GOT YOU!',
    gameVentas: '💰 Sales: $',
    gameCargando: 'Loading data...',
    gamePausado: 'GAME PAUSED',
    gameSalirMenu: 'EXIT TO MENU'
  }
};

/**
 * Retorna las traducciones para el idioma dado.
 * @param {string} lang - 'es' | 'en'
 * @returns {Object}
 */
export function getT(lang) {
  return TRANSLATIONS[lang] || TRANSLATIONS['es'];
}
