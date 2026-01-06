/******************************************************
 * MÉTHODE PRIX — Supports Souples / Rigides / Adhésifs
 *
 * RÈGLE REMISE (SR) :
 *  - COEF_PUBLIC (=3.5) appliqué sur les coûts "matières" :
 *      - matière support (JSON)
 *      - film de lamination (fournisseur)
 *  - Les prestations sont déjà en public :
 *      - découpe, impression, blanc, oeillets, application lamination
 *  - La remise SR s'applique sur :
 *      ✅ matière support
 *      ✅ film lamination
 *      ❌ application lamination
 *
 * Résultat :
 *   computePrixSouplesRigidesImpression(state)
 *     → Promise<{ prix_public_ht, prix_final_ht, detail }>
 ******************************************************/

// ------------------------
// 1. CONSTANTES TARIFAIRES
// ------------------------

// ⚠ À AJUSTER : prix d'impression au m² (HT) — déjà en prix public
const PRIX_IMPRESSION_M2 = 3; // € / m² (mets ta valeur ici)

// Découpe — déjà en prix public
const PRIX_DECOUPE_FORMAT_M2       = 3;   // € / m²
const PRIX_DECOUPE_COMPLEXE_Souple = 13;  // € / m²
const PRIX_DECOUPE_COMPLEXE_Rigide = 6;   // € / m²

// Lamination — prix fournisseur au m² (film)
const PRIX_FOURN_LAM_STANDARD      = 2.63;
const PRIX_FOURN_LAM_CONFORMABLE   = 6.55;
const PRIX_FOURN_LAM_ANTIGRAFFITI  = 8.55;
const PRIX_FOURN_LAM_ANTIDERAPANT  = 8.52;
const PRIX_FOURN_LAM_VELEDA        = 10.05;

// Application lamination — déjà en prix public (NON REMISÉE)
const PRIX_APPLICATION_LAM_M2      = 3;   // € / m²

// Blanc de soutien — déjà en prix public
const PRIX_BLANC_M2                = 3;   // € / m²

// Œillets — déjà en prix public
const PRIX_OEILLET_UNITE           = 1;   // € / pièce

// Coefficient prix public & minimum par article
const COEF_PUBLIC                  = 3.5;
const MIN_PAR_ARTICLE              = 5;   // € HT (par unité)


// ------------------------
// 2. CHARGEMENT DES TARIFS MATIÈRES (JSON)
// ------------------------

let COFEL_TARIFS_SR_PROMISE = null;

function normaliserTarifs(data) {
  if (Array.isArray(data)) {
    const map = {};
    data.forEach((row) => {
      if (!row) return;
      const k = row.key;
      let v = row.prix_fournisseur;
      if (k && v != null && !Number.isNaN(Number(v))) {
        map[k] = Number(v);
      }
    });
    return map;
  }
  const map = {};
  for (const k in data) {
    let v = data[k];
    if (v != null && !Number.isNaN(Number(v))) {
      map[k] = Number(v);
    }
  }
  return map;
}

function loadTarifsMatieresSR() {
  if (!COFEL_TARIFS_SR_PROMISE) {
    COFEL_TARIFS_SR_PROMISE = fetch("../data/prix-matieres-souples-rigides-impression.json")
      .then((res) => res.json())
      .then((data) => {
        const src = (data && typeof data === "object" && data.matieres)
          ? data.matieres
          : data;

        const map = normaliserTarifs(src);
        console.log("Tarifs matières SR chargés (MATIERES) :", map);
        return map;
      })
      .catch((err) => {
        console.error("Erreur chargement tarifs SR :", err);
        return {};
      });
  }
  return COFEL_TARIFS_SR_PROMISE;
}


// ------------------------
// 3. OUTILS
// ------------------------

function surfaceM2FromState(state) {
  const L = Number(state.largeur || 0); // mm
  const H = Number(state.hauteur || 0); // mm
  const Q = Math.max(1, Number(state.quantite || 1));
  if (!L || !H || !Q) return 0;
  const m2_unite = (L * H) / 1_000_000; // mm² → m²
  return m2_unite * Q;
}

