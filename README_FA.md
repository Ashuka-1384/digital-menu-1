# منوی دیجیتال

فقط یک پروژه (`public-site`). ادمین داخل خود منو است: دکمه کلید بالا سمت راست ← رمز `MenuAdmin`.

## راه‌اندازی (یک بار)
1. در Supabase یک پروژه بسازید و محتوای `supabase-setup.sql` را در SQL Editor اجرا کنید.
2. از Supabase > Project Settings > API مقدار `Project URL` و `anon public key` را بردارید.
3. در Vercel (پروژه فعلی، Root Directory = `public-site`) > Settings > Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. کدها را روی GitHub پوش کنید؛ Vercel خودش دیپلوی می‌کند.

متغیرهای قدیمی GITHUB_* و پروژه Vercel جداگانه‌ی admin-site دیگر لازم نیستند.
برای تغییر رمز: `ADMIN_PASSWORD` در `public-site/src/supabase.js`.
