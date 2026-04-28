document.addEventListener("DOMContentLoaded", () => {
  syncSessionUi();
  loadAnalysis();
});

async function loadAnalysis() {
  try {
    const response = await apiRequest("/api/dashboard");
    renderAnalysis(response);
  } catch (error) {
    setText("type-chart", `Erreur: ${error.message}`);
  }
}

function renderAnalysis(data) {
  const priceByType = data.price_by_type || [];
  const recentSales = data.recent_sales || [];

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
}
