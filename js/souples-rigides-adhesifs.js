/******************************************************
 * CONFIGURATEUR — SUPPORTS SOUPLES, RIGIDES & ADHÉSIFS
 * Cofel — Navigation Wizard 7 étapes avec variantes
 ******************************************************/

document.addEventListener("DOMContentLoaded", () => {

  /* ========= STATE ========= */
  const state = {
    support: null,
    impression: null,
    materialKey: null,
    materialLabel: null,
    variantKey: null,
    variantLabel: null,
    options: {},
    largeur: null,
    hauteur: null,
    quantite: 1
  };

  /* ============================================================
     CONFIGURATION DES MATIÈRES (OFFICIELLE SELON TON ARBRE)
  ============================================================ */

  const MATERIALS = {

    /* ===== SOUPLE — AVEC IMPRESSION ===== */
    souple_avec: [
      { key: "depoli", label: "Adhésif dépoli", variants: null },
      { key: "conformable", label: "Adhésif conformable", variants: null },
      
      /* Le seul avec variantes ⬇ */
      { key: "polymer", label: "Adhésif polymère", variants: [
          { key: "polymer_renforce", label: "Polymère — colle renforcée" },
          { key: "polymer_standard", label: "Polymère — colle standard" },
          { key: "polymer_transparent", label: "Polymère — transparent" },
        ]
      },

      { key: "microperfore", label: "Adhésif micro-perforé", variants: null },
      { key: "papierpeint", label: "Papier peint 110 g", variants: null },
      { key: "magnetique", label: "Magnétique", variants: null }
    ],

    /* ===== SOUPLE — SANS IMPRESSION ===== */
    souple_sans: [
      { key: "depoli", label: "Adhésif dépoli (sans impression)", variants: null },
      { key: "conformable", label: "Adhésif conformable (sans impression)", variants: null },
      { key: "polymer", label: "Adhésif polymère (sans impression)", variants: null },
      { key: "microperfore", label: "Adhésif micro-perforé (sans impression)", variants: null },
      { key: "papierpeint", label: "Papier peint 110 g", variants: null },
      { key: "magnetique", label: "Magnétique", variants: null }
    ],

    /* ===== RIGIDE — AVEC IMPRESSION ===== */
    rigide_avec: [
      { key: "pvc3", label: "PVC 3 mm", variants: null },
      { key: "pvc5", label: "PVC 5 mm", variants: null },
      { key: "pvc10", label: "PVC 10 mm", variants: null },
      { key: "akilux35", label: "Akilux 3,5 mm", variants: null },  // ✔ SEUL AKILUX OFFICIEL
      { key: "plexi3", label: "Plexi 3 mm", variants: null },
      { key: "plexi5", label: "Plexi 5 mm", variants: null },
      { key: "plexi8", label: "Plexi 8 mm", variants: null },
      { key: "plexi10", label: "Plexi 10 mm", variants: null },
      { key: "dibond3", label: "ACM Dibond 3 mm", variants: null }
    ],

    /* ===== RIGIDE — SANS IMPRESSION ===== */
    rigide_sans: [
      { key: "pvc3", label: "PVC 3 mm (sans impression)", variants: null },
      { key: "pvc5", label: "PVC 5 mm (sans impression)", variants: null },
      { key: "pvc10", label: "PVC 10 mm (sans impression)", variants: null },
      { key: "akilux35", label: "Akilux 3,5 mm (sans impression)", variants: null },
      { key: "plexi3", label: "Plexi 3 mm (sans impression)", variants: null },
      { key: "plexi5", label: "Plexi 5 mm (sans impression)", variants: null },
      { key: "plexi8", label: "Plexi 8 mm (sans impression)", variants: null },
      { key: "plexi10", label: "Plexi 10 mm (sans impression)", variants: null },
      { key: "dibond3", label: "ACM Dibond 3 mm (sans impression)", variants: null }
    ]
  };

  /* ========= OPTIONS — seront améliorées après ton Excel ========= */
  const OPTIONS = {
    decoupe_normale: { label: "Découpe normale" },
    decoupe_complexe: { label: "Découpe complexe" },
    blanc_soutien: { label: "Blanc de soutien" },
    lamination_mate: { label: "Lamination mate" },
    lamination_bril: { label: "Lamination brillante" },
    oeillets: { label: "Œillets (prix par œillet)" }
  };

  /* ============================================================
     SÉLECTEURS UTILITAIRES
  ============================================================ */

  const steps = [...document.querySelectorAll(".step-section")];
  const navItems = [...document.querySelectorAll(".step-item")];
  const navStep4 = document.getElementById("step4nav");

  const id = (x) => document.getElementById(x);

  /* ============================================================
     FONCTIONS NAVIGATION WIZARD
  ============================================================ */

  let currentStep = 1;

  function goTo(step) {
    currentStep = step;

    steps.forEach((s, i) => {
      s.classList.toggle("active", i + 1 === step);
    });

    navItems.forEach((n, i) => {
      const st = i + 1;
      n.classList.toggle("active", st === step);

      if (st <= step) {
        n.classList.remove("locked");
        n.style.display = "block";
      } else {
        n.classList.add("locked");

        // Étape 4 masquée si non pertinente
        if (st === 4 && !materialHasVariants(state.materialKey)) {
          n.style.display = "none";
        } else {
          n.style.display = "block";
        }
      }
    });
  }

  /* ============================================================
     HELPERS : VARIANTES
  ============================================================ */
  function materialHasVariants(materialKey) {
    if (!materialKey) return false;

    const group = MATERIALS[state.support + "_" + state.impression];
    const found = group.find(m => m.key === materialKey);
    return found && found.variants;
  }

  function getMaterialVariants(materialKey) {
    const group = MATERIALS[state.support + "_" + state.impression];
    return group.find(m => m.key === materialKey).variants;
  }

  /* ============================================================
     REMPLISSAGE DES MATIÈRES (ÉTAPE 3)
  ============================================================ */
  function populateMaterials() {
    const cont = id("listeMatieres");
    cont.innerHTML = "";

    if (!state.support || !state.impression) return;

    const list = MATERIALS[state.support + "_" + state.impression];

    list.forEach(mat => {
      const div = document.createElement("label");
      div.innerHTML = `<input type="radio" name="material" value="${mat.key}"> ${mat.label}`;
      cont.appendChild(div);
    });
  }

  /* ============================================================
     REMPLISSAGE DES VARIANTES (ÉTAPE 4)
  ============================================================ */
  function populateVariants() {
    const cont = id("listeVariantes");
    cont.innerHTML = "";

    const variants = getMaterialVariants(state.materialKey);
    variants.forEach(v => {
      const lbl = document.createElement("label");
      lbl.innerHTML = `<input type="radio" name="variant" value="${v.key}"> ${v.label}`;
      cont.appendChild(lbl);
    });
  }

  /* ============================================================
     OPTIONS (ÉTAPE 5)
  ============================================================ */
  function populateOptions() {
    const cont = id("optionsContainer");
    cont.innerHTML = "";

    // ✨ tu ajouteras plus tard logique par matière
    for (let key in OPTIONS) {
      const op = OPTIONS[key];
      const line = document.createElement("label");
      line.innerHTML = `<input type="checkbox" data-opt="${key}"> ${op.label}`;
      cont.appendChild(line);
    }
  }

  /* ============================================================
     RÉCAP (ÉTAPE 7)
  ============================================================ */
  function renderRecap() {
    id("recap").innerHTML = `
      <p><b>Support :</b> ${state.support}</p>
      <p><b>Impression :</b> ${state.impression}</p>
      <p><b>Matière :</b> ${state.materialLabel}</p>
      ${state.variantLabel ? `<p><b>Variante :</b> ${state.variantLabel}</p>` : ""}
      <p><b>Options :</b> ${Object.values(state.options).join(", ") || "Aucune"}</p>
      <p><b>Format :</b> ${state.largeur} × ${state.hauteur} mm</p>
      <p><b>Quantité :</b> ${state.quantite}</p>
    `;
  }

  /* ============================================================
     ÉCOUTEURS DES BOUTONS
  ============================================================ */

  /* ————— ÉTAPE 1 → 2 ————— */
  id("next1").onclick = () => {
    const sel = document.querySelector("input[name='support']:checked");
    if (!sel) return alert("Sélectionne un support.");

    state.support = sel.value;
    goTo(2);
  };

  /* ————— ÉTAPE 2 → 3 ————— */
  id("prev2").onclick = () => goTo(1);
  id("next2").onclick = () => {
    const sel = document.querySelector("input[name='impression']:checked");
    if (!sel) return alert("Sélectionne un mode d'impression.");

    state.impression = sel.value;

    populateMaterials();
    goTo(3);
  };

  /* ————— ÉTAPE 3 → (4 ou 5) ————— */
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
      populateOptions();
      goTo(5);
    }
  };

  /* ————— ÉTAPE 4 → 5 ————— */
  id("prev4").onclick = () => goTo(3);
  id("next4").onclick = () => {
    const sel = document.querySelector("input[name='variant']:checked");
    if (!sel) return alert("Choisis une variante polymère.");

    const list = getMaterialVariants(state.materialKey);
    const variant = list.find(v => v.key === sel.value);

    state.variantKey = variant.key;
    state.variantLabel = variant.label;

    populateOptions();
    goTo(5);
  };

  /* ————— ÉTAPE 5 → 6 ————— */
  id("prev5").onclick = () => {
    if (materialHasVariants(state.materialKey)) goTo(4);
    else goTo(3);
  };
  id("next5").onclick = () => {
    state.options = {};
    document.querySelectorAll("#optionsContainer input[type='checkbox']").forEach(cb => {
      if (cb.checked) {
        const key = cb.dataset.opt;
        state.options[key] = OPTIONS[key].label;
      }
    });
    goTo(6);
  };

  /* ————— ÉTAPE 6 → 7 ————— */
  id("prev6").onclick = () => goTo(5);
  id("next6").onclick = () => {
    state.largeur = id("largeur").value;
    state.hauteur = id("hauteur").value;
    state.quantite = id("quantite").value;

    if (!state.largeur || !state.hauteur) {
      return alert("Renseigne largeur et hauteur.");
    }

    renderRecap();
    goTo(7);
  };

  /* ————— ÉTAPE 7 → retour ————— */
  id("prev7").onclick = () => goTo(6);

  /* Navigation via barre d'étapes (retour en arrière uniquement) */
  navItems.forEach(item => {
    item.onclick = () => {
      const target = Number(item.dataset.step);
      if (target <= currentStep) goTo(target);
    };
  });

});
