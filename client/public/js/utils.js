export function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str ?? "";
    return d.innerHTML;
}
export function hashHue(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash =
            str.charCodeAt(i) +
                ((hash << 5) - hash);
    }
    return Math.abs(hash) % 360;
}
export function formatDrinkDate(value) {
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("sv-SE", {
        day: "numeric", month: "long", year: "numeric",
    });
}
