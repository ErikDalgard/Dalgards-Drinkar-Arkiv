const isDev =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const API_BASE = isDev
  ? "http://localhost:8787"
  : "https://dalgardsdrinkar-api.dalgard-erik.workers.dev";

const R2_BASE_URL =isDev 
    ?  "https://pub-83faa7a86a754e4cb75268aefbb4d7c9.r2.dev/"
    : "https://pub-bc043636a580470b9ca005f040b69b9c.r2.dev/";