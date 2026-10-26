import { TASTE_LABELS, parseTasteProfile } from "./taste.js";

export function createTasteFields() {
  const container = document.getElementById("admin-taste-rows");
  const hint = document.getElementById("admin-taste-hint");
  const clear = document.getElementById("admin-taste-clear");
  let values = Array(5).fill(null);
  let originalUnparsed = "";

  function update() {
    container.querySelectorAll("input").forEach((input) => {
      input.checked = values[Number(input.dataset.index)] === Number(input.value);
    });
    const count = values.filter((value) => value !== null).length;
    clear.disabled = count === 0 && !originalUnparsed;
    hint.textContent = originalUnparsed
      ? "Den sparade profilen kunde inte tolkas. Den behålls tills du väljer nya värden eller rensar profilen."
      : count > 0 && count < 5
        ? `${count} av 5 värden valda.`
        : "Valfritt.";
  }
  TASTE_LABELS.forEach((label, index) => {
    const row = document.createElement("fieldset");
    row.className = "admin-taste-row";
    const legend = document.createElement("legend");
    legend.textContent = label;
    const choices = document.createElement("div");
    choices.className = "admin-taste-choices";
    for (let value = 0; value <= 5; value++) {
      const option = document.createElement("label");
      option.className = "admin-taste-choice";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = `taste-${index}`;
      input.value = String(value);
      input.dataset.index = String(index);
      input.setAttribute("aria-label", `${label}: ${value} av 5`);
      const text = document.createElement("span");
      text.textContent = String(value);
      input.addEventListener("change", () => {
        originalUnparsed = "";
        values[index] = value;
        update();
      });
      option.append(input, text);
      choices.appendChild(option);
    }
    row.append(legend, choices);
    container.appendChild(row);
  });
  function setValue(value) {
    const parsed = parseTasteProfile(value);
    originalUnparsed = !parsed && typeof value === "string" ? value.trim() : "";
    values = parsed || Array(5).fill(null);
    update();
  }
  function isComplete() {
    return values.every((value) => value === null) || values.every((value) => value !== null);
  }
  function getValue() {
    if (originalUnparsed) return originalUnparsed;
    return values.every((value) => value !== null) ? values.map((value) => `${value}/5`).join(",") : "";
  }
  clear.addEventListener("click", () => {
    setValue("");
    container.dispatchEvent(new Event("change", { bubbles: true }));
    container.querySelector("input").focus();
  });
  setValue("");
  return { setValue, getValue, isComplete };
}
