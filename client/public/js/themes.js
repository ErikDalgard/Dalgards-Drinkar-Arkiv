import { hashHue } from "./utils.js";
let themeColorMap = {};
export function buildThemeColorMap(themes) {
    themeColorMap = {};
    const shuffled = [...themes].sort((a, b) => hashHue(a) - hashHue(b));
    const n = shuffled.length;
    shuffled.forEach((theme, i) => {
        themeColorMap[theme] = Math.round((360 * i) / n);
    });
}
export function themeHue(theme) {
    return theme in themeColorMap
        ? themeColorMap[theme]
        : hashHue(theme || "ovrigt");
}
