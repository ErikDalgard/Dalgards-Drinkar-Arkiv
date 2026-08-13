// ============================================
// Configuration & State
// ============================================

const API_BASE = "https://dalgardsdrinkar-api.dalgard-erik.workers.dev";

let adminKey = "";
let allDrinks = [];
let toastTimeout = null;


// ============================================
// Admin Login
// ============================================

function login() {
  adminKey = document.getElementById("admin-key-input").value.trim();

  if (!adminKey) return;

  document.getElementById("key-section").style.display = "none";
  document.getElementById("admin-panel").style.display = "block";
  document.getElementById("admin-wrap").classList.add("logged-in");

  loadDrinks();
}

document.getElementById("key-save").addEventListener("click", login);

document.getElementById("admin-key-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    login();
  }
});


document.getElementById("home-link").addEventListener("click", ()=>{
    window.location.href = "index.html";
})

// ============================================
// Drink Data
// ============================================

async function loadDrinks() {
  const res = await fetch(`${API_BASE}/drinks`);
  allDrinks = await res.json();
}


// ============================================
// Mode Selection
// ============================================

document.getElementById("mode-select").addEventListener("change", (e) => {
  const isEdit = e.target.value === "edit";

  document.getElementById("edit-picker-group").style.display =
    isEdit ? "block" : "none";

  if (!isEdit) {
    clearForm();
    editSearch.value = "";
    document.getElementById("delete-btn").style.display = "none";
  }
});


// ============================================
// Edit Search
// ============================================

const editSearch = document.getElementById("edit-search");
const editResults = document.getElementById("edit-search-results");

editSearch.addEventListener("input", () => {
  const q = editSearch.value.toLowerCase().trim();

  editResults.innerHTML = "";

  if (!q) {
    editResults.classList.remove("open");
    return;
  }

  const matches = allDrinks
    .filter(
      (d) =>
        d.drink.toLowerCase().includes(q) ||
        d.date.includes(q)
    )
    .slice(0, 20); // Begränsa till 20 träffar

  if (matches.length === 0) {
    editResults.innerHTML =
      '<div class="edit-search-result">Inga träffar</div>';

    editResults.classList.add("open");
    return;
  }

  matches.forEach((d) => {
    const item = document.createElement("div");

    item.className = "edit-search-result";
    item.innerHTML = `
      ${escapeHtml(d.drink)}
      <span class="result-date">${d.date}</span>
    `;

    item.addEventListener("click", () => {
      editSearch.value = `${d.date} — ${d.drink}`;
      editResults.classList.remove("open");

      document.getElementById("delete-btn").style.display = "inline-block";

      fillForm(d);
    });

    editResults.appendChild(item);
  });

  editResults.classList.add("open");
});

editSearch.addEventListener("focus", () => {
  if (editSearch.value.trim()) {
    editResults.classList.add("open");
  }
});

document.addEventListener("click", (e) => {
  if (!e.target.closest(".edit-search-wrap")) {
    editResults.classList.remove("open");
  }
});


// ============================================
// Toast Notifications
// ============================================

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");

  clearTimeout(toastTimeout);

  toast.textContent = message;
  toast.className = `toast ${type} show`;

  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}


// ============================================
// Form Helpers
// ============================================

function clearForm() {
  [
    "f-date",
    "f-drink",
    "f-theme",
    "f-note",
    "f-ingredients",
    "f-steps",
    "f-taste",
    "f-video-url",
    "f-photo-url",
    "f-id",
  ].forEach((id) => {
    document.getElementById(id).value = "";
  });

  document.getElementById("f-video-file").value = "";
  document.getElementById("f-photo-file").value = "";

  document.getElementById("f-video-filename").textContent =
    "Ingen fil vald";

  document.getElementById("f-photo-filename").textContent =
    "Ingen fil vald";
}

function fillForm(d) {
  document.getElementById("f-id").value = d.id;
  document.getElementById("f-date").value = d.date;
  document.getElementById("f-drink").value = d.drink;
  document.getElementById("f-theme").value = d.theme;
  document.getElementById("f-note").value = d.note;
  document.getElementById("f-ingredients").value = d.ingredients;
  document.getElementById("f-steps").value = d.steps;
  document.getElementById("f-taste").value = d.taste;
  document.getElementById("f-video-url").value = d.url;
  document.getElementById("f-photo-url").value = d.photo;

  document.getElementById("f-video-file").value = "";
  document.getElementById("f-photo-file").value = "";

  document.getElementById("f-video-filename").textContent =
    "Ingen fil vald";

  document.getElementById("f-photo-filename").textContent =
    "Ingen fil vald";
}

