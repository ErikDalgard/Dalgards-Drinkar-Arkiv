// Track actual form values without storing drafts, files or passwords anywhere.
export function createUnsavedChanges(forms, isSaving = () => false) {
  const win = forms[0].ownerDocument.defaultView;
  const fileIds = new WeakMap();
  let nextFileId = 0;
  let listening = false;
  let disposed = false;

  function snapshot(form) {
    return JSON.stringify(Array.from(form.elements).filter((field) =>
      ["INPUT", "TEXTAREA", "SELECT"].includes(field.tagName) &&
      !["submit", "button", "reset"].includes(field.type)
    ).map((field) => {
      let value = field.value;
      if (field.type === "file") {
        value = Array.from(field.files, (file) => {
          if (!fileIds.has(file)) fileIds.set(file, ++nextFileId);
          return fileIds.get(file);
        });
      } else if (["radio", "checkbox"].includes(field.type)) {
        value = [field.value, field.checked];
      }
      return [field.tagName, field.type, field.name, value];
    }));
  }
  const saved = new Map(forms.map((form) => [form, snapshot(form)]));
  function hasChanges(form) {
    return snapshot(form) !== saved.get(form);
  }
  function beforeUnload(event) {
    if (!isSaving() && !forms.some(hasChanges)) return;
    event.preventDefault();
    event.returnValue = true;
  }
  function refresh() {
    if (disposed) return;
    const needed = isSaving() || forms.some(hasChanges);
    if (needed === listening) return;
    listening = needed;
    if (needed) win.addEventListener("beforeunload", beforeUnload);
    else win.removeEventListener("beforeunload", beforeUnload);
  }
  // Allow row editors and submit handlers to finish updating the form first.
  const afterChange = () => queueMicrotask(refresh);
  const events = ["input", "change", "click", "submit"];
  forms.forEach((form) => events.forEach((type) => form.addEventListener(type, afterChange)));
  function markClean(form) {
    saved.set(form, snapshot(form));
    refresh();
  }
  function confirmDiscard(form) {
    return !hasChanges(form) || win.confirm("Du har osparade ändringar i drinken. Vill du fortsätta och kasta ändringarna?");
  }
  function dispose() {
    disposed = true;
    win.removeEventListener("beforeunload", beforeUnload);
    forms.forEach((form) => events.forEach((type) => form.removeEventListener(type, afterChange)));
  }
  return { hasChanges, markClean, confirmDiscard, refresh, dispose };
}
