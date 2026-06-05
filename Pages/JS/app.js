const STORAGE_KEY = "ymmo-session";
const HISTORY_PREFIX = "ymmo-history::";

const ROLE_HOME_MAP = {
  Client: "/client",
  Agent: "/agent",
  Manager: "/manager",
  "Admin IT": "/admin",
};

let currentProperties = [];
let selectedPropertyId = null;

document.addEventListener("DOMContentLoaded", () => {
  syncSessionUi();

  const page = document.body.dataset.page;
  if (page === "home") {
    initHomePage();
    return;
  }

  if (page === "login") {
    initLoginPage();
    return;
  }

  if (page === "register") {
    initRegisterPage();
    return;
  }

  if (page === "logout") {
    clearSession();
    syncSessionUi();
    return;
  }

  if (page === "role") {
    initRolePage(document.body.dataset.roleView || "");
  }
});

function initHomePage() {
  const searchForm = document.getElementById("search-form");
  const resetButton = document.getElementById("reset-filters");
  const refreshButton = document.getElementById("refresh-button");
  const contactForm = document.getElementById("contact-form");
  const offersGrid = document.getElementById("offers-grid");
  const selectedContactButton = document.getElementById("selected-contact-button");
  const quickButtons = Array.from(document.querySelectorAll(".chip-button"));

  if (!searchForm || !contactForm || !offersGrid) {
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
    await Promise.all([loadDashboard(), loadProperties(readForm(searchForm))]);
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

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await submitContactRequest(contactForm);
  });

  Promise.all([loadDashboard(), loadProperties(readForm(searchForm))]).catch((error) => {
    setText("offers-state", error.message);
  });
}

function initLoginPage() {
  const form = document.getElementById("login-form");
  const feedback = document.getElementById("login-feedback");
  if (!form || !feedback) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFeedback(feedback, "Verification du compte...", "");

    try {
      const payload = readForm(form);
      const response = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      saveSession(response.user);
      syncSessionUi();
      setFeedback(feedback, "Connexion reussie. Redirection en cours...", "success");
      window.setTimeout(() => {
        redirectToRoleHome(response.user.role_name);
      }, 450);
    } catch (error) {
      setFeedback(feedback, error.message, "error");
    }
  });
}

function initRegisterPage() {
  const form = document.getElementById("register-form");
  const feedback = document.getElementById("register-feedback");
  if (!form || !feedback) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFeedback(feedback, "Creation du compte...", "");

    try {
      const payload = readForm(form);
      const response = await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      saveSession(response.user);
      syncSessionUi();
      setFeedback(feedback, "Compte cree. Redirection vers votre espace...", "success");
      window.setTimeout(() => {
        redirectToRoleHome(response.user.role_name);
      }, 550);
    } catch (error) {
      setFeedback(feedback, error.message, "error");
    }
  });
}