function getTarifKeyForMaterial(state) {
  const { materialKey, variantKey } = state;

  if (materialKey === "polymer") {
    if (variantKey === "opaque_standard") return "polymer_opaque_standard";
    if (variantKey === "opaque_renforce") return "polymer_opaque_renforce";
    if (variantKey === "ultraclear")      return "polymer_ultraclear";
    return null;
  }

  if (materialKey === "microperfore") {
    if (variantKey === "transparent") return "microperfore_transparent";
    if (variantKey === "opaque")      return "microperfore_opaque";
    return null;
  }

  if (materialKey === "papierpeint") return "papierpeint";
  if (materialKey === "vinyl_teinte_masse") return "vinyl_teinte_masse";

  switch (materialKey) {
    case "depoli":       return "depoli";
    case "conformable":  return "conformable";
    case "magnetique":   return "magnetique";
    case "ardoisine":    return "ardoisine";
    case "pvc3":         return "pvc3";
    case "pvc5":         return "pvc5";
    case "pvc10":        return "pvc10";
    case "akilux35":     return "akilux35";
    case "plexi3":       return "plexi3";
    case "plexi5":       return "plexi5";
    case "plexi8":       return "plexi8";
    case "plexi10":      return "plexi10";
    case "dibond3":      return "dibond3";
    default:
      console.warn("Matière sans clé de tarif définie :", state);
      return null;
  }
}

function getClientDiscountSR() {
  try {
    const raw = localStorage.getItem("cofel_client_profile");
    if (!raw) return 0;

    const profile = JSON.parse(raw);
    if (!profile) return 0;

    let v = profile.discount_sr;
    if (v === undefined || v === null || v === "") return 0;

    if (typeof v === "string") v = v.replace(",", ".").trim();
    v = Number(v);

    if (!Number.isFinite(v)) return 0;

    const rate = (v > 1) ? (v / 100) : v;
    if (rate < 0 || rate > 0.9) return 0;

    return rate;
  } catch (e) {
    return 0;
  }
}

function round2(n){
  n = Number(n);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}


// ------------------------
// 4. CALCUL PRINCIPAL
// ------------------------

