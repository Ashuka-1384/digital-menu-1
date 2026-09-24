import { getFile, putFile, decodeGitHubContent } from './_github.mjs'

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store')
  try{
    if(req.method === 'GET'){
      const file = await getFile('content/menu.json')
      return res.status(200).json({data:JSON.parse(decodeGitHubContent(file.content)), sha:file.sha})
    }
    if(req.method === 'PUT'){
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      const file = await getFile('content/menu.json')
      const next = {...body, updatedAt:new Date().toISOString()}
      const content = Buffer.from(JSON.stringify(next,null,2)+'\n','utf8').toString('base64')
      const result = await putFile('content/menu.json',content,'admin: update menu.json',file.sha)
      return res.status(200).json({ok:true,commit:result.commit?.sha,updatedAt:next.updatedAt})
    }
    return res.status(405).json({error:'Method not allowed'})
  }catch(error){return res.status(error.status||500).json({error:error.message||'Server error'})}
}
