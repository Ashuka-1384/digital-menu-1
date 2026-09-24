import { GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH } from './repo-config.mjs'

const apiBase = 'https://api.github.com'

export function env(name){
  const value = process.env[name]
  if(!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

export function repoConfig(){
  return { owner:GITHUB_OWNER, repo:GITHUB_REPO, branch:GITHUB_BRANCH }
}

export async function github(path, options={}){
  const token = env('GITHUB_TOKEN')
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      'Accept':'application/vnd.github+json',
      'X-GitHub-Api-Version':'2022-11-28',
      'Authorization':`Bearer ${token}`,
      ...(options.headers||{})
    }
  })
  const text = await response.text()
  let data
  try{ data = text ? JSON.parse(text) : null }catch{ data = text }
  if(!response.ok) throw new Error(data?.message || `GitHub API error ${response.status}`)
  return data
}

export async function getFile(path){
  const {owner,repo,branch} = repoConfig()
  return github(`/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`)
}

export async function putFile(path, contentBase64, message, sha){
  const {owner,repo,branch} = repoConfig()
  return github(`/repos/${owner}/${repo}/contents/${path}`, {
    method:'PUT',
    body:JSON.stringify({message,content:contentBase64,branch,sha})
  })
}

export async function deleteFile(path, sha, message){
  const {owner,repo,branch} = repoConfig()
  return github(`/repos/${owner}/${repo}/contents/${path}`, {
    method:'DELETE',
    body:JSON.stringify({message,branch,sha})
  })
}

export function decodeGitHubContent(content){
  return Buffer.from(content.replace(/\n/g,''),'base64').toString('utf8')
}
