let currentProperties = [];

document.addEventListener("DOMContentLoaded", () => {
  syncSessionUi();
  initCataloguePage();
});

function initCataloguePage() {
  const searchForm = document.getElementById("search-form");
  const resetButton = document.getElementById("reset-filters");
  const refreshButton = document.getElementById("refresh-button");
  const offersGrid = document.getElementById("offers-grid");

  if (!searchForm || !offersGrid) {
    return;
  }

  searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await loadProperties(readForm(searchForm));
  });

  resetButton?.addEventListener("click", async () => {
    searchForm.reset();
    await loadProperties(readForm(searchForm));
  });

  refreshButton?.addEventListener("click", async () => {
    await loadProperties(readForm(searchForm));
  });

  offersGrid.addEventListener("click", (event) => {
    const card = event.target.closest(".property-card");
    if (card) {
      const propertyId = Number(card.getAttribute("data-property-id"));
      if (propertyId) {
        goToPropertyDetail(propertyId);
      }
    }
  });

  loadProperties(readForm(searchForm)).catch((error) => {
    setText("offers-state", error.message);
  });
}

async function loadProperties(filters) {
  const offersState = document.getElementById("offers-state");
  const resultsCounter = document.getElementById("results-counter");
  const offersGrid = document.getElementById("offers-grid");

  if (!offersState || !resultsCounter || !offersGrid) {
    return;
  }

  offersState.textContent = "Chargement des offres...";
  resultsCounter.textContent = "";
  offersGrid.innerHTML = "";

  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });

    const route = params.toString() ? `/api/properties?${params.toString()}` : "/api/properties";
    const response = await apiRequest(route);
    currentProperties = response.items || [];
    renderProperties(currentProperties);

    offersState.textContent = response.count ? "" : "Aucun bien ne correspond aux filtres.";
    resultsCounter.textContent = response.count
      ? `${response.count} bien${response.count > 1 ? "s" : ""} charge${response.count > 1 ? "s" : ""}.`
      : "";
  } catch (error) {
    offersState.textContent = error.message;
  }
}

function renderProperties(items) {
  const offersGrid = document.getElementById("offers-grid");
  if (!offersGrid) {
    return;
  }

  if (!items.length) {
    offersGrid.innerHTML = "";
    return;
  }

  offersGrid.innerHTML = items
    .map((item) => {
      const statusClass = item.status === "Disponible" ? "status-available" : "status-pending";
      const propertyClass = getPropertyClass(item.type);
      const mediaUrl = getPropertyMediaUrl(item);
      const visualStyle = mediaUrl
        ? ` style="background-image: linear-gradient(135deg, rgba(20, 32, 25, 0.18), rgba(20, 32, 25, 0.45)), url('${escapeHtml(mediaUrl)}');"`
        : "";
      const details = [
        item.rooms ? `${item.rooms} pieces` : null,
        item.surface_m2 ? `${item.surface_m2} m2` : null,
        item.energy_class ? `DPE ${item.energy_class}` : null,
      ]
        .filter(Boolean)
        .join(" · ");

      const metrics = [
        item.monthly_views ? `${item.monthly_views} vues/mois` : null,
        item.buyer_interest_score ? `interet ${item.buyer_interest_score}/100` : null,
        item.estimated_days_on_market ? `${item.estimated_days_on_market} jours` : null,
      ]
        .filter(Boolean)
        .map((value) => `<span class="metric-chip">${escapeHtml(value)}</span>`)
        .join("");

      return `
        <article class="property-card" data-property-id="${item.id}">
          <div class="property-visual ${propertyClass}"${visualStyle}>
            <span>${escapeHtml(item.city || "Ville")}</span>
            <strong>${escapeHtml(item.title || "Bien sans titre")}</strong>
          </div>
          <div class="property-meta-top">
            <div class="badge-row">
              <span class="badge type">${escapeHtml(item.type || "Bien")}</span>
              <span class="badge ${statusClass}">${escapeHtml(item.status || "Inconnu")}</span>
            </div>
            <strong class="property-price">${formatPrice(item.price)}</strong>
          </div>
          <div class="property-copy">
            <h3>${escapeHtml(item.reference || "")}</h3>
            <p class="property-city">${escapeHtml(item.city || "Ville inconnue")} · ${escapeHtml(item.agency_name || "Agence Ymmo")}</p>
            <p>${escapeHtml(item.description || "Description a completer.")}</p>
          </div>
          <div class="property-meta-bottom">
            <span class="helper">${escapeHtml(details || "Caracteristiques a completer")}</span>
          </div>
          <div class="metric-chip-list">${metrics}</div>
        </article>
      `;
    })
    .join("");
}

function goToPropertyDetail(propertyId) {
  // Track the viewed property
  const property = currentProperties.find((item) => item.id === propertyId);
  if (property) {
    trackViewedProperty(property);
  }

  // Navigate to the detail page
  window.location.href = `/detail-bien?id=${propertyId}`;
}
