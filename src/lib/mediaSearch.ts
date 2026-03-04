import { toSlug } from './helpers'
import type { MediaType } from '../types/training'

export interface InternetMediaResult {
  id: string
  title: string
  type: MediaType
  provider: string
  url: string
  thumbnailUrl: string | null
  license: string | null
  attribution: string | null
  tags: string[]
}

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return (await response.json()) as T
}

const uniqueByUrl = (items: InternetMediaResult[]): InternetMediaResult[] => {
  const seen = new Set<string>()
  const output: InternetMediaResult[] = []
  items.forEach((item) => {
    if (!item.url || seen.has(item.url)) {
      return
    }
    seen.add(item.url)
    output.push(item)
  })
  return output
}

const searchOpenverse = async (query: string): Promise<InternetMediaResult[]> => {
  type OpenverseImage = {
    id: string
    title: string
    url: string
    thumbnail: string | null
    license: string | null
    creator: string | null
    tags?: Array<{ name: string }>
  }

  type OpenverseResponse = {
    results: OpenverseImage[]
  }

  const q = encodeURIComponent(query)
  const url = `https://api.openverse.org/v1/images/?q=${q}&page_size=15`

  try {
    const data = await fetchJson<OpenverseResponse>(url)
    return (data.results ?? []).map((item) => ({
      id: `openverse-${item.id}`,
      title: item.title || query,
      type: 'image' as const,
      provider: 'Openverse',
      url: item.url,
      thumbnailUrl: item.thumbnail ?? null,
      license: item.license ?? null,
      attribution: item.creator ?? null,
      tags: (item.tags ?? []).map((tag) => tag.name).filter(Boolean),
    }))
  } catch {
    return []
  }
}

const searchWikimedia = async (query: string): Promise<InternetMediaResult[]> => {
  type WikiPage = {
    title: string
    imageinfo?: Array<{
      url?: string
      thumburl?: string
      mime?: string
      extmetadata?: {
        LicenseShortName?: { value?: string }
        Artist?: { value?: string }
      }
    }>
  }

  type WikiResponse = {
    query?: {
      pages?: Record<string, WikiPage>
    }
  }

  const q = encodeURIComponent(query)
  const commonParams =
    'action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url|mime|extmetadata'

  const [imagesData, videosData] = await Promise.all([
    fetchJson<WikiResponse>(
      `https://commons.wikimedia.org/w/api.php?${commonParams}&gsrsearch=${q}`,
    ).catch(() => ({}) as WikiResponse),
    fetchJson<WikiResponse>(
      `https://commons.wikimedia.org/w/api.php?${commonParams}&gsrsearch=${encodeURIComponent(`${query} filetype:video`)}`,
    ).catch(() => ({}) as WikiResponse),
  ])

  const toResults = (data: WikiResponse): InternetMediaResult[] => {
    const pages = Object.values(data.query?.pages ?? {})
    return pages
      .map((page) => {
        const info = page.imageinfo?.[0]
        if (!info?.url || !info.mime) {
          return null
        }

        const mediaType: MediaType = info.mime.startsWith('video') ? 'video' : 'image'
        const title = page.title.replace(/^File:/i, '')

        return {
          id: `wikimedia-${toSlug(title)}`,
          title,
          type: mediaType,
          provider: 'Wikimedia Commons',
          url: info.url,
          thumbnailUrl: info.thumburl ?? null,
          license: info.extmetadata?.LicenseShortName?.value ?? null,
          attribution: info.extmetadata?.Artist?.value ?? null,
          tags: title
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter((token) => token.length > 2),
        }
      })
      .filter((item): item is InternetMediaResult => Boolean(item))
  }

  return toResults(imagesData).concat(toResults(videosData))
}

export const searchInternetMedia = async (query: string): Promise<InternetMediaResult[]> => {
  const normalizedQuery = query.trim()
  if (!normalizedQuery) {
    return []
  }

  const [openverseResults, wikimediaResults] = await Promise.all([
    searchOpenverse(normalizedQuery),
    searchWikimedia(normalizedQuery),
  ])

  return uniqueByUrl(openverseResults.concat(wikimediaResults)).slice(0, 30)
}
