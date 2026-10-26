// Keep semicolon-separated API fields; an explicit "# " prefix marks a heading.
function createRecipeFields(kind, label, multiline) {
  const container = document.getElementById(`f-${kind}`);
  const addButton = document.getElementById(`add-${kind}`);
  const headingButton = document.getElementById(`add-${kind}-heading`);
  let nextId = 0;

  function updateLabels() {
    let number = 0;
    [...container.children].forEach((row) => {
      const isHeading = row.dataset.type === "heading";
      if (isHeading) number = 0;
      else number++;
      const rowLabel = isHeading ? "Rubrik" : `${label} ${number}`;
      row.querySelector("label").textContent = rowLabel;
      row.querySelector("select").setAttribute("aria-label", `Radtyp för ${rowLabel.toLowerCase()}`);
      row.querySelector("button").setAttribute("aria-label", `Ta bort ${rowLabel.toLowerCase()}`);
    });
  }
  function addRow(value = "", focus = false, type = "item") {
    const row = document.createElement("div");
    row.className = "admin-recipe-row";
    const header = document.createElement("div");
    header.className = "admin-recipe-row-header";
    const rowLabel = document.createElement("label");
    const input = document.createElement(multiline ? "textarea" : "input");
    input.id = `recipe-${kind}-${nextId++}`;
    rowLabel.htmlFor = input.id;
    input.className = "admin-recipe-value";
    if (!multiline) input.type = "text";
    input.value = value;
    const typeSelect = document.createElement("select");
    typeSelect.className = "admin-recipe-type";
    [["item", label], ["heading", "Rubrik"]].forEach(([value, text]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      typeSelect.appendChild(option);
    });
    function setType(value) {
      row.dataset.type = value;
      typeSelect.value = value;
      row.classList.toggle("admin-recipe-heading-row", value === "heading");
      input.placeholder = value === "heading" ? "T.ex. Bärsyrup" : multiline ? "Beskriv steget…" : "T.ex. 6 cl whiskey";
      if (multiline) input.rows = value === "heading" ? 1 : 2;
    }
    setType(type);
    typeSelect.addEventListener("change", () => {
      setType(typeSelect.value);
      updateLabels();
    });
    header.append(rowLabel, typeSelect);
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
    row.append(header, input, remove);
    container.appendChild(row);
    updateLabels();
    if (focus) input.focus();
  }
  function setValue(value) {
    container.replaceChildren();
    // Existing || recipe-group separators remain untouched inside their rows.
    const values = (value || "").split(";").map((item) => item.trim()).filter(Boolean);
    (values.length ? values : [""]).forEach((item) => {
      const heading = item.match(/^#\s+(.+)$/s);
      addRow(heading ? heading[1] : item, false, heading ? "heading" : "item");
    });
  }
  function getValue() {
    return [...container.children].map((row) => {
      const value = row.querySelector(".admin-recipe-value").value.trim();
      if (!value) return "";
      return row.dataset.type === "heading" ? `# ${value}` : value;
    }).filter(Boolean).join(";");
  }
  addButton.addEventListener("click", () => addRow("", true));
  headingButton.addEventListener("click", () => {
    // Reuse the initial/trailing blank row so a new section starts cleanly.
    const last = container.lastElementChild;
    if (last && !last.querySelector(".admin-recipe-value").value.trim()) last.remove();
    addRow("", true, "heading");
  });
  setValue("");
  return { setValue, getValue };
}
