// devis-core.js — moteur de devis Cofel (version adaptée remises configurateurs)
// -----------------------------------------------------------------------------
// Principes :
// - Les configurateurs envoient des PU DÉJÀ REMISÉS (pu_public_ht).
// - Le devis n'applique plus de remise additionnelle (remise_pct = 0).
// - Les lignes de type "transport" ne sont jamais remisées.
// - API compatible avec l'ancien code : Devis.computeTotals(), Devis.addLine(), etc.

(function (global) {
  "use strict";

  const STORAGE_KEY = "devisCourant_v1";
  const TVA_RATE = 0.20;

  function readStore() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function writeStore(obj) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  }

  function ensureState() {
    const st = readStore();
    if (!Array.isArray(st.lignes)) st.lignes = [];
    if (typeof st.remise_pct !== "number") st.remise_pct = 0;
    return st;
  }

  function reload() {
  const st = ensureState();

  // Migration automatique des anciennes lignes
  if (Array.isArray(st.lignes)) {
    st.lignes = st.lignes.map(l => {
      const q = Number(l.quantite || 1);

      // Si nouvelle version déjà appliquée : on garde
      if (l.pu_public_ht !== undefined && l.pu_remise_ht !== undefined) {
        return l;
      }

      // Ancienne version : on migre
      const pu_old = Number(l.pu_net_ht || 0);

      return {
        id: l.id,
        type: l.type || "",
        designation: l.designation || "Ligne",
        quantite: q,

        pu_public_ht: pu_old,               // fallback : on considère que ton ancien PU était déjà le remisé
        pu_remise_ht: pu_old,

        total_public_ht: +(q * pu_old).toFixed(2),
        total_remise_ht: +(q * pu_old).toFixed(2),

        // Champs historiques pour compat
        pu_net_ht: pu_old,
        total_ligne_ht: +(q * pu_old).toFixed(2)
      };
    });
  }

  writeStore(st);
}


  function clearAll(hard) {
    const st = ensureState();
    st.lignes = [];
    // on garde remise_pct à 0 par cohérence
    st.remise_pct = 0;
    writeStore(st);
  }

  function addLine(line) {
    const st = ensureState();

    const id = "L" + Date.now().toString(36) + Math.random().toString(16).slice(2);

    const q = Number(line.quantite || 1);
    // PU remisé envoyé par les configurateurs : pu_public_ht
    // on accepte aussi pu_net_ht pour compat
    const pu = Number(
      line.pu_public_ht !== undefined
        ? line.pu_public_ht
        : (line.pu_net_ht !== undefined ? line.pu_net_ht : 0)
    );

    const total = +(q * pu).toFixed(2);

    // Nouveau format : on stocke les deux prix
const pu_public = Number(line.pu_public_ht !== undefined ? line.pu_public_ht : pu);
const pu_remise = Number(line.pu_remise_ht !== undefined ? line.pu_remise_ht : pu);

st.lignes.push({
  id,
  type: line.type || "",
  designation: line.designation || "Ligne",
  quantite: q,

  // anciens champs "compat"
  pu_net_ht: pu_remise,
  total_ligne_ht: +(q * pu_remise).toFixed(2),

  // nouveaux champs
  pu_public_ht: pu_public,
  pu_remise_ht: pu_remise,
  total_public_ht: +(q * pu_public).toFixed(2),
  total_remise_ht: +(q * pu_remise).toFixed(2)
});


    writeStore(st);
    return id;
  }

  function removeLine(id) {
    const st = ensureState();
    st.lignes = st.lignes.filter(l => l.id !== id);
    writeStore(st);
  }

  function updateQty(id, q) {
    q = Number(q);
    if (!(q > 0)) return;
    const st = ensureState();
    const l = st.lignes.find(x => x.id === id);
    if (!l) return;
    l.quantite = q;
    l.total_ligne_ht = +(q * Number(l.pu_net_ht || 0)).toFixed(2);
    writeStore(st);
  }
  // === RÉCUPÉRER UNE LIGNE PAR ID ===
  function getLine(id) {
    const st = ensureState();
    return (st.lignes || []).find(l => l.id === id) || null;
  }

  // === METTRE À JOUR DÉSIGNATION / PRIX D’UNE LIGNE ===
  function updateLine(id, patch) {
    const st = ensureState();
    const lignes = st.lignes || [];
    const idx = lignes.findIndex(l => l.id === id);
    if (idx === -1) return;

    const old = lignes[idx];

   // Fusion de l’ancienne ligne avec les nouvelles valeurs
const updated = { ...old, ...patch };

// Quantité
const q = Number(updated.quantite || 1);

// Détection : est-ce que l’admin modifie le prix ?
const adminDidNotEditPrice =
  patch.pu_public_ht === undefined &&
  patch.pu_remise_ht === undefined &&
  patch.pu_net_ht === undefined;

// 👉 CAS 1 : l’admin NE TOUCHE PAS AU PRIX → on NE recalcul PAS le PU
if (adminDidNotEditPrice) {
  const pu = Number(old.pu_net_ht || 0);

  updated.pu_public_ht   = pu;
  updated.pu_remise_ht   = pu;
  updated.pu_net_ht      = pu;

  updated.total_public_ht = +(q * pu).toFixed(2);
  updated.total_remise_ht = +(q * pu).toFixed(2);
  updated.total_ligne_ht  = +(q * pu).toFixed(2);

  lignes[idx] = updated;
  st.lignes = lignes;
  writeStore(st);
  return;
}

// 👉 CAS 2 : l’admin MODIFIE le PU → recalcul normal
const pu = Number(
  updated.pu_public_ht !== undefined ? updated.pu_public_ht :
  updated.pu_remise_ht !== undefined ? updated.pu_remise_ht :
  updated.pu_net_ht !== undefined ? updated.pu_net_ht : 0
);

updated.pu_public_ht   = pu;
updated.pu_remise_ht   = pu;
updated.pu_net_ht      = pu;

updated.total_public_ht = +(q * pu).toFixed(2);
updated.total_remise_ht = +(q * pu).toFixed(2);
updated.total_ligne_ht  = +(q * pu).toFixed(2);

lignes[idx] = updated;
st.lignes = lignes;
writeStore(st);

  }

  function computeTotals() {
    const st = ensureState();
    const lignes = st.lignes;

    // remise globale désactivée sur le devis (tout est déjà remisé dans les PU)
    const remise_pct = 0;

    let sumNonTransport = 0;
    let sumTransport = 0;

    for (const l of lignes) {
      const total = Number(l.total_ligne_ht || 0);
      if ((l.type || "").toLowerCase() === "transport") {
        sumTransport += total;
      } else {
        sumNonTransport += total;
      }
    }

    // remise éventuelle (aujourd'hui 0) uniquement sur les lignes hors transport
    const afterDiscount = sumNonTransport * (1 - remise_pct / 100);

    const total_ht = +(afterDiscount + sumTransport).toFixed(2);
    const tva = +(total_ht * TVA_RATE).toFixed(2);
    const total_ttc = +(total_ht + tva).toFixed(2);

    return {
      remise_pct,
      lignes,
      total_ht,
      tva,
      total_ttc
    };
  }

  function setRemise(v) {
    // pour compatibilité, mais on force à 0 pour éviter toute double remise
    const st = ensureState();
    st.remise_pct = 0;
    writeStore(st);
  }

    const api = {
    reload,
    clearAll,
    addLine,
    removeLine,
    updateQty,
    computeTotals,
    setRemise,
    getLine,
    updateLine
  };


  // export global comme avant (window.Devis)
  global.Devis = api;

})(typeof window !== "undefined" ? window : this);
