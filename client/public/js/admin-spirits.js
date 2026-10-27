import { loadSpirits, setSpirits } from "./spirits.js";

export function createSpiritEditor(getKey, showToast, onStateChange = () => {}) {
  const form = document.getElementById("spirits-form");
  const fields = document.getElementById("spirits-fields");
  const rows = document.getElementById("spirits-rows");
  const status = document.getElementById("spirits-status");
  const save = document.getElementById("spirits-save");
  const discard = document.getElementById("spirits-discard");
  const retry = document.getElementById("spirits-retry");
  let saved = [];
  let busy = false;
  let saving = false;
  let loaded = false;
  let nextId = 0;

  function changed() {
    save.disabled = discard.disabled = busy || !loaded;
    status.textContent = "Osparade ändringar";
  }
  function addRow(item = { name: "", synonyms: [] }) {
    const id = ++nextId;
    const row = document.createElement("section");
    row.className = "admin-spirit-row";
    const nameLabel = document.createElement("label");
    nameLabel.htmlFor = `spirit-name-${id}`;
    nameLabel.textContent = "Spritsort";
    const name = document.createElement("input");
    name.id = nameLabel.htmlFor;
    name.className = "spirit-name";
    name.value = item.name;
    name.required = true;
    name.maxLength = 80;
    name.placeholder = "T.ex. Whiskey";
    const wordsLabel = document.createElement("label");
    wordsLabel.htmlFor = `spirit-words-${id}`;
    wordsLabel.textContent = "Sökord – ett per rad";
    const words = document.createElement("textarea");
    words.id = wordsLabel.htmlFor;
    words.className = "spirit-words";
    words.value = item.synonyms.join("\n");
    words.required = true;
    words.rows = 4;
    words.placeholder = "whiskey\nbourbon\nscotch";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "admin-recipe-remove";
    remove.textContent = "Ta bort spritsort";
    remove.addEventListener("click", () => {
      row.remove();
      changed();
      document.getElementById("spirits-add").focus();
    });
    row.append(nameLabel, name, wordsLabel, words, remove);
    rows.append(row);
    return name;
  }
  function render() {
    rows.replaceChildren();
    saved.forEach(addRow);
    save.disabled = discard.disabled = true;
    onStateChange(true);
  }
  async function load() {
    if (busy) return;
    busy = true;
    fields.disabled = true;
    retry.hidden = true;
    try {
      saved = await loadSpirits(API_BASE);
      loaded = true;
      render();
    } catch {
      status.textContent = "Kunde inte ladda spritsorterna. Försök igen.";
      retry.hidden = false;
    } finally {
      busy = false;
      fields.disabled = !loaded;
    }
  }
  form.addEventListener("input", changed);
  document.getElementById("spirits-add").addEventListener("click", () => {
    if (rows.children.length >= 50) {
      status.textContent = "Du kan ha högst 50 spritsorter.";
      return;
    }
    addRow().focus();
    changed();
  });
  discard.addEventListener("click", () => {
    render();
    status.textContent = "Ändringarna har ångrats.";
  });
  retry.addEventListener("click", load);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || !loaded || !form.reportValidity()) return;
    const catalog = Array.from(rows.children, (row) => ({
      name: row.querySelector(".spirit-name").value.trim(),
      synonyms: row.querySelector(".spirit-words").value.split(/\r?\n/).map((word) => word.trim()).filter(Boolean),
    }));
    busy = true;
    saving = true;
    onStateChange();
    fields.disabled = true;
    status.textContent = "Sparar…";
    try {
      const response = await fetch(`${API_BASE}/spirits`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-Admin-Key": getKey() },
        body: JSON.stringify(catalog),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(response.status === 401 ? "Logga in igen för att spara." : data.error || "Kunde inte spara spritsorterna.");
      setSpirits(data);
      saved = data;
      render();
      status.textContent = "Spritsorterna har sparats.";
      showToast("Spritsorterna har sparats!", "success");
    } catch (error) {
      status.textContent = error.message || "Kunde inte spara. Försök igen.";
    } finally {
      busy = false;
      saving = false;
      fields.disabled = false;
      onStateChange();
    }
  });
  return { load, isSaving: () => saving };
}
