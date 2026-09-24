import React,{useEffect,useMemo,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {Plus, Pencil, Trash2, Image as ImageIcon, X, Save, RefreshCw, Check, AlertCircle, Star, Eye, EyeOff, Upload, Search} from 'lucide-react'
import './styles.css'
import seed from './seed.json'
import { CONTENT_RAW_BASE } from './site-config'

const RAW_BASE = CONTENT_RAW_BASE.replace(/\/$/,'')
const headers = () => ({'Content-Type':'application/json'})
function imgUrl(path){if(!path)return ''; if(/^https?:\/\//.test(path))return path; const clean=String(path).replace(/^\//,'').replace(/^content\//,''); return RAW_BASE ? `${RAW_BASE}/${clean}` : `/content/${clean}`}
function money(v){return Number(v||0).toLocaleString('fa-IR')}
function uid(){return `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`}

function App(){
 const [menu,setMenu]=useState(seed); const [originalSha,setOriginalSha]=useState(null); const [selected,setSelected]=useState(null); const [query,setQuery]=useState(''); const [filter,setFilter]=useState('all'); const [status,setStatus]=useState(''); const [saving,setSaving]=useState(false); const [loading,setLoading]=useState(true)
 const load=async()=>{setLoading(true);setStatus('');try{const r=await fetch('/api/content',{headers:headers(),cache:'no-store'});if(!r.ok) throw new Error('API unavailable');const d=await r.json();setMenu(d.data);setOriginalSha(d.sha);setStatus('همگام با مخزن')}catch(e){console.error(e); setStatus(`خطا در اتصال API: ${e.message}`)}finally{setLoading(false)}}
 useEffect(()=>{load()},[])
 const items=useMemo(()=>menu.items.filter(x=>filter==='all'||x.categoryId===filter).filter(x=>!query||`${x.name} ${x.description}`.includes(query)),[menu,filter,query])
 const categoryName=id=>menu.categories.find(c=>c.id===id)?.name || 'بدون دسته'
 const updateItem=(id,patch)=>setMenu(m=>({...m,items:m.items.map(x=>x.id===id?{...x,...patch}:x)}))
 const addItem=()=>{const category=menu.categories[0]?.id||'';const item={id:uid(),categoryId:category,name:'آیتم جدید',description:'توضیحات آیتم را وارد کنید',price:0,image:'',featured:false,available:true,sort:menu.items.length+1};setMenu(m=>({...m,items:[item,...m.items]}));setSelected(item)}
 const removeItem=id=>{if(!confirm('این آیتم حذف شود؟')) return;setMenu(m=>({...m,items:m.items.filter(x=>x.id!==id)}));if(selected?.id===id)setSelected(null)}
 const save=async()=>{setSaving(true);setStatus('در حال ذخیره…');try{const r=await fetch('/api/content',{method:'PUT',headers:headers(),body:JSON.stringify(menu)});if(!r.ok) throw new Error((await r.json()).error||'save failed');const d=await r.json();setMenu(m=>({...m,updatedAt:d.updatedAt}));setStatus('ذخیره شد ✓')}catch(e){console.error(e);setStatus(`ذخیره انجام نشد: ${e.message}`)}finally{setSaving(false)}}
 const upload=async(file,id)=>{if(!file)return;setStatus('در حال آماده‌سازی تصویر…');try{const base64=await compress(file);const r=await fetch('/api/image',{method:'POST',headers:headers(),body:JSON.stringify({name:file.name,dataBase64:base64})});if(!r.ok) throw new Error((await r.json()).error||'upload failed');const d=await r.json();const old=menu.items.find(x=>x.id===id)?.image;setMenu(m=>({...m,items:m.items.map(x=>x.id===id?{...x,image:d.path}:x)}));if(old){await fetch('/api/image',{method:'DELETE',headers:headers(),body:JSON.stringify({path:old})}).catch(()=>{})}setStatus('تصویر بارگذاری شد؛ ذخیره را بزنید'); return d.path}catch(e){console.error(e);setStatus(`بارگذاری تصویر انجام نشد: ${e.message}`); return null} }
 const removeImage=async id=>{const old=menu.items.find(x=>x.id===id)?.image;if(!old)return;setMenu(m=>({...m,items:m.items.map(x=>x.id===id?{...x,image:''}:x)}));await fetch('/api/image',{method:'DELETE',headers:headers(),body:JSON.stringify({path:old})}).catch(()=>{});setStatus('تصویر حذف شد؛ ذخیره را بزنید')}
 if(loading) return <div className="admin-loading"><div className="spinner"/>در حال اتصال به مخزن…</div>
 return <div className="admin-shell">
   <aside className="sidebar"><div className="brand"><div className="logo">N</div><div><strong>NOMA</strong><span>CONTENT STUDIO</span></div></div><div className="sidebar-title">مدیریت محتوا</div><nav><button className="nav-active">منوی دیجیتال</button><button onClick={()=>window.open('/', '_blank')}><Eye size={17}/> پیش‌نمایش</button></nav><div className="sidebar-note"><span>وضعیت</span><strong>{status||'آماده'}</strong><small>فایل منبع: content/menu.json</small></div></aside>
   <main className="workspace">
    <header className="topbar"><div><span className="eyebrow">NOMA / ADMIN</span><h1>مدیریت منو</h1></div><div className="top-actions"><button className="ghost" onClick={load}><RefreshCw size={17}/> تازه‌سازی</button><button className="save" disabled={saving} onClick={save}><Save size={17}/>{saving?'در حال ذخیره…':'ذخیره تغییرات'}</button></div></header>
    <section className="stats"><div><span>کل آیتم‌ها</span><strong>{menu.items.length}</strong></div><div><span>نمایش داده می‌شود</span><strong>{menu.items.filter(x=>x.available!==false).length}</strong></div><div><span>پیشنهاد ویژه</span><strong>{menu.items.filter(x=>x.featured).length}</strong></div></section>
    <section className="content-toolbar"><div className="category-tabs"><button className={filter==='all'?'on':''} onClick={()=>setFilter('all')}>همه</button>{menu.categories.map(c=><button key={c.id} className={filter===c.id?'on':''} onClick={()=>setFilter(c.id)}>{c.name}</button>)}</div><label className="search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="جست‌وجوی آیتم"/></label><button className="add" onClick={addItem}><Plus size={18}/> افزودن آیتم</button></section>
    <section className="items-list">{items.map(item=><article className="item-row" key={item.id}><div className="thumb">{item.image?<img src={imgUrl(item.image)} alt=""/>:<ImageIcon size={22}/>} {item.featured&&<span className="thumb-star"><Star size={11} fill="currentColor"/></span>}</div><div className="item-main"><div className="item-head"><h3>{item.name}</h3><span className="cat">{categoryName(item.categoryId)}</span></div><p>{item.description}</p><div className="meta"><strong>{money(item.price)} {menu.currency}</strong><span className={item.available!==false?'available':'unavailable'}>{item.available!==false?'در منو':'پنهان'}</span></div></div><div className="row-actions"><button onClick={()=>setSelected(item)}><Pencil size={17}/><span>ویرایش</span></button><button className="danger" onClick={()=>removeItem(item.id)}><Trash2 size={17}/><span>حذف</span></button></div></article>)}</section>
   </main>
   {selected&&<Drawer item={selected} categories={menu.categories} onClose={()=>setSelected(null)} onChange={p=>{updateItem(selected.id,p);setSelected({...selected,...p})}} onUpload={async(file,id)=>{const path=await upload(file,id); if(path) setSelected(x=>({...x,image:path})); return path}} onRemoveImage={async id=>{await removeImage(id); setSelected(x=>({...x,image:''}))}}/>} 
 </div>
}

function Drawer({item,categories,onClose,onChange,onUpload,onRemoveImage}){
 const [local,setLocal]=useState(item); useEffect(()=>setLocal(item),[item.id])
 const patch=p=>{setLocal(x=>({...x,...p}));onChange(p)}
 return <div className="drawer-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><aside className="drawer"><div className="drawer-head"><div><span className="eyebrow">ITEM EDITOR</span><h2>ویرایش آیتم</h2></div><button onClick={onClose}><X/></button></div><div className="form">
  <label>نام آیتم<input value={local.name} onChange={e=>patch({name:e.target.value})}/></label>
  <div className="split"><label>دسته<select value={local.categoryId} onChange={e=>patch({categoryId:e.target.value})}>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>قیمت<input type="number" min="0" value={local.price} onChange={e=>patch({price:Number(e.target.value)})}/></label></div>
  <label>توضیحات<textarea rows="4" value={local.description} onChange={e=>patch({description:e.target.value})}/></label>
  <div className="toggle-grid"><button className={local.available!==false?'toggle active':'toggle'} onClick={()=>patch({available:local.available===false})}>{local.available!==false?<Eye size={16}/>:<EyeOff size={16}/>} {local.available!==false?'نمایش در منو':'پنهان از منو'}</button><button className={local.featured?'toggle active':'toggle'} onClick={()=>patch({featured:!local.featured})}><Star size={16}/>{local.featured?'پیشنهاد ویژه':'عادی'}</button></div>
  <div className="image-box"><div className="image-box-head"><span>تصویر آیتم</span>{local.image&&<button className="link-danger" onClick={()=>onRemoveImage(local.id)}>حذف تصویر</button>}</div>{local.image?<img src={imgUrl(local.image)} alt="preview"/>:<div className="empty-image"><ImageIcon size={32}/><span>هنوز تصویری انتخاب نشده</span></div>}<label className="upload"><Upload size={17}/> {local.image?'جایگزینی تصویر':'بارگذاری تصویر'}<input type="file" accept="image/*" onChange={e=>{onUpload(e.target.files?.[0],local.id);e.target.value=''}}/></label><small>تصویر قبل از آپلود به JPG/WebP فشرده می‌شود.</small></div>
 </div><div className="drawer-footer"><button className="save full" onClick={onClose}><Check size={17}/>تأیید</button></div></aside></div>
}
function compress(file){return new Promise((resolve,reject)=>{if(file.size>12*1024*1024){reject(new Error('حجم تصویر اولیه بیشتر از 12MB است'));return}const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{const max=1500;const scale=Math.min(1,max/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);const ctx=c.getContext('2d');ctx.drawImage(img,0,0,c.width,c.height);const data=c.toDataURL('image/webp',.78); if(data.length>3.2*1024*1024){reject(new Error('تصویر بعد از فشرده‌سازی هنوز بزرگ است؛ تصویر کوچک‌تری انتخاب کنید'));return} resolve(data)};img.onerror=reject;img.src=reader.result};reader.onerror=reject;reader.readAsDataURL(file)})}
createRoot(document.getElementById('root')).render(<App/>)
