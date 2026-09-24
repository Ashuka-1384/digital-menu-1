import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowUpLeft,
  ChevronDown,
  Clock3,
  Instagram,
  Phone,
  Search,
  Sparkles,
  Utensils,
  X,
} from 'lucide-react'
import './styles.css'
import { CONTENT_RAW_BASE } from './site-config'

const FALLBACK = '/fallback-menu.json'
const MENU_API = '/api/menu'
const RAW_BASE = CONTENT_RAW_BASE.replace(/\/$/, '')
const CACHE_KEY = 'digital-menu-cache-v4'
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

    const applyMenu = (next) => {
      if (!next?.items || !next?.categories || !next?.restaurant) {
        throw new Error('Invalid menu payload')
      }
      if (!alive) return
      setMenu(next)
      setLoading(false)
      writeCachedMenu(next)
    }

    const refresh = async () => {
      const now = Date.now()
      if (inFlight || now - lastRefreshAt < MIN_REFRESH_GAP) return inFlight
      lastRefreshAt = now

      inFlight = (async () => {
        try {
          const fresh = await fetchJson(MENU_API)
          applyMenu(fresh)
          return true
        } catch (apiError) {
          console.warn('Menu API refresh failed:', apiError)

          if (!RAW_BASE) {
            try {
              applyMenu(await fetchJson(FALLBACK))
              return true
            } catch {
              return false
            }
          }

          try {
            applyMenu(await fetchJson(`${RAW_BASE}/menu.json?ts=${Date.now()}`))
            return true
          } catch (rawError) {
            console.warn('Raw content fallback failed:', rawError)
            if (!menu) {
              try {
                applyMenu(await fetchJson(FALLBACK))
                return true
              } catch {
                return false
              }
            }
            return false
          }
        } finally {
          inFlight = null
        }
      })()

      return inFlight
    }

    const cached = readCachedMenu()
    if (cached) {
      setMenu(cached)
      setLoading(false)
    }

    refresh()

    const onFocus = () => refresh()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      alive = false
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  useEffect(() => {
    if (!selectedItem) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setSelectedItem(null)
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.classList.add('modal-open')
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.classList.remove('modal-open')
    }
  }, [selectedItem])

  const categories = useMemo(
    () => (menu
      ? [{ id: 'all', name: 'همه' }, ...[...menu.categories].sort((a, b) => a.sort - b.sort)]
      : []),
    [menu],
  )

  const allAvailableItems = useMemo(() => {
    if (!menu) return []
    return [...menu.items]
      .filter(item => item.available !== false)
      .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || a.sort - b.sort)
  }, [menu])

  const visibleItems = useMemo(() => {
    if (!menu) return []
    const term = query.trim().toLocaleLowerCase('fa-IR')
    return allAvailableItems.filter((item) => {
      const matchesCategory = active === 'all' || item.categoryId === active
      const searchable = `${item.name} ${item.description}`.toLocaleLowerCase('fa-IR')
      return matchesCategory && (!term || searchable.includes(term))
    })
  }, [menu, active, query, allAvailableItems])

  const categoryCounts = useMemo(() => {
    if (!menu) return {}
    return allAvailableItems.reduce((acc, item) => {
      acc[item.categoryId] = (acc[item.categoryId] || 0) + 1
      return acc
    }, {})
  }, [menu, allAvailableItems])

  const featuredItem = useMemo(
    () => allAvailableItems.find(item => item.featured) || allAvailableItems[0],
    [allAvailableItems],
  )

  if (loading) {
    return (
      <div className="loading-shell">
        <div className="loading-mark"><Utensils size={22} /></div>
        <span>در حال آماده‌سازی منو…</span>
      </div>
    )
  }

  if (!menu) {
    return <div className="loading-shell">منو در دسترس نیست.</div>
  }

  const activeCategoryName = categories.find(c => c.id === active)?.name || 'همه'
  const introTitle = active === 'all' ? 'انتخاب‌های امروز' : activeCategoryName
  const totalItems = allAvailableItems.length

  return (
    <div className="site-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="menu-header page-width">
        <div className="header-bar">
          <div className="header-mark" aria-hidden="true"><Utensils size={18} /></div>
          <div className="header-meta">
            <span>منو</span>
            <span className="header-dot" />
            <span>{totalItems.toLocaleString('fa-IR')} انتخاب</span>
          </div>
          <button
            className="icon-button header-search-trigger"
            type="button"
            onClick={() => searchInputRef.current?.focus()}
            aria-label="باز کردن جست‌وجو"
          >
            <Search size={20} />
          </button>
        </div>

        <div className="hero-block">
          <div className="hero-copy">
            <span className="hero-kicker"><Sparkles size={15} /> منوی دیجیتال</span>
            <h1>منو</h1>
            {menu.restaurant.tagline && <p>{menu.restaurant.tagline}</p>}
          </div>
          <div className="hero-badge">
            <span>انتخاب کن</span>
            <ArrowUpLeft size={18} />
          </div>
        </div>
      </header>

      <main className="page-width">
        {featuredItem && active === 'all' && !query && (
          <section className="featured-panel" aria-label="پیشنهاد ویژه">
            <button className="featured-link" type="button" onClick={() => setSelectedItem(featuredItem)}>
              <div className="featured-image">
                {featuredItem.image ? (
                  <img src={imageUrl(featuredItem.image)} alt="" loading="eager" decoding="async" fetchPriority="high" />
                ) : (
                  <div className="placeholder-art featured-placeholder"><span>01</span><Utensils size={28} /></div>
                )}
              </div>
              <div className="featured-copy">
                <span className="micro-label">پیشنهاد ویژه</span>
                <div className="featured-title-row">
                  <h2>{featuredItem.name}</h2>
                  <strong>{formatPrice(featuredItem.price, menu.currency)}</strong>
                </div>
                <p>{featuredItem.description}</p>
                <span className="text-link">مشاهده جزئیات <ArrowUpLeft size={16} /></span>
              </div>
            </button>
          </section>
        )}

        <section className="menu-toolbar" aria-label="فیلتر منو">
          <div className="search-shell">
            <Search size={18} />
            <input
              ref={searchInputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="جست‌وجوی غذا، نوشیدنی…"
              aria-label="جست‌وجوی آیتم"
              inputMode="search"
            />
            {query && (
              <button type="button" className="clear-search" onClick={() => setQuery('')} aria-label="پاک کردن جست‌وجو">
                <X size={16} />
              </button>
            )}
          </div>

          <div className="category-row" role="tablist" aria-label="دسته‌بندی‌ها">
            {categories.map(cat => (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={active === cat.id}
                className={active === cat.id ? 'category-chip active' : 'category-chip'}
                onClick={() => setActive(cat.id)}
              >
                <span>{cat.name}</span>
                <small>{cat.id === 'all' ? totalItems : (categoryCounts[cat.id] || 0)}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="section-heading">
          <div>
            <span className="section-overline">{query ? 'نتایج جست‌وجو' : 'انتخاب شما'}</span>
            <h2>{introTitle}</h2>
          </div>
          <span className="result-count">{visibleItems.length.toLocaleString('fa-IR')} آیتم</span>
        </section>

        {visibleItems.length > 0 ? (
          <section className="menu-grid">
            {visibleItems.map((item, index) => (
              <article
                className={`menu-card ${item.featured ? 'is-featured' : ''}`}
                key={item.id}
                style={{ '--card-index': index }}
              >
                <button type="button" className="card-button" onClick={() => setSelectedItem(item)}>
                  <div className="card-image-wrap">
                    {item.image ? (
                      <img
                        src={imageUrl(item.image)}
                        alt=""
                        loading={index < 2 ? 'eager' : 'lazy'}
                        decoding="async"
                        fetchPriority={index === 0 ? 'high' : 'auto'}
                      />
                    ) : (
                      <div className="placeholder-art">
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        <Utensils size={24} />
                      </div>
                    )}
                    {item.featured && <span className="featured-ribbon"><Sparkles size={13} /> ویژه</span>}
                    <span className="image-arrow"><ArrowUpLeft size={17} /></span>
                  </div>

                  <div className="card-content">
                    <div className="card-title-line">
                      <h3>{item.name}</h3>
                      <span className="price">{formatPrice(item.price, menu.currency)}</span>
                    </div>
                    <p>{item.description}</p>
                    <div className="card-footer">
                      <span className="detail-hint">جزئیات</span>
                      <span className="ready-state"><Clock3 size={14} /> آماده سرو</span>
                    </div>
                  </div>
                </button>
              </article>
            ))}
          </section>
        ) : (
          <div className="empty-state">
            <div className="empty-icon"><Search size={21} /></div>
            <strong>چیزی پیدا نشد</strong>
            <p>عبارت جست‌وجو یا دسته‌بندی دیگری را امتحان کنید.</p>
            <button type="button" onClick={() => { setQuery(''); setActive('all') }}>نمایش همه آیتم‌ها</button>
          </div>
        )}
      </main>

      <footer className="footer page-width">
        <div>
          <span className="footer-label">منوی دیجیتال</span>
          <p>{menu.restaurant.description || 'انتخاب آسان، سریع و بدون کاغذ.'}</p>
        </div>
        <div className="footer-actions">
          {menu.restaurant.phone && (
            <a href={`tel:${menu.restaurant.phone}`}>
              <Phone size={17} /> تماس
            </a>
          )}
          {menu.restaurant.instagram && (
            <a href={menu.restaurant.instagram} target="_blank" rel="noreferrer">
              <Instagram size={17} /> اینستاگرام <ArrowUpLeft size={15} />
            </a>
          )}
        </div>
      </footer>

      {selectedItem && (
        <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedItem(null) }}>
          <article className="item-modal" role="dialog" aria-modal="true" aria-label={selectedItem.name}>
            <button type="button" className="modal-close" onClick={() => setSelectedItem(null)} aria-label="بستن">
              <X size={20} />
            </button>
            <div className="modal-image">
              {selectedItem.image ? (
                <img src={imageUrl(selectedItem.image)} alt="" decoding="async" />
              ) : (
                <div className="placeholder-art modal-placeholder"><span>منو</span><Utensils size={34} /></div>
              )}
            </div>
            <div className="modal-content">
              <div className="modal-topline">
                <span>{selectedItem.featured ? 'پیشنهاد ویژه' : 'انتخاب شما'}</span>
                <strong>{formatPrice(selectedItem.price, menu.currency)}</strong>
              </div>
              <h2>{selectedItem.name}</h2>
              <p>{selectedItem.description}</p>
              <button type="button" className="modal-done" onClick={() => setSelectedItem(null)}>
                بستن جزئیات <ChevronDown size={17} />
              </button>
            </div>
          </article>
        </div>
      )}
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
