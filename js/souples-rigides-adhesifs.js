/******************************************************
 * CONFIGURATEUR COFEL — Supports SOUPLES / RIGIDES / ADHÉSIFS
 * Version dynamique pilotée par MATERIAL_RULES
 * Étapes : Support → Impression → Matière → Variante →
 * Découpe → Lamination → Blanc → Œillets → Format → Récap
 ******************************************************/

document.addEventListener("DOMContentLoaded", () => {

  console.log("JS configurateur chargé ✔");

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

  const sections = [...document.querySelectorAll(".step-section")];
  const navItems = [...document.querySelectorAll(".step-item")];

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

  /********** MATIÈRES **********/
  function populateMaterials() {
    const cont = id("listeMatieres");
    cont.innerHTML = "";

    const list = MATERIAL_RULES[state.support + "_" + state.impression];
    for (let key in list) {
      const m = list[key];
      cont.innerHTML += `
        <label>
          <input type="radio" name="material" value="${key}">
          ${m.label}
        </label>`;
    }
  }

  /********** VARIANTES **********/
  function populateVariants() {
    const cont = id("listeVariantes");
    cont.innerHTML = "";

    const r = getRule();
    const variants = r.variants;

    for (let key in variants) {
      const v = variants[key];
      cont.innerHTML += `
        <label>
          <input type="radio" name="variant" value="${key}">
          ${v.label}
        </label>`;
    }
  }

  /********** DÉCOUPE **********/
  function populateDecoupe() {
    const cont = id("decoupeContainer");
    cont.innerHTML = "";

    const rule = getVariantRule() || getRule();

    rule.decoupe.forEach(opt => {
      cont.innerHTML += `
        <label>
          <input type="radio" name="decoupe" value="${opt}">
          Découpe ${opt}
        </label>`;
    });
  }

  /********** LAMINATION **********/
  function populateLamination() {
    const cont = id("laminationContainer");
    const info = id("laminationInfo");

    cont.innerHTML = "";
    info.textContent = "";

    const rule = getVariantRule() || getRule();

    if (!rule.lamination || rule.lamination.length === 0) {
      info.textContent = "Pas de lamination possible pour cette matière.";
      return;
    }

    rule.lamination.forEach(opt => {
      cont.innerHTML += `
        <label>
          <input type="radio" name="lamination" value="${opt}">
          Lamination ${opt}
        </label>`;
    });
  }

  /********** BLANC **********/
  function populateBlanc() {
    const cont = id("blancContainer");
    const info = id("blancInfo");

    cont.innerHTML = "";
    info.textContent = "";

    const rule = getVariantRule() || getRule();

    if (!rule.blanc || rule.blanc.length === 0) {
      info.textContent = "Blanc de soutien non disponible pour cette matière.";
      return;
    }

    rule.blanc.forEach(opt => {
      cont.innerHTML += `
        <label>
          <input type="radio" name="blanc" value="${opt}">
          ${opt}
        </label>`;
    });
  }

  /********** ŒILLETS **********/
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
     4 — CONTRÔLE D’AFFICHAGE DES ONGLETS
  ============================================================ */

  function updateStepVisibility() {
    const rule = getVariantRule() || getRule();

    /** Étape 8 — ŒILLETS : affichée uniquement sur Akilux 3,5 mm */
    const step8 = navItems[7]; // index 7 = étape 8

    if (rule && rule.oeillets) {
      step8.style.display = "inline-flex";
    } else {
      step8.style.display = "none";
    }
  }

  /* ============================================================
     5 — NAVIGATION
  ============================================================ */

  let currentStep = 1;

  function goTo(step) {
    currentStep = step;

    sections.forEach((sec, i) => {
      sec.classList.toggle("active", i + 1 === step);
    });

    navItems.forEach((nav, i) => {
      nav.classList.toggle("active", i + 1 === step);
      nav.classList.toggle("locked", i + 1 > step);
    });

    updateStepVisibility();
  }

  /* CLIC DIRECT SUR LES ONGLETS */
  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const step = Number(item.dataset.step);
      if (item.classList.contains("locked")) return;
      goTo(step);
    });
  });

  /* ============================================================
     6 — BOUTONS NEXT / PREVIOUS
  ============================================================ */

  /***** STEP 1 → 2 *****/
  id("next1").onclick = () => {
    const sel = document.querySelector("input[name='support']:checked");
    if (!sel) return alert("Choisir un support.");
    state.support = sel.value;
    goTo(2);
  };

  /***** STEP 2 → 3 *****/
  id("prev2").onclick = () => goTo(1);
  id("next2").onclick = () => {
    const sel = document.querySelector("input[name='impression']:checked");
    if (!sel) return alert("Choisir impression / sans.");
    state.impression = sel.value;

    populateMaterials();
    goTo(3);
  };

  /***** STEP 3 → 4/5 *****/
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

  /***** STEP 4 → 5 *****/
  id("prev4").onclick = () => goTo(3);
  id("next4").onclick = () => {
    const sel = document.querySelector("input[name='variant']:checked");
    if (!sel) return alert("Choisir une variante.");

    state.variantKey = sel.value;
    state.variantLabel = getVariantRule().label;

    populateDecoupe();
    goTo(5);
  };

  /***** STEP 5 → 6 *****/
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

  /***** STEP 6 → 7 *****/
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

  /***** STEP 7 → 8 *****/
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

    populateOeillets();
    goTo(8);
  };

  /***** STEP 8 → 9 *****/
  id("prev8").onclick = () => goTo(7);
  id("next8").onclick = () => {
    const rule = getVariantRule() || getRule();

    if (rule.oeillets) {
      state.oeillets = Number(id("oeilletsCount").value);
    } else {
      state.oeillets = 0;
    }

    goTo(9);
  };

  /***** STEP 9 → 10 *****/
  id("prev9").onclick = () => goTo(8);
  id("next9").onclick = () => {
    state.largeur = id("largeur").value;
    state.hauteur = id("hauteur").value;
    state.quantite = id("quantite").value;

    if (!state.largeur || !state.hauteur) {
      return alert("Renseigner largeur / hauteur.");
    }

    renderRecap();
    goTo(10);
  };

  /***** STEP 10 → retour *****/
  id("prev10").onclick = () => goTo(9);

  /* ============================================================
     7 — RÉCAP
  ============================================================ */
  function renderRecap() {
    id("recap").innerHTML = `
      <p><b>Support :</b> ${state.support}</p>
      <p><b>Impression :</b> ${state.impression}</p>
      <p><b>Matière :</b> ${state.materialLabel}</p>
      ${state.variantLabel ? `<p><b>Variante :</b> ${state.variantLabel}</p>` : ""}
      <p><b>Découpe :</b> ${state.decoupe}</p>
      <p><b>Lamination :</b> ${state.lamination}</p>
      <p><b>Blanc :</b> ${state.blanc}</p>
      <p><b>Œillets :</b> ${state.oeillets}</p>
      <p><b>Format :</b> ${state.largeur} × ${state.hauteur} mm</p>
      <p><b>Quantité :</b> ${state.quantite}</p>
    `;
  }

});
