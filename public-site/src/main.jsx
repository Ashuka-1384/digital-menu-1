import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowUpLeft,
  ChevronDown,
  Instagram,
  Phone,
  Search,
  Utensils,
  X,
} from 'lucide-react'
import './styles.css'
import { CONTENT_RAW_BASE } from './site-config'

const FALLBACK = '/fallback-menu.json'
const MENU_API = '/api/menu'
const RAW_BASE = CONTENT_RAW_BASE.replace(/\/$/, '')
const CACHE_KEY = 'digital-menu-cache-v5'
const REQUEST_TIMEOUT = 4000
const MIN_REFRESH_GAP = 3000

function formatPrice(value, currency = 'تومان') {
  return `${Number(value || 0).toLocaleString('fa-IR')} ${currency}`
}

function imageUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  const clean = String(path).replace(/^\//, '').replace(/^content\//, '')
  return RAW_BASE ? `${RAW_BASE}/${clean}` : `/content/${clean}`
}

function readCachedMenu() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.data?.items && parsed?.data?.categories ? parsed.data : null
  } catch {
    return null
  }
}

function writeCachedMenu(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }))
  } catch {
    // Local storage can be unavailable in private/restricted browsers.
  }
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json', ...(options.headers || {}) },
      ...options,
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json()
  } finally {
    window.clearTimeout(timer)
  }
}