function validateForm() {
  const date = document.getElementById("f-date").value.trim();
  const drink = document.getElementById("f-drink").value.trim();

  const videoFile = document.getElementById("f-video-file").files[0];
  const photoFile = document.getElementById("f-photo-file").files[0];

  const existingVideo =
    document.getElementById("f-video-url").value.trim();

  const existingPhoto =
    document.getElementById("f-photo-url").value.trim();

  const missing = [];

  if (!date) missing.push("Datum");
  if (!drink) missing.push("Drinknamn");

  if (!videoFile && !existingVideo) {
    missing.push("Video");
  }

  if (!photoFile && !existingPhoto) {
    missing.push("Poster-bild");
  }

  return missing;
}


// ============================================
// File Inputs
// ============================================

document.getElementById("f-video-file").addEventListener("change", (e) => {
  const name = e.target.files[0]?.name || "Ingen fil vald";

  document.getElementById("f-video-filename").textContent = name;
});

document.getElementById("f-photo-file").addEventListener("change", (e) => {
  const name = e.target.files[0]?.name || "Ingen fil vald";

  document.getElementById("f-photo-filename").textContent = name;
});


// ============================================
// File Upload
// ============================================

async function uploadFile(file) {
  const res = await fetch(
    `${API_BASE}/upload?filename=${encodeURIComponent(file.name)}`,
    {
      method: "POST",
      headers: {
        "X-Admin-Key": adminKey,
      },
      body: file,
    }
  );

  if (!res.ok) {
    throw new Error("Uppladdning misslyckades");
  }

  const data = await res.json();

  return data.url;
}


// ============================================
// Add / Edit Drink
// ============================================

document.getElementById("drink-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const missing = validateForm();

  if (missing.length > 0) {
    showToast(`Fyll i: ${missing.join(", ")}`, "error");
    return;
  }

  const statusEl = document.getElementById("status-msg");

  try {
    const videoFile =
      document.getElementById("f-video-file").files[0];

    const photoFile =
      document.getElementById("f-photo-file").files[0];

    let videoUrl =
      document.getElementById("f-video-url").value;

    let photoUrl =
      document.getElementById("f-photo-url").value;

    if (videoFile) {
      videoUrl = await uploadFile(videoFile);
    }

    if (photoFile) {
      photoUrl = await uploadFile(photoFile);
    }

    const theme =
      document.getElementById("f-theme").value.trim() || "Övrigt";

    const payload = {
      date: document.getElementById("f-date").value,
      drink: document.getElementById("f-drink").value,
      theme: theme,
      note: document.getElementById("f-note").value,
      ingredients: document.getElementById("f-ingredients").value,
      steps: document.getElementById("f-steps").value,
      taste: document.getElementById("f-taste").value,
      url: videoUrl,
      photo: photoUrl,
    };

    const id = document.getElementById("f-id").value;
    const isEdit = !!id;

    const res = await fetch(
      `${API_BASE}/drinks${isEdit ? "/" + id : ""}`,
      {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      throw new Error("Sparande misslyckades");
    }

    showToast(isEdit ? "Ändrad!" : "Tillagd!", "success");

    statusEl.textContent = "";

    clearForm();

    document.getElementById("f-video-file").value = "";
    document.getElementById("f-photo-file").value = "";

    loadDrinks();
  } catch (err) {
    showToast("Fel: " + err.message, "error");
    statusEl.textContent = "";
  }
});


// ============================================
// Delete Drink
// ============================================

document.getElementById("delete-btn").addEventListener("click", async () => {
  const id = document.getElementById("f-id").value;

  if (!id) return;

  if (!confirm("Säker på att du vill ta bort den här drinken?")) {
    return;
  }

  const res = await fetch(`${API_BASE}/drinks/${id}`, {
    method: "DELETE",
    headers: {
      "X-Admin-Key": adminKey,
    },
  });

  if (res.ok) {
    showToast("Raderad", "error");

    document.getElementById("status-msg").textContent = "";

    clearForm();

    loadDrinks();

    editSearch.value = "";
    editResults.classList.remove("open");

    document.getElementById("delete-btn").style.display = "none";
  }
});


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
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  return Math.abs(hash) % 360;
}