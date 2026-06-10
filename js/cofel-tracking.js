(function(){
  const WORKER_BASE = "https://cofel-auth.sonveven.workers.dev";
  const CLIENT_KEY = "cofel_client_profile";
  const STORAGE_KEY = "devisCourant_v1";

  function readClient(){
    try {
      return JSON.parse(localStorage.getItem(CLIENT_KEY) || "{}");
    } catch(e) {
      return {};
    }
  }

  function readQuote(){
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch(e) {
      return {};
    }
  }

  function getProductType(){
    return document.body?.dataset?.productType
      || window.COFEL_PRODUCT_TYPE
      || document.title
      || "page";
  }

  function postEvent(eventType, extra){
    try {
      const client = readClient();

      const payload = {
        eventType,
        clientEmail: client.email || "",
        clientCompany: client.company || "",
        page: location.pathname,
        productType: getProductType(),
        totalHT: Number(extra?.totalHT || 0),
        totalTTC: Number(extra?.totalTTC || 0),
        linesCount: Number(extra?.linesCount || 0),
        details: {
          ...(extra || {}),
          url: location.href,
          userAgent: navigator.userAgent
        }
      };

      fetch(`${WORKER_BASE}/track-event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch((err) => {
        console.warn("Erreur tracking Cofel :", err);
      });

    } catch(err) {
      console.warn("Tracking Cofel impossible :", err);
    }
  }

  function quoteTotalsFromStorage(){
    const quote = readQuote();
    const lignes = Array.isArray(quote.lignes) ? quote.lignes : [];

    const totalHT = lignes.reduce((sum, l) => {
      const totalLigne = Number(l.total_ligne_ht || 0);
      if (totalLigne) return sum + totalLigne;

      const q = Number(l.quantite || 0);
      const pu = Number(l.pu_net_ht || 0);
      return sum + q * pu;
    }, 0);

    return {
      totalHT: Number(totalHT.toFixed(2)),
      totalTTC: Number((totalHT * 1.2).toFixed(2)),
      linesCount: lignes.length,
      lignes
    };
  }

  // Ouverture de page
  postEvent("page_view", {
    title: document.title
  });

  // Clic sur "Ajouter au devis" ou "Exporter"
  document.addEventListener("click", function(e){
    const btn = e.target.closest("button, a");
    if (!btn) return;

    const txt = (btn.textContent || "").toLowerCase();
    const id = btn.id || "";

    if (id === "btnAddDevis" || txt.includes("ajouter au devis")) {
      setTimeout(() => {
        const t = quoteTotalsFromStorage();

        postEvent("add_to_quote", {
          ...t,
          button: btn.textContent.trim()
        });
      }, 800);
    }

    if (id === "btnPdf" || txt.includes("exporter")) {
      const t = quoteTotalsFromStorage();

      postEvent("export_pdf", {
        ...t,
        button: btn.textContent.trim()
      });
    }
  });

  // Snapshot panier sur la page index uniquement
  if (
    location.pathname.endsWith("/index.html") ||
    location.pathname === "/" ||
    location.pathname === ""
  ) {
    let lastSnapshot = 0;

    function snapshot(){
      const now = Date.now();
      if (now - lastSnapshot < 30000) return;
      lastSnapshot = now;

      const t = quoteTotalsFromStorage();
      if (t.linesCount > 0) {
        postEvent("quote_snapshot", t);
      }
    }

    window.addEventListener("focus", snapshot);

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) snapshot();
    });

    setTimeout(snapshot, 2000);
  }

  window.CofelTrack = postEvent;
})();
