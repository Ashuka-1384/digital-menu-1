import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Star,
  Trash2,
  Upload,
  Utensils,
  X,
} from 'lucide-react'
import './styles.css'
import seed from './seed.json'
import { CONTENT_RAW_BASE } from './site-config'

const RAW_BASE = CONTENT_RAW_BASE.replace(/\/$/, '')
const headers = () => ({ 'Content-Type': 'application/json' })

function imgUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  const clean = String(path).replace(/^\//, '').replace(/^content\//, '')
  return RAW_BASE ? `${RAW_BASE}/${clean}` : `/content/${clean}`
}

function money(value) {
  return Number(value || 0).toLocaleString('fa-IR')
}

function uid() {
  return `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function App() {
  const [menu, setMenu] = useState(seed)
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    setStatus('')
    try {
      const response = await fetch('/api/content', { headers: headers(), cache: 'no-store' })
      if (!response.ok) throw new Error('API unavailable')
      const data = await response.json()
      setMenu(data.data)
      setStatus('همگام با مخزن')
    } catch (error) {
      console.error(error)
      setStatus(`خطا در اتصال API: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const items = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('fa-IR')
    return menu.items
      .filter(item => filter === 'all' || item.categoryId === filter)
      .filter(item => !term || `${item.name} ${item.description}`.toLocaleLowerCase('fa-IR').includes(term))
      .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || a.sort - b.sort)
  }, [menu, filter, query])

  const categoryName = id => menu.categories.find(c => c.id === id)?.name || 'بدون دسته'

  const updateItem = (id, patch) => {
    setMenu(current => ({
      ...current,
      items: current.items.map(item => item.id === id ? { ...item, ...patch } : item),
    }))
  }

  const addItem = () => {
    const category = menu.categories[0]?.id || ''
    const item = {
      id: uid(),
      categoryId: category,
      name: 'آیتم جدید',
      description: 'توضیحات آیتم را وارد کنید',
      price: 0,
      image: '',
      featured: false,
      available: true,
      sort: menu.items.length + 1,
    }
    setMenu(current => ({ ...current, items: [item, ...current.items] }))
    setSelected(item)
  }

  const removeItem = id => {
    if (!window.confirm('این آیتم حذف شود؟')) return
    setMenu(current => ({ ...current, items: current.items.filter(item => item.id !== id) }))
    if (selected?.id === id) setSelected(null)
    setStatus('آیتم حذف شد؛ ذخیره را بزنید')
  }

  const save = async () => {
    setSaving(true)
    setStatus('در حال ذخیره…')
    try {
      const response = await fetch('/api/content', {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify(menu),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'save failed')
      }
      const data = await response.json()
      setMenu(current => ({ ...current, updatedAt: data.updatedAt }))
      setStatus('ذخیره شد ✓')
    } catch (error) {
      console.error(error)
      setStatus(`ذخیره انجام نشد: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const upload = async (file, id) => {
    if (!file) return null
    setStatus('در حال آماده‌سازی تصویر…')
    try {
      const base64 = await compress(file)
      const response = await fetch('/api/image', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ name: file.name, dataBase64: base64 }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'upload failed')
      }
      const data = await response.json()
      const old = menu.items.find(item => item.id === id)?.image
      updateItem(id, { image: data.path })
      if (old) {
        await fetch('/api/image', {
          method: 'DELETE',
          headers: headers(),
          body: JSON.stringify({ path: old }),
        }).catch(() => {})
      }
      setStatus('تصویر بارگذاری شد؛ ذخیره را بزنید')
      return data.path
    } catch (error) {
      console.error(error)
      setStatus(`بارگذاری تصویر انجام نشد: ${error.message}`)
      return null
    }
  }

  const removeImage = async id => {
    const old = menu.items.find(item => item.id === id)?.image
    if (!old) return
    updateItem(id, { image: '' })
    await fetch('/api/image', {
      method: 'DELETE',
      headers: headers(),
      body: JSON.stringify({ path: old }),
    }).catch(() => {})
    setStatus('تصویر حذف شد؛ ذخیره را بزنید')
  }

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="loading-logo"><Utensils size={21} /></div>
        <span>در حال اتصال به منو…</span>
      </div>
    )
  }

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-icon"><Utensils size={18} /></div>
          <div>
            <strong>مدیریت منو</strong>
            <span>داشبورد محتوا</span>
          </div>
        </div>

        <div className="nav-group">
          <span className="nav-label">بخش‌ها</span>
          <button className="nav-item active"><Sparkles size={17} /> آیتم‌های منو</button>
          <button className="nav-item" onClick={() => window.open('/', '_blank')}><Eye size={17} /> پیش‌نمایش</button>
        </div>

        <div className="sidebar-bottom">
          <div className="status-card">
            <div className="status-head"><span>وضعیت</span><span className={status?.includes('خطا') || status?.includes('نشد') ? 'status-dot error' : 'status-dot'} /></div>
            <strong>{status || 'آماده'}</strong>
            <small>منبع داده: content/menu.json</small>
          </div>
          <button className="preview-link" onClick={() => window.open('/', '_blank')}><Eye size={16} /> مشاهده منو</button>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">داشبورد منو</span>
            <h1>مدیریت محتوا</h1>
            <p>قیمت، توضیحات، دسته‌بندی و نمایش آیتم‌ها را کنترل کنید.</p>
          </div>
          <div className="top-actions">
            <button className="ghost" onClick={load} disabled={saving}><RefreshCw size={17} /> تازه‌سازی</button>
            <button className="save" disabled={saving} onClick={save}><Save size={17} /> {saving ? 'در حال ذخیره…' : 'ذخیره تغییرات'}</button>
          </div>
        </header>

        <section className="stats">
          <div className="stat-card"><span>کل آیتم‌ها</span><strong>{menu.items.length.toLocaleString('fa-IR')}</strong><small>در مخزن</small></div>
          <div className="stat-card"><span>قابل نمایش</span><strong>{menu.items.filter(item => item.available !== false).length.toLocaleString('fa-IR')}</strong><small>در منوی عمومی</small></div>
          <div className="stat-card"><span>پیشنهاد ویژه</span><strong>{menu.items.filter(item => item.featured).length.toLocaleString('fa-IR')}</strong><small>برجسته شده</small></div>
        </section>

        <section className="content-toolbar">
          <div className="toolbar-title">
            <span>آیتم‌ها</span>
            <strong>{items.length.toLocaleString('fa-IR')} نتیجه</strong>
          </div>
          <div className="category-tabs" role="tablist" aria-label="دسته‌بندی‌ها">
            <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>همه</button>
            {menu.categories.map(category => (
              <button key={category.id} className={filter === category.id ? 'on' : ''} onClick={() => setFilter(category.id)}>{category.name}</button>
            ))}
          </div>
          <label className="search">
            <Search size={17} />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="جست‌وجوی آیتم…" />
          </label>
          <button className="add" onClick={addItem}><Plus size={18} /> افزودن آیتم</button>
        </section>

        {items.length > 0 ? (
          <section className="items-list">
            {items.map((item, index) => (
              <article className="item-row" key={item.id} style={{ '--row-index': index }}>
                <div className="thumb">
                  {item.image ? <img src={imgUrl(item.image)} alt="" loading={index < 3 ? 'eager' : 'lazy'} /> : <ImageIcon size={22} />}
                  {item.featured && <span className="thumb-star"><Star size={11} fill="currentColor" /></span>}
                </div>
                <div className="item-main">
                  <div className="item-head"><h3>{item.name}</h3><span className="cat">{categoryName(item.categoryId)}</span></div>
                  <p>{item.description || 'بدون توضیحات'}</p>
                  <div className="meta"><strong>{money(item.price)} {menu.currency}</strong><span className={item.available !== false ? 'available' : 'unavailable'}>{item.available !== false ? 'در منو' : 'پنهان'}</span></div>
                </div>
                <div className="row-actions">
                  <button onClick={() => setSelected(item)}><Pencil size={16} /> ویرایش</button>
                  <button className="danger" onClick={() => removeItem(item.id)}><Trash2 size={16} /> حذف</button>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <div className="empty-admin"><div><AlertCircle size={21} /></div><strong>آیتمی پیدا نشد</strong><span>فیلتر یا عبارت جست‌وجو را تغییر دهید.</span></div>
        )}

        <div className="mobile-actions">
          <button onClick={() => window.open('/', '_blank')}><Eye size={18} /> پیش‌نمایش</button>
          <button onClick={save} disabled={saving}><Save size={18} /> ذخیره</button>
        </div>
      </main>

      {selected && (
        <Drawer
          item={selected}
          categories={menu.categories}
          onClose={() => setSelected(null)}
          onChange={patch => {
            updateItem(selected.id, patch)
            setSelected(current => current ? { ...current, ...patch } : current)
          }}
          onUpload={async (file, id) => {
            const path = await upload(file, id)
            if (path) setSelected(current => current ? { ...current, image: path } : current)
            return path
          }}
          onRemoveImage={async id => {
            await removeImage(id)
            setSelected(current => current ? { ...current, image: '' } : current)
          }}
        />
      )}
    </div>
  )
}

function Drawer({ item, categories, onClose, onChange, onUpload, onRemoveImage }) {
  const [local, setLocal] = useState(item)
  useEffect(() => setLocal(item), [item.id])

  const patch = value => {
    setLocal(current => ({ ...current, ...value }))
    onChange(value)
  }

  return (
    <div className="drawer-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="ویرایش آیتم">
        <div className="drawer-head">
          <div>
            <span className="eyebrow">ویرایش آیتم</span>
            <h2>جزئیات</h2>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="بستن"><X /></button>
        </div>

        <div className="form">
          <label>نام آیتم<input value={local.name} onChange={event => patch({ name: event.target.value })} /></label>
          <div className="split">
            <label>دسته<select value={local.categoryId} onChange={event => patch({ categoryId: event.target.value })}>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label>قیمت<input type="number" min="0" inputMode="numeric" value={local.price} onChange={event => patch({ price: Number(event.target.value) })} /></label>
          </div>
          <label>توضیحات<textarea rows="4" value={local.description} onChange={event => patch({ description: event.target.value })} /></label>

          <div className="setting-grid">
            <button className={local.available !== false ? 'toggle active' : 'toggle'} onClick={() => patch({ available: local.available === false })}>
              {local.available !== false ? <Eye size={16} /> : <EyeOff size={16} />}
              {local.available !== false ? 'نمایش در منو' : 'پنهان از منو'}
            </button>
            <button className={local.featured ? 'toggle active' : 'toggle'} onClick={() => patch({ featured: !local.featured })}>
              <Star size={16} fill={local.featured ? 'currentColor' : 'none'} />
              {local.featured ? 'پیشنهاد ویژه' : 'عادی'}
            </button>
          </div>

          <div className="image-box">
            <div className="image-box-head"><span>تصویر آیتم</span>{local.image && <button className="link-danger" onClick={() => onRemoveImage(local.id)}>حذف تصویر</button>}</div>
            {local.image ? <img src={imgUrl(local.image)} alt="پیش‌نمایش آیتم" /> : <div className="empty-image"><ImageIcon size={32} /><span>برای این آیتم تصویری ثبت نشده است.</span></div>}
            <label className="upload"><Upload size={17} /> {local.image ? 'جایگزینی تصویر' : 'بارگذاری تصویر'}<input type="file" accept="image/*" onChange={event => { onUpload(event.target.files?.[0], local.id); event.target.value = '' }} /></label>
            <small>تصویر در مرورگر به WebP فشرده می‌شود تا منو سبک بماند.</small>
          </div>
        </div>

        <div className="drawer-footer"><button className="full" onClick={onClose}><Check size={17} /> پایان ویرایش</button></div>
      </aside>
    </div>
  )
}

function compress(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 12 * 1024 * 1024) {
      reject(new Error('حجم تصویر اولیه بیشتر از 12MB است'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const max = 1500
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const context = canvas.getContext('2d')
        context.drawImage(img, 0, 0, canvas.width, canvas.height)
        const data = canvas.toDataURL('image/webp', .78)
        if (data.length > 3.2 * 1024 * 1024) {
          reject(new Error('تصویر بعد از فشرده‌سازی هنوز بزرگ است؛ تصویر کوچک‌تری انتخاب کنید'))
          return
        }
        resolve(data)
      }
      img.onerror = reject
      img.src = reader.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

createRoot(document.getElementById('root')).render(<App />)
