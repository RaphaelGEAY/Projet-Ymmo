document.addEventListener("DOMContentLoaded", () => {
  syncSessionUi();

  const page = document.body.dataset.page;
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
    // Redirect after a short delay
    setTimeout(() => {
      window.location.href = "accueil.html";
    }, 1000);
  }
});

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
