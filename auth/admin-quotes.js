// ============================================================================
// Admin – Liste des devis Cofel (portail admin-quotes.html)
// Charge les devis depuis le Worker + filtres + ouverture du PDF stocké sur GitHub
// + Export Excel (XLSX) des devis filtrés
// ============================================================================

const API_URL = "https://cofel-auth.sonveven.workers.dev";

// Références DOM (cohérentes avec admin-quotes.html)
const tbody        = document.querySelector("#tableQuotes tbody");
const fEmail       = document.getElementById("searchEmail");
const fCompany     = document.getElementById("searchCompany");
const fProduct     = document.getElementById("searchProduct");
const fDate        = document.getElementById("searchDate");
const fMinAmount   = document.getElementById("searchMinAmount");
const fMaxAmount   = document.getElementById("searchMaxAmount");
const btnExportXlsx = document.getElementById("btnExportXlsx");

let allQuotes = [];

// ======================= CHARGEMENT DES DEVIS =======================
async function loadQuotes() {
  if (!tbody) return;

  tbody.innerHTML =
    `<tr><td colspan="7" style="padding:20px;color:var(--txt-dim);text-align:center;">
      Chargement des devis…
    </td></tr>`;

  try {
    const res = await fetch(`${API_URL}/list-quotes`);
    const data = await res.json();

    if (!data.ok) {
      throw new Error("Réponse API non ok");
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

// ======================= FILTRAGE CENTRALISÉ =======================
function getFilteredQuotes() {
  const emailVal = (fEmail?.value || "").toLowerCase().trim();
  const compVal  = (fCompany?.value || "").toLowerCase().trim();
  const prodVal  = fProduct?.value || "";
  const dateVal  = fDate?.value || ""; // yyyy-mm-dd

  // Montants
  const minRaw = (fMinAmount?.value ?? "").toString().replace(",", ".");
  const maxRaw = (fMaxAmount?.value ?? "").toString().replace(",", ".");
  const minVal = minRaw === "" ? NaN : parseFloat(minRaw);
  const maxVal = maxRaw === "" ? NaN : parseFloat(maxRaw);

  return allQuotes.filter((q) => {
    const mail    = (q.client_email || "").toLowerCase();
    const company = (q.client_company || "").toLowerCase();
    const created = q.created_at || "";
    const total   = toNumber(q.total_ht);

    if (emailVal && !mail.includes(emailVal)) return false;
    if (compVal && !company.includes(compVal)) return false;
    if (prodVal && q.product_type !== prodVal) return false;

    // Filtre date : garde tous les devis de ce jour (created_at ISO: "yyyy-mm-dd...")
    if (dateVal && !created.startsWith(dateVal)) return false;

    if (!Number.isNaN(minVal) && total < minVal) return false;
    if (!Number.isNaN(maxVal) && total > maxVal) return false;

    return true;
  });
}

// ======================= AFFICHAGE DES LIGNES =======================
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
        <td>
          <button class="btn-view" onclick="viewQuote(${Number(q.id)})">Voir</button>
        </td>
      </tr>
    `)
    .join("");
}

// ======================= FORMATAGE =======================
function formatDate(iso) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return (
      d.toLocaleDateString("fr-FR") +
      " " +
      d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    );
  } catch {
    return iso;
  }
}

function formatEuros(n) {
  if (n == null) return "-";
  return toNumber(n).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " €";
}

function toNumber(v) {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
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

// Petite sécurité XSS côté table (utile si données externes)
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ======================= ACTION : VOIR (ouvre le PDF GitHub) =======================
function viewQuote(id) {
  window.open(`${API_URL}/get-pdf?id=${id}`, "_blank");
}

// ======================= EXPORT EXCEL (XLSX) =======================
function exportExcel() {
  const filtered = getFilteredQuotes();

  if (!filtered.length) {
    alert("Aucun devis à exporter avec ces filtres.");
    return;
  }

  if (typeof XLSX === "undefined") {
    alert("Librairie Excel non chargée. Vérifie le <script src> xlsx.full.min.js dans admin-quotes.html.");
    return;
  }

  // Entêtes fixes (ordre maîtrisé)
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

  // Largeurs de colonnes (lisible)
  ws["!cols"] = [
    { wch: 10 }, // ID
    { wch: 20 }, // Date
    { wch: 28 }, // Email
    { wch: 28 }, // Société
    { wch: 22 }, // Contact
    { wch: 22 }, // Produit
    { wch: 14 }, // Total
    { wch: 45 }, // Lien PDF
  ];

  // Format monétaire sur la colonne "Total HT" (col index 6 => G)
  const range = XLSX.utils.decode_range(ws["!ref"]);
  for (let r = 1; r <= range.e.r; r++) { // commence à 1 (ligne 2) car ligne 1 = header
    const addr = XLSX.utils.encode_cell({ c: 6, r });
    const cell = ws[addr];
    if (cell) {
      cell.t = "n";
      cell.z = '#,##0.00 "€"';
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Devis");

  const stamp = fileStamp();
  const fileName = `devis_cofel_${stamp}.xlsx`;

  XLSX.writeFile(wb, fileName);
}

function fileStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

// ======================= FILTRES =======================
[fEmail, fCompany, fProduct, fDate, fMinAmount, fMaxAmount].forEach((el) => {
  if (!el) return;
  el.addEventListener("input", renderQuotes);
});

if (btnExportXlsx) {
  btnExportXlsx.addEventListener("click", exportExcel);
}

// ======================= INITIALISATION =======================
loadQuotes();
