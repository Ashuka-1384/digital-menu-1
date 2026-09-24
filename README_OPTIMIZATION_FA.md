# بهینه‌سازی Public Site — NOMA

این Patch ساختار اصلی پروژه را تغییر نمی‌دهد. فقط یک API داخلی در `public-site/api/menu.mjs`
اضافه می‌شود تا Public به‌جای خواندن مستقیم `raw.githubusercontent.com`، آخرین `menu.json`
را از GitHub REST API از سمت سرور Vercel دریافت کند.

تغییرات:
- `public-site/api/menu.mjs` جدید: Proxy سروری برای `content/menu.json`
- `public-site/src/main.jsx`: خواندن از `/api/menu`، کش محلی برای نمایش فوری، refresh هنگام focus/visibility و fallback
- `public-site/src/styles.css`: حذف `feTurbulence` سنگین
- `public-site/index.html`: preconnect برای Google Fonts
- `public-site/vercel.json`: فعال‌سازی Function تنظیم‌شده برای API
- `public-site/.env.example`: متغیرهای لازم Public

Environment Variables در Vercel برای پروژه Public:
- GITHUB_READ_TOKEN = یک Fine-grained token فقط با Contents: Read
- GITHUB_OWNER = Ashuka-1384
- GITHUB_REPO = digital-menu-1
- GITHUB_BRANCH = main

برای کمترین تغییر می‌توانی به‌جای `GITHUB_READ_TOKEN` همان `GITHUB_TOKEN` موجود را نیز قرار بدهی؛
API هر دو را قبول می‌کند. توکن را هرگز با پیشوند `VITE_` قرار نده.

نحوه انتشار:
1. فایل‌های این Patch را روی نسخه فعلی پروژه جایگزین کن.
2. `git add public-site`
3. `git commit -m "optimize public menu delivery"`
4. `git pull --rebase origin main`
5. `git push origin main`
6. در Vercel Public پروژه را Deploy/Redeploy کن.
7. در Vercel Public → Settings → Environment Variables متغیرهای بالا را تنظیم کن.

نتیجه مورد انتظار:
Admin Save → GitHub → Public API → Public معمولاً در حد چند ثانیه به‌روز می‌شود، نه چند دقیقه.
