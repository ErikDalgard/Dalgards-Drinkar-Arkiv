// ============================================
// State & Configuration
// ============================================

let allVideos = [];

let currentPage = 1;
const PAGE_SIZE = 24;

let selectedTheme = "";
let selectedSpirits = new Set();


// ============================================
// Spirits
// ============================================

const SPIRITS = [
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

const SPIRIT_SYNONYMS = {
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


// ============================================
// Theme Colors
// ============================================

let themeColorMap = {};

function buildThemeColorMap(themes) {
  themeColorMap = {};

  const shuffled = [...themes].sort(
    (a, b) => hashHue(a) - hashHue(b)
  );

  const n = shuffled.length;

  shuffled.forEach((theme, i) => {
    themeColorMap[theme] = Math.round((360 * i) / n);
  });
}

function themeHue(theme) {
  return theme in themeColorMap
    ? themeColorMap[theme]
    : hashHue(theme || "ovrigt");
}


// ============================================
// Initialization
// ============================================

async function init() {
  const res = await fetch(`${API_BASE}/drinks`);
  allVideos = await res.json();

  const subtitle = document.getElementById("subtitle");

  const years = [
    ...new Set(allVideos.map((v) => v.date.slice(0, 4))),
  ].sort();

  const themes = [
    ...new Set(allVideos.map((v) => v.theme)),
  ]
    .filter(Boolean)
    .sort();

  buildThemeColorMap(themes);
  buildThemeChips(themes);
  buildSpiritChips();

  // Spirit picker
  document
    .getElementById("spirit-picker-toggle")
    .addEventListener("click", (e) => {
      e.stopPropagation();

      document
        .getElementById("spirit-picker-panel")
        .classList.toggle("open");
    });

  document.addEventListener("click", (e) => {
    const panel = document.getElementById("spirit-picker-panel");

    if (
      !panel.contains(e.target) &&
      e.target.id !== "spirit-picker-toggle"
    ) {
      panel.classList.remove("open");
    }
  });

  // Theme picker
  document
    .getElementById("theme-picker-toggle")
    .addEventListener("click", () => {
      openThemeModal();
    });

  document
    .getElementById("theme-modal-close")
    .addEventListener("click", () => {
      closeThemeModal();
    });

  document
    .getElementById("theme-modal-backdrop")
    .addEventListener("click", (e) => {
      if (e.target.id === "theme-modal-backdrop") {
        closeThemeModal();
      }
    });

  document
    .getElementById("theme-picker-search")
    .addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase();

      document.querySelectorAll(".theme-chip").forEach((chip) => {
        chip.style.display = chip.textContent
          .toLowerCase()
          .includes(q)
          ? ""
          : "none";
      });
    });

  // Search, sorting & modal
  document
    .getElementById("search")
    .addEventListener("input", () => {
      currentPage = 1;
      render();
    });

  document
    .getElementById("sort-order")
    .addEventListener("change", () => {
      currentPage = 1;
      render();
    });

  document
    .getElementById("modal-close")
    .addEventListener("click", closeModal);

  document
    .getElementById("recipe-toggle")
    .addEventListener("click", toggleRecipe);

  document
    .getElementById("modal-backdrop")
    .addEventListener("click", (e) => {
      if (e.target.id === "modal-backdrop") {
        closeModal();
      }
    });

  // Filter panel
  document
    .getElementById("filter-toggle")
    .addEventListener("click", () => {
      const filterPanel =
        document.getElementById("filter-panel");

      const filterText =
        document.getElementById("filter-toggle-text");

      if (!filterPanel) return;

      filterPanel.classList.toggle("open");

      const isOpen =
        filterPanel.classList.contains("open");

      if (filterText) {
        filterText.textContent = isOpen
          ? "Dölj filter"
          : "Visa filter";
      }
    });

  document
    .getElementById("date-from")
    .addEventListener("change", () => {
      currentPage = 1;
      render();
    });

  document
    .getElementById("date-to")
    .addEventListener("change", () => {
      currentPage = 1;
      render();
    });

  document
    .getElementById("filter-clear")
    .addEventListener("click", () => {
      selectTheme("");
      selectSpirit("");

      document.getElementById("date-from").value = "";
      document.getElementById("date-to").value = "";

      currentPage = 1;
      render();
    });

  // Home
  document
    .getElementById("home-link")
    .addEventListener("click", () => {
      selectTheme("");
      selectSpirit("");

      document.getElementById("search").value = "";
      document.getElementById("date-from").value = "";
      document.getElementById("date-to").value = "";
      document.getElementById("sort-order").value = "desc";

      document
        .getElementById("filter-panel")
        .classList.remove("open");

      document
        .getElementById("filter-toggle")
        .classList.remove("active");

      currentPage = 1;
      render();

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });

  render();
}


