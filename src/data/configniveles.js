export const CONFIG_NIVELES = {
  nivel_1: {
    nombre: "La Bahía",
    clave: "nivel_1",
    fondoKey: "fondo_nivel1",
    mapaAnchoFactor: 3.75,
    mapaAltoFactor: 3,
    edificios: [
      { x: 400,  y: 300,  w: 320, h: 260 },
      { x: 1200, y: 200,  w: 280, h: 320 },
      { x: 2100, y: 400,  w: 350, h: 240 },
      { x: 3000, y: 250,  w: 400, h: 300 },
      { x: 600,  y: 1100, w: 300, h: 280 },
      { x: 1700, y: 1300, w: 360, h: 350 },
      { x: 2800, y: 1050, w: 290, h: 400 },
      { x: 900,  y: 2000, w: 340, h: 300 },
      { x: 2000, y: 1900, w: 420, h: 260 },
      { x: 3100, y: 1700, w: 310, h: 380 },
      { x: 3800, y: 350,  w: 260, h: 420 },
      { x: 4300, y: 800,  w: 400, h: 280 },
      { x: 3950, y: 1400, w: 340, h: 320 },
      { x: 4400, y: 2000, w: 380, h: 360 }
    ]
  },
  nivel_2: {
    nombre: "El Centro",
    clave: "nivel_2",
    fondoKey: "fondo_nivel2",
    mapaAnchoFactor: 4,
    mapaAltoFactor: 4,
    edificios: [
      // Zona superior
      { x: 300,  y: 300,  w: 400, h: 400 },
      { x: 1200, y: 300,  w: 350, h: 450 },
      { x: 2200, y: 200,  w: 420, h: 300 },
      { x: 3300, y: 300,  w: 500, h: 360 },
      { x: 4300, y: 200,  w: 400, h: 400 },

      // Zona central
      { x: 500,  y: 1100, w: 350, h: 450 },
      { x: 1600, y: 1100, w: 450, h: 380 },
      { x: 2800, y: 1000, w: 360, h: 420 },
      { x: 4000, y: 1000, w: 400, h: 500 },

      // Zona inferior
      { x: 200,  y: 2100, w: 480, h: 320 },
      { x: 1100, y: 2200, w: 340, h: 460 },
      { x: 2200, y: 2000, w: 500, h: 300 },
      { x: 3200, y: 2100, w: 400, h: 350 },
      { x: 4200, y: 2200, w: 320, h: 500 },
      { x: 1500, y: 2800, w: 600, h: 400 } 
    ]
  }
};