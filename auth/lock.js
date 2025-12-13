// /auth/lock.js
// Protège les pages des configurateurs.
// Accès autorisé si :
//  - token "admin" valide (mot de passe global Cofel)
//  - OU profil client présent (connexion via client-login.html)

import { AUTH_SETTINGS } from "./config.js";

const TOKEN_KEY = `auth_token_${AUTH_SETTINGS.siteId}`;
const CLIENT_KEY = "cofel_client_profile";

function getProjectBase() {
  // Sur Cloudflare Pages, ton site est servi à la racine,
  // donc la base est toujours "/"
  return "/";
}

function redirectToLogin() {
  const base = getProjectBase();
  const returnUrl = encodeURIComponent(location.href);
  location.replace(`${base}auth/client-login.html?return=${returnUrl}`);
}

function hasValidAdminToken() {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return false;
    const token = JSON.parse(raw);
    const now = Date.now();
    if (!token.exp || token.exp < now) return false;
    if (token.ua && token.ua !== navigator.userAgent) return false;
    return true;
  } catch (e) {
    console.error("Erreur lecture token admin :", e);
    return false;
  }
}

function hasClientProfile() {
  try {
    const raw = localStorage.getItem(CLIENT_KEY);
    if (!raw) return false;
    const profile = JSON.parse(raw);
    // On vérifie juste qu'il y a un email
    if (!profile || typeof profile.email !== "string") return false;
    return true;
  } catch (e) {
    console.error("Erreur lecture profil client :", e);
    return false;
  }
}

// === Point d'entrée ===
if (!hasValidAdminToken() && !hasClientProfile()) {
  redirectToLogin();
}
