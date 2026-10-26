import { createDrinkDialog } from "./dialogs.js";

// Local object URLs let the existing recipe view preview files without uploads.
export function createAdminPreview() {
  let objectUrls = [];
  function releaseFiles() {
    objectUrls.forEach((url) => URL.revokeObjectURL(url));
    objectUrls = [];
  }
  const dialog = createDrinkDialog(() => {}, releaseFiles, () => {}, (url) => url);
  function close() {
    dialog.close();
    releaseFiles();
  }
  function mediaUrl(file, storedKey) {
    if (!file) return `${R2_BASE_URL}${storedKey}`;
    const url = URL.createObjectURL(file);
    objectUrls.push(url);
    return url;
  }
  function open(drink, files) {
    close();
    try {
      dialog.open({ ...drink, url: mediaUrl(files.video, drink.url), photo: mediaUrl(files.photo, drink.photo) });
    } catch (err) {
      close();
      throw err;
    }
  }
  window.addEventListener("pagehide", close);
  return { open, close };
}
