// ============================================================================
// Admin – Liste des devis Cofel (portail admin-quotes.html)
// Charge les devis depuis le Worker + filtres + ouverture du PDF stocké sur GitHub
// ============================================================================

const API_URL = "https://cofel-auth.sonveven.workers.dev";

// Références DOM (cohérentes avec admin-quotes.html)
const tbody      = document.querySelector("#tableQuotes tbody");
const fEmail     = document.getElementById("searchEmail");
const fCompany   = document.getElementById("searchCompany");
const fProduct   = document.getElementById("searchProduct");
const fDate      = document.getElementById("searchDate");

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

// ======================= AFFICHAGE DES LIGNES =======================
function renderQuotes() {
  if (!tbody) return;

  const emailVal = (fEmail.value || "").toLowerCase().trim();
  const compVal  = (fCompany.value || "").toLowerCase().trim();
  const prodVal  = fProduct.value || "";
  const dateVal  = fDate.value || ""; // format yyyy-mm-dd

  const filtered = allQuotes.filter((q) => {
    const mail   = (q.client_email || "").toLowerCase();
    const company = (q.client_company || "").toLowerCase();
    const created = q.created_at || "";

    if (emailVal && !mail.includes(emailVal)) return false;
    if (compVal && !company.includes(compVal)) return false;
    if (prodVal && q.product_type !== prodVal) return false;
    if (dateVal && !created.startsWith(dateVal)) return false;

    return true;
  });

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
        <td>${q.client_email || "-"}</td>
        <td>${q.client_company || "-"}</td>
        <td>${q.client_name || "-"}</td>
        <td>${q.product_type}</td>
        <td>${formatEuros(q.total_ht)}</td>
        <td>
          <button class="btn-view" onclick="viewQuote(${q.id})">
            Voir
          </button>
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
  return Number(n).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " €";
}

// ======================= ACTION : VOIR (ouvre le PDF GitHub) =======================
function viewQuote(id) {
  window.open(`https://cofel-auth.sonveven.workers.dev/get-pdf?id=${id}`, "_blank");
}


// ======================= FILTRES =======================
[fEmail, fCompany, fProduct, fDate].forEach((el) => {
  el.addEventListener("input", renderQuotes);
});

// ======================= INITIALISATION =======================
loadQuotes();
