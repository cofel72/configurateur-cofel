// ============================================================================
// Admin – Liste des devis Cofel (admin-quotes.html)
// + filtres (email, société, produit, période, montants)
// + presets période (mois en cours, 3 mois glissants...)
// + export Excel (XLSX) des devis filtrés
// + bouton "Voir PDF"
// + bouton "Modifier" pour réinjecter un devis dans index.html
// ============================================================================

const API_URL = "https://cofel-auth.sonveven.workers.dev";
const STORAGE_KEY = "devisCourant_v1";

// DOM
const tbody         = document.querySelector("#tableQuotes tbody");
const fEmail        = document.getElementById("searchEmail");
const fCompany      = document.getElementById("searchCompany");
const fProduct      = document.getElementById("searchProduct");

const fPreset       = document.getElementById("datePreset");
const fDateFrom     = document.getElementById("dateFrom");
const fDateTo       = document.getElementById("dateTo");

const fMinAmount    = document.getElementById("searchMinAmount");
const fMaxAmount    = document.getElementById("searchMaxAmount");
const btnExportXlsx = document.getElementById("btnExportXlsx");

let allQuotes = [];

// ======================= CHARGEMENT =======================
async function loadQuotes() {
  if (!tbody) return;

  tbody.innerHTML =
    `<tr><td colspan="7" style="padding:20px;color:var(--txt-dim);text-align:center;">
      Chargement des devis…
    </td></tr>`;

  try {
    const res = await fetch(`${API_URL}/list-quotes`, { cache: "no-store" });
    const data = await res.json();

    if (!data.ok) {
      throw new Error(data.error || "Réponse API non ok");
    }

    allQuotes = data.quotes || [];
    renderQuotes();

  } catch (err) {
    console.error("Erreur loadQuotes :", err);
    alert("Erreur de chargement des devis.");

    tbody.innerHTML =
      `<tr><td colspan="7" style="padding:20px;color:red;text-align:center;">
        Erreur de chargement des devis.
      </td></tr>`;
  }
}

// ======================= FILTRES =======================
function getFilteredQuotes() {
  const emailVal = (fEmail?.value || "").toLowerCase().trim();
  const compVal  = (fCompany?.value || "").toLowerCase().trim();
  const prodVal  = fProduct?.value || "";

  const minRaw = (fMinAmount?.value ?? "").toString().replace(",", ".");
  const maxRaw = (fMaxAmount?.value ?? "").toString().replace(",", ".");

  const minVal = minRaw === "" ? NaN : parseFloat(minRaw);
  const maxVal = maxRaw === "" ? NaN : parseFloat(maxRaw);

  const fromStr = fDateFrom?.value || "";
  const toStr   = fDateTo?.value || "";

  const fromDt  = fromStr ? dateAtStartOfDay(fromStr) : null;
  const toDt    = toStr ? dateAtEndOfDay(toStr) : null;

  return allQuotes.filter((q) => {
    const mail    = (q.client_email || "").toLowerCase();
    const company = (q.client_company || "").toLowerCase();
    const total   = toNumber(q.total_ht);

    if (emailVal && !mail.includes(emailVal)) return false;
    if (compVal && !company.includes(compVal)) return false;
    if (prodVal && q.product_type !== prodVal) return false;

    if (fromDt || toDt) {
      const created = parseQuoteDate(q.created_at);
      if (!created) return false;
      if (fromDt && created < fromDt) return false;
      if (toDt && created > toDt) return false;
    }

    if (!Number.isNaN(minVal) && total < minVal) return false;
    if (!Number.isNaN(maxVal) && total > maxVal) return false;

    return true;
  });
}

