// ============================================================================
// Admin – Liste des devis Cofel (admin-quotes.html)
// + filtres (email, société, produit, période, montants)
// + presets période (mois en cours, 3 mois glissants...)
// + export Excel (XLSX) des devis filtrés
// ============================================================================

const API_URL = "https://cofel-auth.sonveven.workers.dev";

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
    const res = await fetch(`${API_URL}/list-quotes`);
    const data = await res.json();

    if (!data.ok) throw new Error("Réponse API non ok");

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

  // Montants
  const minRaw = (fMinAmount?.value ?? "").toString().replace(",", ".");
  const maxRaw = (fMaxAmount?.value ?? "").toString().replace(",", ".");
  const minVal = minRaw === "" ? NaN : parseFloat(minRaw);
  const maxVal = maxRaw === "" ? NaN : parseFloat(maxRaw);

  // Période (inclusive)
  const fromStr = fDateFrom?.value || ""; // yyyy-mm-dd
  const toStr   = fDateTo?.value || "";   // yyyy-mm-dd
  const fromDt  = fromStr ? dateAtStartOfDay(fromStr) : null;
  const toDt    = toStr   ? dateAtEndOfDay(toStr)     : null;

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

// ======================= RENDER =======================
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
    .map((q) => `
      <tr>
        <td>${formatDate(q.created_at)}</td>
        <td>${escapeHtml(q.client_email || "-")}</td>
        <td>${escapeHtml(q.client_company || "-")}</td>
        <td>${escapeHtml(q.client_name || "-")}</td>
        <td>${escapeHtml(humanProduct(q.product_type))}</td>
        <td>${formatEuros(q.total_ht)}</td>
        <td><button class="btn-view" onclick="viewQuote(${Number(q.id)})">Voir</button></td>
      </tr>
    `)
    .join("");
}

// ======================= PRESETS PÉRIODE =======================
function applyDatePreset(preset) {
  const now = new Date();

  // Helpers
  const ymd = (d) => {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  };
  const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
  const endOfMonth   = (d) => new Date(d.getFullYear(), d.getMonth()+1, 0);

  // addMonths "safe"
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
    const to   = now; // mois en cours jusqu’à aujourd’hui
    fDateFrom.value = ymd(from);
    fDateTo.value   = ymd(to);
  }

  if (preset === "month_prev") {
    const prev = addMonths(now, -1);
    const from = startOfMonth(prev);
    const to   = endOfMonth(prev);
    fDateFrom.value = ymd(from);
    fDateTo.value   = ymd(to);
  }

  if (preset === "rolling_3m") {
    const from = addMonths(now, -3); // glissant : -3 mois à aujourd’hui
    const to   = now;
    fDateFrom.value = ymd(from);
    fDateTo.value   = ymd(to);
  }

  if (preset === "rolling_30d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    const to = now;
    fDateFrom.value = ymd(from);
    fDateTo.value   = ymd(to);
  }

  renderQuotes();
}

// Si l’utilisateur touche aux dates manuellement => on repasse en "personnalisée"
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
    ["ID", "Date", "Email", "Société", "Contact", "Produit", "Total HT", "Lien PDF"],
    ...filtered.map((q) => ([
      q.id ?? "",
      formatDate(q.created_at),
      q.client_email || "",
      q.client_company || "",
      q.client_name || "",
      humanProduct(q.product_type),
      toNumber(q.total_ht),
      `${API_URL}/get-pdf?id=${q.id}`
    ]))
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws["!cols"] = [
    { wch: 10 }, { wch: 20 }, { wch: 28 }, { wch: 28 },
    { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 45 },
  ];

  // Format € sur colonne "Total HT" (G)
  const range = XLSX.utils.decode_range(ws["!ref"]);
  for (let r = 1; r <= range.e.r; r++) {
    const addr = XLSX.utils.encode_cell({ c: 6, r });
    const cell = ws[addr];
    if (cell) { cell.t = "n"; cell.z = '#,##0.00 "€"'; }
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
  const [y,m,d] = ymd.split("-").map(Number);
  return new Date(y, (m-1), d, 0, 0, 0, 0);
}
function dateAtEndOfDay(ymd) {
  const [y,m,d] = ymd.split("-").map(Number);
  return new Date(y, (m-1), d, 23, 59, 59, 999);
}

function formatDate(iso) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR") + " " +
      d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function toNumber(v) {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function formatEuros(n) {
  if (n == null) return "-";
  return toNumber(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function humanProduct(code) {
  const map = {
    "tole-tablette": "Tôle tablette",
    "rampe-lumineuse": "Rampe lumineuse (PLL)",
    "totem": "Totems",
    "lettres-pvc": "Lettres PVC",
    "devis-index": "Devis Index",
  };
  return map[code] || (code || "-");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fileStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

// ======================= EVENTS =======================
[fEmail, fCompany, fProduct, fMinAmount, fMaxAmount].forEach((el) => {
  if (!el) return;
  el.addEventListener("input", renderQuotes);
});

if (fPreset) {
  fPreset.addEventListener("change", (e) => applyDatePreset(e.target.value));
}

if (fDateFrom) fDateFrom.addEventListener("input", onManualDateChange);
if (fDateTo)   fDateTo.addEventListener("input", onManualDateChange);

if (btnExportXlsx) btnExportXlsx.addEventListener("click", exportExcel);

// ======================= INIT =======================
loadQuotes();
