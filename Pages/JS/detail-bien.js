let currentProperty = null;

document.addEventListener("DOMContentLoaded", () => {
  syncSessionUi();
  initDetailPage();
});

function initDetailPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get("id");

  if (!propertyId) {
    redirectToCatalogue();
    return;
  }

  loadPropertyDetail(Number(propertyId)).catch((error) => {
    setFeedback(document.getElementById("detail-feedback"), error.message, "error");
  });

  // Bind contact button
  const contactButton = document.getElementById("contact-button");
  contactButton?.addEventListener("click", () => {
    if (currentProperty) {
      goToContactForProperty(currentProperty);
    }
  });

  // Bind edit button (for authenticated users managing their properties)
  const editButton = document.getElementById("edit-button");
  editButton?.addEventListener("click", () => {
    if (currentProperty) {
      showEditModal(currentProperty);
    }
  });

  // Bind image upload
  const uploadButton = document.getElementById("upload-image-button");
  const imageInput = document.getElementById("image-input");

  uploadButton?.addEventListener("click", () => {
    imageInput?.click();
  });

  imageInput?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (file && currentProperty) {
      await uploadPropertyImage(currentProperty.id, file);
    }
  });
}

async function loadPropertyDetail(propertyId) {
  try {
    const response = await apiRequest(`/api/properties?id=${propertyId}`);
    const properties = response.items || [];
    const property = properties.find((p) => p.id === propertyId);

    if (!property) {
      throw new Error("Bien non trouvé");
    }

    currentProperty = property;
    renderPropertyDetail(property);
    updateEditVisibility();
  } catch (error) {
    console.error("Error loading property:", error);
    throw error;
  }
}

function renderPropertyDetail(property) {
  // Update title and location
  document.getElementById("property-title").textContent = property.title || "Bien sans titre";
  document.getElementById("property-location").textContent = `${property.city || "Ville inconnue"} · ${property.reference || ""}`;

  // Update badges
  const typeClass = getPropertyClass(property.type).replace("property-visual", "");
  document.getElementById("property-type-badge").textContent = property.type || "Bien";
  document.getElementById("property-status-badge").textContent = property.status || "Inconnu";
  document.getElementById("property-status-badge").className = property.status === "Disponible" 
    ? "badge status-available" 
    : "badge status-pending";

  // Update price and agency
  document.getElementById("property-price").textContent = formatPrice(property.price);
  document.getElementById("property-agency").textContent = property.agency_name || "Ymmo";

  // Update description
  document.getElementById("property-description").textContent = property.description || "Description à completer.";

  // Update specs
  document.getElementById("property-rooms").textContent = property.rooms ? `${property.rooms} p.` : "--";
  document.getElementById("property-surface").textContent = property.surface_m2 ? `${property.surface_m2} m²` : "--";
  document.getElementById("property-energy").textContent = property.energy_class ? `DPE ${property.energy_class}` : "--";
  document.getElementById("property-interest").textContent = property.buyer_interest_score ? `${property.buyer_interest_score}/100` : "--";

  // Update image
  renderPropertyImage(property);
}

function renderPropertyImage(property) {
  const imageElement = document.getElementById("property-image");
  if (!imageElement) return;

  const propertyClass = getPropertyClass(property.type);
  imageElement.className = `property-image ${propertyClass.replace("property-visual", "selected-visual")}`;
  const mediaUrl = getPropertyMediaUrl(property);
  if (mediaUrl) {
    imageElement.style.backgroundImage = `linear-gradient(135deg, rgba(20, 32, 25, 0.18), rgba(20, 32, 25, 0.45)), url('${mediaUrl.replace(/'/g, "\\'")}')`;
  } else {
    imageElement.style.removeProperty("background-image");
  }
  imageElement.innerHTML = `
    <div class="image-overlay">
      <strong>${escapeHtml(property.title || "Bien")}</strong>
      <p>${escapeHtml(property.city || "Lieu")}</p>
    </div>
  `;
}

function updateEditVisibility() {
  const session = loadSession();
  const editButton = document.getElementById("edit-button");
  const uploadButton = document.getElementById("upload-image-button");

  // Only show edit/upload for agents and authenticated users with their own properties
  if (session && (session.role_name === "Agent" || session.role_name === "Manager" || session.role_name === "Admin IT")) {
    editButton?.classList.remove("hidden");
    uploadButton?.classList.remove("hidden");
  }
}

function showEditModal(property) {
  // Simple inline edit for property title/description
  const newTitle = prompt("Nouveau titre:", property.title || "");
  if (newTitle !== null && newTitle !== property.title) {
    updateProperty({ ...property, title: newTitle });
  }
}

async function updateProperty(updates) {
  try {
    const feedback = document.getElementById("detail-feedback");
    setFeedback(feedback, "Mise à jour en cours...", "");

    await apiRequest(`/api/properties/${currentProperty.id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });

    currentProperty = { ...currentProperty, ...updates };
    renderPropertyDetail(currentProperty);
    setFeedback(feedback, "Bien mis à jour avec succès.", "success");
  } catch (error) {
    const feedback = document.getElementById("detail-feedback");
    setFeedback(feedback, error.message, "error");
  }
}

async function uploadPropertyImage(propertyId, file) {
  try {
    const feedback = document.getElementById("detail-feedback");
    setFeedback(feedback, "Téléchargement de l'image...", "");

    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`/api/properties/${propertyId}/image`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Erreur lors du téléchargement");
    }

    setFeedback(feedback, "Image mise à jour avec succès.", "success");
    // Refresh property data to show new image
    await loadPropertyDetail(propertyId);
    if (document.getElementById("image-input")) {
      document.getElementById("image-input").value = "";
    }
  } catch (error) {
    const feedback = document.getElementById("detail-feedback");
    setFeedback(feedback, error.message, "error");
  }
}

function goToContactForProperty(property) {
  // Save to sessionStorage
  sessionStorage.setItem("selectedProperty", JSON.stringify({
    id: property.id,
    title: property.title,
    city: property.city,
    price: property.price,
    agency_name: property.agency_name,
  }));

  // Redirect to contact page
  window.location.href = "/contact";
}

function redirectToCatalogue() {
  window.location.href = "/catalogue";
}
