/******************************************************
 * RULESET — Supports souples / rigides / adhésifs
 * Source de vérité unique du configurateur
 ******************************************************/


const MATERIAL_RULES = {

/* ---------------------------------------------------
   1 — MATIÈRES SOUPLES — AVEC IMPRESSION
--------------------------------------------------- */
  "souple_avec": {

    "depoli": {
      label: "Adhésif dépoli",
      variants: null,
      blanc: ["Avec blanc", "Sans blanc"],
      decoupe: ["Format", "Complexe"],
      lamination: [],  // aucune lamination possible
    },

    "conformable": {
      label: "Adhésif conformable",
      variants: null,
      blanc: [], // pas de blanc sur conformable
      decoupe: ["Format", "Complexe"],
      lamination: ["Mate", "Brillante"],
    },

    "polymer": {
      label: "Adhésif polymère",
      variants: {
        "ultraclear": {
          label: "Transparent Ultra Clear",
          blanc: ["Avec blanc", "Sans blanc"],
          decoupe: ["Format", "Complexe"],
          lamination: ["Mate", "Brillante"]
        },
        "opaque_renforce": {
          label: "Opaque — colle renforcée",
          blanc: [], 
          decoupe: ["Format", "Complexe"],
          lamination: ["Brillante", "Mate", "Anti-dérapante"]
        },
        "opaque_standard": {
          label: "Opaque — colle standard",
          blanc: [], 
          decoupe: ["Format", "Complexe"],
          lamination: ["Brillante", "Mate", "Anti-graffiti"]
        }
      }
    },

    "microperfore": {
      label: "Adhésif micro-perforé",
      variants: {
        "transparent": {
          label: "Transparent",
          blanc: ["Avec blanc", "Sans blanc"],
          decoupe: ["Format", "Complexe"],
          lamination: [] 
        },
        "opaque": {
          label: "Opaque",
          blanc: [], 
          decoupe: ["Format", "Complexe"],
          lamination: []
        }
      }
    },

    "papierpeint": {
      label: "Papier peint 110 g",
      variants: null,
      blanc: [],
      decoupe: ["Format"],
      lamination: []
    },

    "magnetique": {
      label: "Magnétique",
      variants: null,
      blanc: [],
      decoupe: ["Format", "Complexe"],
      lamination: ["Brillante", "Mate", "Velleda"]
    }
  },

/* ---------------------------------------------------
   2 — MATIÈRES SOUPLES — SANS IMPRESSION
--------------------------------------------------- */

  "souple_sans": {

    "depoli": {
      label: "Adhésif dépoli",
      variants: null,
      blanc: [],
      decoupe: ["Format", "Complexe"],
      lamination: []
    },

    "vinyl_teinte_masse": {
      label: "Vinyl polymère teinté masse",
      variants: null,
      blanc: [],
      decoupe: ["Format", "Complexe"],
      lamination: []
    },

    "ardoisine": {
      label: "Ardoisine",
      variants: null,
      blanc: [],
      decoupe: ["Format", "Complexe"],
      lamination: []
    }
  },

/* ---------------------------------------------------
   3 — MATIÈRES RIGIDES — AVEC IMPRESSION
--------------------------------------------------- */

  "rigide_avec": {

    "pvc3": {
      label: "PVC 3 mm",
      variants: null,
      blanc: [],
      decoupe: ["Format", "Complexe"],
      lamination: []
    },

    "pvc5": {
      label: "PVC 5 mm",
      variants: null,
      blanc: [],
      decoupe: ["Format", "Complexe"],
      lamination: []
    },

    "pvc10": {
      label: "PVC 10 mm",
      variants: null,
      blanc: [],
      decoupe: ["Format", "Complexe"],
      lamination: []
    },

    "akilux35": {
      label: "Akilux 3,5 mm",
      variants: {
        "avec_oeillets": {
          label: "Avec œillets",
          oeillets: true,
          blanc: [],
          decoupe: ["Format"],
          lamination: []
        },
        "sans_oeillets": {
          label: "Sans œillets",
          oeillets: false,
          blanc: [],
          decoupe: ["Format"],
          lamination: []
        }
      }
    },

    "plexi3": plexiRule("Plexi 3 mm"),
    "plexi5": plexiRule("Plexi 5 mm"),
    "plexi8": plexiRule("Plexi 8 mm"),
    "plexi10": plexiRule("Plexi 10 mm"),

    "dibond3": {
      label: "ACM Dibond 3 mm",
      variants: null,
      blanc: [],
      decoupe: ["Format", "Complexe"],
      lamination: ["Mate", "Brillante", "Velleda"]
    }
  },

/* ---------------------------------------------------
   4 — MATIÈRES RIGIDES — SANS IMPRESSION
--------------------------------------------------- */

  "rigide_sans": {
    "pvc3": { label: "PVC 3 mm", variants: null, blanc: [], decoupe: ["Format", "Complexe"], lamination: [] },
    "pvc5": { label: "PVC 5 mm", variants: null, blanc: [], decoupe: ["Format", "Complexe"], lamination: [] },
    "pvc10": { label: "PVC 10 mm", variants: null, blanc: [], decoupe: ["Format", "Complexe"], lamination: [] },

    "akilux35": {
      label: "Akilux 3,5 mm",
      variants: null,
      blanc: [],
      decoupe: ["Format"],
      lamination: []
    },

    "plexi3": plexiRule("Plexi 3 mm"),
    "plexi5": plexiRule("Plexi 5 mm"),
    "plexi8": plexiRule("Plexi 8 mm"),
    "plexi10": plexiRule("Plexi 10 mm"),

    "dibond3": {
      label: "ACM Dibond 3 mm",
      variants: null,
      blanc: [],
      decoupe: ["Format", "Complexe"],
      lamination: ["Mate", "Brillante", "Velleda"]
    }
  }

};

/* ---------------------------------------------------
   Fonction factorisée pour Plexi
--------------------------------------------------- */
function plexiRule(label) {
  return {
    label,
    variants: {
      "avec_blanc": {
        label: "Avec blanc de soutien",
        blanc: ["Avec blanc"],
        decoupe: ["Format", "Complexe"],
        lamination: []
      },
      "sans_blanc": {
        label: "Sans blanc de soutien",
        blanc: ["Sans blanc"],
        decoupe: ["Format", "Complexe"],
        lamination: []
      }
    }
  };
}
