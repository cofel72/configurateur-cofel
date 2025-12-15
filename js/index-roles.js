// =========================================================
// COFEL — Gestion des rôles utilisateurs (Index)
// =========================================================

(function () {
  "use strict";

  // === Administrateurs complets ===
  const FULL_ADMINS = [
    "commercial@cofel72.fr"
  ];

  // === Utilisateurs autorisés à modifier les devis ===
  const QUOTE_EDITORS = [
    "souvre@cofel72.fr",
    "secretaire@cofel72.fr",
    "direction@deco72.com"
  ];

  // Exposition globale (utilisée par index-devis.js plus tard)
  window.COFEL_ROLES = {
    isFullAdmin: false,
    canEditQuote: false,
    email: ""
  };

  try {
    const profile = JSON.parse(
      localStorage.getItem("cofel_client_profile") || "{}"
    );

    const email = profile.email || "";
    window.COFEL_ROLES.email = email;

    window.COFEL_ROLES.isFullAdmin =
      FULL_ADMINS.includes(email);

    window.COFEL_ROLES.canEditQuote =
      window.COFEL_ROLES.isFullAdmin ||
      QUOTE_EDITORS.includes(email);

  } catch (e) {
    console.warn("COFEL roles — lecture profil impossible", e);
  }

  // === Affichage des liens admin ===
  document.addEventListener("DOMContentLoaded", () => {
    const adminLinks = document.getElementById("admin-links");
    if (!adminLinks) return;

    if (window.COFEL_ROLES.isFullAdmin) {
      adminLinks.classList.remove("hidden");
    }
  });

})();
