# Dalgards Drinkar

A project to collect and display my parents cocktail recipes, photos, and videos in one place.

**Live site:** [dalgardsdrinkar.dalgard-erik.workers.dev](https://dalgardsdrinkar.dalgard-erik.workers.dev/)

---

## Project structure

* **`client/` (Frontend)**
  * HTML, CSS, and JavaScript.
  * Hosted on Cloudflare Pages.

* **`api/` (Backend)**
  * A Cloudflare Worker connecting the frontend to a D1 database and R2 bucket for media storage.
  * **Note:** Most of the files in this directory (`tsconfig`, `vitest`, `worker-configuration`, etc.) are auto-generated boilerplate created by Cloudflare's CLI. 

---

## Directory Structure

```text
dalgardsdrinkar/
├── client/                      # Frontend website
│   ├── public/                  
│   │   ├── assets/              
│   │   ├── css/                 
│   │   └── js/                  
│   ├── index.html               # Main recipe page
│   └── admin.html               # Admin panel to manage drinks
│
├── api/                         # Backend (mostly Cloudflare boilerplate)
│   ├── src/                     # API routes & logic (index.ts)
│   ├── wrangler.jsonc           # D1 and R2 configuration
│   └── ...                      # Auto-generated files (package.json, tsconfig, etc.)
│
├── .gitignore                   # Ignores node_modules, .wrangler, etc.
└── README.md