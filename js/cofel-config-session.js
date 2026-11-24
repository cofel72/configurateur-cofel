/* Configuration des lignes et résumé du devis. Aucun changement des formules tarifaires. */
(function () {
  "use strict";
  const STORE = "devisCourant_v1";
  const PAGES = [
    "configurateur-tole-tablette", "configurateur-lettre-boitier",
    "configurateur-lettres-PVC", "configurateur-totems",
    "configurateur-enseigne-drapeau", "configurateur-rampe-lumineuse",
    "configurateur-tolerie-dibond", "configurateur-lettre-alu-alupvc",
    "souples-rigides-adhesifs"
  ];
  const pageKey = path => String(path || "").replace(/\.html$/, "").split("/").pop();
  const key = pageKey(location.pathname);
  const isConfig = PAGES.includes(key);
  let ready = false, adapter = null, restoring = false, restoreFailed = false;
  let editId = isConfig ? new URLSearchParams(location.search).get("editLine") : null;
  let originalLine = null;
  const pending = new Set();
  const $ = id => document.getElementById(id);
  const read = () => {
    try { return JSON.parse(localStorage.getItem(STORE) || "{}") || {}; }
    catch (_) { return {}; }
  };
  const changed = () => window.dispatchEvent(new Event("cofel:quote-changed"));
  const money = n => Number(n || 0).toLocaleString("fr-FR", {style:"currency", currency:"EUR"});
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

  function validConfiguration(config) {
    return config && config.version === 1 &&
      PAGES.includes(pageKey(config.path)) &&
      config.path === "/configurateurs/" + pageKey(config.path) + ".html" &&
      Array.isArray(config.fields);
  }
  function capture() {
    if (!isConfig) return null;
    const fields = Array.from(document.querySelectorAll("input, select, textarea"))
      .filter(el => !el.disabled && !el.readOnly &&
        !["button","submit","file","password","hidden"].includes(el.type) &&
        !/^(ralSearch|map[TO]_)/.test(el.id) &&
        (el.id || el.name) && (el.type !== "radio" || el.checked))
      .map(el => ({
        id: el.id || "", name: el.name || "", type: el.type,
        value: el.value, checked: ["checkbox","radio"].includes(el.type) ? el.checked : undefined
      }));
    return {version:1, path:"/configurateurs/" + key + ".html", fields,
      state: adapter?.capture ? adapter.capture() : null};
  }
  function openLine(id) {
    const line = (read().lignes || []).find(l => l.id === id);
    if (!validConfiguration(line?.configuration)) return false;
    location.href = line.configuration.path + "?editLine=" + encodeURIComponent(id);
    return true;
  }
  function commitLine(line, state) {
    if (restoring || restoreFailed) throw new Error("La configuration n’est pas encore prête. Attendez la fin du chargement.");
    const config = capture();
    if (config) line.configuration = {...config, lineQuantity:line.quantite};
    if (editId) {
      const index = state.lignes.findIndex(l => l.id === editId);
      if (index < 0) throw new Error("La ligne d’origine a été supprimée. Revenez au devis avant de continuer.");
      if (JSON.stringify(state.lignes[index]) !== originalLine) {
        throw new Error("Cette ligne a été modifiée dans un autre onglet. Revenez au devis et rouvrez-la pour conserver les dernières modifications.");
      }
      line = {...state.lignes[index], ...line, id:editId};
      state.lignes[index] = line;
    } else {
      state.lignes.push(line);
    }
    return line;
  }
  function afterSave(line) {
    if (editId) {
      originalLine = JSON.stringify(line);
      setBanner("Configuration mise à jour dans le devis.", false);
    }
    changed();
  }
  function track(promise) {
    const item = Promise.resolve(promise);
    pending.add(item);
    item.then(() => pending.delete(item), () => pending.delete(item));
    return item;
  }
  async function settle() {
    while (pending.size) await Promise.all(Array.from(pending));
    await pause(0);
  }
  async function waitFor(test, message) {
    const until = Date.now() + 15000;
    while (!test()) {
      if (Date.now() > until) throw new Error(message);
      await pause(50);
    }
  }
  function findField(field) {
    if (field.id) return $(field.id);
    return Array.from(document.getElementsByName(field.name))
      .find(el => el.type === field.type && el.value === field.value);
  }
  async function restoreFields(config) {
    for (const field of config.fields) {
      // Les radios non sélectionnées ne font pas partie de la capture.
      await waitFor(() => {
        const el = findField(field);
        return el && (el.tagName !== "SELECT" || Array.from(el.options).some(o => o.value === field.value));
      }, "Une option enregistrée n’est plus disponible. La ligne d’origine reste intacte.");
      const el = findField(field);
      if (el.disabled) {
        if (field.checked === false || el.checked === field.checked) continue;
        throw new Error("Une option enregistrée n’est plus compatible. La ligne d’origine reste intacte.");
      }
      if (el.type === "checkbox" || el.type === "radio") {
        if (el.checked === field.checked) continue;
        el.checked = field.checked;
      } else {
        // Toujours rejouer les champs pour synchroniser les menus personnalisés.
        el.value = field.value;
      }
      el.dispatchEvent(new Event("input", {bubbles:true}));
      el.dispatchEvent(new Event("change", {bubbles:true}));
      await settle();
    }
    // Les menus visuels sont construits à partir des selects natifs.
    document.querySelectorAll(".cselect[data-bind]").forEach(wrap => {
      const native = $(wrap.dataset.bind);
      const label = wrap.querySelector(".cselect-label");
      if (native && label) label.textContent = native.selectedOptions[0]?.textContent || "";
      wrap.querySelectorAll(".cselect-option").forEach(opt => {
        opt.setAttribute("aria-selected", String(opt.dataset.value === native?.value));
      });
    });
  }
  function setBanner(text, loading) {
    let banner = $("cofelEditBanner");
    if (!banner) {
      banner = document.createElement("section");
      banner.id = "cofelEditBanner";
      banner.className = "cofel-edit-banner";
      banner.setAttribute("aria-label", "Modification de la configuration");
      const message = document.createElement("p");
      message.id = "cofelEditMessage";
      message.setAttribute("role", "status");
      const cancel = document.createElement("a");
      cancel.href = "/index.html#recapDevis";
      cancel.textContent = "Revenir au devis";
      const fresh = document.createElement("a");
      fresh.href = "/configurateurs/" + key + ".html";
      fresh.textContent = "Créer une autre ligne";
      banner.append(message, cancel, fresh);
      const header = document.querySelector("header");
      if (header) header.after(banner); else document.body.prepend(banner);
    }
    $("cofelEditMessage").textContent = text;
    banner.setAttribute("aria-busy", String(loading));
  }
  function setAddDisabled(disabled) {
    const button = $("btnAddDevis") || $("addToDevisBtn");
    if (button) button.disabled = disabled;
  }
  async function restoreLine() {
    const line = (read().lignes || []).find(l => l.id === editId);
    if (!line || !validConfiguration(line.configuration) || pageKey(line.configuration.path) !== key) {
      restoreFailed = true;
      setBanner("Cette ligne ne contient pas de configuration réutilisable. Revenez au devis.", false);
      setAddDisabled(true);
      return;
    }
    originalLine = JSON.stringify(line);
    restoring = true;
    setAddDisabled(true);
    setBanner("Chargement de la configuration enregistrée…", true);
    try {
      await waitFor(() => ready, "Les tarifs n’ont pas pu être chargés. Réessayez ou revenez au devis.");
      await settle();
      if (adapter?.restore && line.configuration.state) await adapter.restore(line.configuration.state);
      else await restoreFields(line.configuration);
      // La quantité du devis peut avoir été modifiée manuellement après sa création.
      if ($("quantite") && line.configuration.lineQuantity !== undefined && Number(line.quantite) !== Number(line.configuration.lineQuantity)) {
        $("quantite").value = line.quantite;
        $("quantite").dispatchEvent(new Event("input", {bubbles:true}));
        $("quantite").dispatchEvent(new Event("change", {bubbles:true}));
        if (adapter?.refresh) await adapter.refresh();
      }
      const button = $("btnAddDevis") || $("addToDevisBtn");
      if (button) button.textContent = "✓ Mettre à jour la ligne";
      setBanner("Vous modifiez une ligne du devis. Le prix sera recalculé lors de sa mise à jour. Le devis reste intact tant que vous ne validez pas.", false);
      setAddDisabled(false);
    } catch (err) {
      restoreFailed = true;
      setBanner(err.message, false);
      setAddDisabled(true);
    } finally { restoring = false; updateWarnings(); }
  }
  function renderSummary() {
    const root = $("cofelQuoteSummary");
    if (!root) return;
    const lines = (read().lignes || []).filter(l => String(l.type || "").toLowerCase() !== "groupe");
    try {
      const transport = JSON.parse(localStorage.getItem("cofel_transport_add") || "null");
      if (transport?.id && !lines.some(l => l.id === transport.id)) lines.push(transport);
    } catch (_) {}
    const total = lines.reduce((sum,l) => sum + (Number(l.quantite) || 0) * (Number(l.pu_net_ht) || 0), 0);
    root.querySelector("[data-count]").textContent = lines.length + (lines.length === 1 ? " ligne" : " lignes");
    root.querySelector("[data-total]").textContent = money(total) + " HT";
  }
  function createSummary() {
    if ($("cofelQuoteSummary")) return;
    const root = document.createElement("aside");
    root.id = "cofelQuoteSummary";
    root.className = "cofel-quote-summary";
    root.setAttribute("aria-label", "Résumé du devis en cours");
    const currentIsHome = ["", "/", "/index.html"].includes(location.pathname);
    root.innerHTML = '<div><span>Devis en cours · </span><span data-count></span><strong data-total></strong></div>' +
      '<a href="' + (currentIsHome ? "#recapDevis" : "/index.html#recapDevis") + '">Voir mon devis →</a>';
    document.body.append(root);
    document.body.classList.add("cofel-has-summary");
    renderSummary();
  }
  function updateWarnings() {
    if (!isConfig) return;
    const warnings = [];
    let anchor = null;
    if (key === "configurateur-tole-tablette") {
      anchor = $("optAjour");
      const mat = document.querySelector('input[name="matiere"]:checked')?.value;
      const existingNote = $("ajourMatiereNote");
      if (existingNote) {
        existingNote.classList.toggle("cofel-compatibility-notice", !!anchor?.checked && mat !== "laque");
        existingNote.setAttribute("role", "status");
        existingNote.setAttribute("aria-live", "polite");
      } else if (anchor?.checked && mat !== "laque") {
        warnings.push("Ajourage : choisissez « Alu 20/10 laqué ». Les goujons sont soudés avant le laquage ; cette opération ne peut pas être réalisée sur une tôle prélaquée.");
      }
    }
    if (key === "configurateur-lettres-PVC") {
      anchor = $("optRetro");
      if ($("epaisseur")?.value === "10") warnings.push("PVC 10 mm : le rétroéclairage et la semelle PMMA ne sont pas disponibles.");
      if ($("optSemelle")?.checked) warnings.push("Semelle PMMA : éclairage et fixations inclus. Ces options sont sélectionnées automatiquement, sans fixation supplémentaire.");
      else if (anchor?.checked) warnings.push("Rétroéclairage : les fixations sont incluses. La fixation séparée est désactivée pour éviter un supplément.");
    }
    if (key === "configurateur-lettre-alu-alupvc") {
      anchor = $("categorie");
      if (anchor?.value && anchor.value !== "alu30") warnings.push("Les tiges aluminium soudées à sceller sont disponibles uniquement pour les lettres aluminium 30/10.");
    }
    if (key === "configurateur-enseigne-drapeau") {
      anchor = $("dimension");
      const unavailable = Array.from(document.querySelectorAll('input[name="finition"]:disabled'))
        .map(el => el.closest("label")?.textContent.trim()).filter(Boolean);
      if (unavailable.length) warnings.push("Finitions indisponibles pour cette forme et cette dimension : " + unavailable.join(" ; ") + ".");
    }
    let notice = $("cofelCompatibilityNotice");
    if (!anchor) return;
    if (!notice) {
      notice = document.createElement("div");
      notice.id = "cofelCompatibilityNotice";
      notice.className = "cofel-compatibility-notice";
      notice.setAttribute("role", "status");
      notice.setAttribute("aria-live", "polite");
      const section = anchor.closest("fieldset, .card, .panel");
      (section || anchor.parentElement).append(notice);
    }
    notice.textContent = warnings.join(" ");
    notice.hidden = !warnings.length;
  }
  window.CofelConfig = {
    capture, openLine, commitLine, afterSave, track, validConfiguration,
    register(value) { adapter = value; },
    markReady() { ready = true; },
    get isRestoring() { return restoring; }
  };
  document.addEventListener("DOMContentLoaded", () => {
    createSummary();
    updateWarnings();
    document.addEventListener("input", () => setTimeout(updateWarnings, 0));
    document.addEventListener("change", () => setTimeout(updateWarnings, 0));
    if (editId) restoreLine();
  });
  window.addEventListener("cofel:quote-changed", renderSummary);
  window.addEventListener("storage", e => { if ([STORE, "cofel_transport_add", null].includes(e.key)) renderSummary(); });
  window.addEventListener("pageshow", renderSummary);
  window.addEventListener("focus", renderSummary);
})();

