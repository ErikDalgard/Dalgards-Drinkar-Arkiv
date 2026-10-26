export const SPIRITS = [
    "Vodka",
    "Gin",
    "Ljus Rom",
    "Mörk Rom",
    "Tequila",
    "Whiskey",
    "Cognac",
    "Calvados",
    "Limoncello",
    "Aperitif & Bitter",
    "Vermouth",
];
export const SPIRIT_SYNONYMS = {
    Vodka: [
        "vodka",
        "vaniljvodka",
        "citronvodka",
        "citrongräsinfluerad vodka",
    ],
    Gin: [
        "gin",
        "london dry gin",
        "old tom gin",
        "sloe gin",
        "rejmyregin",
        "westerviks gin",
        "rönnbärsgin",
    ],
    "Ljus Rom": [
        "ljus rom",
        "vit rom",
    ],
    "Mörk Rom": [
        "mörk rom",
        "demarara rom",
        "demerara rom",
    ],
    Tequila: [
        "tequila",
        "mezcal",
    ],
    Whiskey: [
        "whiskey",
        "bourbon",
        "rågwhiskey",
        "rye",
        "scotch",
        "skotsk blended whiskey",
        "fireball",
    ],
    Cognac: [
        "cognac",
        "konjak",
        "brandy",
    ],
    Calvados: [
        "calvados",
    ],
    Limoncello: [
        "limoncello",
    ],
    "Aperitif & Bitter": [
        "campari",
        "carmpano bitter",
        "aperol",
        "gammel dansk",
        "dubonnet",
        "fernet branca",
        "lillet",
        "kina lillet",
    ],
    Vermouth: [
        "vermouth",
        "vermuth",
        "röd vermouth",
        "söt vermouth",
        "torr vermouth",
    ],
};

// Match any synonym in the selected category, not just its display name.
export function ingredientsContainSpirit(ingredients, selectedSpirit) {
    if (!ingredients || !selectedSpirit) return false;
    const text = ingredients.toLowerCase();
    const synonyms = SPIRIT_SYNONYMS[selectedSpirit] ?? [];
    return synonyms.some((synonym) => text.includes(synonym.toLowerCase()));
}

export function getDrinkSpirits(ingredients) {
    return SPIRITS.filter((spirit) => ingredientsContainSpirit(ingredients, spirit));
}
