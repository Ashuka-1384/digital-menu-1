import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

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
export async function loadMenuData() {
  if (!supabase) throw new Error('Supabase is not configured')
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
