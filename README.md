# منوی دیجیتال — Vercel + GitHub Content API

یک منوی دیجیتال RTL-first ساخته‌شده با React، Vite و Vercel. داده‌ها و تصاویر داخل repository نگهداری می‌شوند و پنل مدیریت، فایل محتوا را از طریق GitHub Contents API به‌روزرسانی می‌کند.

## ساختار

```text
content/menu.json
content/images/
public-site/
admin-site/
```

`public-site` نسخه عمومی منو است و `admin-site` برای مدیریت آیتم‌ها استفاده می‌شود. هر دو می‌توانند به‌صورت دو پروژه مستقل Vercel از همین repository منتشر شوند.

## طراحی جدید

ظاهر هر دو بخش از پایه بازطراحی شده است:

- رابط عمومی با تمرکز روی نام آیتم، قیمت و دسته‌بندی، بدون نام برند یا بخش‌های تبلیغاتی.
- طراحی mobile-first با لیست خوانا در موبایل و شبکه دو ستونه در نمایشگرهای بزرگ‌تر.
- دسته‌بندی افقی قابل لمس، جست‌وجوی سریع و modal سبک برای جزئیات هر آیتم.
- انیمیشن‌ها فقط با CSS و transitionهای کوتاه پیاده‌سازی شده‌اند و برای `prefers-reduced-motion` نیز رفتار مناسب دارند.
- تصاویر lazy-load می‌شوند و پنل مدیریت قبل از ارسال، تصاویر را به WebP فشرده می‌کند.
- هیچ کتابخانه انیمیشن سنگینی اضافه نشده است.

## محیط Admin

توکن محرمانه فقط باید در Environment Variables پنل Admin نگهداری شود:

```text
GITHUB_TOKEN=...
GITHUB_OWNER=...
GITHUB_REPO=...
GITHUB_BRANCH=main
```

توکن را در کد، فایل `.env` قابل commit یا پروژه عمومی قرار ندهید.

## تنظیمات مخزن

اطلاعات عمومی repository در این فایل‌ها قرار دارند:

```text
public-site/src/site-config.js
admin-site/src/site-config.js
admin-site/api/repo-config.mjs
```

این اطلاعات محرمانه نیستند. توکن GitHub محرمانه است و در این فایل‌ها قرار نمی‌گیرد.

## اجرای محلی

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

برای اجرای توابع `/api/*` در توسعه، استفاده از `vercel dev` توصیه می‌شود.

## انتشار در Vercel

برای نسخه عمومی، Root Directory را روی `public-site` قرار دهید.

برای پنل مدیریت، Root Directory را روی `admin-site` قرار دهید.

هر دو پروژه از همان repository استفاده می‌کنند اما deployment مستقل دارند.

## ساختار داده

فایل `content/menu.json` ساختار زیر را حفظ می‌کند:

```json
{
  "restaurant": {
    "name": "",
    "tagline": "...",
    "description": "...",
    "phone": "",
    "instagram": ""
  },
  "currency": "تومان",
  "categories": [],
  "items": [],
  "updatedAt": "..."
}
```

فیلد `restaurant.name` برای سازگاری با schema نگه داشته شده اما در رابط عمومی و پنل مدیریت نمایش داده نمی‌شود.

## آدرس عمومی

گزینهٔ «مشاهده منو» در پنل مدیریت مستقیماً به این آدرس هدایت می‌شود:

```text
https://digital-menu-public-six.vercel.app/
```

در پنل مدیریت گزینهٔ «پیش‌نمایش» حذف شده است.
