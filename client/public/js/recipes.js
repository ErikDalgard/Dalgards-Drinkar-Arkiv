import { getDrinkSpirits } from "./spirits.js";
import { hashHue } from "./utils.js";

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
        const ingredients = (ingredientGroups[i] || "").split(";").map((s) => s.trim()).filter(Boolean);
        const steps = (stepGroups[i] || "").split(";").map((s) => s.trim()).filter(Boolean);
        if (ingredients.length) {
            container.appendChild(makeRecipeSection("Ingredienser", ingredients, false));
        }
        if (steps.length) {
            container.appendChild(makeRecipeSection("Gör såhär", steps, true));
        }
    }
}

function makeRecipeSection(title, items, ordered) {
    const section = document.createElement("section");
    section.className = `recipe-section ${ordered ? "recipe-method" : "recipe-shopping"}`;
    section.setAttribute("aria-label", title);
    const heading = document.createElement("h3");
    heading.className = "recipe-heading";
    heading.textContent = title;
    section.appendChild(heading);
    const groups = [];
    let current = { title: "", items: [] };
    items.forEach((text) => {
        const heading = text.match(/^#\s+(.+)$/s);
        if (heading) {
            if (current.title || current.items.length) groups.push(current);
            current = { title: heading[1], items: [] };
        } else {
            current.items.push(text);
        }
    });
    if (current.title || current.items.length) groups.push(current);
    const hasHeadings = groups.some((group) => group.title);
    groups.forEach((group) => {
        const target = hasHeadings ? document.createElement("div") : section;
        if (hasHeadings) {
            target.className = "recipe-subsection";
            section.appendChild(target);
        }
        if (group.title) {
            const subtitle = document.createElement("h4");
            subtitle.className = "recipe-subheading";
            subtitle.textContent = group.title;
            target.appendChild(subtitle);
        }
        if (!group.items.length) return;
        const list = document.createElement(ordered ? "ol" : "ul");
        list.className = ordered ? "recipe-steps" : "recipe-ingredients";
        // Preserve list semantics in Safari when removing the default markers.
        list.setAttribute("role", "list");
        group.items.forEach((text) => {
            const item = document.createElement("li");
            item.textContent = text;
            list.appendChild(item);
        });
        target.appendChild(list);
    });
    return section;
}

export function renderSpiritLinks(ingredients, onSpiritSelect) {
    const container = document.getElementById("recipe-spirit-links");
    container.replaceChildren();
    const spirits = getDrinkSpirits(ingredients);
    container.hidden = spirits.length === 0;
    if (!spirits.length) return;
    const heading = document.createElement("h3");
    heading.className = "recipe-heading";
    heading.textContent = "Fler drinkar med:";
    container.appendChild(heading);
    const buttons = document.createElement("div");
    buttons.className = "recipe-spirit-buttons";
    spirits.forEach((spirit) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "recipe-spirit-button";
        button.textContent = spirit;
        button.style.setProperty("--spirit-hue", hashHue(spirit));
        button.setAttribute("aria-label", `Visa alla drinkar med ${spirit}`);
        button.addEventListener("click", () => onSpiritSelect(spirit));
        buttons.appendChild(button);
    });
    container.appendChild(buttons);
}
