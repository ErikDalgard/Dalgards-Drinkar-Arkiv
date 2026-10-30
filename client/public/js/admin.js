import { populateSearchSuggestion } from "./search-suggestions.js";
import { createUnsavedChanges } from "./admin-unsaved.js";
import { createTasteFields } from "./admin-taste-fields.js";
import { createSpiritEditor } from "./admin-spirits.js";
import { createAdminPreview } from "./admin-preview.js";

// ============================================
// Configuration & State
// ============================================



let adminKey = "";
let allDrinks = [];
let toastTimeout = null;
let statusTimeout = null;
let isSaving = false;

const ingredientFields = createRecipeFields("ingredients", "Ingrediens", false);
const stepFields = createRecipeFields("steps", "Steg", true);
const tasteFields = createTasteFields();
const preview = createAdminPreview();
const drinkForm = document.getElementById("drink-form");
const spiritsForm = document.getElementById("spirits-form");
const spiritEditor = createSpiritEditor(() => adminKey, showToast, (clean = false) => {
  if (clean) unsavedChanges.markClean(spiritsForm);
  else unsavedChanges.refresh();
});
const unsavedChanges = createUnsavedChanges([drinkForm, spiritsForm], () => isSaving || spiritEditor.isSaving());

function collectDrink() {
  return {
    date: document.getElementById("f-date").value.trim(),
    drink: document.getElementById("f-drink").value.trim(),
    theme: document.getElementById("f-theme").value.trim() || "Övrigt",
    note: document.getElementById("f-note").value,
    ingredients: ingredientFields.getValue(),
    steps: stepFields.getValue(),
    taste: tasteFields.getValue(),
    url: document.getElementById("f-video-url").value,
    photo: document.getElementById("f-photo-url").value,
  };
}
function updateFormActions() {
  unsavedChanges.refresh();
  const missing = validateForm();
  const disabled = isSaving || missing.length > 0;
  document.querySelectorAll("[data-admin-mode]").forEach((button) => {
    button.disabled = isSaving;
  });
  ["submit-btn", "edit-submit-btn", "preview-btn"].forEach((id) => {
    document.getElementById(id).disabled = disabled;
  });
  const hint = document.getElementById("admin-required-hint");
  if (hint) {
    hint.textContent = missing.length
      ? `Fyll i: ${missing.join(", ")} för att förhandsgranska eller spara.`
      : "Förhandsgranska gärna innan du sparar. Ingenting laddas upp förrän du sparar.";
  }
}
document.getElementById("drink-form").addEventListener("input", updateFormActions);
document.getElementById("drink-form").addEventListener("change", updateFormActions);
document.getElementById("preview-btn").addEventListener("click", () => {
  if (isSaving || validateForm().length) return;
  try {
    preview.open(collectDrink(), {
      video: document.getElementById("f-video-file").files[0],
      photo: document.getElementById("f-photo-file").files[0],
    });
  } catch (err) {
    showToast("Kunde inte öppna förhandsgranskningen. Försök igen.", "error");
  }
});
updateFormActions();



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
    spiritEditor.load();
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

let drinkMode = "add";

function selectAdminMode(mode) {
  document.querySelectorAll("[data-admin-mode]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.adminMode === mode));
  });
  document.getElementById("admin-drinks-view").hidden = mode === "filters";
  document.getElementById("admin-filters-view").hidden = mode !== "filters";

  // Switching to filters and back keeps the current drink draft/search intact.
  if (mode === "filters" || mode === drinkMode) return;
  drinkMode = mode;
  const isEdit = mode === "edit";
  const form = document.getElementById("drink-form");
  document.getElementById("edit-picker-group").style.display = isEdit ? "block" : "none";

  if (isEdit) {
    clearForm();
    editSearch.value = "";
    editResults.classList.remove("open");
    // Show the form once a drink has been selected.
    form.style.display = "none";
    document.getElementById("submit-btn").style.display = "none";
    document.getElementById("edit-submit-btn").style.display = "none";
    document.getElementById("delete-btn").style.display = "none";
  } else {
    clearForm();
    editSearch.value = "";
    editResults.classList.remove("open");
    form.style.display = "grid";
    document.getElementById("submit-btn").style.display = "inline-block";
    document.getElementById("edit-submit-btn").style.display = "none";
    document.getElementById("delete-btn").style.display = "none";
  }
}

