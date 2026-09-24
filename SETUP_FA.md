# راه‌اندازی سریع

## 1) ساخت مخزن GitHub

کل این پوشه را در یک repository قرار بده و شاخه اصلی را `main` بگذار.

ساختار مهم:

```text
content/menu.json
content/images/
public-site/
admin-site/
```

## 2) ساخت توکن GitHub

یک Fine-grained Personal Access Token بساز که فقط به همین repository دسترسی داشته باشد و Permission مربوط به `Contents` را روی `Read and write` قرار بده.

این توکن را فقط در Environment Variables پروژهٔ `admin-site` قرار بده؛ داخل کد یا Git commit نکن.

## 3) Deploy پنل عمومی

در Vercel یک Project جدید از همان repository بساز و Root Directory را روی:

```text
public-site
```

قرار بده.

Environment Variable:

```text
CONTENT_RAW_BASE (داخل site-config.js)=https://raw.githubusercontent.com/OWNER/REPO/main/content
```

بعد از Deploy، لینک عمومی منو ساخته می‌شود.

## 4) Deploy پنل ادمین

یک Project دوم در Vercel از همان repository بساز و Root Directory را روی:

```text
admin-site
```

قرار بده.

Environment Variables:

```text
GITHUB_TOKEN=...
GITHUB_OWNER=...
GITHUB_REPO=...
GITHUB_BRANCH=main
CONTENT_RAW_BASE (داخل site-config.js)=https://raw.githubusercontent.com/OWNER/REPO/main/content
```

پنل ادمین هیچ Login ندارد. این یعنی هر کسی که URL پنل را داشته باشد امکان ویرایش دارد؛ پس برای آن یک URL طولانی/تصادفی یا دامنهٔ جداگانه و خصوصی انتخاب کن.

## 5) مسیر کار

ادمین در پنل، آیتم را می‌سازد/ویرایش/حذف می‌کند. برای تصویر، فایل در `content/images/` قرار می‌گیرد و `menu.json` به مسیر آن اشاره می‌کند. با زدن «ذخیره تغییرات»، `menu.json` از طریق GitHub API به‌روزرسانی و commit می‌شود.

پنل عمومی مستقیماً `menu.json` به‌روز را از raw GitHub می‌خواند، بنابراین بدون دیتابیس هم اطلاعات پایدار می‌مانند.

## 6) ظاهر و ریسپانسیو

ظاهر Public و Admin کاملاً بازطراحی شده است و بر پایه یک سیستم بصری خنثی و کم‌حجم کار می‌کند. هیچ نام برند یا هویت متنی مشخصی در رابط نمایش داده نمی‌شود.

در موبایل، منوی عمومی یک ستون، دسته‌بندی افقی، جست‌وجوی در دسترس و modal جزئیات دارد؛ در اندازه‌های بزرگ‌تر، شبکه چندستونه فعال می‌شود.


## عیب‌یابی نسخه اصلاح‌شده

### Admin به API وصل نمی‌شود
در Vercel Project مربوط به admin باید این Environment Variableها دقیقاً وجود داشته باشند و برای Production فعال باشند:
- GITHUB_TOKEN
- GITHUB_OWNER
- GITHUB_REPO
- GITHUB_BRANCH=main

بعد از تغییر Environment Variable حتماً Redeploy کنید.

### تصویر آپلود می‌شود ولی نمایش داده نمی‌شود
مسیر ذخیره‌شده باید مانند `content/images/example.webp` باشد. نسخه جدید پیشوند `content/` را هنگام ساخت URL دوباره تکرار نمی‌کند.

### تست API
در مرورگر پنل Admin آدرس `/api/content` را باز کنید. اگر تنظیمات درست باشد یک JSON شامل `data` و `sha` می‌بینید. اگر خطا دیدید، متن خطا را بررسی کنید.


## تغییر جدید در نسخه Config
اطلاعات عمومی مخزن GitHub دیگر از Environment Variable خوانده نمی‌شوند.
آن‌ها را داخل این فایل‌ها وارد کنید:
- `public-site/src/site-config.js`
- `admin-site/src/site-config.js`
- `admin-site/api/repo-config.mjs`

در هر سه فایل این مقادیر را وارد کنید:
`YOUR_GITHUB_USERNAME`
`YOUR_REPOSITORY_NAME`
`main`

تنها راز پروژه `GITHUB_TOKEN` است و باید فقط در Environment Variables پروژه Admin در Vercel باقی بماند.
**Token را داخل کد، ZIP یا GitHub قرار ندهید.**

بعد از تغییر فایل‌های config، هر دو پروژه Vercel را Redeploy کنید.