// ======================= AFFICHAGE =======================
function renderQuotes() {
  if (!tbody) return;

  const filtered = getFilteredQuotes();

  if (filtered.length === 0) {
    tbody.innerHTML =
      `<tr><td colspan="7" style="padding:20px;text-align:center;color:var(--txt-dim);">
        Aucun devis trouvé.
      </td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map((q) => {
      const hasEditableData = quoteHasEditableData(q);

      return `
        <tr>
          <td>${formatDate(q.created_at)}</td>
          <td>${escapeHtml(q.client_email || "-")}</td>
          <td>${escapeHtml(q.client_company || "-")}</td>
          <td>${escapeHtml(q.client_name || "-")}</td>
          <td>${escapeHtml(humanProduct(q.product_type))}</td>
          <td>${formatEuros(q.total_ht)}</td>
          <td>
            <div class="actions-cell">
              <button class="btn-view" onclick="viewQuote(${Number(q.id)})">
                Voir PDF
              </button>

              <button
                class="btn-reopen"
                onclick="reopenQuote(${Number(q.id)})"
                ${hasEditableData ? "" : "disabled"}
                title="${hasEditableData ? "Réinjecter ce devis dans la page d'accueil" : "Ancien devis sans données modifiables"}"
              >
                ↩ Modifier
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

// ======================= RÉOUVERTURE / MODIFICATION DEVIS =======================
function quoteHasEditableData(q) {
  const extra = parseQuoteExtra(q);
  const lignes = extractLinesFromExtra(extra);

  return Array.isArray(lignes) && lignes.length > 0;
}

function reopenQuote(id) {
  const q = allQuotes.find(item => Number(item.id) === Number(id));

  if (!q) {
    alert("Devis introuvable.");
    return;
  }

  const extra = parseQuoteExtra(q);
  const lignesSource = extractLinesFromExtra(extra);

  if (!Array.isArray(lignesSource) || !lignesSource.length) {
    alert(
      "Impossible de modifier ce devis : les lignes du devis ne sont pas disponibles.\n\n" +
      "Cela peut arriver sur d'anciens devis enregistrés avant la mise en place de cette fonction."
    );
    return;
  }

  const ok = confirm(
    "Ce devis va être réinjecté dans la page d'accueil du configurateur.\n\n" +
    "Le devis actuellement présent dans l'index sera remplacé.\n\n" +
    "L'ancien PDF restera archivé.\n\n" +
    "Continuer ?"
  );

  if (!ok) return;

  const lignes = normalizeQuoteLines(lignesSource);

  const chantier =
    extra?.chantier ||
    extra?.client?.chantier ||
    extra?.infos?.chantier ||
    "";

  const date =
    extra?.date ||
    extra?.devisDate ||
    extra?.date_devis ||
    new Date().toISOString().slice(0, 10);

  const societe =
    extra?.societe ||
    extra?.client?.societe ||
    extra?.clientCompany ||
    q.client_company ||
    "";

  const contact =
    extra?.contact ||
    extra?.client?.contact ||
    extra?.clientName ||
    q.client_name ||
    "";

  const state = {
    lignes,

    chantier,
    date,

    clientEmail: q.client_email || "",
    clientCompany: societe,
    clientName: contact,

    client: {
      societe,
      contact,
      chantier
    },

    remise_pct: Number(extra?.remise_pct || extra?.remise || 0) || 0,

    reopened_from_quote: {
      id: q.id,
      created_at: q.created_at,
      product_type: q.product_type,
      reopened_at: new Date().toISOString()
    }
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

  sessionStorage.setItem("cofel_reopened_quote", JSON.stringify({
    id: q.id,
    created_at: q.created_at,
    product_type: q.product_type
  }));

  window.location.href = "/index.html";
}

function parseQuoteExtra(q) {
  if (!q) return null;

  const raw = q.extra_json;

  if (!raw) return null;

  if (typeof raw === "object") return raw;

  try {
    return JSON.parse(raw);
  } catch (err) {
    console.warn("extra_json invalide pour le devis", q.id, err);
    return null;
  }
}

function extractLinesFromExtra(extra) {
  if (!extra) return [];

  if (Array.isArray(extra.lignes)) return extra.lignes;
  if (Array.isArray(extra.lines)) return extra.lines;
  if (Array.isArray(extra.devis?.lignes)) return extra.devis.lignes;
  if (Array.isArray(extra.quote?.lignes)) return extra.quote.lignes;

  return [];
}

function normalizeQuoteLines(lignes) {
  return lignes
    .filter(l => l && typeof l === "object")
    .map(l => {
      const qteRaw = l.quantite ?? l.qte ?? l.qty ?? 1;
      const quantite = Math.max(1, toNumber(qteRaw) || 1);

      let pu = toNumber(
        l.pu_net_ht ??
        l.pu_public_ht ??
        l.pu_ht ??
        l.puHT ??
        l.pu ??
        l.price_ht ??
        l.prix_ht ??
        0
      );

      let total = toNumber(
        l.total_ligne_ht ??
        l.total_ht ??
        l.totalHT ??
        l.montant_ht ??
        l.total ??
        0
      );

      if (!pu && total && quantite) {
        pu = total / quantite;
      }

      if (!total && pu) {
        total = pu * quantite;
      }

      return {
        ...l,
        id: l.id || generateLineId(),
        type: l.type || "devis-reouvert",
        designation: l.designation || l.label || l.name || "Ligne devis",
        quantite: round2(quantite),
        pu_net_ht: round2(pu),
        total_ligne_ht: round2(total)
      };
    });
}

function generateLineId() {
  try {
    if (window.crypto && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch(e) {}

  return "L_" + Date.now() + "_" + Math.random().toString(16).slice(2);
}

function round2(n) {
  const x = Number(n || 0);
  return Number.isFinite(x) ? Number(x.toFixed(2)) : 0;
}

// ======================= PRESETS PÉRIODE =======================
function applyDatePreset(preset) {
  const now = new Date();

  const ymd = (d) => {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
  const endOfMonth   = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

  const addMonths = (d, n) => {
    const x = new Date(d);
    const day = x.getDate();

    x.setDate(1);
    x.setMonth(x.getMonth() + n);

    const last = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
    x.setDate(Math.min(day, last));

    return x;
  };

  if (!preset) return;

  if (preset === "month_current") {
    const from = startOfMonth(now);
    const to = now;

    fDateFrom.value = ymd(from);
    fDateTo.value = ymd(to);
  }

  if (preset === "month_prev") {
    const prev = addMonths(now, -1);
    const from = startOfMonth(prev);
    const to = endOfMonth(prev);

    fDateFrom.value = ymd(from);
    fDateTo.value = ymd(to);
  }

  if (preset === "rolling_3m") {
    const from = addMonths(now, -3);
    const to = now;

    fDateFrom.value = ymd(from);
    fDateTo.value = ymd(to);
  }

  if (preset === "rolling_30d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 30);

    const to = now;

    fDateFrom.value = ymd(from);
    fDateTo.value = ymd(to);
  }

  renderQuotes();
}

function onManualDateChange() {
  if (fPreset) fPreset.value = "";
  renderQuotes();
}

// ======================= EXPORT XLSX =======================
function exportExcel() {
  const filtered = getFilteredQuotes();

  if (!filtered.length) {
    alert("Aucun devis à exporter avec ces filtres.");
    return;
  }

  if (typeof XLSX === "undefined") {
    alert("Librairie Excel non chargée (xlsx).");
    return;
  }

  const aoa = [
    [
      "ID",
      "Date",
      "Email",
      "Société",
      "Contact",
      "Produit",
      "Total HT",
      "Total TTC",
      "Modifiable",
      "Lien PDF"
    ],
    ...filtered.map((q) => ([
      q.id ?? "",
      formatDate(q.created_at),
      q.client_email || "",
      q.client_company || "",
      q.client_name || "",
      humanProduct(q.product_type),
      toNumber(q.total_ht),
      toNumber(q.total_ttc),
      quoteHasEditableData(q) ? "Oui" : "Non",
      `${API_URL}/get-pdf?id=${q.id}`
    ]))
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws["!cols"] = [
    { wch: 10 },
    { wch: 20 },
    { wch: 28 },
    { wch: 28 },
    { wch: 22 },
    { wch: 24 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 45 }
  ];

  const range = XLSX.utils.decode_range(ws["!ref"]);

  for (let r = 1; r <= range.e.r; r++) {
    const htAddr = XLSX.utils.encode_cell({ c: 6, r });
    const ttcAddr = XLSX.utils.encode_cell({ c: 7, r });

    if (ws[htAddr]) {
      ws[htAddr].t = "n";
      ws[htAddr].z = '#,##0.00 "€"';
    }

    if (ws[ttcAddr]) {
      ws[ttcAddr].t = "n";
      ws[ttcAddr].z = '#,##0.00 "€"';
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Devis");

  const stamp = fileStamp();
  XLSX.writeFile(wb, `devis_cofel_${stamp}.xlsx`);
}

// ======================= DIVERS =======================
function viewQuote(id) {
  window.open(`${API_URL}/get-pdf?id=${id}`, "_blank");
}

function parseQuoteDate(iso) {
  if (!iso) return null;

  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateAtStartOfDay(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m - 1), d, 0, 0, 0, 0);
}

function dateAtEndOfDay(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m - 1), d, 23, 59, 59, 999);
}

function formatDate(iso) {
  if (!iso) return "-";

  try {
    const d = new Date(iso);

    return d.toLocaleDateString("fr-FR") + " " +
      d.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit"
      });

  } catch {
    return iso;
  }
}

function toNumber(v) {
  if (v == null) return 0;

  if (typeof v === "number") {
    return Number.isFinite(v) ? v : 0;
  }

  const s = String(v).replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(s);

  return Number.isFinite(n) ? n : 0;
}

function formatEuros(n) {
  if (n == null) return "-";

  return toNumber(n).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + " €";
}

function humanProduct(code) {
  const map = {
    "tole-tablette": "Tôle tablette",
    "rampe-lumineuse": "Rampe lumineuse (PLL)",
    "totem": "Totems",
    "totems": "Totems",
    "lettres-pvc": "Lettres PVC",
    "lettre-alu-alupvc": "Lettres Alu / Alu-PVC",
    "lettre-boitier": "Lettres boîtiers",
    "tolerie-dibond": "Tôlerie Alu / Dibond",
    "souples-rigides-adhesifs": "Supports souples, rigides & adhésifs",
    "devis-index": "Devis Index"
  };

  return map[code] || (code || "-");
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fileStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

// ======================= ÉVÉNEMENTS =======================
[fEmail, fCompany, fProduct, fMinAmount, fMaxAmount].forEach((el) => {
  if (!el) return;

  const eventName = el.tagName === "SELECT" ? "change" : "input";
  el.addEventListener(eventName, renderQuotes);
});

if (fPreset) {
  fPreset.addEventListener("change", (e) => {
    applyDatePreset(e.target.value);
  });
}

if (fDateFrom) {
  fDateFrom.addEventListener("input", onManualDateChange);
}

if (fDateTo) {
  fDateTo.addEventListener("input", onManualDateChange);
}

if (btnExportXlsx) {
  btnExportXlsx.addEventListener("click", exportExcel);
}

// ======================= INIT =======================
loadQuotes();