// ============================================
// Theme Helpers
// ============================================

function slugifyTheme(theme) {
  return theme
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}



// ============================================
// Theme Chips
// ============================================

function buildThemeChips(themes) {
  const list = document.getElementById("theme-chip-list");

  list.innerHTML = "";

  const allChip = document.createElement("button");

  allChip.type = "button";
  allChip.className = "theme-chip";
  allChip.dataset.theme = "__all__";
  allChip.textContent = "Alla teman";

  allChip.addEventListener("click", () => {
    selectTheme("");
  });

  list.appendChild(allChip);

  themes.forEach((theme) => {
    const hue = themeHue(theme || "ovrigt");

    const chip = document.createElement("button");

    chip.type = "button";
    chip.className = "theme-chip";

    if (!theme.trim()) {
      chip.classList.add("icon-only");
    }

    chip.dataset.theme = theme;

    chip.style.background = `hsl(${hue},65%,35%)`;
    chip.style.color = `hsl(${hue},20%,95%)`;


    if (theme.trim()) {
      const span = document.createElement("span");

      span.textContent = theme;

      chip.appendChild(span);
    }

    chip.addEventListener("click", () => {
      selectTheme(theme);
    });

    list.appendChild(chip);
  });
}


// ============================================
// Spirit Chips
// ============================================

function buildSpiritChips() {
  const list = document.getElementById("spirit-chip-list");

  list.innerHTML = "";

  const allChip = document.createElement("button");

  allChip.type = "button";
  allChip.className = "theme-chip";
  allChip.textContent = "All sprit";

  allChip.addEventListener("click", () => {
    selectSpirit("");
  });

  list.appendChild(allChip);

  SPIRITS.forEach((spirit) => {
    const hue = hashHue(spirit);

    const chip = document.createElement("button");

    chip.type = "button";
    chip.className = "theme-chip";
    chip.dataset.spirit = spirit;
    chip.textContent = spirit;

    chip.style.background = `hsl(${hue},45%,88%)`;
    chip.style.color = `hsl(${hue},45%,30%)`;

    chip.addEventListener("click", () => {
      selectSpirit(spirit);
    });

    list.appendChild(chip);
  });
}

function selectSpirit(spirit) {
  if (spirit === "") {
    selectedSpirits.clear();
  } else if (selectedSpirits.has(spirit)) {
    selectedSpirits.delete(spirit);
  } else {
    selectedSpirits.add(spirit);
  }

  updateSpiritLabel();
  updateSpiritChipStyles();

  currentPage = 1;
  render();
}

function updateSpiritLabel() {
  const label =
    document.getElementById("spirit-picker-label");

  if (selectedSpirits.size === 0) {
    label.textContent = "Alla sprit";
  } else if (selectedSpirits.size === 1) {
    label.textContent = [...selectedSpirits][0];
  } else {
    label.textContent =
      `${selectedSpirits.size} sorter valda`;
  }
}

function updateSpiritChipStyles() {
  document
    .querySelectorAll("#spirit-chip-list .theme-chip")
    .forEach((chip) => {
      const spirit = chip.dataset.spirit;

      const isActive =
        spirit === ""
          ? selectedSpirits.size === 0
          : selectedSpirits.has(spirit);

      chip.classList.toggle("active", isActive);
    });
}


// ============================================
// Theme Selection & Modal
// ============================================

function selectTheme(theme) {
  selectedTheme = theme;

  document.getElementById("theme-picker-label").textContent =
    theme || "Alla teman";

  closeThemeModal();

  currentPage = 1;
  render();
}

function openThemeModal() {
  const modal =
    document.getElementById("theme-modal-backdrop");

  modal.classList.add("open");

  const search =
    document.getElementById("theme-picker-search");

  search.value = "";

  document.querySelectorAll(".theme-chip").forEach((chip) => {
    chip.style.display = "";
  });

  setTimeout(() => {
    search.focus();
  }, 50);
}

function closeThemeModal() {
  document
    .getElementById("theme-modal-backdrop")
    .classList.remove("open");
}


// ============================================
// Rendering & Filtering
// ============================================

