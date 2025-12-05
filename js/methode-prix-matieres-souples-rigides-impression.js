/******************************************************
 * MÉTHODE PRIX — Supports Souples / Rigides / Adhésifs
 * Utilise le fichier JSON ../data/prix-matieres-souples-rigides-impression.json
 * + les règles métier que tu as validées.
 *
 * Résultat :
 *   computePrixSouplesRigidesImpression(state)
 *     → Promise<{ prix_public_ht, prix_final_ht, detail }>
 ******************************************************/

// ------------------------
// 1. CONSTANTES TARIFAIRES
// ------------------------

// ⚠ À AJUSTER : prix d'impression au m² (HT)
const PRIX_IMPRESSION_M2 = 0; // € / m² (mets ta valeur ici)

// Découpe
const PRIX_DECOUPE_FORMAT_M2       = 3;   // € / m²
const PRIX_DECOUPE_COMPLEXE_Souple = 13;  // € / m²
const PRIX_DECOUPE_COMPLEXE_Rigide = 6;   // € / m²

// Lamination — prix fournisseur au m²
const PRIX_FOURN_LAM_STANDARD      = 2.63;
const PRIX_FOURN_LAM_CONFORMABLE   = 6.55;
const PRIX_FOURN_LAM_ANTIGRAFFITI  = 8.55;
const PRIX_FOURN_LAM_ANTIDERAPANT  = 8.52;
const PRIX_FOURN_LAM_VELEDA        = 10.05;

// Application lamination
const PRIX_APPLICATION_LAM_M2      = 3;   // € / m²

// Blanc de soutien
const PRIX_BLANC_M2                = 3;   // € / m²

// Œillets
const PRIX_OEILLET_UNITE           = 1;   // € / pièce

// Coefficient prix public & minimum par article
const COEF_PUBLIC                  = 3.5;
const MIN_PAR_ARTICLE              = 5;   // € HT

// ------------------------
// 2. CHARGEMENT DES TARIFS MATIÈRES (JSON)
// ------------------------

let COFEL_TARIFS_SR_PROMISE = null;

/**
 * Normalise le JSON quelle que soit sa forme :
 *  - soit tableau [{key, prix_fournisseur}, ...]
 *  - soit objet { key: prix, ... }
 */
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
  // si c'est déjà une map clé → prix
  const map = {};
  for (const k in data) {
    let v = data[k];
    if (v != null && !Number.isNaN(Number(v))) {
      map[k] = Number(v);
    }
  }
  return map;
}

/**
 * Charge les tarifs matières depuis le JSON, une seule fois.
 */
