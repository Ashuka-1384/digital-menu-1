const API_BASE = 'https://api.github.com'
const DEFAULT_OWNER = 'Ashuka-1384'
const DEFAULT_REPO = 'digital-menu-1'
const DEFAULT_BRANCH = 'main'
const MENU_PATH = 'content/menu.json'
const REQUEST_TIMEOUT = 4000

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = process.env.GITHUB_READ_TOKEN || process.env.GITHUB_TOKEN
  const owner = process.env.GITHUB_OWNER || DEFAULT_OWNER
  const repo = process.env.GITHUB_REPO || DEFAULT_REPO
  const branch = process.env.GITHUB_BRANCH || DEFAULT_BRANCH

  if (!token) {
    return res.status(500).json({ error: 'Missing GitHub read token' })
  }

  const url = new URL(`/repos/${owner}/${repo}/contents/${MENU_PATH}`, API_BASE)
  url.searchParams.set('ref', branch)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github.raw+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2026-03-10',
        'User-Agent': 'noma-public-menu'
      },
      cache: 'no-store',
      signal: controller.signal
    })

    const body = await response.text()

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'GitHub content unavailable'
      })
    }

    try {
      JSON.parse(body)
    } catch {
      return res.status(502).json({ error: 'Invalid menu JSON' })
    }

    // Keep the browser fresh while allowing Vercel's CDN to collapse
    // bursts of identical requests for one second.
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=1')
    res.setHeader('CDN-Cache-Control', 'public, s-maxage=1')

    return res.status(200).send(body)
  } catch (error) {
    const message = error?.name === 'AbortError'
      ? 'GitHub request timed out'
      : 'GitHub request failed'

    return res.status(504).json({ error: message })
  } finally {
    clearTimeout(timer)
  }
}
