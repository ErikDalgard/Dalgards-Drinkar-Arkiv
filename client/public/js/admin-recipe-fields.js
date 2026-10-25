// Keep the existing semicolon-separated API format behind the row-based editor.
function createRecipeFields(kind, label, multiline) {
  const container = document.getElementById(`f-${kind}`);
  const addButton = document.getElementById(`add-${kind}`);
  let nextId = 0;

  function updateLabels() {
    [...container.children].forEach((row, index) => {
      const number = index + 1;
      row.querySelector("label").textContent = `${label} ${number}`;
      row.querySelector("button").setAttribute("aria-label", `Ta bort ${label.toLowerCase()} ${number}`);
    });
  }
  function addRow(value = "", focus = false) {
    const row = document.createElement("div");
    row.className = "admin-recipe-row";
    const rowLabel = document.createElement("label");
    const input = document.createElement(multiline ? "textarea" : "input");
    input.id = `recipe-${kind}-${nextId++}`;
    rowLabel.htmlFor = input.id;
    input.className = "admin-recipe-value";
    if (multiline) input.rows = 2;
    else input.type = "text";
    input.value = value;
    input.placeholder = multiline ? "Beskriv steget…" : "T.ex. 6 cl whiskey";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "admin-recipe-remove";
    remove.textContent = "Ta bort";
    remove.addEventListener("click", () => {
      const rows = [...container.children];
      const index = rows.indexOf(row);
      row.remove();
      if (!container.children.length) addRow();
      updateLabels();
      const next = container.children[Math.min(index, container.children.length - 1)];
      next.querySelector("input, textarea").focus();
    });
    row.append(rowLabel, input, remove);
    container.appendChild(row);
    updateLabels();
    if (focus) input.focus();
  }
  function setValue(value) {
    container.replaceChildren();
    // Existing || recipe-group separators are retained inside their rows.
    const values = (value || "").split(";").map((item) => item.trim()).filter(Boolean);
    (values.length ? values : [""]).forEach((item) => addRow(item));
  }
  function getValue() {
    return [...container.querySelectorAll(".admin-recipe-value")]
      .map((input) => input.value.trim()).filter(Boolean).join(";");
  }
  addButton.addEventListener("click", () => addRow("", true));
  setValue("");
  return { setValue, getValue };
}
