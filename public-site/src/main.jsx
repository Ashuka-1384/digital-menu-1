import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Search, Sparkles, Phone, ArrowUpRight } from 'lucide-react'
import './styles.css'
import { CONTENT_RAW_BASE } from './site-config'

const FALLBACK = '/fallback-menu.json'
const RAW_BASE = CONTENT_RAW_BASE.replace(/\/$/, '')

function formatPrice(value, currency='تومان') {
  return `${Number(value || 0).toLocaleString('fa-IR')} ${currency}`
}

function imageUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  const clean = String(path).replace(/^\//,'').replace(/^content\//,'')
  return RAW_BASE ? `${RAW_BASE}/${clean}` : `/content/${clean}`
}

function App(){
  const [menu,setMenu] = useState(null)
  const [active,setActive] = useState('all')
  const [query,setQuery] = useState('')
  const [loading,setLoading] = useState(true)

  useEffect(()=>{
    const load=async()=>{
      try {
        const url = RAW_BASE ? `${RAW_BASE}/menu.json?ts=${Date.now()}` : FALLBACK
        const r = await fetch(url, {cache:'no-store'})
        if(!r.ok) throw new Error('failed')
        setMenu(await r.json())
      } catch(e) {
        const r = await fetch(FALLBACK)
        setMenu(await r.json())
      } finally { setLoading(false) }
    }
    load()
  },[])

  const categories = useMemo(()=>menu ? [{id:'all',name:'همه'}, ...[...menu.categories].sort((a,b)=>a.sort-b.sort)] : [],[menu])
  const visibleItems = useMemo(()=>{
    if(!menu) return []
    return menu.items
      .filter(x=>x.available !== false)
      .filter(x=>active==='all' || x.categoryId===active)
      .filter(x=>!query.trim() || `${x.name} ${x.description}`.includes(query.trim()))
      .sort((a,b)=> (b.featured?1:0)-(a.featured?1:0) || a.sort-b.sort)
  },[menu,active,query])

  if(loading) return <div className="loading-shell"><div className="spinner"/><span>در حال آماده‌سازی منو…</span></div>
  if(!menu) return <div className="loading-shell">منو در دسترس نیست.</div>

  return <div className="site-shell">
    <div className="grain"/>
    <header className="hero">
      <div className="hero-mark">N</div>
      <div className="hero-copy">
        <div className="eyebrow"><Sparkles size={15}/> DIGITAL MENU</div>
        <h1>{menu.restaurant.name}</h1>
        <p>{menu.restaurant.tagline}</p>
        <span>{menu.restaurant.description}</span>
      </div>
      <div className="hero-side"><span>EST. 2026</span><span>MENU / 01</span></div>
    </header>

    <main>
      <section className="toolbar">
        <div className="category-scroll">{categories.map(cat=><button key={cat.id} className={active===cat.id?'active':''} onClick={()=>setActive(cat.id)}>{cat.name}</button>)}</div>
        <label className="search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="جست‌وجوی آیتم…"/></label>
      </section>

      <section className="intro-row"><div><span className="section-kicker">DISCOVER</span><h2>{active==='all'?'پیشنهادهای امروز':categories.find(c=>c.id===active)?.name}</h2></div><span className="count-pill">{visibleItems.length.toLocaleString('fa-IR')} آیتم</span></section>

      <section className="menu-grid">
        {visibleItems.map((item, index)=><article className={`menu-card ${item.featured?'featured':''}`} key={item.id}>
          <div className="card-image-wrap">
            {item.image ? <img src={imageUrl(item.image)} alt={item.name} loading={index>1?'lazy':'eager'}/> : <div className="image-placeholder"><span>{String(index+1).padStart(2,'0')}</span></div>}
            {item.featured && <span className="badge">پیشنهاد ویژه</span>}
          </div>
          <div className="card-body"><div className="item-top"><h3>{item.name}</h3><span className="line"/><strong>{formatPrice(item.price,menu.currency)}</strong></div><p>{item.description}</p><div className="card-foot"><span>{item.available===false?'ناموجود':'آماده سرو'}</span>{item.featured && <span className="mini-star">✦</span>}</div></div>
        </article>)}
      </section>

      {visibleItems.length===0 && <div className="empty">آیتمی مطابق جست‌وجوی شما پیدا نشد.</div>}
    </main>

    <footer className="footer">
      <div><div className="footer-brand">NOMA<span>®</span></div><p>یک منوی دیجیتال ساده، سریع و بدون کاغذ.</p></div>
      <div className="footer-actions">{menu.restaurant.phone && <a href={`tel:${menu.restaurant.phone}`}><Phone size={17}/> تماس</a>}{menu.restaurant.instagram && <a href={menu.restaurant.instagram} target="_blank" rel="noreferrer"><span className="instagram-glyph" aria-hidden="true">◎</span> اینستاگرام <ArrowUpRight size={15}/></a>}</div>
    </footer>
  </div>
}

createRoot(document.getElementById('root')).render(<App/>)
