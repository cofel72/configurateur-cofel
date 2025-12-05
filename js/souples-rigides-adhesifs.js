/******************************************************
 * CONFIGURATEUR COFEL — Supports SOUPLES / RIGIDES / ADHÉSIFS
 * Version dynamique pilotée par MATERIAL_RULES + calcul de prix
 * Étapes : Support → Impression → Matière → Variante →
 * Découpe → Lamination → Blanc → (Œillets si applicable) →
 * Format → Récap
 *
 * ⚠ Nécessite :
 *   - souples-rigides-adhesifs-rules.js
 *   - methode-prix-matieres-souples-rigides-impression.js
 ******************************************************/

document.addEventListener("DOMContentLoaded", () => {

  console.log("JS configurateur SR chargé ✔");
  
  /* ============================================================
     1 — ÉTAT GLOBAL
  ============================================================ */
  const state = {
    support: null,
    impression: null,
    materialKey: null,
    materialLabel: null,
    variantKey: null,
    variantLabel: null,
    decoupe: null,
    lamination: null,
    blanc: null,
    oeillets: 0,
    largeur: null,
    hauteur: null,
    quantite: 1
  };

  /* ============================================================
     2 — OUTILS
  ============================================================ */

  const id = x => document.getElementById(x);

  function getRule() {
    return MATERIAL_RULES[state.support + "_" + state.impression][state.materialKey];
  }

  function getVariantRule() {
    const r = getRule();
    if (!r.variants) return null;
    return r.variants[state.variantKey];
  }

  function isVariantStepRequired() {
    const r = MATERIAL_RULES[state.support + "_" + state.impression][state.materialKey];
    return r.variants !== null;
  }

  /* ============================================================
     3 — REMPLISSAGE DES ÉTAPES
  ============================================================ */

  /********** ÉTAPE 3 — MATIÈRES **********/
  function populateMaterials() {
    const cont = id("listeMatieres");
    cont.innerHTML = "";

    const list = MATERIAL_RULES[state.support + "_" + state.impression];
    for (let key in list) {
      const m = list[key];
      const lbl = document.createElement("label");
      lbl.innerHTML = `
        <input type="radio" name="material" value="${key}">
        ${m.label}
      `;
      cont.appendChild(lbl);
    }
  }

  /********** ÉTAPE 4 — VARIANTES **********/
  function populateVariants() {
    const cont = id("listeVariantes");
    cont.innerHTML = "";

    const r = getRule();
    const variants = r.variants;

    for (let key in variants) {
      const v = variants[key];
      const lbl = document.createElement("label");
      lbl.innerHTML = `
        <input type="radio" name="variant" value="${key}">
        ${v.label}
      `;
      cont.appendChild(lbl);
    }
  }

  /********** ÉTAPE 5 — DÉCOUPE **********/
  function populateDecoupe() {
    const cont = id("decoupeContainer");
    cont.innerHTML = "";

    const rule = getVariantRule() || getRule();
    const list = rule.decoupe;

    list.forEach(opt => {
      const lbl = document.createElement("label");
      lbl.innerHTML = `
        <input type="radio" name="decoupe" value="${opt}">
        Découpe ${opt === "Format" ? "Au format" : opt}
      `;
      cont.appendChild(lbl);
    });
  }

  /********** ÉTAPE 6 — LAMINATION **********/
  function populateLamination() {
    const cont = id("laminationContainer");
    const info = id("laminationInfo");

    cont.innerHTML = "";
    info.textContent = "";

    const rule = getVariantRule() || getRule();
    const list = rule.lamination;

    if (!list || list.length === 0) {
      info.textContent = "Pas de lamination possible pour cette matière.";
      return;
    }

    list.forEach(opt => {
      const lbl = document.createElement("label");
      lbl.innerHTML = `
        <input type="radio" name="lamination" value="${opt}">
        Lamination ${opt}
      `;
      cont.appendChild(lbl);
    });
  }

  /********** ÉTAPE 7 — BLANC **********/
  function populateBlanc() {
    const cont = id("blancContainer");
    const info = id("blancInfo");

    cont.innerHTML = "";
    info.textContent = "";

    const rule = getVariantRule() || getRule();
    const list = rule.blanc;

    if (!list || list.length === 0) {
      info.textContent = "Blanc de soutien non disponible pour cette matière.";
      return;
    }

    list.forEach(opt => {
      const lbl = document.createElement("label");
      lbl.innerHTML = `
        <input type="radio" name="blanc" value="${opt}">
        ${opt}
      `;
      cont.appendChild(lbl);
    });
  }

  /********** ÉTAPE 8 — ŒILLETS **********/
  function populateOeillets() {
    const cont = id("oeilletsContainer");
    const info = id("oeilletsInfo");

    cont.innerHTML = "";
    info.textContent = "";

    const rule = getVariantRule() || getRule();

    if (!rule.oeillets) {
      info.textContent = "Œillets non disponibles pour cette matière.";
      return;
    }

    cont.innerHTML = `
      <label>Nombre d'œillets :</label>
      <input type="number" id="oeilletsCount" min="0" value="0">
    `;
  }

  /* ============================================================
     4 — NAVIGATION ENTRE ÉTAPES
  ============================================================ */

  const sections = [...document.querySelectorAll(".step-section")];
  const navItems = [...document.querySelectorAll(".step-item")];
  let currentStep = 1;

  function goTo(step) {
    currentStep = step;

    // Déterminer si la matière actuelle gère des œillets (Aquilux 3,5 mm avec la variante correspondante)
    let hasOeillets = false;
    try {
      const rule = getVariantRule() || getRule();
      hasOeillets = !!(rule && rule.oeillets);
    } catch (e) {
      hasOeillets = false;
    }

    sections.forEach((sec, i) => {
      sec.classList.toggle("active", i + 1 === step);
    });

    navItems.forEach((nav, i) => {
      const stepIndex = i + 1;
      nav.classList.toggle("active", stepIndex === step);

      // verrouiller les étapes futures
      if (stepIndex > step) nav.classList.add("locked");
      else nav.classList.remove("locked");

      // masquer ou afficher l’onglet Œillets
      if (nav.dataset.step === "8") {
        nav.style.display = hasOeillets ? "inline-flex" : "none";
      }
    });
  }

  /* -----------------------------------------------------------
     CLIC DIRECT SUR LES ONGLETS
  ----------------------------------------------------------- */
  document.querySelectorAll(".step-item").forEach(item => {
    item.addEventListener("click", () => {
      const step = Number(item.dataset.step);
      if (item.classList.contains("locked")) return;
      goTo(step);
    });
  });

  /* ============================================================
     5 — GESTION DES ÉTAPES (BOUTONS)
  ============================================================ */

  /***** ÉTAPE 1 → 2 *****/
  id("next1").onclick = () => {
    const sel = document.querySelector("input[name='support']:checked");
    if (!sel) return alert("Choisir un support.");
    state.support = sel.value;
    goTo(2);
  };

  /***** ÉTAPE 2 → 3 *****/
  id("prev2").onclick = () => goTo(1);
  id("next2").onclick = () => {
    const sel = document.querySelector("input[name='impression']:checked");
    if (!sel) return alert("Choisir impression / sans.");
    state.impression = sel.value;
    populateMaterials();
    goTo(3);
  };

  /***** ÉTAPE 3 → 4 OU 5 *****/
  id("prev3").onclick = () => goTo(2);
  id("next3").onclick = () => {
    const sel = document.querySelector("input[name='material']:checked");
    if (!sel) return alert("Choisir une matière.");
    state.materialKey = sel.value;
    state.materialLabel = getRule().label;

    if (isVariantStepRequired()) {
      populateVariants();
      goTo(4);
    } else {
      populateDecoupe();
      goTo(5);
    }
  };

  /***** ÉTAPE 4 → 5 *****/
  id("prev4").onclick = () => goTo(3);
  id("next4").onclick = () => {
    const sel = document.querySelector("input[name='variant']:checked");
    if (!sel) return alert("Choisir une variante.");

    state.variantKey = sel.value;
    state.variantLabel = getVariantRule().label;

    populateDecoupe();
    goTo(5);
  };

  /***** ÉTAPE 5 → 6 *****/
  id("prev5").onclick = () => {
    if (isVariantStepRequired()) goTo(4);
    else goTo(3);
  };

  id("next5").onclick = () => {
    const sel = document.querySelector("input[name='decoupe']:checked");
    if (!sel) return alert("Choisir une découpe.");
    state.decoupe = sel.value;

    populateLamination();
    goTo(6);
  };

  /***** ÉTAPE 6 → 7 *****/
  id("prev6").onclick = () => goTo(5);
  id("next6").onclick = () => {
    const rule = getVariantRule() || getRule();
    if (rule.lamination.length > 0) {
      const sel = document.querySelector("input[name='lamination']:checked");
      if (!sel) return alert("Choisir une lamination.");
      state.lamination = sel.value;
    } else {
      state.lamination = "Non disponible";
    }

    populateBlanc();
    goTo(7);
  };

  /***** ÉTAPE 7 → 8 (OU DIRECTEMENT 9) *****/
  id("prev7").onclick = () => goTo(6);
  id("next7").onclick = () => {
    const rule = getVariantRule() || getRule();

    if (rule.blanc.length > 0) {
      const sel = document.querySelector("input[name='blanc']:checked");
      if (!sel) return alert("Choisir une option de blanc.");
      state.blanc = sel.value;
    } else {
      state.blanc = "Non disponible";
    }

    // Si pas d'œillets pour cette matière : on saute l'étape 8
    if (!rule.oeillets) {
      state.oeillets = 0;
      goTo(9);
      return;
    }

    populateOeillets();
    goTo(8);
  };

  /***** ÉTAPE 8 → 9 *****/
  id("prev8").onclick = () => goTo(7);
  id("next8").onclick = () => {
    const rule = getVariantRule() || getRule();
    if (rule.oeillets) {
      state.oeillets = Number(id("oeilletsCount").value || 0);
    } else {
      state.oeillets = 0;
    }
    goTo(9);
  };

  /***** ÉTAPE 9 → 10 *****/
  id("prev9").onclick = () => {
    const rule = getVariantRule() || getRule();
    if (rule.oeillets) goTo(8);
    else goTo(7);
  };

  id("next9").onclick = async () => {
    state.largeur = id("largeur").value;
    state.hauteur = id("hauteur").value;
    state.quantite = id("quantite").value;

    if (!state.largeur || !state.hauteur) {
      return alert("Renseigner largeur / hauteur.");
    }

    // Calcul du prix (appel à la méthode globale)
    let pricing = null;
    try {
      pricing = await computePrixSouplesRigidesImpression(state);
    } catch (e) {
      console.error("Erreur calcul prix SR :", e);
      alert("Erreur lors du calcul du prix.");
    }

    renderRecap(pricing);
    goTo(10);
  };

  /***** ÉTAPE 10 → retour *****/
  id("prev10").onclick = () => goTo(9);

  /* ============================================================
     6 — RÉCAP
  ============================================================ */
  function renderRecap(pricing) {
    let prixHtml = "";
    if (pricing && typeof pricing.prix_final_ht === "number") {
      const pub  = pricing.prix_public_ht || 0;
      const fin  = pricing.prix_final_ht || 0;
      const rem  = (pricing.detail && pricing.detail.remise_sr) || 0;
      const pct  = (rem * 100).toFixed(1).replace(".0", "");

      prixHtml = `
        <hr style="border-color:rgba(255,255,255,.35);margin:12px 0;">
        <p><b>Prix public HT :</b> ${pub.toFixed(2)} €</p>
        <p><b>Remise client (config SR) :</b> ${pct} %</p>
        <p><b>Prix client HT :</b> ${fin.toFixed(2)} €</p>
      `;
    }

    id("recap").innerHTML = `
      <p><b>Support :</b> ${state.support}</p>
      <p><b>Impression :</b> ${state.impression}</p>
      <p><b>Matière :</b> ${state.materialLabel}</p>
      ${state.variantLabel ? `<p><b>Variante :</b> ${state.variantLabel}</p>` : ""}
      <p><b>Découpe :</b> ${state.decoupe}</p>
      <p><b>Lamination :</b> ${state.lamination}</p>
      <p><b>Blanc de soutien :</b> ${state.blanc}</p>
      <p><b>Œillets :</b> ${state.oeillets}</p>
      <p><b>Format :</b> ${state.largeur} × ${state.hauteur} mm</p>
      <p><b>Quantité :</b> ${state.quantite}</p>
      ${prixHtml}
    `;
  }

});
