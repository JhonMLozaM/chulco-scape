// =====================================================================================
// IMPORTACIONES OFICIALES DESDE CDN PARA NAVEGADORES WEB (Firebase v10)
// =====================================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment,
  arrayUnion,
  collection, 
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// =====================================================================================
// 1. CONFIGURACIÓN DE CREDENCIALES
// =====================================================================================
const firebaseConfig = {
  apiKey: "AIzaSyCqxVgpdEHElPtEQBnJluRpL9dZ_BTV4aU",
  authDomain: "chulco-scape.firebaseapp.com",
  projectId: "chulco-scape",
  storageBucket: "chulco-scape.firebasestorage.app",
  messagingSenderId: "342486836898",
  appId: "1:342486836898:web:fb4f478b9ca8910e13d9fb",
  measurementId: "G-3X26PTVCQL"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Estructura base para nuevos jugadores
const INITIAL_PLAYER_DATA = {
  dinero: 0,              // Dinero ganado en el juego para mejoras (CORREGIDO)
  moneda: 0,              // Encebollados para skins (AÑADIDO PARA EVITAR ERRORES)
  deudaActual: 500,       
  paseNivel: 1,           
  paseXP: 0,              
  pasePremium: false,
  recompensasPase: [],     
  mejoras: {
    velocidad: 1,         
    danioBolon: 1         
  },
  skinsDesbloqueadas: ['skin_base'], 
  accesorioEquipado: 'skin_base',
  puntosLigaSemanales: 0,
  ligaActual: 1,
  grupoLiga: `L1_G${Math.floor(Math.random() * 10) + 1}`, // Grupo aleatorio
  semanaActual: 0
};

// =====================================================================================
// FUNCIONES EXPORTADAS
// =====================================================================================

// --- UTILIDADES ---
export const obtenerNumeroSemana = () => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

export const iniciarSesionJugador = async () => {
  try {
    const credencial = await signInAnonymously(auth);
    const user = credencial.user;
    
    const jugadorDocRef = doc(db, "jugadores", user.uid);
    const jugadorDoc = await getDoc(jugadorDocRef);

    if (!jugadorDoc.exists()) {
      const newData = { ...INITIAL_PLAYER_DATA, semanaActual: obtenerNumeroSemana() };
      await setDoc(jugadorDocRef, newData);
      return newData;
    }
    
    const datos = jugadorDoc.data();
    return await gestionarReinicioSemanal(user.uid, datos);
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    throw error;
  }
};

export const gestionarReinicioSemanal = async (uid, datosJugador) => {
  const semanaActual = obtenerNumeroSemana();
  if (datosJugador.semanaActual !== semanaActual) {
    let nuevaLiga = datosJugador.ligaActual || 1;
    const puntos = datosJugador.puntosLigaSemanales || 0;
    
    if (nuevaLiga === 1 && puntos >= 500) nuevaLiga = 2;
    else if (nuevaLiga === 2 && puntos >= 1500) nuevaLiga = 3;
    else if (nuevaLiga === 3 && puntos >= 3000) nuevaLiga = 4;
    else if (nuevaLiga === 4 && puntos >= 5000) nuevaLiga = 5;

    // Calcular el premio de acuerdo a la liga original
    const ligaParaPremio = datosJugador.ligaActual || 1;
    const premios = { 1: 50, 2: 100, 3: 200, 4: 350, 5: 700 };
    const premioConsolacion = premios[ligaParaPremio] || 50;

    const actualizaciones = {
      puntosLigaSemanales: 0,
      semanaActual: semanaActual,
      moneda: increment(premioConsolacion),
      ligaActual: nuevaLiga,
      grupoLiga: `L${nuevaLiga}_G${Math.floor(Math.random() * 10) + 1}`,
      alertaReinicio: true
    };

    const jugadorDocRef = doc(db, "jugadores", uid);
    await updateDoc(jugadorDocRef, actualizaciones);

    return { ...datosJugador, ...actualizaciones, moneda: (datosJugador.moneda || 0) + premioConsolacion };
  }
  return datosJugador;
};

export const apagarAlertaReinicio = async () => {
  const user = auth.currentUser;
  if (!user) return;
  const jugadorDocRef = doc(db, "jugadores", user.uid);
  await updateDoc(jugadorDocRef, { alertaReinicio: false });
};

export const obtenerDatosJugador = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  const jugadorDocRef = doc(db, "jugadores", user.uid);
  const jugadorDoc = await getDoc(jugadorDocRef);
  return jugadorDoc.exists() ? jugadorDoc.data() : null;
};

