// ============================================
// Configuration & State
// ============================================



let adminKey = "";
let allDrinks = [];
let toastTimeout = null;


// ============================================
// Admin Login
// ============================================

async function login() {
  const inputKey = document.getElementById("admin-key-input").value.trim();
  if (!inputKey) return;

  try {
    // Fråga API:et om nyckeln är rätt
    const res = await fetch(`${API_BASE}/admin/verify`, {
      method: "POST",
      headers: { "X-Admin-Key": inputKey }
    });

    if (!res.ok) {
      showToast("Fel lösenord!", "error")
      return;
    }

    // Om nyckeln var rätt: spara den och visa adminpanelen
    adminKey = inputKey;
    document.getElementById("key-section").style.display = "none";
    document.getElementById("admin-panel").style.display = "block";
    document.getElementById("admin-wrap").classList.add("logged-in");

    loadDrinks();
  } catch (err) {
    alert("Kunde inte ansluta till servern.");
  }
}
// Koppla knappen till login-funktionen
document.getElementById("key-save").addEventListener("click", login);

// Gör så att man kan trycka Enter i lösenordsfältet
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
  const form = document.getElementById("drink-form");

  document.getElementById("edit-picker-group").style.display =
    isEdit ? "block" : "none";

  if (isEdit) {
    // Redigeringsläge – visa inte formuläret förrän en drink valts
    form.style.display = "none";

    document.getElementById("submit-btn").style.display = "none";
    document.getElementById("edit-submit-btn").style.display = "none";
    document.getElementById("delete-btn").style.display = "none";

  } else {
    // Lägg till-läge – formuläret visas direkt
    clearForm();

    editSearch.value = "";
    editResults.classList.remove("open");

    form.style.display = "grid";

    document.getElementById("submit-btn").style.display = "inline-block";
    document.getElementById("edit-submit-btn").style.display = "none";
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

function setStatus(message) {
  const statusEl = document.getElementById("status-msg");
  const statusText = document.getElementById("status-text");

  statusText.textContent = message;
  statusEl.style.display = "flex";
}

function clearStatus() {
  const statusEl = document.getElementById("status-msg");
  const statusText = document.getElementById("status-text");

  statusText.textContent = "";
  statusEl.style.display = "none";
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

  // Visa befintliga filnamn
  const videoFilename = d.url
    ? decodeURIComponent(d.url.split("/").pop())
    : "Ingen fil vald";

  const photoFilename = d.photo
    ? decodeURIComponent(d.photo.split("/").pop())
    : "Ingen fil vald";

  document.getElementById("f-video-file").value = "";
  document.getElementById("f-photo-file").value = "";

const videoFilenameEl = document.getElementById("f-video-filename");
const photoFilenameEl = document.getElementById("f-photo-filename");

if (d.url) {
  videoFilenameEl.innerHTML = `
    <a href="${R2_BASE_URL}${d.url}" download target="_blank">
      ${escapeHtml(videoFilename)}
    </a>
  `;
} else {
  videoFilenameEl.textContent = "Ingen fil vald";
}

if (d.photo) {
  photoFilenameEl.innerHTML = `
    <a href="${R2_BASE_URL}${d.photo}" download target="_blank">
      ${escapeHtml(photoFilename)}
    </a>
  `;
} else {
  photoFilenameEl.textContent = "Ingen fil vald";
}

  // Visa redigeringsknappar
  document.getElementById("submit-btn").style.display = "none";
  document.getElementById("edit-submit-btn").style.display = "inline-block";
  document.getElementById("delete-btn").style.display = "inline-block";

  // Visa formuläret
  document.getElementById("drink-form").style.display = "grid";
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
  const file = e.target.files[0];

  console.log("VIDEO FILE SELECTED:", {
    exists: !!file,
    name: file?.name,
    size: file?.size,
    type: file?.type,
  });

  document.getElementById("f-video-filename").textContent =
    file?.name || "Ingen fil vald";
});

document.getElementById("f-photo-file").addEventListener("change", (e) => {
  const file = e.target.files[0];

  console.log("PHOTO FILE SELECTED:", {
    exists: !!file,
    name: file?.name,
    size: file?.size,
    type: file?.type,
  });

  document.getElementById("f-photo-filename").textContent =
    file?.name || "Ingen fil vald";
});


// ============================================
// File Upload
// ============================================