function render() {
  const q =
    document.getElementById("search").value.toLowerCase();

  const theme = selectedTheme;

  const dateFrom =
    document.getElementById("date-from").value;

  const dateTo =
    document.getElementById("date-to").value;

  const filtered = allVideos.filter((v) =>
    (!theme || v.theme === theme) &&
    (
      selectedSpirits.size === 0 ||
      [...selectedSpirits].every((s) =>
        ingredientsContainSpirit(v.ingredients, s)
      )
    ) &&
    (!dateFrom || v.date >= dateFrom) &&
    (!dateTo || v.date <= dateTo) &&
    (
      !q ||
      `${v.drink} ${v.note} ${v.theme} ${v.date}`
        .toLowerCase()
        .includes(q)
    )
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE)
  );

  currentPage = Math.max(
    1,
    Math.min(currentPage, totalPages)
  );

  const start =
    (currentPage - 1) * PAGE_SIZE;

  const end = start + PAGE_SIZE;

  const sortOrder =
    document.getElementById("sort-order").value;

  filtered.sort((a, b) =>
    sortOrder === "asc"
      ? a.date.localeCompare(b.date)
      : b.date.localeCompare(a.date)
  );

  const pageItems = filtered.slice(start, end);

  const grid = document.getElementById("grid");

  grid.innerHTML = "";

  pageItems.forEach((v) => {
    grid.appendChild(makeCard(v));
  });

  document.getElementById("count").textContent =
    `${filtered.length} av ${allVideos.length} videos`;

  document.getElementById("empty").style.display =
    filtered.length ? "none" : "block";

  renderPagination(totalPages);
}


// ============================================
// Pagination
// ============================================

