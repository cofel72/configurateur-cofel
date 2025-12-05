document.addEventListener("DOMContentLoaded", () => {

  // =============================
  // 1. CONFIG (ARBRE DES MATIÈRES)
  // =============================

  const CONFIG = {
    souple: {
      avec: [
        { key: "adh_depol", label: "Adhésif dépoli",
          options: { hasBlanc:true, decoupeFormat:true, decoupeComplexe:true, lamination:[], extra:{} }
        },
        { key: "adh_conformable", label: "Adhésif conformable",
          options:{ hasBlanc:false, decoupeFormat:true, decoupeComplexe:true, lamination:["mate","brillante"], extra:{} }
        },
        { key: "adh_poly_colleRenforcee", label:"Adhésif polymère — colle renforcée",
          options:{ hasBlanc:false, decoupeFormat:true, decoupeComplexe:true,
                    lamination:["mate","brillante","antidérapante","antigraffitis"], extra:{} }
        },
        { key: "adh_poly_colleStandard", label:"Adhésif polymère — colle standard",
          options:{ hasBlanc:false, decoupeFormat:true, decoupeComplexe:true,
                    lamination:["mate","brillante"], extra:{} }
        },
        { key: "adh_poly_transparent", label:"Adhésif polymère transparent",
          options:{ hasBlanc:true, decoupeFormat:true, decoupeComplexe:true,
                    lamination:["mate","brillante"], extra:{} }
        },
        { key: "adh_microperfore", label:"Adhésif microperforé",
          options:{ hasBlanc:true, decoupeFormat:true, decoupeComplexe:true,
                    lamination:[], extra:{} }
        },
        { key: "adh_papierPeint110", label:"Adhésif papier peint 110 g",
          options:{ hasBlanc:false, decoupeFormat:true, decoupeComplexe:false,
                    lamination:[], extra:{} }
        },
        { key: "magnetique", label:"Magnétique",
          options:{ hasBlanc:false, decoupeFormat:true, decoupeComplexe:true,
                    lamination:["mate","brillante","velleda"], extra:{} }
        }
      ],
      sans: [
        { key:"adh_depol_sans", label:"Adhésif dépoli",
          options:{ hasBlanc:false, decoupeFormat:true, decoupeComplexe:true, lamination:[], extra:{} }
        },
        { key:"vinyl_teinte_masse", label:"Vinyle polymère teinté masse",
          options:{ hasBlanc:false, decoupeFormat:true, decoupeComplexe:true, lamination:[], extra:{} }
        },
        { key:"ardoisine", label:"Ardoisine",
          options:{ hasBlanc:false, decoupeFormat:true, decoupeComplexe:true, lamination:[], extra:{} }
        }
      ]
    },

    rigide: {
      avec: [
        { key:"pvc3", label:"PVC 3 mm",
          options:{ hasBlanc:false, decoupeFormat:true, decoupeComplexe:true, lamination:[], extra:{} }
        },
        { key:"pvc5", label:"PVC 5 mm",
          options:{ hasBlanc:false, decoupeFormat:true, decoupeComplexe:true, lamination:[], extra:{} }
        },
        { key:"pvc10", label:"PVC 10 mm",
          options:{ hasBlanc:false, decoupeFormat:true, decoupeComplexe:true, lamination:[], extra:{} }
        },
        { key:"akilux35", label:"Akilux 3,5 mm",
          options:{ hasBlanc:false, decoupeFormat:true, decoupeComplexe:false, lamination:[], extra:{oeillets:true} }
        },
        { key:"akilux10", label:"Akilux 10 mm",
          options:{ hasBlanc:false, decoupeFormat:true, decoupeComplexe:false, lamination:[], extra:{oeillets:true} }
        },
        { key:"plexi3", label:"Plexi incolore 3 mm",
          options:{ hasBlanc:true, decoupeFormat:true, decoupeComplexe:true, lamination:[], extra:{} }
        },
        { key:"plexi5", label:"Plexi incolore 5 mm",
          options:{ hasBlanc:true, decoupeFormat:true, decoupeComplexe:true, lamination:[], extra:{} }
        },
        { key:"plexi8", label:"Plexi incolore 8 mm",
          options:{ hasBlanc:true, decoupeFormat:true, decoupeComplexe:true, lamination:[], extra:{} }
        },
        { key:"plexi10", label:"Plexi incolore 10 mm",
          options:{ hasBlanc:true, decoupeFormat:true, decoupeComplexe:true, lamination:[], extra:{} }
        },
        { key:"acm3", label:"ACM 3 mm (Dibond)",
          options:{ hasBlanc:false, decoupeFormat:true, decoupeComplexe:true,
                    lamination:["mate","brillante","velleda"], extra:{} }
        }
      ],
      sans: [] // à compléter si besoin plus tard
    }
  };

  // =============================
  // 2. STATE (CHOIX DU CLIENT)
  // =============================

  const state = {
    support:null,
    impression:null,
    materialKey:null,
    material:null,
    options:{
      blanc:null,
      decoupe:null,
      lamination:null,
      oeillets:false,
      nbOeillets:0
    },
    largeur:null,
    hauteur:null,
    quantite:1
  };

  // =============================
  // 3. ELEMENTS DOM
  // =============================

  const stepsSections = [...document.querySelectorAll(".step-section")];
  const stepsNav = [...document.querySelectorAll(".step-item")];
  const listeMatieres = document.getElementById("listeMatieres");
  const optionsContainer = document.getElementById("optionsContainer");
  const recapEl = document.getElementById("recap");

  let currentStep = 1;
  let maxStep = 1;

  // =============================
  // 4. NAVIGATION ENTRE ÉTAPES
  // =============================

  function renderSteps(){
    stepsSections.forEach((sec,i)=>{
      sec.classList.toggle("active", i+1 === currentStep);
    });
    stepsNav.forEach((nav,i)=>{
      const step = i+1;
      nav.classList.toggle("active", step === currentStep);
      nav.classList.toggle("locked", step > maxStep);
    });
  }

  function goTo(step){
    currentStep = step;
    if(step > maxStep) maxStep = step;
    renderSteps();
    if(step === 3) populateMaterials();
    if(step === 4) populateOptions();
    if(step === 6) buildRecap();
  }

  function getChecked(name){
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : null;
  }

  function validate(step){

    if(step === 1){
      const v = getChecked("support");
      if(!v){ alert("Choisis un type de support."); return false; }
      state.support = v;
      return true;
    }

    if(step === 2){
      const v = getChecked("impression");
      if(!v){ alert("Choisis si tu veux une impression."); return false; }
      state.impression = v;
      return true;
    }

    if(step === 3){
      if(!state.materialKey){ alert("Choisis une matière."); return false; }
      return true;
    }

    if(step === 4){
      const mat = state.material;

      if(mat.options.hasBlanc && !state.options.blanc){
        alert("Précise le blanc de soutien.");
        return false;
      }

      if((mat.options.decoupeFormat || mat.options.decoupeComplexe) &&
        !state.options.decoupe){
        alert("Choisis un type de découpe.");
        return false;
      }

      if(mat.options.lamination.length > 0 && !state.options.lamination){
        state.options.lamination = "aucune";
      }

      return true;
    }

    if(step === 5){
      const L = Number(document.getElementById("largeur").value || 0);
      const H = Number(document.getElementById("hauteur").value || 0);
      const Q = Number(document.getElementById("quantite").value || 0);

      if(!L || !H){ alert("Renseigne largeur et hauteur."); return false; }
      if(!Q || Q < 1){ alert("Quantité invalide."); return false; }

      state.largeur = L;
      state.hauteur = H;
      state.quantite = Q;

      return true;
    }

    return true;
  }

  // =============================
  // 5. MATIÈRES (ÉTAPE 3)
  // =============================
  function populateMaterials(){
    listeMatieres.innerHTML = "";

    if(!state.support || !state.impression){
      listeMatieres.textContent = "Choisis support + impression d’abord.";
      return;
    }

    const branch = CONFIG[state.support][state.impression];
    if(!branch){
      listeMatieres.textContent = "Aucune matière disponible.";
      return;
    }

    branch.forEach(mat => {
      const label = document.createElement("label");
      label.className = "pill";

      const inp = document.createElement("input");
      inp.type = "radio";
      inp.name = "matiere";
      inp.value = mat.key;

      if(state.materialKey === mat.key) inp.checked = true;

      inp.addEventListener("change",()=>{
        state.materialKey = mat.key;
        state.material = mat;
        state.options = { blanc:null, decoupe:null, lamination:null, oeillets:false, nbOeillets:0 };
      });

      label.appendChild(inp);
      label.appendChild(document.createTextNode(mat.label));
      listeMatieres.appendChild(label);
    });
  }

  // =============================
  // 6. OPTIONS (ÉTAPE 4)
  // =============================
  function populateOptions(){
    optionsContainer.innerHTML = "";
    const mat = state.material;

    if(!mat){
      optionsContainer.textContent = "Choisis une matière d’abord.";
      return;
    }

    // --- Blanc de soutien ---
    if(mat.options.hasBlanc){
      const bloc = sectionTitle("Blanc de soutien");
      const row = radioRow("opt_blanc", [
        {v:"avec", txt:"Avec blanc de soutien"},
        {v:"sans", txt:"Sans blanc de soutien"}
      ], state.options.blanc, (v)=> state.options.blanc = v);
      bloc.appendChild(row);
      optionsContainer.appendChild(bloc);
    }

    // --- Découpe ---
    if(mat.options.decoupeFormat || mat.options.decoupeComplexe){
      const choc = [];
      if(mat.options.decoupeFormat) choc.push({v:"format", txt:"Découpe au format"});
      if(mat.options.decoupeComplexe) choc.push({v:"complexe", txt:"Découpe complexe"});

      const bloc = sectionTitle("Découpe");
      const row = radioRow("opt_decoupe", choc,
        state.options.decoupe,
        (v)=> state.options.decoupe = v
      );
      bloc.appendChild(row);
      optionsContainer.appendChild(bloc);
    }

    // --- Lamination ---
    const lam = mat.options.lamination || [];
    const blocLam = sectionTitle("Lamination");

    if(lam.length === 0){
      blocLam.appendChild(infoText("Pas de lamination possible sur ce support."));
    } else {
      const list = [{v:"aucune", txt:"Aucune lamination"}];
      lam.forEach(l => {
        list.push({v:l, txt:("Lamination " + l)});
      });
      const row = radioRow("opt_lami", list, state.options.lamination,
        (v)=> state.options.lamination = v);
      blocLam.appendChild(row);
    }
    optionsContainer.appendChild(blocLam);

    // --- Œillets ---
    if(mat.options.extra && mat.options.extra.oeillets){
      const bloc = sectionTitle("Œillets");

      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.checked = state.options.oeillets;

      const lab = document.createElement("label");
      lab.style.marginLeft = "8px";
      lab.textContent = "Ajouter des œillets";

      chk.addEventListener("change",()=>{
        state.options.oeillets = chk.checked;
        if(!chk.checked) state.options.nbOeillets = 0;
      });

      const nb = document.createElement("input");
      nb.type = "number";
      nb.min = 0;
      nb.placeholder = "Nombre d'œillets";
      nb.style.marginLeft = "10px";
      nb.value = state.options.nbOeillets || "";

      nb.addEventListener("input",()=>{
        const v = Number(nb.value||0);
        state.options.nbOeillets = v>0 ? v : 0;
        if(v>0){
          state.options.oeillets = true;
          chk.checked = true;
        }
      });

      const wrap = document.createElement("div");
      wrap.style.display = "flex";
      wrap.style.alignItems = "center";
      wrap.appendChild(chk);
      wrap.appendChild(lab);
      wrap.appendChild(nb);

      bloc.appendChild(wrap);
      optionsContainer.appendChild(bloc);
    }
  }

  // =============================
  // 7. RÉCAP (ÉTAPE 6)
  // =============================
  function buildRecap(){
    recapEl.innerHTML = "";

    const data = [
      ["Support", state.support === "souple" ? "Support souple" : "Support rigide"],
      ["Impression", state.impression === "avec" ? "Avec impression" : "Sans impression"],
      ["Matière", state.material ? state.material.label : ""],
      ["Blanc de soutien", state.options.blanc ? (state.options.blanc==="avec"?"Avec":"Sans") : "—"],
      ["Découpe", state.options.decoupe ? (state.options.decoupe==="format"?"Format":"Complexe") : "—"],
      ["Lamination", state.options.lamination || "—"],
      ["Format", `${state.largeur} × ${state.hauteur} mm`],
      ["Quantité", state.quantite],
      ["Œillets", state.options.oeillets? (state.options.nbOeillets+" œillets"):"—"]
    ];

    const ul = document.createElement("ul");
    ul.style.listStyle = "none";
    ul.style.paddingLeft = "0";

    data.forEach(([lbl,val])=>{
      const li = document.createElement("li");
      li.style.marginBottom = "6px";
      li.innerHTML = `<strong>${lbl} :</strong> ${val}`;
      ul.appendChild(li);
    });

    recapEl.appendChild(ul);
  }

  // =============================
  // 8. OUTILS UI (GÉNÉRATEURS)
  // =============================
  function sectionTitle(txt){
    const d = document.createElement("div");
    const h = document.createElement("h3");
    h.textContent = txt;
    d.appendChild(h);
    return d;
  }

  function infoText(txt){
    const p = document.createElement("p");
    p.style.fontSize = "13px";
    p.style.opacity = "0.85";
    p.textContent = txt;
    return p;
  }

  function radioRow(name, options, selected, callback){
    const wrap = document.createElement("div");
    wrap.className = "radio-row";

    options.forEach(opt=>{
      const lab = document.createElement("label");
      const inp = document.createElement("input");
      inp.type = "radio";
      inp.name = name;
      inp.value = opt.v;

      if(selected === opt.v || (!selected && opt.v==="aucune")){
        inp.checked = true;
      }

      inp.addEventListener("change",()=> callback(opt.v));

      lab.appendChild(inp);
      lab.appendChild(document.createTextNode(opt.txt));
      wrap.appendChild(lab);
    });

    return wrap;
  }

  // =============================
  // 9. BOUTONS DE NAVIGATION
  // =============================
  document.getElementById("next1").onclick = () => { if(validate(1)) goTo(2); };
  document.getElementById("prev2").onclick = () => goTo(1);
  document.getElementById("next2").onclick = () => { if(validate(2)) goTo(3); };
  document.getElementById("prev3").onclick = () => goTo(2);
  document.getElementById("next3").onclick = () => { if(validate(3)) goTo(4); };
  document.getElementById("prev4").onclick = () => goTo(3);
  document.getElementById("next4").onclick = () => { if(validate(4)) goTo(5); };
  document.getElementById("prev5").onclick = () => goTo(4);
  document.getElementById("next5").onclick = () => { if(validate(5)) goTo(6); };
  document.getElementById("prev6").onclick = () => goTo(5);

  // Clic sur barre d’étapes (retour uniquement)
  stepsNav.forEach(nav=>{
    nav.addEventListener("click",()=>{
      const target = Number(nav.dataset.step);
      if(target <= maxStep) goTo(target);
    });
  });

});