async function computePrixSouplesRigidesImpression(state) {
  const tarifsMatieres = await loadTarifsMatieresSR();

  const Q = Math.max(1, Number(state.quantite || 1));
  const m2 = surfaceM2FromState(state);

  const detail = {};
  detail.coef_public = COEF_PUBLIC;

  // =========================
  // A) MATIÈRE SUPPORT (REMISÉE)
  // =========================
  let prixMatierePublic = 0;

  const matKey = getTarifKeyForMaterial(state);
  const prixFournMat = matKey ? Number(tarifsMatieres[matKey] || 0) : 0;

  if (prixFournMat > 0 && m2 > 0) {
    prixMatierePublic = prixFournMat * COEF_PUBLIC * m2;
  }

  detail.prix_fourn_matiere_m2 = round2(prixFournMat);
  detail.prix_public_matiere   = round2(prixMatierePublic);

  // =========================
  // B) PRESTATIONS (NON REMISÉES)
  // =========================

  // --- Impression ---
  let prixImpression = 0;
  if (state.impression === "avec" && PRIX_IMPRESSION_M2 > 0 && m2 > 0) {
    prixImpression = PRIX_IMPRESSION_M2 * m2;
  }
  detail.prix_impression = round2(prixImpression);

  // --- Découpe ---
  let prixDecoupe = 0;
  if (state.decoupe === "Format") {
    prixDecoupe = PRIX_DECOUPE_FORMAT_M2 * m2;
  } else if (state.decoupe === "Complexe") {
    prixDecoupe = (state.support === "souple")
      ? (PRIX_DECOUPE_COMPLEXE_Souple * m2)
      : (PRIX_DECOUPE_COMPLEXE_Rigide * m2);
  }
  detail.prix_decoupe = round2(prixDecoupe);

  // --- Blanc de soutien ---
  let prixBlanc = 0;
  if (state.blanc && state.blanc !== "Non disponible" && m2 > 0) {
    if (String(state.blanc).toLowerCase().includes("avec")) {
      prixBlanc = PRIX_BLANC_M2 * m2;
    }
  }
  detail.prix_blanc = round2(prixBlanc);

  // --- Œillets ---
  let prixOeillets = 0;
  const nbOeillets = Number(state.oeillets || 0);
  if (nbOeillets > 0) {
    prixOeillets = nbOeillets * PRIX_OEILLET_UNITE;
  }
  detail.prix_oeillets = round2(prixOeillets);
  detail.nb_oeillets   = nbOeillets;

  // =========================
  // C) LAMINATION : FILM REMISÉ + APPLICATION NON REMISÉE
  // =========================
  let prixFournLam = 0;

  if (state.lamination && state.lamination !== "Non disponible") {
    if (state.lamination === "Anti-graffiti") {
      prixFournLam = PRIX_FOURN_LAM_ANTIGRAFFITI;
    } else if (state.lamination === "Anti-dérapante") {
      prixFournLam = PRIX_FOURN_LAM_ANTIDERAPANT;
    } else if (state.lamination === "Velleda") {
      prixFournLam = PRIX_FOURN_LAM_VELEDA;
    } else if (state.lamination === "Mate" || state.lamination === "Brillante") {
      if (state.support === "souple" && state.materialKey === "conformable") {
        prixFournLam = PRIX_FOURN_LAM_CONFORMABLE;
      } else {
        prixFournLam = PRIX_FOURN_LAM_STANDARD;
      }
    }
  }

  // Film (matière) → public via coef
  const lam_film_public_m2 = (prixFournLam > 0) ? (prixFournLam * COEF_PUBLIC) : 0;
  const lam_film_public_total = (lam_film_public_m2 > 0 && m2 > 0) ? (lam_film_public_m2 * m2) : 0;

  // Application → public fixe (non remisée)
  const lam_app_public_total = (prixFournLam > 0 && m2 > 0) ? (PRIX_APPLICATION_LAM_M2 * m2) : 0;

  const prixLaminationPublic = lam_film_public_total + lam_app_public_total;

  detail.prix_fourn_lam_m2 = round2(prixFournLam);
  detail.prix_public_lam_film_m2 = round2(lam_film_public_m2);
  detail.prix_public_lam_film_total = round2(lam_film_public_total);
  detail.prix_public_lam_app_total  = round2(lam_app_public_total);
  detail.prix_lamination = round2(prixLaminationPublic);

  // =========================
  // D) TOTAL PUBLIC
  // =========================
  const prixPublicHT =
    prixMatierePublic +
    prixImpression +
    prixDecoupe +
    prixBlanc +
    prixOeillets +
    prixLaminationPublic;

  detail.prix_public_ht = round2(prixPublicHT);

  // =========================
  // E) REMISE SR (matière support + film lamination)
  // =========================
  const discount = getClientDiscountSR();
  detail.remise_sr = discount;
  detail.mode_remise = "matiere_support + film_lamination";

  // Partie remisée :
  const remisable_public = prixMatierePublic + lam_film_public_total;
  const remisable_client = remisable_public * (1 - discount);

  // Partie NON remisée :
  const non_remisable_public =
    prixImpression +
    prixDecoupe +
    prixBlanc +
    prixOeillets +
    lam_app_public_total; // ✅ application lamination non remisée

  detail.remisable_public = round2(remisable_public);
  detail.remisable_client = round2(remisable_client);
  detail.non_remisable_public = round2(non_remisable_public);

  let prixFinalHT = remisable_client + non_remisable_public;

  // =========================
  // F) MINIMUM PAR ARTICLE (par unité)
  // =========================
  const minTotal = MIN_PAR_ARTICLE * Q;

  if (prixFinalHT > 0 && prixFinalHT < minTotal) {
    prixFinalHT = minTotal;
    detail.minimum_applique = true;
    detail.minimum_total_ht = round2(minTotal);
  } else {
    detail.minimum_applique = false;
    detail.minimum_total_ht = 0;
  }

  detail.prix_final_ht = round2(prixFinalHT);

  return {
    prix_public_ht: round2(prixPublicHT),
    prix_final_ht: round2(prixFinalHT),
    detail
  };
}
