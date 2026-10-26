# Dalgards Drinkar

My parents run a Instagram account where they post a cocktail each Friday. This is a project to collect and display all of those recipes, photos, and videos in one place.

**Live site:** [dalgardsdrinkar.dalgard-erik.workers.dev](https://dalgardsdrinkar.dalgard-erik.workers.dev/)

---

## Project structure

* **`client/` (Frontend)**
  * HTML, CSS, and JavaScript.
  * Hosted on Cloudflare Pages.

* **`api/` (Backend)**
  * A Cloudflare Worker connecting the frontend to a D1 database and R2 bucket for media storage.
  * Development and production use separate Cloudflare D1 databases and R2 buckets.
  * **Note:** Most of the files in this directory (`tsconfig`, `vitest`, `worker-configuration`, etc.) are auto-generated boilerplate created by Cloudflare's CLI.

## Directory Structure

```text
dalgardsdrinkar/
├── client/                      # Frontend website
│   ├── public/                  
│   │   ├── assets/              
│   │   ├── css/                 
│   │   └── js/                  
│   ├── index.html               # Main recipe page
│   ├── admin.html               # Admin panel to manage drinks
│   ├── test/
│   │   ├── logic/               # Frontend logic tests
│   │   ├── browser/             # Playwright browser tests
│   │   └── server.js            # Local server for browser tests
│   ├── playwright.config.js     # Desktop and mobile test configuration
│   └── package.json             # Frontend test tools and commands
│
├── api/                         # Backend (mostly Cloudflare boilerplate)
│   ├── src/                     # API routes & logic (index.ts)
│   ├── test/                    # API tests (index.spec.ts) and test types
│   ├── vitest.config.mts         # Isolated local D1 and R2 test configuration
│   ├── wrangler.jsonc           # D1 and R2 configuration
│   └── ...                      # Auto-generated files (package.json, tsconfig, etc.)
│
├── .github/workflows/
│   └── api-tests.yml             # API and frontend CI checks
├── .gitignore                   # Ignores node_modules, .wrangler, etc.
└── README.md
```

## CI & tests

GitHub Actions runs API and Frontend tests and TypeScript checks on every push and pull request. Tests use isolated local D1 and R2 storage, without touching development or production data.