function App() {
  const [menu, setMenu] = useState(null)
  const [active, setActive] = useState('all')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState(null)
  const searchInputRef = useRef(null)

  useEffect(() => {
    let alive = true
    let lastRefreshAt = 0
    let inFlight = null

    const applyMenu = next => {
      if (!next?.items || !next?.categories || !next?.restaurant) throw new Error('Invalid menu payload')
      if (!alive) return
      setMenu(next)
      setLoading(false)
      writeCachedMenu(next)
    }

    const refresh = async () => {
      const now = Date.now()
      if (inFlight || now - lastRefreshAt < MIN_REFRESH_GAP) return
      lastRefreshAt = now
      inFlight = (async () => {
        try {
          const response = await fetchJson(MENU_API, { cache: 'no-store' })
          applyMenu(response.data || response)
        } catch {
          try {
            const fallback = await fetchJson(FALLBACK, { cache: 'force-cache' })
            applyMenu(fallback.data || fallback)
          } catch {
            const cached = readCachedMenu()
            if (cached) applyMenu(cached)
            else if (alive) setLoading(false)
          }
        } finally {
          inFlight = null
        }
      })()
      await inFlight
    }

    const cached = readCachedMenu()
    if (cached) {
      setMenu(cached)
      setLoading(false)
    }

    refresh()
    const timer = window.setInterval(refresh, 60000)
    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [])

  const categories = useMemo(() => {
    if (!menu) return []
    return [
      { id: 'all', name: 'همه' },
      ...[...menu.categories].sort((a, b) => a.sort - b.sort),
    ]
  }, [menu])

  const categoryMap = useMemo(() => {
    if (!menu) return {}
    return Object.fromEntries(menu.categories.map(category => [category.id, category.name]))
  }, [menu])

  const allAvailableItems = useMemo(() => {
    if (!menu) return []
    return [...menu.items]
      .filter(item => item.available !== false)
      .sort((a, b) => a.sort - b.sort)
  }, [menu])

  const visibleItems = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('fa-IR')
    return allAvailableItems.filter(item => {
      const matchesCategory = active === 'all' || item.categoryId === active
      const searchable = `${item.name} ${item.description}`.toLocaleLowerCase('fa-IR')
      return matchesCategory && (!term || searchable.includes(term))
    })
  }, [active, query, allAvailableItems])

  const activeCategoryName = categories.find(category => category.id === active)?.name || 'همه'

  if (loading) {
    return (
      <div className="loading-shell">
        <div className="loading-line" />
        <span>در حال آماده‌سازی منو…</span>
      </div>
    )
  }

  if (!menu) {
    return <div className="loading-shell">منو در دسترس نیست.</div>
  }

  return (
    <div className="site-shell">
      <div className="page-width">
        <header className="topbar">
          <div className="topbar-title">منو</div>
          <button
            type="button"
            className="search-toggle"
            onClick={() => searchInputRef.current?.focus()}
            aria-label="جست‌وجو"
          >
            <Search size={19} />
          </button>
        </header>

        <section className="hero" aria-labelledby="menu-title">
          <div className="hero-rule" />
          <h1 id="menu-title">منو</h1>
          <p>{allAvailableItems.length.toLocaleString('fa-IR')} آیتم</p>
        </section>

        <main>
          <section className="controls" aria-label="جست‌وجو و دسته‌بندی">
            <label className="search-box">
              <Search size={18} />
              <input
                ref={searchInputRef}
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="جست‌وجو در منو"
                aria-label="جست‌وجو در منو"
                inputMode="search"
              />
              {query && (
                <button type="button" className="clear-search" onClick={() => setQuery('')} aria-label="پاک کردن جست‌وجو">
                  <X size={16} />
                </button>
              )}
            </label>

            <nav className="category-nav" aria-label="دسته‌بندی‌ها">
              {categories.map(category => (
                <button
                  key={category.id}
                  type="button"
                  className={active === category.id ? 'category-button active' : 'category-button'}
                  onClick={() => setActive(category.id)}
                  aria-pressed={active === category.id}
                >
                  {category.name}
                </button>
              ))}
            </nav>
          </section>

          <section className="section-head">
            <div>
              <span>{query ? 'نتایج جست‌وجو' : 'انتخاب‌ها'}</span>
              <h2>{query ? 'نتیجه‌های شما' : activeCategoryName}</h2>
            </div>
            <small>{visibleItems.length.toLocaleString('fa-IR')} آیتم</small>
          </section>

          {visibleItems.length > 0 ? (
            <section className="menu-list">
              {visibleItems.map((item, index) => (
                <article className="menu-card" key={item.id} style={{ '--card-index': index }}>
                  <button type="button" className="card-button" onClick={() => setSelectedItem(item)}>
                    <div className="card-image">
                      {item.image ? (
                        <img
                          src={imageUrl(item.image)}
                          alt=""
                          loading={index < 2 ? 'eager' : 'lazy'}
                          decoding="async"
                          fetchPriority={index === 0 ? 'high' : 'auto'}
                        />
                      ) : (
                        <div className="image-placeholder" aria-hidden="true">
                          <span>{String(index + 1).padStart(2, '0')}</span>
                        </div>
                      )}
                      <span className="image-link"><ArrowUpLeft size={16} /></span>
                    </div>

                    <div className="card-body">
                      <div className="card-topline">
                        <h3>{item.name}</h3>
                        <strong>{formatPrice(item.price, menu.currency)}</strong>
                      </div>
                      <p>{item.description}</p>
                      <span className="card-category">{categoryMap[item.categoryId] || 'منو'}</span>
                    </div>
                  </button>
                </article>
              ))}
            </section>
          ) : (
            <div className="empty-state">
              <div className="empty-mark"><Search size={19} /></div>
              <strong>موردی پیدا نشد</strong>
              <p>عبارت جست‌وجو یا دسته‌بندی دیگری را امتحان کنید.</p>
              <button type="button" onClick={() => { setQuery(''); setActive('all') }}>نمایش همه</button>
            </div>
          )}
        </main>

        {(menu.restaurant.phone || menu.restaurant.instagram) && (
          <footer className="footer">
            <span>منو</span>
            <div className="footer-actions">
              {menu.restaurant.phone && (
                <a href={`tel:${menu.restaurant.phone}`} aria-label="تماس">
                  <Phone size={17} />
                </a>
              )}
              {menu.restaurant.instagram && (
                <a href={menu.restaurant.instagram} target="_blank" rel="noreferrer" aria-label="اینستاگرام">
                  <Instagram size={17} />
                </a>
              )}
            </div>
          </footer>
        )}
      </div>

      {selectedItem && (
        <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedItem(null) }}>
          <article className="item-modal" role="dialog" aria-modal="true" aria-label={selectedItem.name}>
            <button type="button" className="modal-close" onClick={() => setSelectedItem(null)} aria-label="بستن">
              <X size={19} />
            </button>
            <div className="modal-image">
              {selectedItem.image ? (
                <img src={imageUrl(selectedItem.image)} alt="" decoding="async" />
              ) : (
                <div className="modal-placeholder"><Utensils size={28} /><span>منو</span></div>
              )}
            </div>
            <div className="modal-content">
              <span className="modal-category">{categoryMap[selectedItem.categoryId] || 'منو'}</span>
              <div className="modal-title-row">
                <h2>{selectedItem.name}</h2>
                <strong>{formatPrice(selectedItem.price, menu.currency)}</strong>
              </div>
              <p>{selectedItem.description}</p>
              <button type="button" className="modal-done" onClick={() => setSelectedItem(null)}>
                بستن <ChevronDown size={17} />
              </button>
            </div>
          </article>
        </div>
      )}
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