function initRolePage(requiredRole) {
  const session = requireRoleSession(requiredRole);
  if (!session) {
    return;
  }

  Promise.all([
    apiRequest("/api/dashboard"),
    apiRequest("/api/properties"),
    apiRequest(
      requiredRole === "Client"
        ? `/api/contact-requests?email=${encodeURIComponent(session.email)}&limit=12`
        : "/api/contact-requests?limit=20"
    ),
  ])
    .then(([dashboard, propertiesResponse, requests]) => {
      const frame = buildRoleFrame(requiredRole, {
        session,
        dashboard,
        properties: propertiesResponse.items || [],
        requests,
        history: loadViewedHistory(session.email),
      });
      renderRoleFrame(frame);
    })
    .catch((error) => {
      const title = document.getElementById("role-title");
      const description = document.getElementById("role-description");
      if (title) {
        title.textContent = "Impossible de charger cet espace";
      }
      if (description) {
        description.textContent = error.message;
      }
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

async function loadDashboard() {
  const response = await apiRequest("/api/dashboard");
  renderDashboard(response);
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
    networkSummary.innerHTML = `
      <div class="mini-item">
        <strong>${escapeHtml(network.headquarters_city || "Aix-en-Provence")}</strong>
        <span>siege et coordination nationale</span>
      </div>
      <div class="mini-item">
        <strong>${escapeHtml(String(network.agency_count || 0))} agences</strong>
        <span>diffusion nationale synchronisee</span>
      </div>
      <div class="mini-item">
        <strong>${escapeHtml(String(network.total_workstations || 0))} conseillers equipes</strong>
        <span>suivi client partage entre les agences</span>
      </div>
    `;
  }

  const typeChart = document.getElementById("type-chart");
  if (typeChart) {
    const maxValue = Math.max(...priceByType.map((item) => Number(item.average_price) || 0), 1);
    typeChart.innerHTML = priceByType
      .map((item) => {
        const ratio = Math.max(8, Math.round(((Number(item.average_price) || 0) / maxValue) * 100));
        return `
          <div class="bar-row">
            <div class="bar-head">
              <span>${escapeHtml(item.type)}</span>
              <strong>${formatPrice(item.average_price)}</strong>
            </div>
            <div class="bar-track">
              <div class="bar-fill" style="width: ${ratio}%"></div>
            </div>
            <span class="helper">${escapeHtml(String(item.property_count))} bien(s) suivis</span>
          </div>
        `;
      })
      .join("");
  }

  const salesList = document.getElementById("sales-list");
  if (salesList) {
    salesList.innerHTML = renderSalesCards(recentSales);
  }

  const networkGrid = document.getElementById("network-grid");
  if (networkGrid) {
    networkGrid.innerHTML = renderNetworkCards(sites);
  }
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
    fillContactSelection(property);
    scrollToContact();
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
    fillContactSelection(null);
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
  fillContactSelection(property);
}

function fillContactSelection(property) {
  const contactForm = document.getElementById("contact-form");
  const selectedProperty = document.getElementById("selected-property");
  if (!contactForm || !selectedProperty) {
    return;
  }

  const input = contactForm.querySelector("[name='property_id']");
  if (!property) {
    if (input) {
      input.value = "";
    }
    selectedProperty.textContent = "Aucun bien selectionne.";
    return;
  }

  if (input) {
    input.value = String(property.id);
  }
  selectedProperty.textContent = `${property.title} · ${property.city} · ${formatPrice(property.price)}`;
}

function scrollToContact() {
  const contactSection = document.getElementById("contact");
  if (!contactSection) {
    return;
  }

  contactSection.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start",
  });
}

