/**
 * publicidad.js — Gestor de Publicidad del Juego (Google AdSense & Contingencia Local)
 */

const CAMPAIGN_OFFERS = [
  {
    title: "¡SKINS PREMIUM!",
    desc: "Viste al Chulquero con estilo. ¡Consigue el traje del Diablo Huma hoy!",
    image: "assets/sprites/skin_diablo_huma.png",
    action: "SkinsScene",
    color: "#ff3333"
  },
  {
    title: "ENCEBOLILADOS EXTRA",
    desc: "¡Compra encebollados ahora y desbloquea el Pase de Batalla Chulla!",
    image: "assets/ui/encebollado.png",
    action: "SeasonPassScene",
    color: "#ffcc00"
  },
  {
    title: "¡DALE UN JUGO DE MORA!",
    desc: "Baja la deuda con tus ganancias o tómate un descanso refrescante.",
    image: "assets/ui/juguito_mora.png",
    action: "ShopScene",
    color: "#aa3bff"
  }
];

class PublicidadManager {
  constructor() {
    this.adSenseLoaded = false;
    this.adBlockActive = false;
    this.currentCampaignIndex = 0;
  }

  /**
   * Inicializa el servicio de anuncios.
   * Intenta cargar Google AdSense y detecta si hay AdBlock activo.
   */
  async iniciar() {
    try {
      await this.cargarGoogleAdSense();
      this.iniciarGoogleAds();
    } catch (error) {
      console.warn("Google AdSense bloqueado o no disponible. Iniciando anuncios locales alternativos:", error);
      this.adBlockActive = true;
      this.iniciarCampaniasLocales();
    }
  }

  /**
   * Inyecta el script de Google AdSense en el head.
   */
  cargarGoogleAdSense() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-mock';
      script.crossOrigin = 'anonymous';

      script.onload = () => {
        this.adSenseLoaded = true;
        resolve();
      };

      script.onerror = () => {
        reject(new Error("AdBlock detectado o error de red de Google."));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Intenta empujar y renderizar los anuncios de Google AdSense.
   */
  iniciarGoogleAds() {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      console.log("Anuncios de Google AdSense inicializados con éxito.");
    } catch (e) {
      console.warn("Error al empujar anuncios de AdSense, cargando contingencia local:", e);
      this.adBlockActive = true;
      this.iniciarCampaniasLocales();
    }
  }

  /**
   * Genera anuncios de marca propios interactivos del juego para las barras laterales.
   */
  iniciarCampaniasLocales() {
    const leftPanel = document.getElementById('left-ad-panel');
    const rightPanel = document.getElementById('right-ad-panel');

    if (!leftPanel || !rightPanel) return;

    // Inyectar estructura visual para anuncios locales
    this.renderizarAnuncioLocal(leftPanel, "left");
    this.renderizarAnuncioLocal(rightPanel, "right");

    // Rotar anuncios cada 15 segundos
    setInterval(() => {
      this.currentCampaignIndex = (this.currentCampaignIndex + 1) % CAMPAIGN_OFFERS.length;
      this.renderizarAnuncioLocal(leftPanel, "left");
      this.renderizarAnuncioLocal(rightPanel, "right");
    }, 15000);
  }

  renderizarAnuncioLocal(panelElement, side) {
    // Tomar campaña (izquierda toma campaña actual, derecha la siguiente para no repetir idénticas)
    const campaignOffset = side === "left" ? 0 : 1;
    const campaign = CAMPAIGN_OFFERS[(this.currentCampaignIndex + campaignOffset) % CAMPAIGN_OFFERS.length];

    const container = panelElement.querySelector('.ad-banner-container');
    if (!container) return;

    container.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        height: 100%;
        padding: 20px 10px;
        box-sizing: border-box;
        background: linear-gradient(180deg, #16171d 0%, #0d0e12 100%);
        font-family: 'Arial', sans-serif;
        text-align: center;
      ">
        <div style="font-size: 10px; color: #444; text-transform: uppercase; letter-spacing: 1px;">Patrocinado</div>
        
        <div style="
          margin: 15px 0;
          padding: 8px;
          border-radius: 5px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid ${campaign.color};
          color: ${campaign.color};
          font-weight: bold;
          font-size: 13px;
          letter-spacing: 0.5px;
        ">
          ${campaign.title}
        </div>

        <div style="flex-grow: 1; display: flex; justify-content: center; align-items: center; margin: 10px 0;">
          <img src="${campaign.image}" style="max-width: 90px; max-height: 120px; object-fit: contain; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));" alt="anuncio" />
        </div>

        <p style="font-size: 11px; color: #aaa; line-height: 1.4; margin: 10px 0; min-height: 50px;">
          ${campaign.desc}
        </p>

        <button style="
          background: ${campaign.color};
          color: #000000;
          border: none;
          padding: 8px 16px;
          font-weight: bold;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
          text-transform: uppercase;
          transition: transform 0.2s;
        " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
          Ver Oferta
        </button>
      </div>
    `;
  }
}

export const Publicidad = new PublicidadManager();
