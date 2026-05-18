document.addEventListener("DOMContentLoaded", () => {
  syncSessionUi();
  loadDashboard();
});

async function loadDashboard() {
  try {
    const response = await apiRequest("/api/dashboard");
    renderDashboard(response);
  } catch (error) {
    setText("agency-count", "Erreur");
    setText("hotspot-city", "Impossible de charger");
  }
}

function renderDashboard(data) {
  const summary = data.summary || {};
  const analytics = data.analytics || {};
  const hotspots = data.hotspots || [];
  const priceByType = data.price_by_type || [];
  const recentSales = data.recent_sales || [];
  const network = data.network || {};
  const sites = network.sites || [];

  setText("agency-count", network.agency_count || 0);
  setText("property-count", summary.total_properties || 0);
  setText("workstation-count", network.total_workstations || 0);

  const statsGrid = document.getElementById("stats-grid");
  if (statsGrid) {
    const stats = [
      { value: formatPrice(summary.average_price), label: "prix moyen du portefeuille" },
      { value: `${summary.available_properties || 0}`, label: "biens disponibles" },
      { value: `${analytics.average_interest || 0}/100`, label: "interet acheteur moyen" },
      { value: `${analytics.average_days_on_market || 0} j`, label: "delai moyen estime" },
    ];

    statsGrid.innerHTML = renderKpiCards(stats);
  }

  const hotspotCity = document.getElementById("hotspot-city");
  const hotspotSummary = document.getElementById("hotspot-summary");
  if (hotspotCity && hotspotSummary) {
    if (!hotspots.length) {
      hotspotCity.textContent = "Aucune priorite";
      hotspotSummary.textContent = "Aucune ville ressort pour le moment.";
    } else {
      const topCity = hotspots[0];
      hotspotCity.textContent = `${topCity.city} · score ${topCity.interest_score}/100`;
      hotspotSummary.textContent =
        `${topCity.city} combine ${topCity.days_on_market} jours moyens, ` +
        `${topCity.rent_yield}% de rendement estime et un prix moyen de ${formatPrice(topCity.average_price)}.`;
    }
  }

  const networkSummary = document.getElementById("network-summary");
  if (networkSummary) {
    const headOffice = sites.find((site) => site.site_type === "Siege");
    networkSummary.innerHTML = `
      <div class="mini-item">
        <strong>${escapeHtml(network.headquarters_city || "Aix-en-Provence")}</strong>
        <span>siege et supervision centrale</span>
      </div>
      <div class="mini-item">
        <strong>${escapeHtml(String(network.agency_count || 0))} agences</strong>
        <span>diffusion nationale synchronisee</span>
      </div>
      <div class="mini-item">
        <strong>${escapeHtml(String(network.total_workstations || 0))} postes relies</strong>
        <span>${escapeHtml(headOffice ? headOffice.notes : "VPN IPSec et services partages")}</span>
      </div>
    `;
  }
}