function loadTarifsMatieresSR() {
  if (!COFEL_TARIFS_SR_PROMISE) {
    COFEL_TARIFS_SR_PROMISE = fetch("../data/prix-matieres-souples-rigides-impression.json")
      .then((res) => res.json())
      .then((data) => {
        const map = normaliserTarifs(data);
        console.log("Tarifs matières SR chargés :", map);
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

/**
 * Calcule la surface totale en m² (avec la quantité)
 */
function surfaceM2FromState(state) {
  const L = Number(state.largeur || 0); // mm
  const H = Number(state.hauteur || 0); // mm
  const Q = Number(state.quantite || 1);

  if (!L || !H || !Q) return 0;

  const m2_unite = (L * H) / 1_000_000; // mm² → m²
  return m2_unite * Q;
}

/**
 * Récupère la clé du tableau de tarifs pour la matière choisie.
 * (basée sur la colonne "key" de ton Excel)
 */
function getTarifKeyForMaterial(state) {
  const { support, materialKey, variantKey } = state;

  // Adhésifs polymères
  if (materialKey === "polymer") {
    if (variantKey === "opaque_standard") return "polymer_opaque_standard";
    if (variantKey === "opaque_renforce") return "polymer_opaque_renforce";
    if (variantKey === "ultraclear")      return "polymer_ultraclear";
    return null;
  }

  // Micro-perforés
  if (materialKey === "microperfore") {
    if (variantKey === "transparent") return "microperfore_transparent";
    if (variantKey === "opaque")      return "microperfore_opaque";
    return null;
  }

  // Papier peint
  if (materialKey === "papierpeint") {
    return "papierpeint";
  }

  // Vinyle teinté masse
  if (materialKey === "vinyl_teinte_masse") {
    return "vinyl_teinte_masse";
  }

  // Autres : mêmes clés que dans le ruleset + Excel
  switch (materialKey) {
    case "depoli":    return "depoli";
    case "conformable": return "conformable";
    case "magnetique":  return "magnetique";
    case "ardoisine":   return "ardoisine";
    case "pvc3":        return "pvc3";
    case "pvc5":        return "pvc5";
    case "pvc10":       return "pvc10";
    case "akilux35":    return "akilux35";
    case "plexi3":      return "plexi3";
    case "plexi5":      return "plexi5";
    case "plexi8":      return "plexi8";
    case "plexi10":     return "plexi10";
    case "dibond3":     return "dibond3";
    default:
      console.warn("Matière sans clé de tarif définie :", state);
      return null;
  }
}

/**
 * Récupère la remise client spécifique à ce configurateur.
 * -> on attend dans localStorage.cofel_client_profile un champ "discount_sr"
 *    entre 0 et 1 (ex : 0.6 pour -60%) ou 0–100 (ex : 60).
 */
function getClientDiscountSR() {
  try {
    const raw = localStorage.getItem("cofel_client_profile");
    if (!raw) return 0;
    const profile = JSON.parse(raw);
    if (!profile) return 0;

    let v = profile.discount_sr ?? 0;
    if (typeof v === "string") v = v.replace(",", ".");
    v = Number(v);
    if (!Number.isFinite(v)) return 0;

    if (v > 1) {
      // si c'est en %, ex : 60 → 0.6
      return v / 100;
    }
    if (v < 0) return 0;
    if (v > 0.9) return 0.9; // petit garde-fou
    return v;
  } catch (e) {
    console.error("Erreur lecture remise SR :", e);
    return 0;
  }
}

// ------------------------
// 4. CALCUL PRINCIPAL
// ------------------------

/**
 * Calcule tous les prix à partir du state du configurateur.
 * @param {object} state - même objet que dans souples-rigides-adhesifs.js
 * @returns Promise<{ prix_public_ht, prix_final_ht, detail }>
 */
async function computePrixSouplesRigidesImpression(state) {
  const tarifsMatieres = await loadTarifsMatieresSR();
  const m2 = surfaceM2FromState(state);
  const detail = {};

  // --- Prix matière ---
  let prixMatierePublic = 0;
  const matKey = getTarifKeyForMaterial(state);
  const prixFournMat = matKey ? Number(tarifsMatieres[matKey] || 0) : 0;

  if (prixFournMat > 0 && m2 > 0) {
    prixMatierePublic = prixFournMat * COEF_PUBLIC * m2;
  }
  detail.prix_fourn_matiere_m2 = prixFournMat;
  detail.prix_public_matiere   = prixMatierePublic;

  // --- Impression ---
  let prixImpression = 0;
  if (state.impression === "avec" && PRIX_IMPRESSION_M2 > 0 && m2 > 0) {
    prixImpression = PRIX_IMPRESSION_M2 * m2;
  }
  detail.prix_impression = prixImpression;

  // --- Découpe ---
  let prixDecoupe = 0;
  if (state.decoupe === "Format") {
    prixDecoupe = PRIX_DECOUPE_FORMAT_M2 * m2;
  } else if (state.decoupe === "Complexe") {
    if (state.support === "souple") {
      prixDecoupe = PRIX_DECOUPE_COMPLEXE_Souple * m2;
    } else {
      prixDecoupe = PRIX_DECOUPE_COMPLEXE_Rigide * m2;
    }
  }
  detail.prix_decoupe = prixDecoupe;

  // --- Lamination ---
  let prixLaminationPublic = 0;
  if (state.lamination && state.lamination !== "Non disponible" && m2 > 0) {
    let prixFournLam = 0;

    if (state.lamination === "Anti-graffiti") {
      prixFournLam = PRIX_FOURN_LAM_ANTIGRAFFITI;
    } else if (state.lamination === "Anti-dérapante") {
      prixFournLam = PRIX_FOURN_LAM_ANTIDERAPANT;
    } else if (state.lamination === "Velleda") {
      prixFournLam = PRIX_FOURN_LAM_VELEDA;
    } else if (state.lamination === "Mate" || state.lamination === "Brillante") {
      // Cas particulier : lamination conformable
      if (state.support === "souple" && state.materialKey === "conformable") {
        prixFournLam = PRIX_FOURN_LAM_CONFORMABLE;
      } else {
        prixFournLam = PRIX_FOURN_LAM_STANDARD;
      }
    }

    if (prixFournLam > 0) {
      const prix_public_lam_m2 = prixFournLam * COEF_PUBLIC + PRIX_APPLICATION_LAM_M2;
      prixLaminationPublic = prix_public_lam_m2 * m2;
      detail.prix_fourn_lam_m2   = prixFournLam;
      detail.prix_public_lam_m2  = prix_public_lam_m2;
    }
  }
  detail.prix_lamination = prixLaminationPublic;

  // --- Blanc de soutien ---
  let prixBlanc = 0;
  if (state.blanc && state.blanc !== "Non disponible" && m2 > 0) {
    // On facture seulement si l'option choisie contient "Avec"
    if (String(state.blanc).toLowerCase().includes("avec")) {
      prixBlanc = PRIX_BLANC_M2 * m2;
    }
  }
  detail.prix_blanc = prixBlanc;

  // --- Œillets ---
  let prixOeillets = 0;
  const nbOeillets = Number(state.oeillets || 0);
  if (nbOeillets > 0) {
    prixOeillets = nbOeillets * PRIX_OEILLET_UNITE;
  }
  detail.prix_oeillets = prixOeillets;
  detail.nb_oeillets   = nbOeillets;

  // --- TOTAL PUBLIC ---
  let prixPublicHT =
    prixMatierePublic +
    prixImpression +
    prixDecoupe +
    prixLaminationPublic +
    prixBlanc +
    prixOeillets;

  // --- Remise client spécifique configurateur SR ---
  const discount = getClientDiscountSR(); // 0 → 1
  detail.remise_sr = discount;

  let prixFinalHT = prixPublicHT * (1 - discount);

  // Minimum par article
  if (prixFinalHT > 0 && prixFinalHT < MIN_PAR_ARTICLE) {
    prixFinalHT = MIN_PAR_ARTICLE;
    detail.minimum_applique = true;
  } else {
    detail.minimum_applique = false;
  }

  return {
    prix_public_ht: prixPublicHT,
    prix_final_ht: prixFinalHT,
    detail
  };
}