// --- CATÁLOGO DE SKINS ---
export const obtenerCatalogoSkins = async () => {
  try {
    const skinsRef = collection(db, "catalogo_skins");
    const snapshot = await getDocs(skinsRef);
    const catalogo = [];
    
    snapshot.forEach((documento) => {
      catalogo.push({ id: documento.id, ...documento.data() });
    });
    
    return catalogo;
  } catch (error) {
    console.error("Error al obtener el catálogo de skins:", error);
    return [];
  }
};

export const equiparSkinEnFirebase = async (skinId, tipo = 'apariencias') => {
  const user = auth.currentUser;
  if (!user) return;
  const jugadorDocRef = doc(db, "jugadores", user.uid);
  
  const updates = {};
  if (tipo === 'apariencias') updates.accesorioEquipado = skinId;
  else if (tipo === 'pantallas_carga') updates.pantallaCargaEquipada = skinId;
  else if (tipo === 'musica') updates.musicaEquipada = skinId;
  else if (tipo === 'disparos') updates.disparoEquipado = skinId;

  await updateDoc(jugadorDocRef, updates);
};

/**
 * Actualiza los campos básicos del perfil del jugador en Firestore.
 * Solo actualiza los campos que se proporcionen (no nulos).
 */
export const actualizarPerfil = async (camposActualizados) => {
  const user = auth.currentUser;
  if (!user) return false;
  const jugadorDocRef = doc(db, "jugadores", user.uid);
  const datosLimpios = {};
  const camposPermitidos = ['nick', 'nombre', 'correo', 'telefono', 'fechaNacimiento', 'avatarUrl'];
  for (const campo of camposPermitidos) {
    if (camposActualizados[campo] !== undefined && camposActualizados[campo] !== null) {
      datosLimpios[campo] = camposActualizados[campo];
    }
  }
  if (Object.keys(datosLimpios).length === 0) return false;
  await updateDoc(jugadorDocRef, datosLimpios);
  return true;
};

export const adquirirAccesorioEstetico = async (idAccesorio, costo) => {
  const user = auth.currentUser;
  if (!user) return false;

  const jugadorDocRef = doc(db, "jugadores", user.uid);
  const datos = await obtenerDatosJugador();
  const inventarioActual = datos?.skinsDesbloqueadas || ['skin_base'];

  // CORRECCIÓN: Usar 'moneda' (Encebollados) para la compra de skins
  if (!datos || datos.moneda < costo || inventarioActual.includes(idAccesorio)) {
    return false; 
  }

  const updates = {
    moneda: increment(-costo), // Resta los encebollados
    skinsDesbloqueadas: arrayUnion(idAccesorio),
    accesorioEquipado: idAccesorio 
  };

  // VINCULACIÓN: Si es la pantalla de carga, marcar también la recompensa en el pase de batalla
  if (idAccesorio === 'pantalla_carga') {
    updates.recompensasPase = arrayUnion('W1_I4');
  }

  await updateDoc(jugadorDocRef, updates);
  return true;
};

// --- COMPRAS Y ECONOMÍA (Tienda de Mejoras) ---
export const comprarMejoraEnTienda = async (tipoCompra, costo) => {
  const user = auth.currentUser;
  if (!user) return false;

  const jugadorDocRef = doc(db, "jugadores", user.uid);
  const datos = await obtenerDatosJugador();

  // CORRECCIÓN: Validar contra 'dinero'
  if (!datos || datos.dinero < costo) return false; 

  // CORRECCIÓN: Restar del campo 'dinero'
  let actualizaciones = { dinero: increment(-costo) };

  if (tipoCompra === 'deuda') {
    if (datos.deudaActual <= 0) return false;
    actualizaciones.deudaActual = increment(-100); 
  } else {
    actualizaciones[`mejoras.${tipoCompra}`] = increment(1);
  }

  await updateDoc(jugadorDocRef, actualizaciones);
  return true;
};

