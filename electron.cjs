// electron.cjs (En la raíz de tu proyecto: chulco-scape/)
const { app, BrowserWindow } = require('electron');
const path = require('path');
const steamworks = require('steamworks.js');

let mainWindow;

try {
  // Inicializa la API de Steam (480 es el ID de prueba de Spacewar)
  const client = steamworks.init(480); 
  
  // CORRECCIÓN: Se usa localplayer en lugar de localuser
  const nombreJugador = client.localplayer?.getName() || 'Usuario de Steam';
  console.log("¡Steam conectado con éxito! Jugador:", nombreJugador);
} catch (e) {
  console.error("Steam no detectado:", e);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    useContentSize: true,
    fullscreen: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  mainWindow.setMenuBarVisibility(false);
  
  // 1. REVISA ESTA LÍNEA (¿Tu Vite compila en 'dist' o en 'www'? Por defecto Vite usa 'dist')
  mainWindow.loadFile(path.join(__dirname, 'www/index.html')); 

  // 💡 2. AGREGA ESTA LÍNEA JUSTO AQUÍ PARA VER EL ERROR:
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createWindow);