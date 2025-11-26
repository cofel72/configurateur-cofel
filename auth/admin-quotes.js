// ============================================================================
// ADMIN — LISTE DES DEVIS COFEL
// ============================================================================

let allQuotes = [];

// ---------------------------------------------------------------------------
// Chargement des devis depuis le Worker
// ---------------------------------------------------------------------------
async function loadQuotes() {
  try {
    const resp = await fetch("https://cofel-auth.sonveven.workers.dev/list-quotes");
    const data = await resp.json();

    if (!data.ok) {
      alert("Impossible de charger les devis.");
      return;
    }

    allQuotes = data.quotes || [];
    renderQuotes();

  } catch (err) {
    console.error("Erreur loadQuotes :", err);
    alert("Erreur de chargement des devis.");
  }
}

// ---------------------------------------------------------------------------
// Affichage du tableau dans le HTML
// ---------------------------------------------------------------------------
function renderQuotes() {
  const tbody = document.querySelector("#quotes-table tbody");
  tbody.innerHTML = "";

  if (allQuotes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:15px;">Aucun devis pour le moment.</td></tr>`;
    return;
  }

  for (const q of allQuotes) {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${q.id}</td>
      <td>${formatDate(q.created_at)}</td>
      <td>${q.client_email || "-"}</td>
      <td>${q.client_company || "-"}</td>
      <td>${q.client_name || "-"}</td>
      <td>${q.product_type}</td>
      <td>${formatPrice(q.total_ht)}</td>
      <td>
        <button class="view-btn" onclick="viewQuote(${q.id})">
          📄 Voir
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  }
}

// ---------------------------------------------------------------------------
// Ouvrir un PDF
// ---------------------------------------------------------------------------
function viewQuote(id) {
  const q = allQuotes.find(x => x.id === id);

  if (!q) {
    alert("Devis introuvable.");
    return;
  }

  // Vérification : le Worker DOIT avoir rempli pdf_url dans D1
  if (!q.pdf_url) {
    alert("⚠️ Le PDF n'est pas encore disponible sur le serveur.");
    return;
  }

  // Ouverture directe du PDF GitHub
  window.open(q.pdf_url, "_blank");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatPrice(n) {
  if (n == null) return "-";
  return Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) + " €";
}

// ---------------------------------------------------------------------------
// Lancement auto
// ---------------------------------------------------------------------------
window.addEventListener("DOMContentLoaded", loadQuotes);
