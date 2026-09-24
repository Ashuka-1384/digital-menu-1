import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Instagram, Phone, X } from 'lucide-react'
import './styles.css'
import { CONTENT_RAW_BASE } from './site-config'

const FALLBACK = '/fallback-menu.json'
const MENU_API = '/api/menu'
const RAW_BASE = CONTENT_RAW_BASE.replace(/\/$/, '')
const CACHE_KEY = 'digital-menu-cache-v7'
const REQUEST_TIMEOUT = 4500
const MIN_REFRESH_GAP = 3000

function formatPrice(value, currency = 'تومان') {
  const numeric = Number(value || 0)
  return `${numeric.toLocaleString('fa-IR')} ${currency}`
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
    // localStorage is optional.
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
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState(null)
  const categoryRefs = useRef({})

  useEffect(() => {
    let alive = true
    let lastRefreshAt = 0
    let inFlight = null

    const applyMenu = next => {
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
    return [...menu.categories].sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0))
  }, [menu])

  const categoryMap = useMemo(() => {
    if (!menu) return {}
    return Object.fromEntries(menu.categories.map(category => [category.id, category.name]))
  }, [menu])

  const availableItems = useMemo(() => {
    if (!menu) return []
    return [...menu.items]
      .filter(item => item.available !== false)
      .sort((a, b) => {
        const bySort = Number(a.sort || 0) - Number(b.sort || 0)
        return bySort || String(a.name).localeCompare(String(b.name), 'fa')
      })
  }, [menu])

  const visibleItems = useMemo(() => {
    if (active === 'all') return availableItems
    return availableItems.filter(item => item.categoryId === active)
  }, [active, availableItems])

  const activeCategoryName =
    categories.find(category => category.id === active)?.name || 'همه'

  const selectCategory = id => {
    setActive(id)
    window.requestAnimationFrame(() => {
      categoryRefs.current[id]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }

  if (loading) {
    return (
      <div className="loading-shell" aria-live="polite">
        <div className="loading-ornament" aria-hidden="true">
          <span />
        </div>
      </div>
    )
  }

  if (!menu) {
    return <div className="loading-shell loading-error">منو در دسترس نیست.</div>
  }

  return (
    <div className="site-shell">
      <div className="menu-frame">
        <header className="menu-top" aria-hidden="true">
          <span className="top-line" />
          <span className="top-diamond" />
          <span className="top-line" />
        </header>

        <nav className="category-strip" aria-label="دسته‌بندی‌ها">
          <button
            type="button"
            className={active === 'all' ? 'category-chip active' : 'category-chip'}
            onClick={() => setActive('all')}
            aria-pressed={active === 'all'}
          >
            همه
          </button>

          {categories.map(category => (
            <button
              key={category.id}
              type="button"
              className={active === category.id ? 'category-chip active' : 'category-chip'}
              onClick={() => selectCategory(category.id)}
              aria-pressed={active === category.id}
            >
              {category.name}
            </button>
          ))}
        </nav>

        <main className="menu-content">
          {active === 'all' ? (
            categories.map(category => {
              const items = availableItems.filter(item => item.categoryId === category.id)
              if (!items.length) return null

              return (
                <section
                  className="menu-section"
                  key={category.id}
                  ref={node => {
                    categoryRefs.current[category.id] = node
                  }}
                >
                  <div className="section-title">
                    <span className="section-mark" aria-hidden="true" />
                    <h1>{category.name}</h1>
                    <span className="section-line" aria-hidden="true" />
                  </div>

                  <div className="menu-items">
                    {items.map((item, index) => (
                      <MenuItem
                        key={item.id}
                        item={item}
                        categoryName={category.name}
                        currency={menu.currency}
                        index={index}
                        onOpen={() => setSelectedItem(item)}
                      />
                    ))}
                  </div>
                </section>
              )
            })
          ) : (
            <section
              className="menu-section active-section"
              ref={node => {
                categoryRefs.current[active] = node
              }}
            >
              <div className="section-title">
                <span className="section-mark" aria-hidden="true" />
                <h1>{activeCategoryName}</h1>
                <span className="section-line" aria-hidden="true" />
              </div>

              {visibleItems.length > 0 ? (
                <div className="menu-items">
                  {visibleItems.map((item, index) => (
                    <MenuItem
                      key={item.id}
                      item={item}
                      categoryName={categoryMap[item.categoryId] || activeCategoryName}
                      currency={menu.currency}
                      index={index}
                      onOpen={() => setSelectedItem(item)}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <strong>این دسته هنوز آیتمی ندارد</strong>
                  <span>برای این دسته، آیتم جدیدی در منوی مدیریت ثبت نشده است.</span>
                </div>
              )}
            </section>
          )}
        </main>

        {(menu.restaurant.phone || menu.restaurant.instagram) && (
          <footer className="menu-footer">
            <div className="footer-rule" />
            <div className="footer-actions">
              {menu.restaurant.phone && (
                <a href={`tel:${menu.restaurant.phone}`} aria-label="تماس">
                  <Phone size={17} />
                </a>
              )}
              {menu.restaurant.instagram && (
                <a
                  href={menu.restaurant.instagram}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="اینستاگرام"
                >
                  <Instagram size={17} />
                </a>
              )}
            </div>
          </footer>
        )}
      </div>

      {selectedItem && (
        <div
          className="modal-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setSelectedItem(null)
          }}
        >
          <article
            className="item-modal"
            role="dialog"
            aria-modal="true"
            aria-label={selectedItem.name}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setSelectedItem(null)}
              aria-label="بستن"
            >
              <X size={18} />
            </button>

            <div className="modal-image">
              {selectedItem.image ? (
                <img
                  src={imageUrl(selectedItem.image)}
                  alt=""
                  decoding="async"
                />
              ) : (
                <div className="modal-placeholder" aria-hidden="true">
                  <span />
                </div>
              )}
            </div>

            <div className="modal-content">
              <span className="modal-category">
                {categoryMap[selectedItem.categoryId] || 'منو'}
              </span>

              <div className="modal-title-row">
                <h2>{selectedItem.name}</h2>
                <strong>{formatPrice(selectedItem.price, menu.currency)}</strong>
              </div>

              <p>
                {selectedItem.description || 'توضیحی برای این آیتم ثبت نشده است.'}
              </p>

              <button
                type="button"
                className="modal-done"
                onClick={() => setSelectedItem(null)}
              >
                بستن
              </button>
            </div>
          </article>
        </div>
      )}
    </div>
  )
}

function MenuItem({ item, categoryName, currency, index, onOpen }) {
  return (
    <article
      className="menu-item"
      style={{ '--item-index': index }}
    >
      <button
        type="button"
        className="item-button"
        onClick={onOpen}
        aria-label={`جزئیات ${item.name}`}
      >
        <div className="item-image-wrap">
          {item.image ? (
            <img
              src={imageUrl(item.image)}
              alt=""
              loading={index < 4 ? 'eager' : 'lazy'}
              decoding="async"
              fetchPriority={index === 0 ? 'high' : 'auto'}
            />
          ) : (
            <div className="image-placeholder" aria-hidden="true">
              <span />
            </div>
          )}
        </div>

        <div className="item-copy">
          <div className="item-heading">
            <h2>{item.name}</h2>
            <span className="item-price">{formatPrice(item.price, currency)}</span>
          </div>

          <p>{item.description}</p>
          <span className="item-category">{categoryName}</span>
        </div>
      </button>
    </article>
  )
}

createRoot(document.getElementById('root')).render(<App />)
