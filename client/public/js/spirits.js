// The API catalog is shared by filters, recipes and the admin preview.
export const SPIRITS = [];
export const SPIRIT_SYNONYMS = Object.create(null);

export function setSpirits(catalog) {
    if (!Array.isArray(catalog) || catalog.some((item) =>
        !item || typeof item.name !== "string" || !item.name.trim() ||
        !Array.isArray(item.synonyms) || item.synonyms.some((word) => typeof word !== "string"))) {
        throw new Error("Ogiltig lista med spritsorter");
    }
    SPIRITS.splice(0, SPIRITS.length, ...catalog.map((item) => item.name));
    Object.keys(SPIRIT_SYNONYMS).forEach((name) => delete SPIRIT_SYNONYMS[name]);
    catalog.forEach(({ name, synonyms }) => { SPIRIT_SYNONYMS[name] = [...synonyms]; });
}

export async function loadSpirits(apiBase) {
    const response = await fetch(`${apiBase}/spirits`);
    if (!response.ok) throw new Error(`Kunde inte ladda spritsorter (HTTP ${response.status})`);
    const catalog = await response.json();
    setSpirits(catalog);
    return catalog;
}

// Match any synonym in the selected category, not just its display name.
export function ingredientsContainSpirit(ingredients, selectedSpirit) {
    if (!ingredients || !selectedSpirit) return false;
    const text = ingredients.toLowerCase();
    const synonyms = SPIRIT_SYNONYMS[selectedSpirit] ?? [];
    return synonyms.some((synonym) => synonym && text.includes(synonym.toLowerCase()));
}

export function getDrinkSpirits(ingredients) {
    return SPIRITS.filter((spirit) => ingredientsContainSpirit(ingredients, spirit));
}
