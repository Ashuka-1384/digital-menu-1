import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Instagram, KeyRound, Phone, X } from 'lucide-react'
import './styles.css'
import { ADMIN_PASSWORD, explainError, loadMenuData } from './supabase'

const Admin = lazy(() => import('./Admin.jsx'))

const FALLBACK = '/fallback-menu.json'
const CACHE_KEY = 'digital-menu-cache-v8'
const ADMIN_KEY = 'digital-menu-admin'
const MIN_REFRESH_GAP = 3000

function formatPrice(value, currency = 'تومان') {
  const numeric = Number(value || 0)
  return `${numeric.toLocaleString('fa-IR')} ${currency}`
}

const imageUrl = path => path || ''

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

async function fetchFallback() {
  const response = await fetch(FALLBACK, { cache: 'force-cache' })
  if (!response.ok) throw new Error('fallback failed')
  const json = await response.json()
  return json.data || json
}

function AdminLogin({ onSuccess, onCancel, dbError }) {
  const [value, setValue] = useState('')
  const [wrong, setWrong] = useState(false)
  const submit = () => {
    if (value === ADMIN_PASSWORD) onSuccess()
    else setWrong(true)
  }
  return (
    <div className="adm-backdrop" onMouseDown={e => e.target === e.currentTarget && onCancel()}>
      <div className="adm-login" dir="rtl">
        <h2>ورود ادمین</h2>
        <input
          autoFocus
          type="password"
          value={value}
          placeholder="رمز عبور"
          onChange={e => { setValue(e.target.value); setWrong(false) }}
          onKeyDown={e => e.key === 'Enter' && submit()}
        />
        {wrong && <span className="adm-wrong">رمز اشتباه است</span>}
        {dbError && <p className="adm-error adm-pre">اتصال به دیتابیس برقرار نیست:{'\n'}{dbError}</p>}
        <div className="adm-foot">
          <button type="button" className="adm-secondary" onClick={onCancel}>انصراف</button>
          <button type="button" className="adm-primary" onClick={submit}>ورود</button>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [menu, setMenu] = useState(null)
  const [active, setActive] = useState('all')
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState(null)
  const categoryRefs = useRef({})
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem(ADMIN_KEY) === '1')
  const [showLogin, setShowLogin] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const refreshRef = useRef(null)
  const [dbError, setDbError] = useState('')

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

    const refresh = async (force = false) => {
      const now = Date.now()
      if (inFlight || (!force && now - lastRefreshAt < MIN_REFRESH_GAP)) return
      lastRefreshAt = now

      inFlight = (async () => {
        try {
          applyMenu(await loadMenuData())
          if (alive) setDbError('')
        } catch (err) {
          console.error('Supabase error:', err)
          if (alive) setDbError(explainError(err))
          const cached = readCachedMenu()
          if (cached) applyMenu(cached)
          else {
            try {
              applyMenu(await fetchFallback())
            } catch {
              if (alive) setLoading(false)
            }
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

    refreshRef.current = () => refresh(true)
    refresh()
    const timer = window.setInterval(() => refresh(), 60000)

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
        <header className="hero">
          <button
            type="button"
            className={isAdmin ? 'admin-key unlocked' : 'admin-key'}
            onClick={() => (isAdmin ? setShowAdmin(true) : setShowLogin(true))}
            aria-label="ورود ادمین"
          >
            <KeyRound size={15} />
          </button>
          <span className="hero-orn" aria-hidden="true"><i /></span>
          <div className="hero-title">{menu.restaurant.name || 'منو'}</div>
          {menu.restaurant.tagline && <p className="hero-tag">{menu.restaurant.tagline}</p>}
          <span className="hero-orn" aria-hidden="true"><i /></span>
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
      {showLogin && (
        <AdminLogin
          dbError={dbError}
          onCancel={() => setShowLogin(false)}
          onSuccess={() => {
            localStorage.setItem(ADMIN_KEY, '1')
            setIsAdmin(true)
            setShowLogin(false)
            setShowAdmin(true)
          }}
        />
      )}

      {showAdmin && (
        <Suspense fallback={null}>
          <Admin
            onClose={() => setShowAdmin(false)}
            onChanged={() => refreshRef.current?.()}
            onLock={() => {
              localStorage.removeItem(ADMIN_KEY)
              setIsAdmin(false)
              setShowAdmin(false)
            }}
          />
        </Suspense>
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