async function submitContactRequest(form) {
  const feedback = document.getElementById("contact-feedback");
  if (!feedback) {
    return;
  }

  setFeedback(feedback, "Envoi de la demande...", "");

  try {
    const payload = readForm(form);
    await apiRequest("/api/contact-requests", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    form.reset();
    const property = currentProperties.find((item) => item.id === selectedPropertyId) || null;
    if (property) {
      fillContactSelection(property);
    } else {
      setText("selected-property", "Aucun bien selectionne.");
    }
    setFeedback(feedback, "Demande envoyee. L'agence peut maintenant la traiter.", "success");
  } catch (error) {
    setFeedback(feedback, error.message, "error");
  }
}

function buildRoleFrame(role, context) {
  switch (role) {
    case "Client":
      return buildClientFrame(context);
    case "Agent":
      return buildAgentFrame(context);
    case "Manager":
      return buildManagerFrame(context);
    case "Admin IT":
      return buildAdminFrame(context);
    default:
      return {
        hero: {
          kicker: "Espace Ymmo",
          title: "Profil inconnu",
          description: "Aucune interface n'est definie pour ce profil.",
          badge: role || "Ymmo",
          kpis: [],
        },
        nav: ["Apercu", "Focus", "Suivi", "Actions"],
        focus: { kicker: "Focus", title: "Apercu", description: "", html: renderEmptyState("Aucune donnee disponible.") },
        side: { kicker: "Suivi", title: "Liste", description: "", html: renderEmptyState("Aucune donnee disponible.") },
        bottomLeft: { kicker: "Performance", title: "Vue", description: "", html: renderEmptyState("Aucune donnee disponible.") },
        bottomRight: { kicker: "Actions", title: "Checklist", description: "", html: renderEmptyState("Aucune donnee disponible.") },
      };
  }
}

function buildClientFrame({ session, dashboard, properties, requests, history }) {
  const recommended = properties.filter((item) => item.status === "Disponible").slice(0, 4);
  const hotspot = dashboard.hotspots?.[0];
  const historyItems = history.length ? history : recommended.slice(0, 3).map(toHistoryItem);

  return {
    hero: {
      kicker: "Espace client",
      title: `Bonjour ${session.first_name}, on vous a prepare une vue claire de votre parcours.`,
      description:
        "Retrouvez vos demandes, les biens consultes et les meilleures opportunites du moment sans repasser par la page publique.",
      badge: "Client",
      kpis: [
        { value: String(requests.count || 0), label: "demandes en suivi" },
        { value: String(history.length || 0), label: "biens consultes" },
        { value: hotspot ? hotspot.city : "Rennes", label: "ville la plus porteuse" },
        { value: formatPrice(dashboard.summary?.average_price), label: "prix moyen du parc" },
      ],
    },
    nav: ["Apercu", "Recommandations", "Historique", "Parcours"],
    focus: {
      kicker: "Selection client",
      title: "Biens recommandes pour continuer votre recherche",
      description: "Ces biens cumulent une bonne dynamique de marche et une forte attractivite.",
      html: renderPropertyHighlights(recommended, "Ouvrir le catalogue"),
    },
    side: {
      kicker: "Demandes",
      title: "Vos prises de contact",
      description: "Historique recent de vos demandes envoyees aux agences.",
      html: renderRequestList(requests.items, "Aucune demande enregistree pour le moment."),
    },
    bottomLeft: {
      kicker: "Historique",
      title: "Derniers biens consultes",
      description: "Cette liste vous aide a reprendre facilement vos recherches.",
      html: renderHistoryCards(historyItems),
    },
    bottomRight: {
      kicker: "Parcours d'achat",
      title: "Etapes conseillees",
      description: "Un petit plan simple pour ne rien oublier jusqu'a la signature.",
      html: renderTimelineCards([
        {
          title: "Definir le budget",
          body: "Validez l'enveloppe globale avec financement, frais de notaire et marge de securite.",
        },
        {
          title: "Planifier les visites",
          body: "Ciblez les biens prioritaires et comparez quartier, transport et potentiel locatif.",
        },
        {
          title: "Monter le dossier",
          body: "Rassemblez les pieces utiles pour accelerer la reservation et la negotiation.",
        },
        {
          title: "Suivre la signature",
          body: "Gardez un point de contact unique avec l'agence jusqu'a l'acte final.",
        },
      ]),
    },
  };
}

function buildAgentFrame({ session, dashboard, properties, requests }) {
  const hotLeads = requests.items.filter((item) => ["Nouveau", "Relance", "Planifie"].includes(item.status));
  const priorityProperties = properties
    .filter((item) => item.status === "Disponible")
    .sort((left, right) => right.buyer_interest_score - left.buyer_interest_score)
    .slice(0, 4);
  const hotspot = dashboard.hotspots?.[0];

  return {
    hero: {
      kicker: "Espace agent",
      title: `${session.first_name}, voici vos priorites commerciales du jour.`,
      description:
        "L'interface agent regroupe les leads recents, les mandats a pousser et les actions utiles pour garder le rythme commercial.",
      badge: "Agent",
      kpis: [
        { value: String(hotLeads.length), label: "leads a traiter" },
        { value: String(dashboard.summary?.available_properties || 0), label: "biens disponibles" },
        { value: hotspot ? hotspot.city : "Lyon", label: "ville chaude du moment" },
        { value: `${dashboard.analytics?.average_days_on_market || 0} j`, label: "delai moyen du marche" },
      ],
    },
    nav: ["Apercu", "Leads", "Mandats", "Actions"],
    focus: {
      kicker: "Leads du jour",
      title: "Demandes a recontacter en priorite",
      description: "Les prises de contact les plus recentes sont placees en tete pour faciliter les relances.",
      html: renderRequestList(hotLeads.length ? hotLeads : requests.items, "Aucun lead recent pour le moment."),
    },
    side: {
      kicker: "Mandats prioritaires",
      title: "Biens a pousser cette semaine",
      description: "Selection basee sur l'interet acheteur et la disponibilite immediate.",
      html: renderPropertyHighlights(priorityProperties, "Voir le bien"),
    },
    bottomLeft: {
      kicker: "Actions du jour",
      title: "Routine commerciale",
      description: "Un cadre simple pour garder le pipe commercial propre.",
      html: renderTimelineCards([
        {
          title: "Rappeler les leads nouveaux",
          body: "Traiter d'abord les demandes du matin et planifier les visites avant la fin de journee.",
        },
        {
          title: "Verifier les dossiers chauds",
          body: "Confirmer financement, disponibilites et objections restantes sur les biens sous tension.",
        },
        {
          title: "Mettre a jour le suivi",
          body: "Completer les commentaires apres chaque echange pour garder une vision nette en equipe.",
        },
      ]),
    },
    bottomRight: {
      kicker: "Prospection",
      title: "Zones a remettre en avant",
      description: "Villes et actifs utiles pour vos prochaines prises de contact.",
      html: renderHotspotCards(dashboard.hotspots || []),
    },
  };
}

function buildManagerFrame({ session, dashboard, properties, requests }) {
  const underOfferCount = properties.filter((item) => item.status === "Sous offre").length;
  const arbitrationQueue = requests.items.filter((item) => ["Relance", "Planifie", "Qualifie"].includes(item.status));
  const statusCards = Object.entries(requests.status_counts || {}).map(([name, count]) => ({
    title: name,
    body: `${count} dossier(s) actuellement dans cet etat.`,
    accent: "status",
  }));
  const agencyCards = (requests.top_agencies || []).map((item) => ({
    title: item.agency_name,
    body: `${item.request_count} demande(s) recentes a suivre.`,
    accent: "agency",
  }));

  return {
    hero: {
      kicker: "Espace manager",
      title: `${session.first_name}, voici la vue de pilotage reseau et pipeline.`,
      description:
        "L'espace manager met l'accent sur la charge commerciale, les arbitrages a faire et les zones ou l'activite doit etre renforcee.",
      badge: "Manager",
      kpis: [
        { value: String(requests.count || 0), label: "demandes recentes" },
        { value: String(underOfferCount), label: "biens sous offre" },
        { value: String(dashboard.network?.agency_count || 0), label: "agences actives" },
        { value: `${dashboard.analytics?.average_interest || 0}/100`, label: "interet moyen acheteur" },
      ],
    },
    nav: ["Apercu", "Pilotage", "Performance", "Revue"],
    focus: {
      kicker: "Pilotage commercial",
      title: "Vue synthese du pipeline",
      description: "Repartition des demandes recentes et agences les plus sollicitees.",
      html: renderSummaryCards(statusCards.concat(agencyCards), "Aucune activite a signaler."),
    },
    side: {
      kicker: "Arbitrage",
      title: "Demandes a surveiller",
      description: "Les dossiers en relance, qualifies ou planifies meritent un suivi rapproché.",
      html: renderRequestList(arbitrationQueue.length ? arbitrationQueue : requests.items, "Aucun arbitrage prioritaire."),
    },
    bottomLeft: {
      kicker: "Performance",
      title: "Villes et agences a observer",
      description: "Combinaison des signaux marche et de la charge commerciale recente.",
      html: renderHotspotCards(dashboard.hotspots || []).concat(renderSummaryCards(agencyCards, "Aucune agence active.")),
    },
    bottomRight: {
      kicker: "Revue hebdo",
      title: "Points manager a maintenir",
      description: "Une cadence de pilotage simple pour garder le reseau aligne.",
      html: renderTimelineCards([
        {
          title: "Revue des leads critiques",
          body: "Passer les dossiers en attente de retour financier ou de validation client.",
        },
        {
          title: "Point agences",
          body: "Verifier la capacite de chaque agence a absorber les demandes et redistribuer si besoin.",
        },
        {
          title: "Suivi des villes chaudes",
          body: "Comparer prix, rendement et temps de vente pour ajuster la priorisation commerciale.",
        },
      ]),
    },
  };
}

function buildAdminFrame({ session, dashboard }) {
  const sites = dashboard.network?.sites || [];
  const vpnActiveCount = sites.filter((site) => Number(site.vpn_enabled) === 1).length;

  return {
    hero: {
      kicker: "Espace admin IT",
      title: `${session.first_name}, voici votre vue supervision et securite.`,
      description:
        "L'espace admin IT regroupe les sujets de disponibilite, de continuite et de qualite de service.",
      badge: "Admin IT",
      kpis: [
        { value: String(sites.length), label: "sites supervises" },
        { value: String(dashboard.network?.total_workstations || 0), label: "collaborateurs equipes" },
        { value: String(vpnActiveCount), label: "sites suivis" },
        { value: "24/7", label: "supervision cible" },
      ],
    },
    nav: ["Apercu", "Supervision", "Reseau", "Securite"],
    focus: {
      kicker: "Services critiques",
      title: "Etat des services essentiels",
      description: "Vision resumee des services qui soutiennent l'activite quotidienne du reseau.",
      html: renderServiceCards([
        { name: "Catalogue Ymmo", status: "Operationnel", detail: "Biens disponibles et demandes clients accessibles aux equipes." },
        { name: "Donnees clients", status: "Operationnel", detail: "Informations de suivi disponibles pour les agences autorisees." },
        { name: "Acces collaborateurs", status: "Operationnel", detail: "Droits adaptes aux responsabilites de chaque profil." },
        { name: "Continuité d'activite", status: "Planifie", detail: "Procedures de reprise et sauvegardes suivies regulierement." },
      ]),
    },
    side: {
      kicker: "Reseau",
      title: "Sites principaux",
      description: "Extrait du reseau siege et agences pour garder la topologie visible.",
      html: renderNetworkCards(sites.slice(0, 4)),
    },
    bottomLeft: {
      kicker: "Couverture",
      title: "Inventaire reseau",
      description: "Chaque site reprend son type, sa charge poste et sa note d'exploitation.",
      html: renderSiteRows(sites),
    },
    bottomRight: {
      kicker: "Securite et continuite",
      title: "Checklist admin IT",
      description: "Les points de controle qui garantissent un service stable pour les agences.",
      html: renderTimelineCards([
        {
          title: "Verifier la supervision",
          body: "Surveiller la disponibilite des sites, les acces et la qualite du service.",
        },
        {
          title: "Controler les sauvegardes",
          body: "Confirmer l'execution quotidienne et garder une procedure de restauration claire.",
        },
        {
          title: "Revoir les acces",
          body: "Valider les droits et la coherence des profils collaborateurs.",
        },
        {
          title: "Preparer le PRA",
          body: "Lister les services critiques, l'ordre de reprise et l'option cloud proposee.",
        },
      ]),
    },
  };
}

function renderRoleFrame(frame) {
  setText("role-kicker", frame.hero.kicker);
  setText("role-title", frame.hero.title);
  setText("role-description", frame.hero.description);
  setText("role-badge", frame.hero.badge);
  setHtml("role-kpis", renderKpiCards(frame.hero.kpis));

  setText("nav-overview-label", frame.nav[0]);
  setText("nav-focus-label", frame.nav[1]);
  setText("nav-detail-label", frame.nav[2]);
  setText("nav-actions-label", frame.nav[3]);

  setText("focus-kicker", frame.focus.kicker);
  setText("focus-title", frame.focus.title);
  setText("focus-description", frame.focus.description);
  setHtml("focus-content", frame.focus.html);

  setText("side-kicker", frame.side.kicker);
  setText("side-title", frame.side.title);
  setText("side-description", frame.side.description);
  setHtml("side-content", frame.side.html);

  setText("bottom-left-kicker", frame.bottomLeft.kicker);
  setText("bottom-left-title", frame.bottomLeft.title);
  setText("bottom-left-description", frame.bottomLeft.description);
  setHtml("bottom-left-content", frame.bottomLeft.html);

  setText("bottom-right-kicker", frame.bottomRight.kicker);
  setText("bottom-right-title", frame.bottomRight.title);
  setText("bottom-right-description", frame.bottomRight.description);
  setHtml("bottom-right-content", frame.bottomRight.html);
}

async function apiRequest(url, options = {}) {
  const requestOptions = {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  };

  const response = await fetch(url, requestOptions);
  const rawText = await response.text();
  const data = rawText ? JSON.parse(rawText) : {};

  if (!response.ok) {
    throw new Error(data.error || `Erreur de service (${response.status})`);
  }

  return data;
}

function applyQuickFilter(button, form) {
  const city = button.dataset.filterCity || "";
  const type = button.dataset.filterType || "";
  const status = button.dataset.filterStatus || "";
  const cityInput = form.querySelector("[name='city']");
  const typeInput = form.querySelector("[name='type']");
  const statusInput = form.querySelector("[name='status']");

  if (city && cityInput) {
    cityInput.value = city;
  }

  if (type && typeInput) {
    typeInput.value = type;
  }

  if (status && statusInput) {
    statusInput.value = status;
  }
}

function readForm(form) {
  const formData = new FormData(form);
  return Object.fromEntries(formData.entries());
}

function syncSessionUi() {
  const session = loadSession();
  const sessionText = document.getElementById("session-text");
  const loginLink = document.getElementById("login-link");
  const registerLink = document.getElementById("register-link");
  const logoutLink = document.getElementById("logout-link");
  const spaceLink = document.getElementById("space-link");

  if (sessionText) {
    sessionText.textContent = session
      ? `${session.first_name} ${session.last_name} · ${session.role_name}`
      : "Visiteur";
  }

  if (loginLink) {
    loginLink.classList.toggle("hidden", Boolean(session));
  }

  if (registerLink) {
    registerLink.classList.toggle("hidden", Boolean(session));
  }

  if (logoutLink) {
    logoutLink.classList.toggle("hidden", !session);
  }

  if (spaceLink) {
    if (session) {
      spaceLink.classList.remove("hidden");
      spaceLink.href = getRoleHome(session.role_name);
    } else {
      spaceLink.classList.add("hidden");
    }
  }
}

function saveSession(user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

function requireRoleSession(requiredRole) {
  const session = loadSession();
  if (!session) {
    window.location.href = "/connexion";
    return null;
  }

  if (requiredRole && session.role_name !== requiredRole) {
    redirectToRoleHome(session.role_name);
    return null;
  }

  return session;
}

function getRoleHome(roleName) {
  return ROLE_HOME_MAP[roleName] || "/";
}

function redirectToRoleHome(roleName) {
  window.location.href = getRoleHome(roleName);
}

function trackViewedProperty(property) {
  const owner = loadSession()?.email || "guest";
  const key = `${HISTORY_PREFIX}${owner}`;
  const history = loadViewedHistory(owner).filter((item) => item.id !== property.id);

  history.unshift({
    id: property.id,
    title: property.title,
    city: property.city,
    price: property.price,
    type: property.type,
    agency_name: property.agency_name,
  });

  localStorage.setItem(key, JSON.stringify(history.slice(0, 6)));
}

function loadViewedHistory(ownerEmail) {
  try {
    return JSON.parse(localStorage.getItem(`${HISTORY_PREFIX}${ownerEmail}`) || "[]");
  } catch {
    return [];
  }
}

function renderKpiCards(items) {
  return items
    .map(
      (item) => `
        <div class="dashboard-kpi">
          <strong>${escapeHtml(String(item.value))}</strong>
          <span>${escapeHtml(item.label)}</span>
        </div>
      `
    )
    .join("");
}

function renderPropertyHighlights(properties, actionLabel) {
  if (!properties.length) {
    return renderEmptyState("Aucun bien pertinent a afficher.");
  }

  return properties
    .map(
      (item) => `
        <article class="dashboard-card">
          <div class="dashboard-card-top">
            <span class="badge type">${escapeHtml(item.type || "Bien")}</span>
            <strong>${formatPrice(item.price)}</strong>
          </div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.city)} · ${escapeHtml(item.agency_name || "Agence Ymmo")}</p>
          <p>${escapeHtml(item.description || "Description a completer.")}</p>
          <div class="dashboard-card-footer">
            <span class="status-pill ${getStatusClass(item.status)}">${escapeHtml(item.status || "Inconnu")}</span>
            <a class="inline-link" href="/catalogue">${escapeHtml(actionLabel)}</a>
          </div>
        </article>
      `
    )
    .join("");
}

function renderRequestList(items, emptyMessage) {
  if (!items.length) {
    return renderEmptyState(emptyMessage);
  }

  return items
    .map(
      (item) => `
        <article class="request-item">
          <div class="request-top">
            <strong>${escapeHtml(item.full_name || "Contact")}</strong>
            <span class="status-pill ${getStatusClass(item.status)}">${escapeHtml(item.status || "Inconnu")}</span>
          </div>
          <p>${escapeHtml(item.property_title || "Bien non precise")} · ${escapeHtml(item.property_city || "Ville non precise")}</p>
          <p>${escapeHtml(item.message || "")}</p>
          <div class="request-meta">
            <span>${escapeHtml(item.email || "")}</span>
            <span>${escapeHtml(formatDateTime(item.created_at))}</span>
          </div>
        </article>
      `
    )
    .join("");
}

function renderHistoryCards(items) {
  if (!items.length) {
    return renderEmptyState("Aucun historique pour le moment.");
  }

  return items
    .map(
      (item) => `
        <article class="dashboard-card dashboard-card-compact">
          <span class="badge type">${escapeHtml(item.type || "Bien")}</span>
          <h3>${escapeHtml(item.title || "Bien")}</h3>
          <p>${escapeHtml(item.city || "Ville non precise")} · ${formatPrice(item.price)}</p>
          <p>${escapeHtml(item.agency_name || "Agence Ymmo")}</p>
          <a class="inline-link" href="/catalogue">Revoir sur le catalogue</a>
        </article>
      `
    )
    .join("");
}

function renderTimelineCards(items) {
  return items
    .map(
      (item) => `
        <article class="timeline-card">
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.body)}</p>
        </article>
      `
    )
    .join("");
}

function renderHotspotCards(items) {
  if (!items.length) {
    return renderEmptyState("Aucune zone de priorite a afficher.");
  }

  return items
    .map(
      (item) => `
        <article class="dashboard-card dashboard-card-compact">
          <div class="dashboard-card-top">
            <strong>${escapeHtml(item.city)}</strong>
            <span>${escapeHtml(String(item.interest_score || 0))}/100</span>
          </div>
          <p>Prix moyen ${formatPrice(item.average_price)}</p>
          <p>${escapeHtml(String(item.days_on_market || 0))} jours moyens · rendement ${escapeHtml(String(item.rent_yield || 0))}%</p>
        </article>
      `
    )
    .join("");
}

function renderSummaryCards(items, emptyMessage) {
  if (!items.length) {
    return renderEmptyState(emptyMessage);
  }

  return items
    .map(
      (item) => `
        <article class="dashboard-card dashboard-card-compact">
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.body)}</p>
        </article>
      `
    )
    .join("");
}

function renderServiceCards(items) {
  return items
    .map(
      (item) => `
        <article class="service-card">
          <div class="service-card-top">
            <strong>${escapeHtml(item.name)}</strong>
            <span class="status-pill ${getStatusClass(item.status)}">${escapeHtml(item.status)}</span>
          </div>
          <p>${escapeHtml(item.detail)}</p>
        </article>
      `
    )
    .join("");
}

function renderSiteRows(items) {
  if (!items.length) {
    return renderEmptyState("Aucun site a afficher.");
  }

  return items
    .map(
      (item) => `
        <article class="request-item">
          <div class="request-top">
            <strong>${escapeHtml(item.name)}</strong>
            <span class="status-pill">${escapeHtml(item.site_type)}</span>
          </div>
          <p>${escapeHtml(item.city)} · ${escapeHtml(item.region || "Region")}</p>
          <p>${escapeHtml(String(item.workstations_count))} conseillers equipes</p>
          <div class="request-meta">
            <span>Suivi client partage avec le reseau Ymmo.</span>
          </div>
        </article>
      `
    )
    .join("");
}

function renderSalesCards(items) {
  if (!items.length) {
    return renderEmptyState("Aucune vente recente disponible.");
  }

  return items
    .map(
      (item) => `
        <div class="sales-row">
          <strong>${escapeHtml(item.city)} · ${escapeHtml(item.property_type)}</strong>
          <span>${formatPrice(item.sale_price)} pour ${escapeHtml(String(item.surface_m2))} m2</span>
          <span>Vendu le ${escapeHtml(formatDate(item.sold_at))}</span>
        </div>
      `
    )
    .join("");
}

function renderNetworkCards(items) {
  if (!items.length) {
    return renderEmptyState("Aucun site reseau disponible.");
  }

  return items
    .map(
      (item) => `
        <article class="network-card">
          <strong>${escapeHtml(item.name)}</strong>
          <p>${escapeHtml(item.city)} · ${escapeHtml(item.region || "Region")}</p>
          <p>${escapeHtml(item.site_type)} · ${escapeHtml(String(item.workstations_count))} conseillers equipes</p>
          <p>Accompagnement achat, vente et estimation avec un suivi client partage.</p>
        </article>
      `
    )
    .join("");
}

function renderEmptyState(message) {
  return `<p class="empty-state">${escapeHtml(message)}</p>`;
}

function toHistoryItem(property) {
  return {
    id: property.id,
    title: property.title,
    city: property.city,
    price: property.price,
    type: property.type,
    agency_name: property.agency_name,
  };
}

function getStatusClass(status) {
  const normalized = String(status || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized ? `status-pill--${normalized}` : "";
}

function setFeedback(element, message, tone) {
  element.textContent = message;
  element.classList.remove("feedback-success", "feedback-error");
  if (tone === "success") {
    element.classList.add("feedback-success");
  } else if (tone === "error") {
    element.classList.add("feedback-error");
  }
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = String(value);
  }
}

function setHtml(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.innerHTML = value;
  }
}

function formatPrice(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return "Prix sur demande";
  }
  return `${new Intl.NumberFormat("fr-FR").format(numericValue)} EUR`;
}

function formatDate(rawDate) {
  if (!rawDate) {
    return "date inconnue";
  }

  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) {
    return rawDate;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function formatDateTime(rawDate) {
  if (!rawDate) {
    return "date inconnue";
  }

  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) {
    return rawDate;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getPropertyClass(type) {
  const normalized = String(type || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");

  if (normalized.includes("maison")) {
    return "property-visual--maison";
  }

  if (normalized.includes("appartement")) {
    return "property-visual--appartement";
  }

  if (normalized.includes("local-professionnel") || normalized.includes("pro")) {
    return "property-visual--local-professionnel";
  }

  return "property-visual--default";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
