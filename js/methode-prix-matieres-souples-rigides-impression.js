/********************************************************************
 * PRICING ENGINE COFEL
 * Lit pricing.json et calcule : matières, options, minimums,
 * lamination avec matière + application, découpe souple/rigide,
 * oeillets, blancs, impression, prix public et remise.
 ********************************************************************/

let PRICING = null;

export async function loadPricing() {
  if (!PRICING) {
    const res = await fetch("../data/pricing.json");
    PRICING = await res.json();
  }
  return PRICING;
}


// ---------------------------------------------------------------
// Calcul du prix des matières
// ---------------------------------------------------------------
function calcPrixMatiere(matiereKey, surface, pricing) {
  const prixFournisseur = pricing.matieres[matiereKey] || 0;

  const prixPublicM2 = prixFournisseur * pricing.coeff_public;
  return prixPublicM2 * surface;
}


// ---------------------------------------------------------------
// Calcul impression
// ---------------------------------------------------------------
function calcImpression(surface, pricing) {
  const brut = pricing.impression.prix_m2 * surface;
  return Math.max(brut, pricing.impression.minimum);
}


// ---------------------------------------------------------------
// Calcul découpe
// ---------------------------------------------------------------
function calcDecoupe(type, surface, pricing, isRigide) {
  if (type === "Format")
    return pricing.decoupe.format * surface;

  if (type === "Complexe") {
    return isRigide
      ? pricing.decoupe.complexe_rigide * surface
      : pricing.decoupe.complexe_souple * surface;
  }

  return 0;
}


// ---------------------------------------------------------------
// Lamination (matière × coeff_public + application)
// ---------------------------------------------------------------
function calcLamination(lamKey, surface, pricing) {
  if (!lamKey) return 0;

  const prixFournisseur = pricing.matieres[lamKey] || 0;

  const prixMatiere = prixFournisseur * pricing.coeff_public * surface;
  const prixApplication = pricing.lamination_application_m2 * surface;

  return prixMatiere + prixApplication;
}


// ---------------------------------------------------------------
// Blanc de soutien
// ---------------------------------------------------------------
function calcBlanc(surface, pricing) {
  return pricing.blanc_soutien_m2 * surface;
}


// ---------------------------------------------------------------
// Œillets
// ---------------------------------------------------------------
function calcOeillets(qty, pricing) {
  return qty * pricing.oeillet_unite;
}


// ---------------------------------------------------------------
//  CALCUL FINAL
// ---------------------------------------------------------------
export async function computePrice(selection) {
  const pricing = await loadPricing();

  const surface = (selection.largeur * selection.hauteur) / 1_000_000;

  const isRigide = selection.support === "rigide";

  const pMatiere = calcPrixMatiere(selection.matiere_key, surface, pricing);
  const pImpression = selection.impression === "avec"
    ? calcImpression(surface, pricing)
    : 0;

  const pDecoupe = calcDecoupe(selection.decoupe, surface, pricing, isRigide);

  const pLamination = selection.lamination_key
    ? calcLamination(selection.lamination_key, surface, pricing)
    : 0;

  const pBlanc = selection.blanc ? calcBlanc(surface, pricing) : 0;

  const pOeillets = calcOeillets(selection.oeillets || 0, pricing);

  const total =
    pMatiere +
    pImpression +
    pDecoupe +
    pLamination +
    pBlanc +
    pOeillets;

  const totalAvecMinimum = Math.max(total, pricing.prix_minimum_article);

  return {
    surface,
    detail: {
      matiere: pMatiere,
      impression: pImpression,
      decoupe: pDecoupe,
      lamination: pLamination,
      blanc: pBlanc,
      oeillets: pOeillets
    },
    total: totalAvecMinimum
  };
}

