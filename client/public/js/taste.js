// Values follow the saved order: sötma, syra, beska, styrka, sälta.
export const TASTE_LABELS = ["Sötma", "Syra", "Beska", "Styrka", "Sälta"];
export const TASTE_FILTERS = [
    { id: "sweet", label: "Söt", index: 0, min: 4, description: "Sötma 4–5 av 5" },
    { id: "sour", label: "Syrlig", index: 1, min: 4, description: "Syra 4–5 av 5" },
    { id: "bitter", label: "Besk", index: 2, min: 3, description: "Beska 3–5 av 5" },
    { id: "strong", label: "Stark", index: 3, min: 4, description: "Styrka 4–5 av 5" },
];

export function parseTasteProfile(value) {
    if (typeof value !== "string") return null;
    const parts = value.split(",");
    if (parts.length !== 5) return null;
    const matches = parts.map((part) => part.match(/^\s*([0-5])\s*\/\s*5\s*$/));
    return matches.every(Boolean) ? matches.map((match) => Number(match[1])) : null;
}

export function matchesTasteFilters(value, selectedIds) {
    if (!selectedIds.size) return true;
    const profile = parseTasteProfile(value);
    return profile !== null && [...selectedIds].every((id) => {
        const filter = TASTE_FILTERS.find((item) => item.id === id);
        return filter && profile[filter.index] >= filter.min;
    });
}
