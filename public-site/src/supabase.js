import { createClient } from '@supabase/supabase-js'

// اگر نمی‌خواهید از Environment Variables استفاده کنید، مقدارها را مستقیم اینجا بنویسید:
const MANUAL_URL = ''   // مثال: 'https://abcdxyz.supabase.co'
const MANUAL_KEY = ''   // مثال: 'eyJhbGciOi...' یا 'sb_publishable_...'

const URL = (import.meta.env.VITE_SUPABASE_URL || MANUAL_URL || '').trim()
const KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || MANUAL_KEY || '').trim()

export const supabase = URL && KEY ? createClient(URL, KEY) : null
export const BUCKET = 'menu-images'
export const ADMIN_PASSWORD = 'MenuAdmin'

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`)

// آدرس عکس در استوریج را به مسیر فایل تبدیل می‌کند (برای حذف)
export function storagePathFromUrl(url) {
  if (!url) return null
  const marker = `/${BUCKET}/`
  const i = url.indexOf(marker)
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length).split('?')[0])
}

// خواندن کل منو از Supabase و تبدیل به ساختار قبلی
// تبدیل خطاهای فنی به پیام فارسی قابل فهم
export function explainError(e) {
  const raw = String(e?.message || e || '')
  const code = e?.code || ''
  let hint = ''
  if (raw === 'NOT_CONFIGURED') {
    hint = 'آدرس یا کلید Supabase تنظیم نشده. در Vercel دو متغیر VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY را بسازید و بعد حتماً یک Redeploy بزنید (بدون Redeploy اعمال نمی‌شوند).'
  } else if (code === 'PGRST205' || code === '42P01' || /schema cache|does not exist|Could not find the table/i.test(raw)) {
    hint = 'جدول‌ها ساخته نشده‌اند. فایل supabase-setup.sql را در Supabase > SQL Editor اجرا کنید.'
  } else if (/invalid api key|JWT|apikey|401|403/i.test(raw) || code === '42501') {
    hint = 'کلید اشتباه است یا دسترسی (Policy) ندارد. کلید anon/public را از Project Settings > API بردارید و دوباره فایل SQL را اجرا کنید.'
  } else if (/failed to fetch|networkerror|load failed/i.test(raw)) {
    hint = 'آدرس Supabase اشتباه است یا اینترنت قطع است. آدرس باید شبیه https://xxxx.supabase.co باشد.'
  }
  return hint ? `${hint}\n(${raw})` : raw
}

export async function loadMenuData() {
  if (!supabase) throw new Error('NOT_CONFIGURED')
  const [cats, items] = await Promise.all([
    supabase.from('categories').select('*').order('sort', { ascending: true }),
    supabase.from('items').select('*').order('sort', { ascending: true }),
  ])
  if (cats.error) throw cats.error
  if (items.error) throw items.error
  return {
    restaurant: { name: '', phone: '', instagram: '' },
    currency: 'تومان',
    categories: cats.data.map(c => ({ id: c.id, name: c.name, sort: c.sort })),
    items: items.data.map(i => ({
      id: i.id,
      categoryId: i.category_id,
      name: i.name,
      description: i.description || '',
      price: Number(i.price || 0),
      image: i.image_url || '',
      available: i.available !== false,
      sort: i.sort,
    })),
  }
}
