document.addEventListener("DOMContentLoaded", () => {
  syncSessionUi();
  loadInfrastructure();
});

async function loadInfrastructure() {
  try {
    const response = await apiRequest("/api/dashboard");
    renderInfrastructure(response);
  } catch (error) {
    const networkGrid = document.getElementById("network-grid");
    if (networkGrid) {
      networkGrid.textContent = `Erreur: ${error.message}`;
    }
  }
}

function renderInfrastructure(data) {
  const network = data.network || {};
  const sites = network.sites || [];

  const networkGrid = document.getElementById("network-grid");
  if (networkGrid) {
    networkGrid.innerHTML = renderNetworkCards(sites);
  }
}