function renderPagination(totalPages) {
  const el = document.getElementById("pagination");

  el.innerHTML = "";

  if (totalPages <= 1) return;

  const goTo = (page) => {
    currentPage = page;

    render();

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const first = document.createElement("button");

  first.textContent = "«";
  first.setAttribute("aria-label", "Första sidan");
  first.disabled = currentPage === 1;

  first.addEventListener("click", () => {
    goTo(1);
  });

  const prev = document.createElement("button");

  prev.textContent = "‹";
  prev.setAttribute("aria-label", "Föregående sida");
  prev.disabled = currentPage === 1;

  prev.addEventListener("click", () => {
    goTo(currentPage - 1);
  });

  const label = document.createElement("span");

  label.textContent =
    `Sida ${currentPage} av ${totalPages}`;

  const next = document.createElement("button");

  next.textContent = "›";
  next.setAttribute("aria-label", "Nästa sida");
  next.disabled = currentPage === totalPages;

  next.addEventListener("click", () => {
    goTo(currentPage + 1);
  });

  const last = document.createElement("button");

  last.textContent = "»";
  last.setAttribute("aria-label", "Sista sidan");
  last.disabled = currentPage === totalPages;

  last.addEventListener("click", () => {
    goTo(totalPages);
  });

  el.appendChild(first);
  el.appendChild(prev);
  el.appendChild(label);
  el.appendChild(next);
  el.appendChild(last);
}


// ============================================
// Drink Cards
// ============================================

function makeCard(v) {
  const card = document.createElement("div");

  card.className = "card";

  const hue = themeHue(v.theme || "");

  card.innerHTML = `
  <div class="card-media">
      <video
        src="${R2_BASE_URL}${v.url}"
        poster="${R2_BASE_URL}${v.photo}"
        preload="metadata"
        muted
      ></video>

      <span
        class="theme-tag"
        style="
          background:hsl(${hue},45%,38%);
          color:hsl(${hue},20%,95%);
        "
      >

        ${v.theme.trim() ? escapeHtml(v.theme) : ""}
      </span>
    </div>

    <div class="card-body">
      <p class="card-drink">
        ${escapeHtml(v.drink)}
      </p>

      <span class="date">
        ${v.date}
      </span>

      <p class="note">
        ${escapeHtml(v.note)}
      </p>
    </div>
  `;

  card.addEventListener("click", () => {
    openModal(v);
  });

  card
    .querySelector(".theme-tag")
    .addEventListener("click", (e) => {
      e.stopPropagation();
      filterByTheme(v.theme);
    });

  return card;
}


// ============================================
// Taste Profile
// ============================================

const TASTE_LABELS = [
  "Sötma",
  "Syra",
  "Beska",
  "Styrka",
  "Sälta",
];

function renderTasteProfile(tasteStr) {
  const container =
    document.getElementById("taste-profile");

  const rows =
    document.getElementById("taste-rows");

  rows.innerHTML = "";

  if (!tasteStr) {
    container.style.display = "none";
    return;
  }

  const values = tasteStr
    .split(",")
    .map((s) =>
      parseInt(s.trim().split("/")[0], 10)
    );

  TASTE_LABELS.forEach((label, i) => {
    const value = values[i] || 0;

    let dots = "";

    for (let d = 1; d <= 5; d++) {
      dots += `
        <span
          class="taste-dot ${d <= value ? "filled" : ""}"
        ></span>
      `;
    }

    const row = document.createElement("div");

    row.className = "taste-row";

    row.innerHTML = `
      <span class="taste-label">
        ${label}
      </span>

      <span class="taste-dots">
        ${dots}
      </span>
    `;

    rows.appendChild(row);
  });

  container.style.display = "block";
}


// ============================================
// Recipe Groups
// ============================================

function renderRecipeGroups(
  ingredientsRaw,
  stepsRaw,
  drinkNameRaw
) {
  const container =
    document.getElementById("recipe-groups");

  container.innerHTML = "";

  const ingredientGroups = (ingredientsRaw || "")
    .split("||")
    .map((g) => g.trim())
    .filter(Boolean);

  const stepGroups = (stepsRaw || "")
    .split("||")
    .map((g) => g.trim())
    .filter(Boolean);

  const groupCount = Math.max(
    ingredientGroups.length,
    stepGroups.length,
    1
  );

  const drinkNames = (drinkNameRaw || "")
    .split("&")
    .map((name) => name.trim());

  for (let i = 0; i < groupCount; i++) {
    if (groupCount > 1) {
      const label = document.createElement("p");

      label.className = "recipe-group-label";

      label.textContent = drinkNames[i]
        ? `${drinkNames[i]}`
        : `Recept ${i + 1}`;

      container.appendChild(label);
    }

    const ingHeading = document.createElement("p");

    ingHeading.className = "recipe-heading";
    ingHeading.textContent = "Ingredienser";

    container.appendChild(ingHeading);

    const ul = document.createElement("ul");

    ul.className = "recipe-ingredients";

    (ingredientGroups[i] || "")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((ing) => {
        const li = document.createElement("li");

        li.textContent = ing;

        ul.appendChild(li);
      });

    container.appendChild(ul);

    const stepHeading = document.createElement("p");

    stepHeading.className = "recipe-heading";
    stepHeading.textContent = "Gör såhär";

    container.appendChild(stepHeading);

    const ol = document.createElement("ol");

    ol.className = "recipe-steps";

    (stepGroups[i] || "")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((step) => {
        const li = document.createElement("li");

        li.textContent = step;

        ol.appendChild(li);
      });

    container.appendChild(ol);
  }
}


// ============================================
// Modal
// ============================================

function openModal(v) {

  document.getElementById("modal-video").src = `${R2_BASE_URL}${v.url}`;
  document.getElementById("modal-drink").textContent =
    v.drink;

  const modalTheme =
    document.getElementById("modal-theme");

  const hue = themeHue(v.theme || "");

  modalTheme.textContent = v.theme;

  modalTheme.style.background =
    `hsl(${hue},65%,35%)`;

  modalTheme.style.color =
    `hsl(${hue},20%,95%)`;

  document.getElementById("modal-date").textContent =
    v.date;

  document.getElementById("modal-note").textContent =
    v.note;

  const hasRecipe = !!(
    (v.ingredients && v.ingredients.trim()) ||
    (v.steps && v.steps.trim())
  );

  const toggle =
    document.getElementById("recipe-toggle");

  const block =
    document.getElementById("recipe-block");

  toggle.style.display =
    hasRecipe ? "inline-block" : "none";

  toggle.textContent = "Visa recept";

  block.style.display = "none";

  renderRecipeGroups(
    v.ingredients,
    v.steps,
    v.drink
  );

  renderTasteProfile(v.taste);

  document
    .getElementById("modal-backdrop")
    .classList.add("open");
}

function toggleRecipe() {
  const block =
    document.getElementById("recipe-block");

  const toggle =
    document.getElementById("recipe-toggle");

  const showing =
    block.style.display !== "none";

  block.style.display =
    showing ? "none" : "block";

  toggle.textContent =
    showing ? "Visa recept" : "Dölj recept";
}

function closeModal() {
  const video =
    document.getElementById("modal-video");

  video.pause();
  video.src = "";

  document
    .getElementById("modal-backdrop")
    .classList.remove("open");
}


// ============================================
// Filtering
// ============================================

function filterByTheme(theme) {
  selectTheme(theme);

  document
    .getElementById("filter-panel")
    .classList.add("open");

  document
    .getElementById("filter-toggle")
    .classList.add("active");

  currentPage = 1;

  render();

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

function ingredientsContainSpirit(
  ingredients,
  selectedSpirit
) {
  if (!ingredients || !selectedSpirit) {
    return false;
  }

  const text = ingredients.toLowerCase();

  const terms =
    SPIRIT_SYNONYMS[selectedSpirit] ||
    [selectedSpirit.toLowerCase()];

  return terms.some((term) =>
    text.includes(term)
  );
}


// ============================================
// Utility Functions
// ============================================

function escapeHtml(str) {
  const d = document.createElement("div");

  d.textContent = str ?? "";

  return d.innerHTML;
}

function hashHue(str) {
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    hash =
      str.charCodeAt(i) +
      ((hash << 5) - hash);
  }

  return Math.abs(hash) % 360;
}


// ============================================
// Start Application
// ============================================

init();