import { themeHue } from "./themes.js";
import { escapeHtml, formatDrinkDate } from "./utils.js";
export function makeCard(v, { onOpen, onThemeSelect }) {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
    <div class="card-media">
        ${v.theme?.trim() ? `<button type="button" class="card-theme">${escapeHtml(v.theme)}</button>` : ""}
      <span class="card-play" aria-hidden="true">▶</span>
    </div>
    <div class="card-body">
      <h2 class="card-drink"><button type="button" class="card-open">${escapeHtml(v.drink)}</button></h2>
      <div class="card-meta">
        <time class="date"></time>
      </div>
      <p class="note">${escapeHtml(v.note)}</p>
    </div>`;
    if (v.photo) {
        const image = document.createElement("img");
        image.src = `${R2_BASE_URL}${v.photo}`;
        image.alt = "";
        image.loading = "lazy";
        image.decoding = "async";
        card.querySelector(".card-media").prepend(image);
    }
    const date = card.querySelector("time");
    date.dateTime = v.date;
    date.textContent = formatDrinkDate(v.date);
    card.querySelector(".card-open").addEventListener("click", () => onOpen(v));
    const themeButton = card.querySelector(".card-theme");
    if (themeButton) {
        themeButton.style.setProperty("--theme-hue", themeHue(v.theme));
        themeButton.addEventListener("click", () => onThemeSelect(v.theme));
    }
    return card;
}
