document.addEventListener("DOMContentLoaded", () => {
  syncSessionUi();
  initContactPage();
});

function initContactPage() {
  const contactForm = document.getElementById("contact-form");
  if (!contactForm) {
    return;
  }

  // Load previously selected property if available
  loadSelectedProperty();

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await submitContactRequest(contactForm);
  });
}

function loadSelectedProperty() {
  try {
    const stored = sessionStorage.getItem("selectedProperty");
    if (stored) {
      const property = JSON.parse(stored);
      fillContactForm(property);
    } else {
      fillContactForm(null);
    }
  } catch (error) {
    fillContactForm(null);
  }
}

function fillContactForm(property) {
  const selectedProperty = document.getElementById("selected-property");
  const propertyIdInput = document.querySelector("input[name='property_id']");

  if (!selectedProperty) {
    return;
  }

  if (!property) {
    if (propertyIdInput) {
      propertyIdInput.value = "";
    }
    selectedProperty.textContent = "Aucun bien selectionne.";
    return;
  }

  if (propertyIdInput) {
    propertyIdInput.value = String(property.id);
  }
  selectedProperty.textContent = `${property.title} · ${property.city} · ${formatPrice(property.price)}`;
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
    sessionStorage.removeItem("selectedProperty");
    fillContactForm(null);
    setFeedback(feedback, "Demande envoyee. L'agence peut maintenant la traiter.", "success");
  } catch (error) {
    setFeedback(feedback, error.message, "error");
  }
}
