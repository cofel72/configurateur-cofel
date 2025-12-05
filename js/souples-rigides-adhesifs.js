/******************************************************
 * CONFIGURATEUR COFEL — SUPPORTS SOUPLES / RIGIDES / ADHÉSIFS
 * VERSION 10 ÉTAPES — conforme à l'arbre Whimsical
 ******************************************************/

document.addEventListener("DOMContentLoaded", () => {

  console.log("CONFIGURATEUR — JS chargé ✔");

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
     2 — CONFIGURATION OFFICIELLE DES MATIÈRES
  ============================================================ */

  const MATERIALS = {

    /* ===== SOUPLE — AVEC IMPRESSION ===== */
    souple_avec: [
      { key: "depoli", label: "Adhésif dépoli" },
      { key: "conformable", label: "Adhésif conformable" },

      {
        key: "polymer",
        label: "Adhésif polymère",
        variants: [
          { key: "polymer_renforce", label: "Polymère — colle renforcée" },
          { key: "polymer_standard", label: "Polymère — colle standard" },
          { key: "polymer_transparent", label: "Polymère — transparent" }
        ]
      },

      { key: "microperfore", label: "Adhésif micro-perforé" },
      { key: "papierpeint", label: "Papier peint 110 g" },
      { key: "magnetique", label: "Magnétique" }
    ],

    /* ===== SOUPLE — SANS IMPRESSION ===== */
    souple_sans: [
      { key: "depoli", label: "Adhésif dépoli (sans impression)" },
      { key: "conformable", label: "Adhésif conformable (sans impression)" },
      { key: "polymer", label: "Adhésif polymère (sans impression)" },
      { key: "microperfore", label: "Adhésif micro-perforé (sans impression)" },
      { key: "papierpeint", label: "Papier peint 110 g" },
      { key: "magnetique", label: "Magnétique" }
    ],

    /* ===== RIGIDE — AVEC IMPRESSION ===== */
    rigide_avec: [
      { key: "pvc3", label: "PVC 3 mm" },
      { key: "pvc5", label: "PVC 5 mm" },
      { key: "pvc10", label: "PVC 10 mm" },
      { key: "akilux35", label: "Akilux 3,5 mm" },  // ✔ SEUL AKILUX
      { key: "plexi3", label: "Plexi 3 mm" },
      { key: "plexi5", label: "Plexi 5 mm" },
      { key: "plexi8", label: "Plexi 8 mm" },
      { key: "plexi10", label: "Plexi 10 mm" },
      { key: "dibond3", label: "ACM Dibond 3 mm" }
    ],

    /* ===== RIGIDE — SANS IMPRESSION ===== */
    rigide_sans: [
      { key: "pvc3", label: "PVC 3 mm (sans impression)" },
      { key: "pvc5", label: "PVC 5 mm (sans impression)" },
      { key: "pvc10", label: "PVC 10 mm (sans impression)" },
      { key: "akilux35", label: "Akilux 3,5 mm" },
      { key: "plexi3", label: "Plexi 3 mm" },
      { key: "plexi5", label: "Plexi 5 mm" },
      { key: "plexi8", label: "Plexi 8 mm" },
      { key: "plexi10", label: "Plexi 10 mm" },
      { key: "dibond3", label: "ACM Dibond 3 mm" }
    ]
  };
  
  /* ============================================================
     3 — FONCTIONS UTILITAIRES
  ============================================================ */
  const id = x => document.getElementById(x);

  function materialHasVariants(key) {
    const group = MATERIALS[state.support + "_" + state.impression];
    const m = group.find(x => x.key === key);
    return m && m.variants;
  }

  function getMaterialVariants(key) {
    const group = MATERIALS[state.support + "_" + state.impression];
    const m = group.find(x => x.key === key);
    return m.variants || null;
  }

  /* ============================================================
     4 — AFFICHAGE DES MATIÈRES
  ============================================================ */
  function populateMaterials() {
    const cont = id("listeMatieres");
    cont.innerHTML = "";

    const list = MATERIALS[state.support + "_" + state.impression];

    list.forEach(mat => {
      const lbl = document.createElement("label");
      lbl.innerHTML = `
        <input type="radio" name="material" value="${mat.key}">
        ${mat.label}
      `;
      cont.appendChild(lbl);
    });
  }

  function populateVariants() {
    const cont = id("listeVariantes");
    cont.innerHTML = "";

    const variants = getMaterialVariants(state.materialKey);
    variants.forEach(v => {
      const lbl = document.createElement("label");
      lbl.innerHTML = `
        <input type="radio" name="variant" value="${v.key}">
        ${v.label}
      `;
      cont.appendChild(lbl);
    });
  }

  /* ============================================================
     5 — OPTIONS LOGIQUES PAR MATIÈRE
  ============================================================ */

  /* Découpe */
  function populateDecoupe() {
    const cont = id("decoupeContainer");
    cont.innerHTML = "";

    let options = [];

    if (state.support === "souple") {
      // Souple
      if (state.materialKey === "microperfore") {
        options = ["Découpe normale"];
      } else {
        options = ["Découpe normale", "Découpe complexe"];
      }
    } else {
      // Rigide
      options = ["Découpe normale", "Découpe complexe"];
    }

    options.forEach(opt => {
      const lbl = document.createElement("label");
      lbl.innerHTML = `
        <input type="radio" name="decoupe" value="${opt}">
        ${opt}
      `;
      cont.appendChild(lbl);
    });
  }

  /* Lamination */
  function populateLamination() {
    const cont = id("laminationContainer");
    const info = id("laminationInfo");
    cont.innerHTML = "";
    info.textContent = "";

    const nonLaminables = ["microperfore", "papierpeint", "magnetique"];

    if (nonLaminables.includes(state.materialKey)) {
      info.textContent = "La lamination n'est pas possible sur ce support.";
      return;
    }

    ["Lamination mate", "Lamination brillante"].forEach(opt => {
      const lbl = document.createElement("label");
      lbl.innerHTML = `
        <input type="radio" name="lamination" value="${opt}">
        ${opt}
      `;
      cont.appendChild(lbl);
    });
  }

  /* Blanc de soutien */
  function populateBlanc() {
    const cont = id("blancContainer");
    const info = id("blancInfo");
    cont.innerHTML = "";
    info.textContent = "";

    const compatibles = ["polymer", "conformable", "microperfore", "pvc3", "pvc5", "pvc10"];

    if (!compatibles.includes(state.materialKey)) {
      info.textContent = "Le blanc de soutien n'est pas disponible pour cette matière.";
      return;
    }

    ["Avec blanc de soutien", "Sans blanc de soutien"].forEach(opt => {
      const lbl = document.createElement("label");
      lbl.innerHTML = `
        <input type="radio" name="blanc" value="${opt}">
        ${opt}
      `;
      cont.appendChild(lbl);
    });
  }

  /* ============================================================
     6 — WIZARD (NAVIGATION)
  ============================================================ */
  let current = 1;
  const sections = [...document.querySelectorAll(".step-section")];
  const navItems = [...document.querySelectorAll(".step-item")];

  function goTo(step) {
    current = step;

    sections.forEach((sec, i) => {
      sec.classList.toggle("active", i + 1 === step);
    });

    navItems.forEach((nav, i) => {
      nav.classList.toggle("active", i + 1 === step);
      nav.classList.toggle("locked", i + 1 > step);
    });
  }

  /* ============================================================
     7 — GESTION DES ÉTAPES
  ============================================================ */

  /* ÉTAPE 1 → 2 */
  id("next1").onclick = () => {
    const sel = document.querySelector("input[name='support']:checked");
    if (!sel) return alert("Choisis un support.");

    state.support = sel.value;
    goTo(2);
  };

  /* ÉTAPE 2 → 3 */
  id("prev2").onclick = () => goTo(1);
  id("next2").onclick = () => {
    const sel = document.querySelector("input[name='impression']:checked");
    if (!sel) return alert("Choisis un mode d'impression.");

    state.impression = sel.value;

    populateMaterials();
    goTo(3);
  };

  /* ÉTAPE 3 → 4 ou 5 */
  id("prev3").onclick = () => goTo(2);
  id("next3").onclick = () => {
    const sel = document.querySelector("input[name='material']:checked");
    if (!sel) return alert("Choisis une matière.");

    state.materialKey = sel.value;
    state.materialLabel = sel.parentElement.textContent.trim();

    if (materialHasVariants(state.materialKey)) {
      populateVariants();
      goTo(4);
    } else {
      populateDecoupe();
      goTo(5);
    }
  };

  /* ÉTAPE 4 → 5 */
  id("prev4").onclick = () => goTo(3);
  id("next4").onclick = () => {
    const sel = document.querySelector("input[name='variant']:checked");
    if (!sel) return alert("Choisis une variante.");

    const variants = getMaterialVariants(state.materialKey);
    const v = variants.find(x => x.key === sel.value);

    state.variantKey = v.key;
    state.variantLabel = v.label;

    populateDecoupe();
    goTo(5);
  };

  /* ÉTAPE 5 → 6 */
  id("prev5").onclick = () => {
    if (materialHasVariants(state.materialKey)) goTo(4);
    else goTo(3);
  };

  id("next5").onclick = () => {
    const sel = document.querySelector("input[name='decoupe']:checked");
    if (!sel) return alert("Choisis un type de découpe.");

    state.decoupe = sel.value;

    populateLamination();
    goTo(6);
  };

  /* ÉTAPE 6 → 7 */
  id("prev6").onclick = () => goTo(5);

  id("next6").onclick = () => {
    const nonLaminables = ["microperfore", "papierpeint", "magnetique"];
    if (!nonLaminables.includes(state.materialKey)) {
      const sel = document.querySelector("input[name='lamination']:checked");
      if (!sel) return alert("Choisis une option de lamination.");
      state.lamination = sel.value;
    } else {
      state.lamination = "Aucune (non disponible)";
    }

    populateBlanc();
    goTo(7);
  };

  /* ÉTAPE 7 → 8 */
  id("prev7").onclick = () => goTo(6);

  id("next7").onclick = () => {
    const compatibles = ["polymer", "conformable", "microperfore", "pvc3", "pvc5", "pvc10"];

    if (compatibles.includes(state.materialKey)) {
      const sel = document.querySelector("input[name='blanc']:checked");
      if (!sel) return alert("Choisis une option.");
      state.blanc = sel.value;
    } else {
      state.blanc = "Non disponible";
    }

    goTo(8);
  };

  /* ÉTAPE 8 → 9 */
  id("prev8").onclick = () => goTo(7);

  id("next8").onclick = () => {
    if (state.materialKey === "akilux35") {
      state.oeillets = Number(id("oeilletsCount").value);
    } else {
      state.oeillets = 0;
    }
    goTo(9);
  };

  /* ÉTAPE 9 → 10 */
  id("prev9").onclick = () => goTo(8);

  id("next9").onclick = () => {
    state.largeur = id("largeur").value;
    state.hauteur = id("hauteur").value;
    state.quantite = id("quantite").value;

    if (!state.largeur || !state.hauteur) {
      return alert("Renseigne largeur et hauteur.");
    }

    renderRecap();
    goTo(10);
  };

  /* ÉTAPE 10 → retour */
  id("prev10").onclick = () => goTo(9);

  /* ============================================================
     8 — RÉCAPITULATIF
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
