# Premium Digital Menu — Vercel + JSON/File Storage

A simple bilingual-ready (RTL-first) digital menu built with React, Vite and Vercel Node functions. No database.

## Structure

- `content/menu.json` — menu data
- `content/images/` — uploaded images (tracked in Git)
- `public-site/` — customer-facing read-only menu
- `admin-site/` — admin editor (no login; access is intended to be hidden behind a separate/private URL)

Both projects can be deployed as separate Vercel projects from the same repository.

## Why Git-backed storage instead of writing directly to disk?

Vercel Functions run on ephemeral/serverless infrastructure, so changes written to the local filesystem are not a reliable permanent storage mechanism. The admin API therefore updates `content/menu.json` and `content/images/*` through the GitHub Contents API. The repository becomes the source of truth without adding a database.

## Required environment variables for `admin-site`

```text
GITHUB_TOKEN=github_pat_xxxxxxxxx
GITHUB_OWNER=your-github-user-or-org
GITHUB_REPO=your-repo-name
GITHUB_BRANCH=main
ADMIN_API_KEY=optional-but-recommended-secret
```

در نسخهٔ فعلی عمداً لاگین یا پسورد نداریم؛ بنابراین هر کسی که URL پنل ادمین را بداند می‌تواند محتوا را تغییر دهد. برای این مدل، یک دامنه/URL طولانی و خصوصی برای پنل ادمین استفاده کنید.

## Required environment variables for `public-site`

```text
CONTENT_RAW_BASE (داخل site-config.js)=https://raw.githubusercontent.com/OWNER/REPO/main/content
```

The public site only reads `menu.json` and image files. No secret should be added to the public project.

## Local development

### Public

```bash
cd public-site
npm install
npm run dev
```

### Admin

```bash
cd admin-site
npm install
npm run dev
```

For local admin API calls, run the admin project with Vercel CLI (`vercel dev`) so the `/api/*` functions are available.

## Vercel deployment

Deploy `public-site` and `admin-site` as separate Vercel projects, both pointing at this same repository and using the appropriate Root Directory.

Suggested domains:

- `menu.example.com` → `public-site`
- `manage-<random>.example.com` → `admin-site`

The admin site has no authentication flow by design. Treat the admin URL as a secret and do not share it publicly.

## Content schema

```json
{
  "restaurant": {
    "name": "Sample Restaurant",
    "tagline": "Taste the moment",
    "description": "..."
  },
  "currency": "تومان",
  "categories": [
    { "id": "starters", "name": "پیش‌غذا", "sort": 1 }
  ],
  "items": [
    {
      "id": "item-id",
      "categoryId": "starters",
      "name": "...",
      "description": "...",
      "price": 250000,
      "image": "images/item-id-123.jpg",
      "featured": true,
      "available": true,
      "sort": 1
    }
  ],
  "updatedAt": "2026-09-24T00:00:00.000Z"
}
```
