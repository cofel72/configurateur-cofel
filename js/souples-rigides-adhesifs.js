/******************************************************
 * CONFIGURATEUR COFEL — Supports SOUPLES / RIGIDES / ADHÉSIFS
 * Version dynamique pilotée par MATERIAL_RULES
 * Compatible avec 10 étapes : Support → Impression → Matière →
 * Variante → Découpe → Lamination → Blanc → Œillets → Format → Récap
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

  const id = (x) => document.getElementById(x);

  function getRule() {
    return MATERIAL_RULES[state.support + "_" + state.impression][state.materialKey];
  }

  function getVariantRule() {
    const r = getRule();
    if (!r.variants) return null;
    return r.variants[state.variantKey];
  }

  function isVariantStepRequired() {
    return getRule().variants !== null;
  }

  /* -------------------------------------------------------
      UTILITAIRES POUR AFFICHER / CACHER LES ÉTAPES
  ------------------------------------------------------- */
  function hideStep(stepNumber) {
    const nav = document.querySelector(`.step-item[data-step='${stepNumber}']`);
    const sec = document.getElementById(`step${stepNumber}`);
    if (nav) nav.style.display = "none";
    if (sec) sec.style.display = "none";
  }

  function showStep(stepNumber) {
    const nav = document.querySelector(`.step-item[data-step='${stepNumber}']`);
    const sec = document.getElementById(`step${stepNumber}`);
    if (nav) nav.style.display = "block";
    if (sec) sec.style.display = "block";
  }

  function stepIsRequired_Blanc() {
    const rule = getVariantRule() || getRule();
    return rule.blanc && rule.blanc.length > 0;
  }

  function stepIsRequired_Oeillets() {
    const rule = getVariantRule() || getRule();
    return rule.oeillets === true;
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

    const variants = getRule().variants;

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

    list.forEach((opt) => {
      const lbl = document.createElement("label");
      lbl.innerHTML = `
        <input type="radio" name="decoupe" value="${opt}">
        Découpe ${opt}
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

    list.forEach((opt) => {
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

    list.forEach((opt) => {
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

    sections.forEach((sec, i) => {
      sec.classList.toggle("active", i + 1 === step);
    });

    navItems.forEach((nav, i) => {
      nav.classList.toggle("active", i + 1 === step);
      nav.classList.toggle("locked", i + 1 > step);
    });
  }

  /* ============================================================
     5 — GESTION DES ÉTAPES (boutons)
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

    // Ajuster la visibilité des étapes dès le choix matière
    stepIsRequired_Blanc() ? showStep(7) : hideStep(7);
    stepIsRequired_Oeillets() ? showStep(8) : hideStep(8);

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

    if (stepIsRequired_Blanc()) {
      populateBlanc();
      showStep(7);
      goTo(7);
    } else {
      hideStep(7);
      state.blanc = "Non disponible";

      if (stepIsRequired_Oeillets()) {
        showStep(8);
        goTo(8);
      } else {
        hideStep(8);
        goTo(9);
      }
    }
  };

  /***** ÉTAPE 7 → 8 *****/
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

    if (stepIsRequired_Oeillets()) {
      populateOeillets();
      showStep(8);
      goTo(8);
    } else {
      hideStep(8);
      goTo(9);
    }
  };

  /***** ÉTAPE 8 → 9 *****/
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

  /***** ÉTAPE 9 → 10 *****/
  id("prev9").onclick = () => goTo(8);
  id("next9").onclick = () => {
    state.largeur = id("largeur").value;
    state.hauteur = id("hauteur").value;
    state.quantite = id("quantite").value;

    if (!state.largeur || !state.hauteur) {
      return alert("Renseigner largeur et hauteur.");
    }

    renderRecap();
    goTo(10);
  };

  /***** ÉTAPE 10 → RETOUR *****/
  id("prev10").onclick = () => goTo(9);

  /* ============================================================
     6 — RÉCAP
  ============================================================ */
  function renderRecap() {
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
    `;
  }

});