document.querySelectorAll("[data-admin-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    if (isSaving) return;
    const mode = button.dataset.adminMode;
    if (mode !== "filters" && mode !== drinkMode && !unsavedChanges.confirmDiscard(drinkForm)) return;
    selectAdminMode(mode);
  });
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
      '<div class="edit-search-empty">Inga träffar</div>';

    editResults.classList.add("open");
    return;
  }

  matches.forEach((d) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "edit-search-result search-suggestion";
    populateSearchSuggestion(item, d);

    item.addEventListener("click", () => {
      if (isSaving || !unsavedChanges.confirmDiscard(drinkForm)) return;
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

function setStatus(message, progress = null) {
  clearTimeout(statusTimeout);
  statusTimeout = null;
  const statusEl = document.getElementById("status-msg");
  const statusText = document.getElementById("status-text");
  const statusProgress = document.getElementById("status-progress");

  statusText.textContent = message;
  statusEl.style.display = "flex";

  if (progress === null) {
    statusProgress.hidden = true;
    statusProgress.removeAttribute("aria-valuenow");
    return;
  }

  const value = Math.max(0, Math.min(100, progress));
  statusProgress.hidden = false;
  statusProgress.style.setProperty("--progress", `${value}%`);
  statusProgress.setAttribute("aria-valuenow", String(value));
}

function clearStatus() {
  clearTimeout(statusTimeout);
  statusTimeout = null;
  const statusEl = document.getElementById("status-msg");
  const statusText = document.getElementById("status-text");
  const statusProgress = document.getElementById("status-progress");

  statusText.textContent = "";
  statusEl.style.display = "none";
  statusProgress.hidden = true;
  statusProgress.style.setProperty("--progress", "0%");
  statusProgress.setAttribute("aria-valuenow", "0");
}


// ============================================
// Form Helpers
// ============================================

function clearForm() {
  preview.close();
  ingredientFields.setValue("");
  stepFields.setValue("");
  tasteFields.setValue("");
  [
    "f-date",
    "f-drink",
    "f-theme",
    "f-note",
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
  unsavedChanges.markClean(drinkForm);
  updateFormActions();
}

function fillForm(d) {
  preview.close();
  document.getElementById("f-id").value = d.id;
  document.getElementById("f-date").value = d.date;
  document.getElementById("f-drink").value = d.drink;
  document.getElementById("f-theme").value = d.theme;
  document.getElementById("f-note").value = d.note;
  ingredientFields.setValue(d.ingredients);
  stepFields.setValue(d.steps);
  tasteFields.setValue(d.taste);
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
  unsavedChanges.markClean(drinkForm);
  updateFormActions();
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
  if (!tasteFields.isComplete()) missing.push("Smakprofil – välj alla fem värden eller rensa profilen");

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

async function uploadFile(file,type,onProgress=()=>{},onStage=()=>{}) {
  const date=document.getElementById("f-date").value;

  // Bilder använder vanlig upload
  if (type!=="Video") {
    const data=await new Promise((resolve,reject)=>{
      const request=new XMLHttpRequest();
      request.open("POST",`${API_BASE}/upload?filename=${encodeURIComponent(file.name)}&date=${encodeURIComponent(date)}`);
      request.setRequestHeader("X-Admin-Key",adminKey);
      request.setRequestHeader("Content-Type",file.type||"application/octet-stream");
      request.upload.onprogress=(event)=>{
        if(event.lengthComputable) onProgress(event.loaded);
      };
      request.onload=()=>{
        if(request.status<200||request.status>=300) {
          reject(new Error(`${type}-uppladdning misslyckades (${request.status}): ${request.responseText}`));
          return;
        }
        try {
          onProgress(file.size);
          resolve(JSON.parse(request.responseText));
        } catch {
          reject(new Error(`${type}-uppladdningen returnerade ett ogiltigt svar.`));
        }
      };
      request.onerror=()=>reject(new Error(`Nätverksfel vid uppladdning av ${type.toLowerCase()}.`));
      request.onabort=()=>reject(new Error(`${type}-uppladdningen avbröts.`));
      request.send(file);
    });
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
      let uploaded=null;
      let lastError=null;
      for(let attempt=1;attempt<=3;attempt++) {
        try {
          console.log("Uploading part",{partNumber,totalChunks,attempt});
          uploaded=await new Promise((resolve,reject)=>{
            const request=new XMLHttpRequest();
            request.open("PUT",`${API_BASE}/upload/part?key=${encodeURIComponent(key)}&uploadId=${encodeURIComponent(uploadId)}&partNumber=${partNumber}`);
            request.setRequestHeader("X-Admin-Key",adminKey);
            request.setRequestHeader("Content-Type","application/octet-stream");
            request.upload.onprogress=(event)=>{
              if(event.lengthComputable) {
                onProgress(i*CHUNK_SIZE+event.loaded);
              }
            };
            request.onload=()=>{
              if(request.status<200||request.status>=300) {
                reject(new Error(`${request.status}: ${request.responseText}`));
                return;
              }
              try {
                resolve(JSON.parse(request.responseText));
              } catch(err) {
                reject(new Error("Servern returnerade ett ogiltigt svar för videodelen."));
              }
            };
            request.onerror=()=>reject(new Error("Nätverksfel vid uppladdning av videodel."));
            request.onabort=()=>reject(new Error("Uppladdningen avbröts."));
            request.send(chunk);
          });
          break;
        } catch(err) {
          lastError=err;
          console.error(`Part ${partNumber} attempt ${attempt} failed`,err);
          if(attempt<3) await new Promise(r=>setTimeout(r,1000*attempt));
        }
      }

      if(!uploaded) throw new Error(`Del ${partNumber}/${totalChunks} misslyckades: ${lastError?.message||"okänt fel"}`);
      parts.push(uploaded);
      onProgress(Math.min(file.size,parts.length*CHUNK_SIZE));
    }

    onStage("Slutför videouppladdningen...");
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
  if (isSaving) return;
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
    isSaving = true;
    updateFormActions();
    const videoFile =
      document.getElementById("f-video-file").files[0];

    const photoFile =
      document.getElementById("f-photo-file").files[0];

    let videoUrl =
      document.getElementById("f-video-url").value;

    let photoUrl =
      document.getElementById("f-photo-url").value;
    const totalUploadBytes=(videoFile?.size||0)+(photoFile?.size||0);
    const uploadedBytes={Video:0,Bild:0};
    let overallProgress=2;
    const updateOverallStatus=(message,progress)=>{
      overallProgress=Math.max(overallProgress,progress);
      setStatus(message,overallProgress);
    };
    updateOverallStatus("Förbereder uppladdningen...",2);

    const reportUploadProgress=(type,bytes)=>{
      uploadedBytes[type]=Math.max(uploadedBytes[type],bytes);
      const ratio=totalUploadBytes
        ? (uploadedBytes.Video+uploadedBytes.Bild)/totalUploadBytes
        : 1;
      const label=type==="Video"?"Laddar upp video...":"Laddar upp bild...";
      const file=type==="Video"?videoFile:photoFile;
      const fileProgress=file?.size
        ? Math.min(100,Math.round(bytes/file.size*100))
        : 100;
      updateOverallStatus(`${label} ${fileProgress}%`,5+Math.round(ratio*80));
    };


      console.log("VIDEO FILE SELECTED:", {
        name: videoFile?.name,
        size: videoFile?.size,
        type: videoFile?.type
      });


    if (videoFile) {
      console.log("ABOUT TO CALL uploadFile() on video file.");
      updateOverallStatus("Laddar upp video...",5);
      videoUrl = await uploadFile(
        videoFile,
        "Video",
        (bytes)=>reportUploadProgress("Video",bytes),
        (message)=>updateOverallStatus(message,88)
      );
    }

    if (photoFile) {
      console.log("ABOUT TO CALL uploadFile() on photo file.");
      updateOverallStatus(
        "Laddar upp bild...",
        totalUploadBytes?5+Math.round((uploadedBytes.Video/totalUploadBytes)*80):85
      );
      photoUrl = await uploadFile(
        photoFile,
        "Bild",
        (bytes)=>reportUploadProgress("Bild",bytes)
      );
    }

    const payload = { ...collectDrink(), url: videoUrl, photo: photoUrl };

    const id = document.getElementById("f-id").value;
    const isEdit = !!id;

    updateOverallStatus("Sparar drinken...",95);
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

    statusTimeout=setTimeout(clearStatus,1500);

    clearForm();
    if (isEdit) {
      selectAdminMode("add");
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
    isSaving = false;
    updateFormActions();
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

    clearForm();
    loadDrinks();

    editSearch.value = "";
    editResults.classList.remove("open");

  selectAdminMode("add");
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
