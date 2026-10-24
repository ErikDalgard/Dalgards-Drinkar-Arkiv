import { themeHue } from "./themes.js";
import { formatDrinkDate } from "./utils.js";
import { renderRecipeGroups, renderTasteProfile } from "./recipes.js";
export function createDrinkDialog(onThemeSelect) {
    let modalTrigger = null;
    let previousBodyOverflow = "";
    function openModal(v) {
        modalTrigger = document.activeElement;
        previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        document.getElementById("modal-video").src = `${R2_BASE_URL}${v.url}`;
        document.getElementById("modal-video").poster = v.photo ? `${R2_BASE_URL}${v.photo}` : "";
        document.getElementById("modal-drink").textContent =
            v.drink;
        const modalTheme = document.getElementById("modal-theme");
        const hue = themeHue(v.theme || "");
        modalTheme.textContent = v.theme;
        modalTheme.hidden = !v.theme?.trim();
        modalTheme.style.background =
            `hsl(${hue},65%,35%)`;
        modalTheme.style.color =
            `hsl(${hue},20%,95%)`;
        document.getElementById("modal-date").textContent =
            formatDrinkDate(v.date);
        document.getElementById("modal-note").textContent =
            v.note;
        const hasRecipe = !!((v.ingredients && v.ingredients.trim()) ||
            (v.steps && v.steps.trim()));
        document.getElementById("recipe-block").style.display = hasRecipe ? "block" : "none";
        renderRecipeGroups(v.ingredients, v.steps, v.drink);
        renderTasteProfile(v.taste);
        document
            .getElementById("modal-backdrop")
            .classList.add("open");
        document.getElementById("modal-backdrop").showModal();
        document.querySelector(".modal-scroll").scrollTop = 0;
        document.getElementById("modal-close").focus();
    }
    function closeModal() {
        const video = document.getElementById("modal-video");
        video.pause();
        video.src = "";
        document
            .getElementById("modal-backdrop")
            .classList.remove("open");
        document.getElementById("modal-backdrop").close();
        document.body.style.overflow = previousBodyOverflow;
        if (modalTrigger?.isConnected)
            modalTrigger.focus();
    }
    document
        .getElementById("modal-close")
        .addEventListener("click", closeModal);
    document.getElementById("modal-backdrop").addEventListener("cancel", (event) => {
        event.preventDefault();
        closeModal();
    });
    document
        .getElementById("modal-backdrop")
        .addEventListener("click", (e) => {
        if (e.target.id === "modal-backdrop") {
            closeModal();
        }
    });
    document
        .getElementById("modal-theme")
        .addEventListener("click", () => {
        const theme = document.getElementById("modal-theme").textContent.trim();
        closeModal();
        onThemeSelect(theme);
    });
    return { open: openModal, close: closeModal };
}
