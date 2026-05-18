// === Configuration et constants ===
const STORAGE_KEY = "ymmo-session";
const HISTORY_PREFIX = "ymmo-history::";

const ROLE_HOME_MAP = {
  Client: "/client",
  Agent: "/agent",
  Manager: "/manager",
  "Admin IT": "/admin",
};

// === Session Management ===
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

// === API Requests ===
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
    throw new Error(data.error || `Erreur serveur (${response.status})`);
  }

  return data;
}

// === Form and Filter Utilities ===
function readForm(form) {
  const formData = new FormData(form);
  return Object.fromEntries(formData.entries());
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

// === Property History Tracking ===
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

// === Rendering Helpers ===
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
    return renderEmptyState("Aucun bien pertinent à afficher.");
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
          <p>${escapeHtml(item.description || "Description à compléter.")}</p>
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
          <p>${escapeHtml(item.property_title || "Bien non précisé")} · ${escapeHtml(item.property_city || "Ville non précisée")}</p>
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
    return renderEmptyState("Aucun historique local pour le moment.");
  }

  return items
    .map(
      (item) => `
        <article class="dashboard-card dashboard-card-compact">
          <span class="badge type">${escapeHtml(item.type || "Bien")}</span>
          <h3>${escapeHtml(item.title || "Bien")}</h3>
          <p>${escapeHtml(item.city || "Ville non précisée")} · ${formatPrice(item.price)}</p>
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
    return renderEmptyState("Aucune zone de priorité à afficher.");
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
    return renderEmptyState("Aucun site à afficher.");
  }

  return items
    .map(
      (item) => `
        <article class="request-item">
          <div class="request-top">
            <strong>${escapeHtml(item.name)}</strong>
            <span class="status-pill">${escapeHtml(item.site_type)}</span>
          </div>
          <p>${escapeHtml(item.city)} · ${escapeHtml(item.region || "Région")}</p>
          <p>${escapeHtml(String(item.workstations_count))} postes · ${escapeHtml(String(item.printers_count))} imprimante(s)</p>
          <div class="request-meta">
            <span>${escapeHtml(item.notes || "VPN IPSec et services centralisés.")}</span>
          </div>
        </article>
      `
    )
    .join("");
}

function renderSalesCards(items) {
  if (!items.length) {
    return renderEmptyState("Aucune vente récente disponible.");
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
    return renderEmptyState("Aucun site réseau disponible.");
  }

  return items
    .map(
      (item) => `
        <article class="network-card">
          <strong>${escapeHtml(item.name)}</strong>
          <p>${escapeHtml(item.city)} · ${escapeHtml(item.region || "Région")}</p>
          <p>${escapeHtml(item.site_type)} · ${escapeHtml(String(item.workstations_count))} postes · ${escapeHtml(String(item.printers_count))} imprimante(s)</p>
          <p>${escapeHtml(item.notes || "VPN IPSec, DNS/DHCP et supervision centralisée.")}</p>
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

// === DOM Utilities ===
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

// === Formatting Utilities ===
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

  if (normalized.includes("local-professionnel")) {
    return "property-visual--local-professionnel";
  }

  return "property-visual--default";
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
