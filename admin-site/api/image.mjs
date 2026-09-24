import { getFile, putFile, deleteFile } from './_github.mjs'

function safeName(name){return String(name||'upload.jpg').toLowerCase().replace(/[^a-z0-9._-]+/gi,'-').replace(/-+/g,'-').replace(/^-|-$/g,'') || 'upload.jpg'}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store')
  try{
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    if(req.method === 'POST'){
      if(!body?.dataBase64 || !body?.name) return res.status(400).json({error:'name and dataBase64 are required'})
      if(String(body.dataBase64).length > 3.6 * 1024 * 1024) return res.status(413).json({error:'تصویر فشرده‌شده بزرگ است؛ لطفاً تصویر کوچک‌تری انتخاب کنید'})
      const stamp = Date.now().toString(36)
      const filename = `${stamp}-${safeName(body.name)}`
      const path = `content/images/${filename}`
      const result = await putFile(path, body.dataBase64.replace(/^data:[^;]+;base64,/,'').replace(/^base64,/,'').replace(/\s/g,''),'admin: upload menu image')
      return res.status(200).json({ok:true,path,sha:result.content?.sha||null})
    }
    if(req.method === 'DELETE'){
      if(!body?.path) return res.status(400).json({error:'path is required'})
      const file = await getFile(body.path)
      await deleteFile(body.path,file.sha,'admin: delete menu image')
      return res.status(200).json({ok:true})
    }
    return res.status(405).json({error:'Method not allowed'})
  }catch(error){return res.status(error.status||500).json({error:error.message||'Server error'})}
}