// --- PROGRESO Y OTROS ---
export const guardarResultadoRonda = async (dineroGanado, xpGanada) => {
  const user = auth.currentUser;
  if (!user) return;

  const jugadorDocRef = doc(db, "jugadores", user.uid);
  
  // CORRECCIÓN: Guardar en el campo 'dinero' en lugar de 'monedas'
  await updateDoc(jugadorDocRef, {
    dinero: increment(dineroGanado),
    paseXP: increment(xpGanada),
    puntosLigaSemanales: increment(dineroGanado)
  });

  await verificarSubidaDeNivelPase();
};

const verificarSubidaDeNivelPase = async () => {
  const user = auth.currentUser;
  if (!user) return;

  const datos = await obtenerDatosJugador();
  if (!datos) return;

  const XP_POR_NIVEL = 1000; 
  let nuevoNivel = datos.paseNivel || 1;
  let nuevoXP = datos.paseXP || 0;
  let subio = false;

  while (nuevoXP >= XP_POR_NIVEL) {
    nuevoNivel++;
    nuevoXP -= XP_POR_NIVEL;
    subio = true;
  }
  
  if (subio) {
    const jugadorDocRef = doc(db, "jugadores", user.uid);
    await updateDoc(jugadorDocRef, {
      paseNivel: nuevoNivel,
      paseXP: nuevoXP
    });
  }
};

export const actualizarDeuda = async (cantidad) => {
  const user = auth.currentUser;
  if (!user) return;
  const jugadorDocRef = doc(db, "jugadores", user.uid);
  await updateDoc(jugadorDocRef, {
    deudaActual: increment(cantidad)
  });
};

export const desbloquearPasePremium = async () => {
  const user = auth.currentUser;
  if (!user) return false;

  const jugadorDocRef = doc(db, "jugadores", user.uid);
  const datos = await obtenerDatosJugador();
  
  const COSTO_PREMIUM = 1000;
  
  if (!datos || (datos.moneda || 0) < COSTO_PREMIUM || datos.pasePremium) {
    return false;
  }
  
  await updateDoc(jugadorDocRef, {
    pasePremium: true,
    moneda: increment(-COSTO_PREMIUM)
  });
  return true;
};

export const comprarRecompensaPase = async (idRecompensa, costo, esPremium) => {
  const user = auth.currentUser;
  if (!user) return false;

  const jugadorDocRef = doc(db, "jugadores", user.uid);
  const datos = await obtenerDatosJugador();

  if (!datos) return false;

  // Validación de nivel seguro: Cada recompensa requiere 2 niveles
  const match = idRecompensa.match(/^W(\d)_I(\d)$/);
  if (match) {
    const w = parseInt(match[1]);
    const i = parseInt(match[2]);
    const globalIndex = (w - 1) * 7 + (i - 1);
    const lvlReq = (globalIndex + 1) * 2;
    if ((datos.paseNivel || 1) < lvlReq) {
      console.warn(`Intento de compra bloqueado: Nivel insuficiente para ${idRecompensa}. Nivel: ${datos.paseNivel}, Requerido: ${lvlReq}`);
      return false;
    }
  }

  if (esPremium && !datos.pasePremium) return false;
  if ((datos.dinero || 0) < costo) return false;
  if ((datos.recompensasPase || []).includes(idRecompensa)) return false;

  const updates = {
    dinero: increment(-costo),
    recompensasPase: arrayUnion(idRecompensa)
  };

  // VINCULACIÓN: Si es el item de Pase de Batalla vinculante, desbloquear la skin en Firestore
  if (idRecompensa === 'W1_I4') {
    updates.skinsDesbloqueadas = arrayUnion('pantalla_carga');
  }

  await updateDoc(jugadorDocRef, updates);
  return true;
};

