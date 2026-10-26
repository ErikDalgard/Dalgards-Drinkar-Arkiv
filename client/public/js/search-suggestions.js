import { formatDrinkDate } from "./utils.js";

export function createSearchSuggestions(onSelect) {
    const input = document.getElementById("search");
    const popup = document.getElementById("search-suggestions");
    const list = document.getElementById("search-suggestion-list");
    const summary = document.getElementById("search-suggestions-summary");
    const closeButton = document.getElementById("search-suggestions-close");
    const MAX_RESULTS = 20;
    const wrapper = input.closest(".search-wrapper");
    let candidates = [];
    let matches = [];
    let active = -1;
    let dismissed = false;

    function close() {
        popup.hidden = true;
        input.setAttribute("aria-expanded", "false");
        input.removeAttribute("aria-activedescendant");
        active = -1;
        dismissed = true;
    }
    function choose(index) {
        const drink = matches[index];
        if (!drink) return;
        close();
        onSelect(drink);
    }
    function highlight(index) {
        active = index;
        [...list.children].forEach((option, i) => {
            option.setAttribute("aria-selected", String(i === active));
        });
        input.setAttribute("aria-activedescendant", list.children[active].id);
        list.children[active].scrollIntoView({ block: "nearest" });
    }
    function render() {
        const query = input.value.trim().toLowerCase();
        list.replaceChildren();
        active = -1;
        input.removeAttribute("aria-activedescendant");
        if (!query || dismissed || document.activeElement !== input) {
            popup.hidden = true;
            input.setAttribute("aria-expanded", "false");
            return;
        }
        // Dates and themes distinguish repeated names. Respect the active filters.
        const matching = candidates.filter((drink) => drink.drink.toLowerCase().includes(query));
        const total = matching.length;
        matches = matching.sort((a, b) => a.date.localeCompare(b.date) * -1).slice(0, MAX_RESULTS);
        summary.textContent = total > MAX_RESULTS
            ? `Visar ${MAX_RESULTS} av ${total} förslag`
            : `${total} drinkförslag`;
        list.scrollTop = 0;
        matches.forEach((drink, index) => {
            const option = document.createElement("div");
            option.id = `search-suggestion-${index}`;
            option.className = "search-suggestion";
            option.setAttribute("role", "option");
            option.setAttribute("aria-selected", "false");
            if (drink.photo) {
                const image = document.createElement("img");
                image.src = `${R2_BASE_URL}${drink.photo}`;
                image.alt = "";
                image.loading = "lazy";
                option.appendChild(image);
            }
            const text = document.createElement("div");
            text.className = "search-suggestion-text";
            const name = document.createElement("span");
            name.className = "search-suggestion-name";
            name.textContent = drink.drink;
            const detail = document.createElement("span");
            detail.className = "search-suggestion-detail";
            detail.textContent = [formatDrinkDate(drink.date), drink.theme].filter(Boolean).join(" · ");
            text.append(name, detail);
            option.appendChild(text);
            // Keep focus in the combobox until the modal opens.
            option.addEventListener("pointerdown", (event) => event.preventDefault());
            option.addEventListener("click", () => choose(index));
            list.appendChild(option);
        });
        popup.hidden = matches.length === 0;
        input.setAttribute("aria-expanded", String(matches.length > 0));
    }
    input.addEventListener("input", () => { dismissed = false; render(); });
    input.addEventListener("focus", render);
    input.addEventListener("click", () => { dismissed = false; render(); });
    input.addEventListener("blur", (event) => {
        if (!popup.contains(event.relatedTarget)) close();
    });
    closeButton.addEventListener("click", () => {
        input.focus({ preventScroll: true });
        close();
    });
    popup.addEventListener("focusout", (event) => {
        if (event.relatedTarget !== input && !popup.contains(event.relatedTarget)) close();
    });
    input.addEventListener("keydown", (event) => {
        if (event.key === "Escape") { close(); return; }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (popup.hidden) { dismissed = false; render(); }
            if (popup.hidden) return;
            highlight(event.key === "ArrowDown"
                ? (active + 1) % matches.length
                : (active <= 0 ? matches.length - 1 : active - 1));
        } else if (event.key === "Enter" && !popup.hidden && active >= 0) {
            event.preventDefault();
            choose(active);
        }
    });
    document.addEventListener("click", (event) => {
        if (!wrapper.contains(event.target) && !popup.contains(event.target)) close();
    });
    return { update(drinks) { candidates = drinks; render(); } };
}
