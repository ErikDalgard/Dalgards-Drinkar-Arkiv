const TASTE_LABELS = [
    "Sötma",
    "Syra",
    "Beska",
    "Styrka",
    "Sälta",
];
export function renderTasteProfile(tasteStr) {
    const container = document.getElementById("taste-profile");
    const rows = document.getElementById("taste-rows");
    rows.innerHTML = "";
    if (!tasteStr) {
        container.style.display = "none";
        return;
    }
    const values = tasteStr
        .split(",")
        .map((s) => parseInt(s.trim().split("/")[0], 10));
    TASTE_LABELS.forEach((label, i) => {
        const value = values[i] || 0;
        let dots = "";
        for (let d = 1; d <= 5; d++) {
            dots += `
        <span
          class="taste-dot ${d <= value ? "filled" : ""}"
        ></span>
      `;
        }
        const row = document.createElement("div");
        row.className = "taste-row";
        row.innerHTML = `
      <span class="taste-label">
        ${label}
      </span>

      <span class="taste-dots">
        ${dots}
      </span>
    `;
        rows.appendChild(row);
    });
    container.style.display = "block";
}
// ============================================
// Recipe Groups
// ============================================
export function renderRecipeGroups(ingredientsRaw, stepsRaw, drinkNameRaw) {
    const container = document.getElementById("recipe-groups");
    container.innerHTML = "";
    const ingredientGroups = (ingredientsRaw || "")
        .split("||")
        .map((g) => g.trim())
        .filter(Boolean);
    const stepGroups = (stepsRaw || "")
        .split("||")
        .map((g) => g.trim())
        .filter(Boolean);
    const groupCount = Math.max(ingredientGroups.length, stepGroups.length, 1);
    const drinkNames = (drinkNameRaw || "")
        .split("&")
        .map((name) => name.trim());
    for (let i = 0; i < groupCount; i++) {
        if (groupCount > 1) {
            const label = document.createElement("p");
            label.className = "recipe-group-label";
            label.textContent = drinkNames[i]
                ? `${drinkNames[i]}`
                : `Recept ${i + 1}`;
            container.appendChild(label);
        }
        const ingHeading = document.createElement("p");
        ingHeading.className = "recipe-heading";
        ingHeading.textContent = "Ingredienser";
        container.appendChild(ingHeading);
        const ul = document.createElement("ul");
        ul.className = "recipe-ingredients";
        (ingredientGroups[i] || "")
            .split(";")
            .map((s) => s.trim())
            .filter(Boolean)
            .forEach((ing) => {
            const li = document.createElement("li");
            li.textContent = ing;
            ul.appendChild(li);
        });
        container.appendChild(ul);
        const stepHeading = document.createElement("p");
        stepHeading.className = "recipe-heading";
        stepHeading.textContent = "Gör såhär";
        container.appendChild(stepHeading);
        const ol = document.createElement("ol");
        ol.className = "recipe-steps";
        (stepGroups[i] || "")
            .split(";")
            .map((s) => s.trim())
            .filter(Boolean)
            .forEach((step) => {
            const li = document.createElement("li");
            li.textContent = step;
            ol.appendChild(li);
        });
        container.appendChild(ol);
    }
}