export const reiniciarPaseEnFirebase = async () => {
  const user = auth.currentUser;
  if (!user) return false;
  const jugadorDocRef = doc(db, "jugadores", user.uid);
  await updateDoc(jugadorDocRef, {
    paseNivel: 1,
    paseXP: 0,
    recompensasPase: [],
    pasePremium: false
  });
  return true;
};

// =====================================================================================
// NUEVAS FUNCIONES DE AUTENTICACIÓN PERSONALIZADA (EMAIL, GOOGLE, FACEBOOK)
// =====================================================================================

export const comprobarYCrearUsuario = async (user) => {
  try {
    const jugadorDocRef = doc(db, "jugadores", user.uid);
    const jugadorDoc = await getDoc(jugadorDocRef);
    let esNuevo = false;
    let datos = null;

    if (!jugadorDoc.exists()) {
      esNuevo = true;
      datos = { 
        ...INITIAL_PLAYER_DATA, 
        uid: user.uid,
        correo: user.email || "",
        nombre: user.displayName || "",
        nick: user.displayName ? user.displayName.split(" ")[0] : "Jugador",
        avatarUrl: user.photoURL || "",
        semanaActual: obtenerNumeroSemana() 
      };
      await setDoc(jugadorDocRef, datos);
    } else {
      datos = jugadorDoc.data();
      // Si el usuario existe pero no tiene avatarUrl y el proveedor nos da uno, lo actualizamos
      if (!datos.avatarUrl && user.photoURL) {
        datos.avatarUrl = user.photoURL;
        await updateDoc(jugadorDocRef, { avatarUrl: user.photoURL });
      }
      datos = await gestionarReinicioSemanal(user.uid, datos);
    }
    return { playerData: datos, esNuevo };
  } catch (error) {
    console.error("Error al comprobar/crear usuario en Firestore:", error);
    throw error;
  }
};

export const iniciarSesionConCorreo = async (correo, password) => {
  try {
    const credencial = await signInWithEmailAndPassword(auth, correo, password);
    return await comprobarYCrearUsuario(credencial.user);
  } catch (error) {
    console.error("Error al iniciar sesión con correo:", error);
    throw error;
  }
};

export const registrarConCorreo = async (correo, password) => {
  try {
    const credencial = await createUserWithEmailAndPassword(auth, correo, password);
    return await comprobarYCrearUsuario(credencial.user);
  } catch (error) {
    console.error("Error al registrar con correo:", error);
    throw error;
  }
};

export const iniciarSesionGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const credencial = await signInWithPopup(auth, provider);
    return await comprobarYCrearUsuario(credencial.user);
  } catch (error) {
    console.error("Error al iniciar sesión con Google:", error);
    throw error;
  }
};

export const iniciarSesionFacebook = async () => {
  try {
    const provider = new FacebookAuthProvider();
    const credencial = await signInWithPopup(auth, provider);
    return await comprobarYCrearUsuario(credencial.user);
  } catch (error) {
    console.error("Error al iniciar sesión con Facebook:", error);
    throw error;
  }
};

export const esNicknameUnico = async (nickname) => {
  try {
    const q = query(collection(db, "jugadores"), where("nick", "==", nickname));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty;
  } catch (error) {
    console.error("Error al comprobar unicidad del nickname:", error);
    return false;
  }
};

export const guardarNicknameDeUsuario = async (uid, nickname) => {
  try {
    const jugadorDocRef = doc(db, "jugadores", uid);
    await updateDoc(jugadorDocRef, { nick: nickname });
    const snap = await getDoc(jugadorDocRef);
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    console.error("Error al guardar nickname:", error);
    throw error;
  }
};

export const comprarEncebollados = async (cantidad) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuario no autenticado");
  try {
    const jugadorDocRef = doc(db, "jugadores", user.uid);
    await updateDoc(jugadorDocRef, {
      moneda: increment(cantidad)
    });
    const snap = await getDoc(jugadorDocRef);
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    console.error("Error al acreditar Encebollados:", error);
    throw error;
  }
};