async function uploadFile(file,type) {
  const date=document.getElementById("f-date").value;

  // Bilder använder vanlig upload
  if (type!=="Video") {
    const res=await fetch(`${API_BASE}/upload?filename=${encodeURIComponent(file.name)}&date=${encodeURIComponent(date)}`,{
      method:"POST",
      headers:{"X-Admin-Key":adminKey,"Content-Type":file.type||"application/octet-stream"},
      body:file
    });
    if(!res.ok) throw new Error(`${type}-uppladdning misslyckades (${res.status}): ${await res.text()}`);
    const data=await res.json();
    if(!data.url) throw new Error(`${type}-uppladdningen returnerade ingen URL.`);
    return data.url;
  }

  // Video: multipart, 10 MB per del
  const CHUNK_SIZE=10*1024*1024;
  const totalChunks=Math.ceil(file.size/CHUNK_SIZE);

  console.log("=== MULTIPART VIDEO START ===",{
    name:file.name,
    sizeMB:(file.size/1024/1024).toFixed(2),
    chunks:totalChunks
  });

  let startRes;
  try {
    startRes=await fetch(`${API_BASE}/upload/start?filename=${encodeURIComponent(file.name)}&date=${encodeURIComponent(date)}`,{
      method:"POST",
      headers:{"X-Admin-Key":adminKey}
    });
  } catch(err) {
    throw new Error("Kunde inte starta videouppladdningen. Kontrollera internetanslutningen.");
  }

  if(!startRes.ok) throw new Error(`Kunde inte starta videouppladdningen (${startRes.status}): ${await startRes.text()}`);

  const {key,uploadId}=await startRes.json();
  const parts=[];

  try {
    for(let i=0;i<totalChunks;i++) {
      const partNumber=i+1;
      const chunk=file.slice(i*CHUNK_SIZE,Math.min((i+1)*CHUNK_SIZE,file.size));
      const progress=Math.round(partNumber/totalChunks*100);
      setStatus(`Laddar upp video... ${progress}%`);
      let uploaded=null;
      let lastError=null;
      for(let attempt=1;attempt<=3;attempt++) {
        try {
          console.log("Uploading part",{partNumber,totalChunks,attempt});
          const res=await fetch(`${API_BASE}/upload/part?key=${encodeURIComponent(key)}&uploadId=${encodeURIComponent(uploadId)}&partNumber=${partNumber}`,{
            method:"PUT",
            headers:{
              "X-Admin-Key":adminKey,
              "Content-Type":"application/octet-stream"
            },
            body:chunk
          });

          if(!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
          uploaded=await res.json();
          break;
        } catch(err) {
          lastError=err;
          console.error(`Part ${partNumber} attempt ${attempt} failed`,err);
          if(attempt<3) await new Promise(r=>setTimeout(r,1000*attempt));
        }
      }

      if(!uploaded) throw new Error(`Del ${partNumber}/${totalChunks} misslyckades: ${lastError?.message||"okänt fel"}`);
      parts.push(uploaded);
    }

    setStatus("Slutför videouppladdningen...");
    const completeRes=await fetch(`${API_BASE}/upload/complete?key=${encodeURIComponent(key)}&uploadId=${encodeURIComponent(uploadId)}`,{
      method:"POST",
      headers:{
        "X-Admin-Key":adminKey,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({parts})
    });

    if(!completeRes.ok) throw new Error(`Kunde inte slutföra videon (${completeRes.status}): ${await completeRes.text()}`);

    const data=await completeRes.json();

    console.log("=== MULTIPART VIDEO COMPLETE ===",data);

    return data.url;

  } catch(err) {
    console.error("=== MULTIPART VIDEO FAILED ===",err);

    try {
      await fetch(`${API_BASE}/upload/abort?key=${encodeURIComponent(key)}&uploadId=${encodeURIComponent(uploadId)}`,{
        method:"POST",
        headers:{"X-Admin-Key":adminKey}
      });
    } catch(abortErr) {
      console.error("Abort failed",abortErr);
    }

    throw err;
  }
}

// ============================================
// Add / Edit Drink
// ============================================

document.getElementById("drink-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  console.log("=== FORM SUBMIT STARTED ===");

  const missing = validateForm();

  if (missing.length > 0) {
    showToast(`Fyll i: ${missing.join(", ")}`, "error");
    return;
  }

  const statusEl = document.getElementById("status-msg");
  const submitBtn = document.getElementById("submit-btn");
  const editSubmitBtn = document.getElementById("edit-submit-btn");

  try {
    submitBtn.disabled = true;
    editSubmitBtn.disabled = true;
    const videoFile =
      document.getElementById("f-video-file").files[0];

    const photoFile =
      document.getElementById("f-photo-file").files[0];

    let videoUrl =
      document.getElementById("f-video-url").value;

    let photoUrl =
      document.getElementById("f-photo-url").value;

      console.log("VIDEO FILE SELECTED:", {
        name: videoFile?.name,
        size: videoFile?.size,
        type: videoFile?.type
      });


    if (videoFile) {
      console.log("ABOUT TO CALL uploadFile() on video file.");
      setStatus("Laddar upp video...");
      videoUrl = await uploadFile(videoFile, "Video");
      setStatus("Video uppladdad ✓");
    }

    if (photoFile) {
      console.log("ABOUT TO CALL uploadFile() on photo file.");
      setStatus("Laddar upp bild...");
      photoUrl = await uploadFile(photoFile, "Bild");
      setStatus("Bild uppladdad ✓");
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

    setStatus("Sparar drinken...");
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
    if (isEdit) {
      document.getElementById("mode-select").value = "add";
      document.getElementById("edit-picker-group").style.display = "none";
      document.getElementById("submit-btn").style.display = "inline-block";
      document.getElementById("edit-submit-btn").style.display = "none";
      document.getElementById("delete-btn").style.display = "none";

      editSearch.value = "";
      editResults.classList.remove("open");
    }

    document.getElementById("f-video-file").value = "";
    document.getElementById("f-photo-file").value = "";

    document.getElementById("submit-btn").style.display = "inline-block";
    document.getElementById("edit-submit-btn").style.display = "none";
    document.getElementById("delete-btn").style.display = "none";

    loadDrinks();
  } catch (err) {
    console.error("Save failed:", err);

      clearStatus();

      showToast(
        "Fel: " + (err.message || "Något gick fel"),
        "error");
  }
  finally {
    submitBtn.disabled = false;
    editSubmitBtn.disabled = false;
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

  document.getElementById("mode-select").value = "add";
  document.getElementById("edit-picker-group").style.display = "none";

  document.getElementById("submit-btn").style.display = "inline-block";
  document.getElementById("edit-submit-btn").style.display = "none";
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