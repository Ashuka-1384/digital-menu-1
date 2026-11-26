import React, { useCallback, useEffect, useState } from 'react'
import { ArrowRightLeft, ChevronDown, ChevronUp, ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react'
import { BUCKET, explainError, loadMenuData, storagePathFromUrl, supabase, uid } from './supabase'

const toLatin = s =>
  String(s ?? '')
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[٬,،\s]/g, '')

const bySort = (a, b) => Number(a.sort || 0) - Number(b.sort || 0)

// کوچک کردن عکس و تبدیل به WebP قبل از آپلود
async function compressImage(file) {
  try {
    const bitmap = await createImageBitmap(file)
    const max = 1200
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise(res => canvas.toBlob(res, 'image/webp', 0.82))
    return blob || file
  } catch {
    return file
  }
}

async function uploadImage(file) {
  const blob = await compressImage(file)
  const ext = blob.type === 'image/webp' ? 'webp' : (file.name.split('.').pop() || 'jpg')
  const path = `${uid()}.${ext}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false })
  if (error) throw error
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

async function removeImage(url) {
  const path = storagePathFromUrl(url)
  if (path) await supabase.storage.from(BUCKET).remove([path])
}

const itemRow = (it, sort) => ({
  id: it.id,
  category_id: it.categoryId,
  name: it.name,
  description: it.description || '',
  price: it.price || 0,
  image_url: it.image || '',
  available: it.available !== false,
  sort,
})

export default function Admin({ onClose, onLock, onChanged }) {
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('items')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // آیتم در حال ویرایش/افزودن
  const [moving, setMoving] = useState(null) // آیتم در حال انتقال به دسته دیگر

  const reload = useCallback(async () => {
    try {
      setData(await loadMenuData())
    } catch (e) {
      setError(explainError(e))
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  // اجرای یک عملیات، سپس تازه‌سازی
  const run = async fn => {
    setBusy(true)
    setError('')
    try {
      await fn()
      await reload()
      onChanged?.()
    } catch (e) {
      setError(explainError(e))
    } finally {
      setBusy(false)
    }
  }

  if (!data) {
    return (
      <div className="adm-backdrop">
        <div className="adm-panel adm-center">
          <p className="adm-pre">{error || 'در حال بارگذاری…'}</p>
          {error && <button type="button" className="adm-secondary" onClick={onClose}>بستن</button>}
        </div>
      </div>
    )
  }

  const categories = [...data.categories].sort(bySort)
  const itemsOf = catId => data.items.filter(i => i.categoryId === catId).sort(bySort)

  /* ---------- جابجایی ---------- */
  const moveCategory = (index, dir) =>
    run(async () => {
      const list = [...categories]
      const j = index + dir
      if (j < 0 || j >= list.length) return
      ;[list[index], list[j]] = [list[j], list[index]]
      const rows = list.map((c, i) => ({ id: c.id, name: c.name, sort: i + 1 }))
      const { error: e } = await supabase.from('categories').upsert(rows)
      if (e) throw e
    })

  const moveItem = (catId, index, dir) =>
    run(async () => {
      const list = [...itemsOf(catId)]
      const j = index + dir
      if (j < 0 || j >= list.length) return
      ;[list[index], list[j]] = [list[j], list[index]]
      const rows = list.map((it, i) => itemRow(it, i + 1))
      const { error: e } = await supabase.from('items').upsert(rows)
      if (e) throw e
    })

  /* ---------- دسته‌ها ---------- */
  const addCategory = name =>
    run(async () => {
      const { error: e } = await supabase
        .from('categories')
        .insert({ id: uid(), name, sort: categories.length + 1 })
      if (e) throw e
    })

  const renameCategory = (id, name) =>
    run(async () => {
      const { error: e } = await supabase.from('categories').update({ name }).eq('id', id)
      if (e) throw e
    })

  const deleteCategory = cat => {
    const items = itemsOf(cat.id)
    const msg = items.length
      ? `دسته «${cat.name}» و ${items.length} آیتم داخل آن حذف می‌شود. مطمئنید؟`
      : `دسته «${cat.name}» حذف شود؟`
    if (!window.confirm(msg)) return
    run(async () => {
      await Promise.all(items.map(i => removeImage(i.image)))
      const { error: e } = await supabase.from('categories').delete().eq('id', cat.id)
      if (e) throw e
    })
  }

  /* ---------- آیتم‌ها ---------- */
  const moveItemToCategory = (item, catId) => {
    setMoving(null)
    run(async () => {
      const target = itemsOf(catId)
      const sort = (target.length ? Math.max(...target.map(i => Number(i.sort || 0))) : 0) + 1
      const { error: e } = await supabase.from('items').upsert(itemRow({ ...item, categoryId: catId }, sort))
      if (e) throw e
    })
  }

  const deleteItem = item => {
    if (!window.confirm(`«${item.name}» حذف شود؟`)) return
    run(async () => {
      await removeImage(item.image)
      const { error: e } = await supabase.from('items').delete().eq('id', item.id)
      if (e) throw e
    })
  }

  const saveItem = (form, newFile, imageRemoved) =>
    run(async () => {
      let image = form.image
      if (newFile) {
        const url = await uploadImage(newFile)
        if (form.image) await removeImage(form.image)
        image = url
      } else if (imageRemoved) {
        if (form.image) await removeImage(form.image)
        image = ''
      }
      const isNew = !form.id
      const existing = data.items.find(i => i.id === form.id)
      let sort = existing?.sort
      if (isNew || existing.categoryId !== form.categoryId) {
        const target = itemsOf(form.categoryId)
        sort = (target.length ? Math.max(...target.map(i => Number(i.sort || 0))) : 0) + 1
      }
      const row = itemRow({ ...form, id: form.id || uid(), image }, sort)
      const { error: e } = await supabase.from('items').upsert(row)
      if (e) throw e
      setEditing(null)
    })

  return (
    <div className="adm-backdrop">
      <div className="adm-panel" dir="rtl">
        <header className="adm-head">
          <h2>مدیریت منو</h2>
          <div className="adm-head-actions">
            <button type="button" className="adm-link" onClick={onLock}>خروج</button>
            <button type="button" className="adm-icon" onClick={onClose} aria-label="بستن">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="adm-tabs">
          <button type="button" className={tab === 'items' ? 'on' : ''} onClick={() => setTab('items')}>
            آیتم‌ها
          </button>
          <button type="button" className={tab === 'cats' ? 'on' : ''} onClick={() => setTab('cats')}>
            دسته‌بندی‌ها
          </button>
        </div>

        {error && <div className="adm-error">{error}</div>}

        <div className={busy ? 'adm-body is-busy' : 'adm-body'}>
          {tab === 'cats' ? (
            <CategoriesTab
              categories={categories}
              countOf={id => itemsOf(id).length}
              onAdd={addCategory}
              onRename={renameCategory}
              onDelete={deleteCategory}
              onMove={moveCategory}
            />
          ) : (
            <>
              {categories.length === 0 && (
                <p className="adm-hint">ابتدا از تب «دسته‌بندی‌ها» یک دسته بسازید.</p>
              )}
              {categories.map(cat => {
                const list = itemsOf(cat.id)
                return (
                  <section className="adm-group" key={cat.id}>
                    <div className="adm-group-head">
                      <h3>{cat.name}</h3>
                      <button
                        type="button"
                        className="adm-add"
                        onClick={() =>
                          setEditing({
                            id: '', categoryId: cat.id, name: '', description: '',
                            price: '', image: '', available: true,
                          })
                        }
                      >
                        <Plus size={15} /> آیتم جدید
                      </button>
                    </div>

                    {list.length === 0 && <p className="adm-hint">آیتمی ندارد.</p>}

                    {list.map((item, idx) => (
                      <div className={item.available ? 'adm-row' : 'adm-row off'} key={item.id}>
                        <div className="adm-thumb">
                          {item.image ? <img src={item.image} alt="" /> : <span />}
                        </div>
                        <div className="adm-row-main">
                          <strong>{item.name}</strong>
                          <small>
                            {Number(item.price).toLocaleString('fa-IR')} {data.currency}
                            {!item.available && ' · مخفی'}
                          </small>
                        </div>
                        <div className="adm-row-actions">
                          <button type="button" disabled={idx === 0} onClick={() => moveItem(cat.id, idx, -1)} aria-label="بالا">
                            <ChevronUp size={17} />
                          </button>
                          <button type="button" disabled={idx === list.length - 1} onClick={() => moveItem(cat.id, idx, 1)} aria-label="پایین">
                            <ChevronDown size={17} />
                          </button>
                          <button type="button" disabled={categories.length < 2} onClick={() => setMoving(item)} aria-label="انتقال به دسته دیگر" title="انتقال به دسته دیگر">
                            <ArrowRightLeft size={16} />
                          </button>
                          <button type="button" onClick={() => setEditing({ ...item })} aria-label="ویرایش">
                            <Pencil size={16} />
                          </button>
                          <button type="button" className="danger" onClick={() => deleteItem(item)} aria-label="حذف">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </section>
                )
              })}
            </>
          )}
        </div>
      </div>

      {moving && (
        <div className="adm-backdrop adm-over" onMouseDown={e => e.target === e.currentTarget && setMoving(null)}>
          <div className="adm-login" dir="rtl">
            <h2>انتقال «{moving.name}»</h2>
            <p className="adm-hint">به کدام دسته منتقل شود؟</p>
            <div className="adm-movelist">
              {categories.filter(c => c.id !== moving.categoryId).map(c => (
                <button type="button" key={c.id} onClick={() => moveItemToCategory(moving, c.id)}>
                  {c.name}
                </button>
              ))}
            </div>
            <div className="adm-foot">
              <button type="button" className="adm-secondary" onClick={() => setMoving(null)}>انصراف</button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <ItemForm
          initial={editing}
          categories={categories}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSave={saveItem}
        />
      )}
    </div>
  )
}

function CategoriesTab({ categories, countOf, onAdd, onRename, onDelete, onMove }) {
  const [name, setName] = useState('')
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')

  return (
    <div>
      <div className="adm-newcat">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="نام دسته جدید"
          onKeyDown={e => {
            if (e.key === 'Enter' && name.trim()) { onAdd(name.trim()); setName('') }
          }}
        />
        <button
          type="button"
          className="adm-primary"
          disabled={!name.trim()}
          onClick={() => { onAdd(name.trim()); setName('') }}
        >
          افزودن
        </button>
      </div>

      {categories.map((cat, idx) => (
        <div className="adm-row" key={cat.id}>
          <div className="adm-row-main">
            {editId === cat.id ? (
              <input
                autoFocus
                className="adm-inline"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && editName.trim()) { onRename(cat.id, editName.trim()); setEditId(null) }
                  if (e.key === 'Escape') setEditId(null)
                }}
                onBlur={() => {
                  if (editName.trim() && editName.trim() !== cat.name) onRename(cat.id, editName.trim())
                  setEditId(null)
                }}
              />
            ) : (
              <>
                <strong>{cat.name}</strong>
                <small>{countOf(cat.id).toLocaleString('fa-IR')} آیتم</small>
              </>
            )}
          </div>
          <div className="adm-row-actions">
            <button type="button" disabled={idx === 0} onClick={() => onMove(idx, -1)} aria-label="بالا">
              <ChevronUp size={17} />
            </button>
            <button type="button" disabled={idx === categories.length - 1} onClick={() => onMove(idx, 1)} aria-label="پایین">
              <ChevronDown size={17} />
            </button>
            <button type="button" onClick={() => { setEditId(cat.id); setEditName(cat.name) }} aria-label="تغییر نام">
              <Pencil size={16} />
            </button>
            <button type="button" className="danger" onClick={() => onDelete(cat)} aria-label="حذف">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function ItemForm({ initial, categories, busy, onCancel, onSave }) {
  const [form, setForm] = useState({ ...initial, price: initial.price === '' ? '' : String(initial.price) })
  const [file, setFile] = useState(null)
  const [removed, setRemoved] = useState(false)
  const [preview, setPreview] = useState('')

  useEffect(() => {
    if (!file) { setPreview(''); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const shownImage = preview || (removed ? '' : form.image)
  const valid = form.name.trim() && form.categoryId

  const submit = () => {
    if (!valid) return
    onSave(
      { ...form, name: form.name.trim(), price: Number(toLatin(form.price)) || 0 },
      file,
      removed,
    )
  }

  return (
    <div className="adm-backdrop adm-over">
      <div className="adm-form" dir="rtl">
        <header className="adm-head">
          <h2>{form.id ? 'ویرایش آیتم' : 'آیتم جدید'}</h2>
          <button type="button" className="adm-icon" onClick={onCancel} aria-label="بستن">
            <X size={18} />
          </button>
        </header>

        <div className="adm-form-body">
          <div className="adm-photo">
            <div className="adm-photo-box">
              {shownImage ? <img src={shownImage} alt="" /> : <ImagePlus size={28} />}
            </div>
            <div className="adm-photo-actions">
              <label className="adm-secondary">
                {shownImage ? 'تغییر عکس' : 'افزودن عکس'}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) { setFile(f); setRemoved(false) }
                    e.target.value = ''
                  }}
                />
              </label>
              {shownImage && (
                <button
                  type="button"
                  className="adm-secondary danger"
                  onClick={() => { setFile(null); setRemoved(true) }}
                >
                  حذف عکس
                </button>
              )}
            </div>
          </div>

          <label className="adm-field">
            <span>نام</span>
            <input value={form.name} onChange={e => set('name', e.target.value)} />
          </label>

          <label className="adm-field">
            <span>توضیحات</span>
            <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
          </label>

          <div className="adm-two">
            <label className="adm-field">
              <span>قیمت (تومان)</span>
              <input
                inputMode="numeric"
                value={form.price}
                onChange={e => set('price', e.target.value)}
              />
            </label>
            <label className="adm-field">
              <span>دسته</span>
              <select value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="adm-check">
            <input
              type="checkbox"
              checked={form.available}
              onChange={e => set('available', e.target.checked)}
            />
            <span>نمایش در منو</span>
          </label>
        </div>

        <footer className="adm-foot">
          <button type="button" className="adm-secondary" onClick={onCancel}>انصراف</button>
          <button type="button" className="adm-primary" disabled={!valid || busy} onClick={submit}>
            {busy ? 'در حال ذخیره…' : 'ذخیره'}
          </button>
        </footer>
      </div>
    </div>
  )
}
