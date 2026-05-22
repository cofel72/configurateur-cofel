// /auth/lock.js
// Protège les pages des configurateurs.
// Accès autorisé si :
//  - token "admin" valide
//  - OU profil client présent ET session client non expirée
//
// Amélioration :
//  - une session client expire automatiquement au bout de 24 h
//  - cela force une reconnexion et recharge les remises à jour

import { AUTH_SETTINGS } from "./config.js";

const TOKEN_KEY = `auth_token_${AUTH_SETTINGS.siteId}`;
const CLIENT_KEY = "cofel_client_profile";

// Durée de validité d'une session client : 24 h
const CLIENT_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function getProjectBase() {
  return "/";
}

function redirectToLogin(reason = "") {
  const base = getProjectBase();
  const returnUrl = encodeURIComponent(location.href);

  let url = `${base}auth/client-login.html?return=${returnUrl}`;

  if (reason) {
    url += `&reason=${encodeURIComponent(reason)}`;
  }

  location.replace(url);
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

function clearClientProfile() {
  try {
    localStorage.removeItem(CLIENT_KEY);
  } catch (e) {
    console.error("Erreur suppression profil client :", e);
  }
}

function getClientProfile() {
  try {
    const raw = localStorage.getItem(CLIENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error("Erreur lecture profil client :", e);
    clearClientProfile();
    return null;
  }
}

function hasValidClientProfile() {
  const profile = getClientProfile();

  if (!profile || typeof profile.email !== "string" || !profile.email.trim()) {
    clearClientProfile();
    return false;
  }

  const now = Date.now();

  // Important :
  // Les anciens profils déjà connectés n'ont pas encore _cofel_expires_at.
  // On les considère donc comme expirés pour forcer une reconnexion propre.
  if (!profile._cofel_expires_at) {
    clearClientProfile();
    return false;
  }

  const expiresAt = Number(profile._cofel_expires_at);

  if (!Number.isFinite(expiresAt) || expiresAt <= now) {
    clearClientProfile();
    return false;
  }

  return true;
}

function scheduleAutoLogoutIfNeeded() {
  const profile = getClientProfile();
  if (!profile || !profile._cofel_expires_at) return;

  const expiresAt = Number(profile._cofel_expires_at);
  if (!Number.isFinite(expiresAt)) return;

  const delay = expiresAt - Date.now();

  if (delay <= 0) {
    clearClientProfile();
    redirectToLogin("expired");
    return;
  }

  // Déconnexion automatique même si le client laisse l'onglet ouvert
  setTimeout(() => {
    clearClientProfile();
    redirectToLogin("expired");
  }, delay);
}

// === Point d'entrée ===
const adminOk = hasValidAdminToken();
const clientOk = hasValidClientProfile();

if (!adminOk && !clientOk) {
  redirectToLogin("expired");
} else {
  scheduleAutoLogoutIfNeeded();

  // Authentification OK → signal global
  window.dispatchEvent(new Event("cofel-auth-ready"));
}
