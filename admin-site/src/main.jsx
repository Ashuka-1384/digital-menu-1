import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  AlertCircle,
  Check,
  Eye,
  EyeOff,
  FolderPlus,
  Image as ImageIcon,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Upload,
  Utensils,
  X,
} from 'lucide-react'
import './styles.css'
import seed from './seed.json'
import { CONTENT_RAW_BASE } from './site-config'

const RAW_BASE = CONTENT_RAW_BASE.replace(/\/$/, '')
const PUBLIC_MENU_URL = 'https://digital-menu-public-six.vercel.app/'
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

function uid(prefix = 'item') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function categorySort(categories) {
  return [...categories].sort((a, b) => a.sort - b.sort)
}

function App() {
  const [menu, setMenu] = useState(seed)
  const [selected, setSelected] = useState(null)
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    setStatus('')
    try {
      const response = await fetch('/api/content', {
        headers: headers(),
        cache: 'no-store',
      })
      if (!response.ok) throw new Error('API unavailable')
      const data = await response.json()
      setMenu({
        ...data.data,
        categories: categorySort(data.data.categories || []),
      })
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
      .filter(item =>
        !term ||
        `${item.name} ${item.description}`.toLocaleLowerCase('fa-IR').includes(term),
      )
      .sort((a, b) => a.sort - b.sort)
  }, [menu, filter, query])

  const categoryName = id =>
    menu.categories.find(category => category.id === id)?.name || 'بدون دسته'

  const categoryCounts = useMemo(() => {
    const counts = Object.fromEntries(menu.categories.map(category => [category.id, 0]))

    menu.items.forEach(item => {
      if (counts[item.categoryId] !== undefined) counts[item.categoryId] += 1
    })

    return counts
  }, [menu])

  const updateItem = (id, patch) => {
    setMenu(current => ({
      ...current,
      items: current.items.map(item =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }))
  }

  const addItem = () => {
    const preferredCategory =
      filter !== 'all' && menu.categories.some(category => category.id === filter)
        ? filter
        : menu.categories[0]?.id || ''

    const item = {
      id: uid(),
      categoryId: preferredCategory,
      name: 'آیتم جدید',
      description: 'توضیحات آیتم را وارد کنید',
      price: 0,
      image: '',
      featured: false,
      available: true,
      sort: menu.items.length + 1,
    }

    setMenu(current => ({
      ...current,
      items: [item, ...current.items],
    }))
    setSelected(item)
    setStatus('آیتم جدید اضافه شد؛ ذخیره را بزنید')
  }

  const removeItem = id => {
    if (!window.confirm('این آیتم حذف شود؟')) return

    setMenu(current => ({
      ...current,
      items: current.items.filter(item => item.id !== id),
    }))

    if (selected?.id === id) setSelected(null)
    setStatus('آیتم حذف شد؛ ذخیره را بزنید')
  }

  const addCategory = event => {
    event?.preventDefault()

    const name = newCategoryName.trim()
    if (!name) {
      setCategoryError('نام دسته‌بندی را وارد کنید.')
      return
    }

    const duplicate = menu.categories.some(
      category => category.name.trim().toLocaleLowerCase('fa-IR') === name.toLocaleLowerCase('fa-IR'),
    )

    if (duplicate) {
      setCategoryError('این دسته‌بندی از قبل وجود دارد.')
      return
    }

    const category = {
      id: uid('category'),
      name,
      sort: Math.max(0, ...menu.categories.map(item => Number(item.sort) || 0)) + 1,
    }

    setMenu(current => ({
      ...current,
      categories: categorySort([...current.categories, category]),
    }))
    setNewCategoryName('')
    setCategoryError('')
    setFilter(category.id)
    setStatus(`دسته «${name}» ساخته شد؛ ذخیره را بزنید`)
  }

  const renameCategory = (id, name) => {
    const value = name.trim()
    if (!value) {
      setCategoryError('نام دسته‌بندی نمی‌تواند خالی باشد.')
      return
    }

    const duplicate = menu.categories.some(
      category =>
        category.id !== id &&
        category.name.trim().toLocaleLowerCase('fa-IR') === value.toLocaleLowerCase('fa-IR'),
    )

    if (duplicate) {
      setCategoryError('نام واردشده تکراری است.')
      return
    }

    setMenu(current => ({
      ...current,
      categories: current.categories.map(category =>
        category.id === id ? { ...category, name: value } : category,
      ),
    }))
    setCategoryError('')
    setStatus('نام دسته‌بندی تغییر کرد؛ ذخیره را بزنید')
  }

  const deleteCategory = id => {
    const category = menu.categories.find(item => item.id === id)
    if (!category) return

    const used = menu.items.some(item => item.categoryId === id)
    if (used) {
      setCategoryError(`دسته «${category.name}» آیتم دارد؛ ابتدا آیتم‌ها را به دسته دیگری منتقل کنید.`)
      return
    }

    if (!window.confirm(`دسته «${category.name}» حذف شود؟`)) return

    setMenu(current => ({
      ...current,
      categories: categorySort(current.categories.filter(item => item.id !== id))
        .map((item, index) => ({ ...item, sort: index + 1 })),
    }))
    if (filter === id) setFilter('all')
    setCategoryError('')
    setStatus('دسته‌بندی حذف شد؛ ذخیره را بزنید')
  }

  const save = async () => {
    setSaving(true)
    setStatus('در حال ذخیره…')

    try {
      const response = await fetch('/api/content', {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({
          ...menu,
          categories: categorySort(menu.categories).map((category, index) => ({
            ...category,
            sort: index + 1,
          })),
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'save failed')
      }

      const data = await response.json()
      setMenu(current => ({
        ...current,
        categories: categorySort(current.categories).map((category, index) => ({
          ...category,
          sort: index + 1,
        })),
        updatedAt: data.updatedAt,
      }))
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
        <div className="loading-logo"><Utensils size={20} /></div>
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
            <span>محتوا و دسته‌بندی‌ها</span>
          </div>
        </div>

        <div className="nav-group">
          <span className="nav-label">مدیریت</span>
          <button className="nav-item active">
            <Utensils size={16} />
            آیتم‌های منو
          </button>
        </div>

        <div className="sidebar-bottom">
          <div className="status-card">
            <div className="status-head">
              <span>وضعیت</span>
              <span
                className={
                  status?.includes('خطا') || status?.includes('نشد')
                    ? 'status-dot error'
                    : 'status-dot'
                }
              />
            </div>
            <strong>{status || 'آماده'}</strong>
            <small>منبع داده: content/menu.json</small>
          </div>

          <a className="public-menu-link" href={PUBLIC_MENU_URL}>
            <Eye size={16} />
            مشاهده منو
          </a>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">مدیریت منو</span>
            <h1>آیتم‌ها و دسته‌بندی‌ها</h1>
            <p>ساختار منو را مدیریت کنید؛ هر آیتم می‌تواند به هر دسته‌ای متصل شود.</p>
          </div>

          <div className="top-actions">
            <button className="ghost" onClick={load} disabled={saving}>
              <RefreshCw size={16} />
              تازه‌سازی
            </button>
            <button className="save" disabled={saving} onClick={save}>
              <Save size={16} />
              {saving ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
            </button>
          </div>
        </header>

        <section className="stats">
          <div className="stat-card">
            <span>کل آیتم‌ها</span>
            <strong>{menu.items.length.toLocaleString('fa-IR')}</strong>
            <small>ثبت‌شده در منو</small>
          </div>
          <div className="stat-card">
            <span>قابل نمایش</span>
            <strong>
              {menu.items.filter(item => item.available !== false).length.toLocaleString('fa-IR')}
            </strong>
            <small>در منوی عمومی</small>
          </div>
          <div className="stat-card">
            <span>دسته‌ها</span>
            <strong>{menu.categories.length.toLocaleString('fa-IR')}</strong>
            <small>قابل انتخاب برای آیتم‌ها</small>
          </div>
        </section>

        <section className="content-toolbar">
          <div className="toolbar-title">
            <span>آیتم‌های منو</span>
            <strong>{items.length.toLocaleString('fa-IR')} نتیجه</strong>
          </div>

          <div className="category-tabs" role="tablist" aria-label="دسته‌بندی‌ها">
            <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>
              همه
            </button>

            {categorySort(menu.categories).map(category => (
              <button
                key={category.id}
                className={filter === category.id ? 'on' : ''}
                onClick={() => setFilter(category.id)}
              >
                {category.name}
                <span>{(categoryCounts[category.id] || 0).toLocaleString('fa-IR')}</span>
              </button>
            ))}
          </div>

          <label className="search">
            <Search size={16} />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="جست‌وجوی آیتم…"
              aria-label="جست‌وجوی آیتم"
            />
          </label>

          <div className="toolbar-actions">
            <button className="secondary-action" onClick={() => {
              setCategoryError('')
              setCategoryManagerOpen(true)
            }}>
              <FolderPlus size={16} />
              دسته جدید
            </button>

            <button className="add" onClick={addItem}>
              <Plus size={17} />
              افزودن آیتم
            </button>
          </div>
        </section>

        {items.length > 0 ? (
          <section className="items-list">
            {items.map((item, index) => (
              <article
                className="item-row"
                key={item.id}
                style={{ '--row-index': index }}
              >
                <div className="thumb">
                  {item.image ? (
                    <img
                      src={imgUrl(item.image)}
                      alt=""
                      loading={index < 3 ? 'eager' : 'lazy'}
                    />
                  ) : (
                    <ImageIcon size={21} />
                  )}
                </div>

                <div className="item-main">
                  <div className="item-head">
                    <h2>{item.name}</h2>
                    <span className="cat">{categoryName(item.categoryId)}</span>
                  </div>
                  <p>{item.description || 'بدون توضیحات'}</p>
                  <div className="meta">
                    <strong>{money(item.price)} {menu.currency}</strong>
                    <span className={item.available !== false ? 'available' : 'unavailable'}>
                      {item.available !== false ? 'در منو' : 'پنهان'}
                    </span>
                  </div>
                </div>

                <div className="row-actions">
                  <button onClick={() => setSelected(item)}>
                    <Pencil size={15} />
                    ویرایش
                  </button>
                  <button className="danger" onClick={() => removeItem(item.id)}>
                    <Trash2 size={15} />
                    حذف
                  </button>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <div className="empty-admin">
            <div><AlertCircle size={20} /></div>
            <strong>آیتمی پیدا نشد</strong>
            <span>فیلتر یا عبارت جست‌وجو را تغییر دهید.</span>
          </div>
        )}

        <div className="mobile-actions">
          <button onClick={save} disabled={saving}>
            <Save size={17} />
            ذخیره تغییرات
          </button>
        </div>
      </main>

      {selected && (
        <Drawer
          item={selected}
          categories={categorySort(menu.categories)}
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

      {categoryManagerOpen && (
        <CategoryManager
          categories={categorySort(menu.categories)}
          categoryCounts={categoryCounts}
          newCategoryName={newCategoryName}
          setNewCategoryName={value => {
            setNewCategoryName(value)
            if (categoryError) setCategoryError('')
          }}
          error={categoryError}
          onAdd={addCategory}
          onRename={renameCategory}
          onDelete={deleteCategory}
          onClose={() => {
            setCategoryManagerOpen(false)
            setCategoryError('')
            setNewCategoryName('')
          }}
        />
      )}
    </div>
  )
}

function Drawer({ item, categories, onClose, onChange, onUpload, onRemoveImage }) {
  const [local, setLocal] = useState(item)

  useEffect(() => {
    setLocal(item)
  }, [item.id])

  const patch = value => {
    setLocal(current => ({ ...current, ...value }))
    onChange(value)
  }

  return (
    <div
      className="drawer-backdrop"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="ویرایش آیتم">
        <div className="drawer-head">
          <div>
            <span className="eyebrow">ویرایش آیتم</span>
            <h2>جزئیات</h2>
          </div>

          <button className="drawer-close" onClick={onClose} aria-label="بستن">
            <X size={18} />
          </button>
        </div>

        <div className="form">
          <label>
            نام آیتم
            <input
              value={local.name}
              onChange={event => patch({ name: event.target.value })}
            />
          </label>

          <div className="split">
            <label>
              دسته
              <select
                value={local.categoryId}
                onChange={event => patch({ categoryId: event.target.value })}
              >
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              قیمت
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={local.price}
                onChange={event => patch({ price: Number(event.target.value) })}
              />
            </label>
          </div>

          <label>
            توضیحات
            <textarea
              rows="4"
              value={local.description}
              onChange={event => patch({ description: event.target.value })}
            />
          </label>

          <div className="setting-grid single">
            <button
              className={local.available !== false ? 'toggle active' : 'toggle'}
              onClick={() => patch({ available: local.available === false })}
            >
              {local.available !== false ? <Eye size={16} /> : <EyeOff size={16} />}
              {local.available !== false ? 'نمایش در منو' : 'پنهان از منو'}
            </button>
          </div>

          <div className="image-box">
            <div className="image-box-head">
              <span>تصویر آیتم</span>
              {local.image && (
                <button className="link-danger" onClick={() => onRemoveImage(local.id)}>
                  حذف تصویر
                </button>
              )}
            </div>

            {local.image ? (
              <img src={imgUrl(local.image)} alt="" />
            ) : (
              <div className="empty-image">
                <ImageIcon size={29} />
                <span>برای این آیتم تصویری ثبت نشده است.</span>
              </div>
            )}

            <label className="upload">
              <Upload size={16} />
              {local.image ? 'جایگزینی تصویر' : 'بارگذاری تصویر'}
              <input
                type="file"
                accept="image/*"
                onChange={event => {
                  onUpload(event.target.files?.[0], local.id)
                  event.target.value = ''
                }}
              />
            </label>

            <small>
              تصویر در مرورگر به WebP فشرده می‌شود تا منو سبک بماند.
            </small>
          </div>
        </div>

        <div className="drawer-footer">
          <button className="full" onClick={onClose}>
            <Check size={16} />
            پایان ویرایش
          </button>
        </div>
      </aside>
    </div>
  )
}

function CategoryManager({
  categories,
  categoryCounts,
  newCategoryName,
  setNewCategoryName,
  error,
  onAdd,
  onRename,
  onDelete,
  onClose,
}) {
  const [draftNames, setDraftNames] = useState(
    Object.fromEntries(categories.map(category => [category.id, category.name])),
  )

  useEffect(() => {
    setDraftNames(
      Object.fromEntries(categories.map(category => [category.id, category.name])),
    )
  }, [categories])

  const commitRename = id => {
    const value = draftNames[id] ?? ''
    if (value.trim() && value.trim() !== categories.find(category => category.id === id)?.name) {
      onRename(id, value)
    }
  }

  return (
    <div
      className="manager-backdrop"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="category-manager" role="dialog" aria-modal="true" aria-label="مدیریت دسته‌بندی‌ها">
        <header className="manager-head">
          <div>
            <span className="eyebrow">ساختار منو</span>
            <h2>دسته‌بندی‌ها</h2>
            <p>دسته جدید بسازید، نام دسته‌ها را تغییر دهید یا دسته خالی را حذف کنید.</p>
          </div>

          <button className="drawer-close" onClick={onClose} aria-label="بستن">
            <X size={18} />
          </button>
        </header>

        <form className="category-create" onSubmit={onAdd}>
          <input
            value={newCategoryName}
            onChange={event => setNewCategoryName(event.target.value)}
            placeholder="مثلاً قهوه سرد"
            aria-label="نام دسته جدید"
          />
          <button type="submit">
            <Plus size={16} />
            ایجاد دسته
          </button>
        </form>

        {error && <div className="category-error">{error}</div>}

        <div className="category-list">
          {categories.map(category => (
            <div className="category-row" key={category.id}>
              <div className="category-row-meta">
                <span className="category-index">
                  {String(category.sort).padStart(2, '0')}
                </span>
                <span className="category-count">
                  {(categoryCounts[category.id] || 0).toLocaleString('fa-IR')} آیتم
                </span>
              </div>

              <input
                value={draftNames[category.id] ?? ''}
                onChange={event =>
                  setDraftNames(current => ({
                    ...current,
                    [category.id]: event.target.value,
                  }))
                }
                onBlur={() => commitRename(category.id)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    event.currentTarget.blur()
                  }
                }}
                aria-label={`نام ${category.name}`}
              />

              <button
                className="category-delete"
                onClick={() => onDelete(category.id)}
                disabled={(categoryCounts[category.id] || 0) > 0}
                title={
                  (categoryCounts[category.id] || 0) > 0
                    ? 'ابتدا آیتم‌های این دسته را منتقل کنید'
                    : 'حذف دسته'
                }
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        <footer className="manager-footer">
          <span>تغییرات دسته‌بندی همراه با «ذخیره تغییرات» به مخزن ارسال می‌شود.</span>
          <button type="button" onClick={onClose}>
            بستن
          </button>
        </footer>
      </section>
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
