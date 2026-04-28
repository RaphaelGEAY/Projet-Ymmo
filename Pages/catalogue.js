let currentProperties = [];
let selectedPropertyId = null;

document.addEventListener("DOMContentLoaded", () => {
  syncSessionUi();
  initCataloguePage();
});

function initCataloguePage() {
  const searchForm = document.getElementById("search-form");
  const resetButton = document.getElementById("reset-filters");
  const refreshButton = document.getElementById("refresh-button");
  const offersGrid = document.getElementById("offers-grid");
  const selectedContactButton = document.getElementById("selected-contact-button");
  const quickButtons = Array.from(document.querySelectorAll(".chip-button"));

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

  quickButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      applyQuickFilter(button, searchForm);
      await loadProperties(readForm(searchForm));
    });
  });

  offersGrid.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-property-id]");
    if (!trigger) {
      return;
    }

    const propertyId = Number(trigger.dataset.propertyId);
    selectPropertyById(propertyId, { scrollToContact: trigger.dataset.action === "contact" });
  });

  selectedContactButton?.addEventListener("click", () => {
    if (!selectedPropertyId) {
      return;
    }
    selectPropertyById(selectedPropertyId, { scrollToContact: true });
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

    if (!currentProperties.length) {
      selectedPropertyId = null;
      renderSelectedProperty(null);
    } else if (!currentProperties.some((item) => item.id === selectedPropertyId)) {
      selectPropertyById(currentProperties[0].id);
    } else {
      renderSelectedProperty(currentProperties.find((item) => item.id === selectedPropertyId) || null);
    }

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
      const isSelected = item.id === selectedPropertyId;
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
        <article class="property-card ${isSelected ? "is-selected" : ""}">
          <div class="property-visual ${propertyClass}">
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
          <div class="button-row">
            <button class="btn soft" type="button" data-action="select" data-property-id="${item.id}">
              Voir la fiche
            </button>
            <button class="btn ghost" type="button" data-action="contact" data-property-id="${item.id}">
              Contacter
            </button>
          </div>
        </article>
      `;
    })
    .join("");
}

function selectPropertyById(propertyId, options = {}) {
  const property = currentProperties.find((item) => item.id === propertyId);
  if (!property) {
    return;
  }

  selectedPropertyId = property.id;
  trackViewedProperty(property);
  renderProperties(currentProperties);
  renderSelectedProperty(property);

  if (options.scrollToContact) {
    fillContactForm(property);
    scrollToForm();
  }
}

function renderSelectedProperty(property) {
  const visual = document.getElementById("selected-visual");
  const typeBadge = document.getElementById("selected-type-badge");
  const title = document.getElementById("selected-title");
  const location = document.getElementById("selected-location");
  const price = document.getElementById("selected-price");
  const agency = document.getElementById("selected-agency");
  const status = document.getElementById("selected-status");
  const description = document.getElementById("selected-description");
  const metrics = document.getElementById("selected-metrics");
  const selectedContactButton = document.getElementById("selected-contact-button");

  if (!visual || !typeBadge || !title || !location || !price || !agency || !status || !description || !metrics) {
    return;
  }

  if (!property) {
    visual.className = "selected-visual selected-visual--default";
    typeBadge.textContent = "Bien";
    title.textContent = "Choisissez un bien";
    location.textContent = "La fiche detaillee apparaitra ici.";
    price.textContent = "Prix sur demande";
    agency.textContent = "Ymmo";
    status.textContent = "Non selectionne";
    description.textContent =
      "Selectionnez un bien depuis la liste pour afficher sa synthese, ses indicateurs et preparer une demande de visite.";
    metrics.innerHTML = "";
    if (selectedContactButton) {
      selectedContactButton.disabled = true;
    }
    fillContactForm(null);
    return;
  }

  visual.className = `selected-visual ${getPropertyClass(property.type).replace("property-visual", "selected-visual")}`;
  typeBadge.textContent = property.type || "Bien";
  title.textContent = property.title || "Bien sans titre";
  location.textContent = `${property.city || "Ville inconnue"} · ${property.reference || ""}`;
  price.textContent = formatPrice(property.price);
  agency.textContent = property.agency_name || "Agence Ymmo";
  status.textContent = property.status || "Inconnu";
  description.textContent = property.description || "Description a completer.";

  const metricValues = [
    property.rooms ? `${property.rooms} pieces` : null,
    property.surface_m2 ? `${property.surface_m2} m2` : null,
    property.energy_class ? `DPE ${property.energy_class}` : null,
    property.buyer_interest_score ? `interet ${property.buyer_interest_score}/100` : null,
    property.estimated_days_on_market ? `${property.estimated_days_on_market} jours estimes` : null,
    property.estimated_rent_yield ? `rendement ${property.estimated_rent_yield}%` : null,
  ].filter(Boolean);

  metrics.innerHTML = metricValues
    .map((value) => `<span class="metric-chip">${escapeHtml(value)}</span>`)
    .join("");

  if (selectedContactButton) {
    selectedContactButton.disabled = false;
  }
  fillContactForm(property);
}

function fillContactForm(property) {
  // Store the selected property for contact page
  if (!property) {
    sessionStorage.removeItem("selectedProperty");
    return;
  }
  
  sessionStorage.setItem("selectedProperty", JSON.stringify({
    id: property.id,
    title: property.title,
    city: property.city,
    price: property.price,
    agency_name: property.agency_name,
  }));
}

function scrollToForm() {
  // Scroll to top of detail panel
  const detailSurface = document.querySelector(".detail-surface");
  if (detailSurface) {
    detailSurface.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  }
}
