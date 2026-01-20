/******************************************************
 * CONFIGURATEUR COFEL — Supports SOUPLES / RIGIDES / ADHÉSIFS
 * Version dynamique pilotée par MATERIAL_RULES + calcul de prix
 * Étapes : Support → Impression → Matière → Variante →
 * Découpe → Lamination → Blanc → (Œillets si applicable) →
 * Format → Récap
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
    if (!r || !r.variants) return null;
    return r.variants[state.variantKey];
  }

  function isVariantStepRequired() {
    const r = MATERIAL_RULES[state.support + "_" + state.impression][state.materialKey];
    return !!(r && r.variants !== null && r.variants !== undefined);
  }

  function safeList(v){
    return Array.isArray(v) ? v : [];
  }

  // ✅ Pour Panneau alvéolaire 3,5 mm : on saisit les œillets dans l'étape Variantes => on ne montre pas l'étape 8
  function shouldShowOeilletsStep(){
    try{
      const vr = getVariantRule();
      const rule = vr || getRule();
      if(!rule || !rule.oeillets) return false;
      if(vr) return false; // oeillets gérés dans Variantes (Panneau alvéolaire 3,5 mm)
      return true;
    }catch(e){
      return false;
    }
  }

  /* ============================================================
     3 — UI : bloc œillets INLINE dans l'étape Variantes
  ============================================================ */

  function ensureVariantOeilletsBlock(){
    const cont = id("listeVariantes");
    if(!cont) return null;

    let block = id("variantOeilletsBlock");
    if(block) return block;

    const fieldset = cont.closest("fieldset") || cont.parentElement;
    block = document.createElement("div");
    block.id = "variantOeilletsBlock";
    block.style.marginTop = "12px";
    block.style.display = "none";

    block.innerHTML = `
      <label style="display:block; margin-bottom:6px;">Nombre d'œillets</label>
      <input type="number" id="oeilletsInlineCount" min="1" value="4" />
      <p class="hint" style="margin-top:6px;">(Uniquement si vous choisissez “Avec œillets”)</p>
    `;

    fieldset.appendChild(block);
    return block;
  }

  function showVariantOeilletsBlock(show){
    const block = ensureVariantOeilletsBlock();
    if(!block) return;
    block.style.display = show ? "block" : "none";
    const input = id("oeilletsInlineCount");
    if(!show && input){
      input.value = "0";
      state.oeillets = 0;
    }
  }

  function getInlineOeilletsValue(){
    const input = id("oeilletsInlineCount");
    if(!input) return 0;
    const v = Number(input.value || 0);
    if(!Number.isFinite(v)) return 0;
    return Math.max(0, Math.floor(v));
  }

  /* ============================================================
     4 — REMPLISSAGE DES ÉTAPES
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

    // reset inline oeillets
    showVariantOeilletsBlock(false);

    for (let key in variants) {
      const v = variants[key];
      const lbl = document.createElement("label");
      lbl.innerHTML = `
        <input type="radio" name="variant" value="${key}">
        ${v.label}
      `;
      cont.appendChild(lbl);
    }

    // ✅ si la variante sélectionnée a oeillets:true => afficher champ inline
    const radios = cont.querySelectorAll('input[name="variant"]');
    radios.forEach(radio => {
      radio.addEventListener("change", () => {
        const k = radio.value;
        const vr = variants[k];
        if(vr && vr.oeillets){
          showVariantOeilletsBlock(true);
          // si on avait déjà une valeur dans l'état
          const input = id("oeilletsInlineCount");
          if(input){
            input.value = String(state.oeillets > 0 ? state.oeillets : 4);
          }
        }else{
          showVariantOeilletsBlock(false);
        }
      });
    });
  }

  /********** ÉTAPE 5 — DÉCOUPE **********/
  function populateDecoupe() {
    const cont = id("decoupeContainer");
    cont.innerHTML = "";

    const rule = getVariantRule() || getRule();
    const list = safeList(rule.decoupe);

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
    const list = safeList(rule.lamination);

    if (list.length === 0) {
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
    const list = safeList(rule.blanc);

    if (list.length === 0) {
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

  /********** ÉTAPE 8 — ŒILLETS (fallback seulement) **********/
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
     5 — NAVIGATION ENTRE ÉTAPES
  ============================================================ */

  const sections = [...document.querySelectorAll(".step-section")];
  const navItems = [...document.querySelectorAll(".step-item")];
  let currentStep = 1;

  function goTo(step) {
    currentStep = step;

    sections.forEach((sec, i) => {
      sec.classList.toggle("active", i + 1 === step);
    });

    const showOeilletsTab = shouldShowOeilletsStep();

    navItems.forEach((nav, i) => {
      const stepIndex = i + 1;
      nav.classList.toggle("active", stepIndex === step);

      // verrouiller les étapes futures
      if (stepIndex > step) nav.classList.add("locked");
      else nav.classList.remove("locked");

      // masquer/afficher l’onglet Œillets (step 8)
      if (nav.dataset.step === "8") {
        nav.style.display = showOeilletsTab ? "inline-flex" : "none";
      }
    });
  }

  // clic direct sur onglets
  document.querySelectorAll(".step-item").forEach(item => {
    item.addEventListener("click", () => {
      const step = Number(item.dataset.step);
      if (item.classList.contains("locked")) return;
      goTo(step);
    });
  });

  /* ============================================================
     6 — GESTION DES ÉTAPES (BOUTONS)
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

    // reset oeillets si on change de matière
    state.oeillets = 0;
    showVariantOeilletsBlock(false);

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
    state.variantLabel = (getVariantRule() && getVariantRule().label) ? getVariantRule().label : null;

    // ✅ si variante "avec œillets" : on saisit ici le nombre
    const vr = getVariantRule();
    if(vr && vr.oeillets){
      const v = getInlineOeilletsValue();
      if(!v || v < 1) return alert("Renseigner un nombre d'œillets (≥ 1).");
      state.oeillets = v;
    }else{
      state.oeillets = 0;
    }

    populateDecoupe();
    goTo(5);
  };

  /***** ÉTAPE 5 → (6 ou 7 ou 9) *****/
  id("prev5").onclick = () => {
    if (isVariantStepRequired()) goTo(4);
    else goTo(3);
  };

  id("next5").onclick = () => {
    const sel = document.querySelector("input[name='decoupe']:checked");
    if (!sel) return alert("Choisir une découpe.");
    state.decoupe = sel.value;

    const rule = getVariantRule() || getRule();
    const lamList = safeList(rule.lamination);
    const blancList = safeList(rule.blanc);

    // ✅ saut automatique des étapes non disponibles
    if(lamList.length === 0){
      state.lamination = "Non disponible";

      if(blancList.length === 0){
        state.blanc = "Non disponible";

        // oeillets étape 8 uniquement si réellement nécessaire (pas Panneau alvéolaire 3,5 mm)
        if(shouldShowOeilletsStep()){
          populateOeillets();
          goTo(8);
        }else{
          goTo(9);
        }
        return;
      }

      populateBlanc();
      goTo(7);
      return;
    }

    populateLamination();
    goTo(6);
  };

  /***** ÉTAPE 6 → (7 ou 9) *****/
  id("prev6").onclick = () => goTo(5);
  id("next6").onclick = () => {
    const rule = getVariantRule() || getRule();
    const list = safeList(rule.lamination);

    if (list.length > 0) {
      const sel = document.querySelector("input[name='lamination']:checked");
      if (!sel) return alert("Choisir une lamination.");
      state.lamination = sel.value;
    } else {
      state.lamination = "Non disponible";
    }

    const blancList = safeList(rule.blanc);
    if(blancList.length === 0){
      state.blanc = "Non disponible";
      if(shouldShowOeilletsStep()){
        populateOeillets();
        goTo(8);
      }else{
        goTo(9);
      }
      return;
    }

    populateBlanc();
    goTo(7);
  };

  /***** ÉTAPE 7 → (8 ou 9) *****/
  id("prev7").onclick = () => {
    const rule = getVariantRule() || getRule();
    const lamList = safeList(rule.lamination);
    if(lamList.length > 0) goTo(6);
    else goTo(5);
  };

  id("next7").onclick = () => {
    const rule = getVariantRule() || getRule();
    const list = safeList(rule.blanc);

    if (list.length > 0) {
      const sel = document.querySelector("input[name='blanc']:checked");
      if (!sel) return alert("Choisir une option de blanc.");
      state.blanc = sel.value;
    } else {
      state.blanc = "Non disponible";
    }

    if (shouldShowOeilletsStep()) {
      populateOeillets();
      goTo(8);
    } else {
      // ✅ Panneau alvéolaire 3,5 mm : pas d’étape œillets, déjà saisi en Variantes
      goTo(9);
    }
  };

  /***** ÉTAPE 8 → 9 (fallback) *****/
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
    if (shouldShowOeilletsStep()) return goTo(8);

    const blancList = safeList(rule.blanc);
    if(blancList.length > 0) return goTo(7);

    const lamList = safeList(rule.lamination);
    if(lamList.length > 0) return goTo(6);

    return goTo(5);
  };

  id("next9").onclick = async () => {
    state.largeur = id("largeur").value;
    state.hauteur = id("hauteur").value;
    state.quantite = id("quantite").value;

    if (!state.largeur || !state.hauteur) {
      return alert("Renseigner largeur / hauteur.");
    }

    // Calcul du prix
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
     7 — RÉCAP
     ✅ Pas d’œillets si 0
     ✅ Afficher uniquement le prix client HT
  ============================================================ */
  function renderRecap(pricing) {
    const oeilletsN = Number(state.oeillets || 0);

    let prixHtml = "";
    if (pricing && typeof pricing.prix_final_ht === "number") {
      const fin = pricing.prix_final_ht || 0;
      prixHtml = `
        <hr style="border-color:rgba(255,255,255,.35);margin:12px 0;">
        <p><b>Prix client hors-taxe :</b> ${fin.toFixed(2)} €</p>
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
      ${oeilletsN > 0 ? `<p><b>Œillets :</b> ${oeilletsN}</p>` : ""}
      <p><b>Format :</b> ${state.largeur} × ${state.hauteur} mm</p>
      <p><b>Quantité :</b> ${state.quantite}</p>
      ${prixHtml}
    `;
  }

});
