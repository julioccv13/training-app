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

const TRAINING_TERMS = [
  'entrenamiento',
  'ejercicio',
  'ejercicios',
  'rutina',
  'gimnasio',
  'pesas',
  'musculacion',
  'hipertrofia',
  'fuerza',
  'fitness',
  'workout',
  'exercise',
  'training',
  'gym',
  'strength',
  'bodybuilding',
  'powerlifting',
  'weightlifting',
  'resistance',
  'barbell',
  'dumbbell',
  'bench press',
  'deadlift',
  'squat',
  'pull up',
  'lat pulldown',
  'row',
  'hip thrust',
  'face pull',
  'remo',
  'jalon',
  'dominadas',
  'sentadilla',
  'zancada',
  'zancadas',
  'bulgarian',
  'bulgarian squat',
  'split squat',
  'zancada bulgara',
  'lunges',
  'lunge',
  'peso muerto',
  'press',
  'biceps',
  'triceps',
  'hombro',
  'hombros',
  'pecho',
  'espalda',
  'dorsales',
  'trapecios',
  'deltoides',
  'romboides',
  'cuadriceps',
  'isquios',
  'isquiotibiales',
  'gluteos',
  'aductores',
  'gemelos',
  'tibiales',
  'cardio',
]

const normalizeText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const tokenize = (value: string): string[] =>
  normalizeText(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3)

const buildHaystack = (item: InternetMediaResult): string =>
  normalizeText(
    [item.title, item.provider, item.url, item.attribution ?? '', item.license ?? '', item.tags.join(' ')].join(' '),
  )

const countQueryTokenMatches = (haystack: string, query: string): number => {
  const normalizedQuery = normalizeText(query)
  const queryTokens = tokenize(query)

  if (queryTokens.length === 0) {
    return haystack.includes(normalizedQuery) ? 1 : 0
  }

  return queryTokens.reduce((sum, token) => (haystack.includes(token) ? sum + 1 : sum), 0)
}

const hasTrainingTerm = (haystack: string): boolean =>
  TRAINING_TERMS.some((term) => haystack.includes(normalizeText(term)))

const isTrainingRelated = (item: InternetMediaResult, query: string): boolean => {
  const haystack = buildHaystack(item)
  if (!hasTrainingTerm(haystack)) {
    return false
  }

  return countQueryTokenMatches(haystack, query) > 0
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

  const uniqueResults = uniqueByUrl(openverseResults.concat(wikimediaResults))
  const strict = uniqueResults.filter((item) => isTrainingRelated(item, normalizedQuery))

  if (strict.length > 0) {
    return strict.slice(0, 30)
  }

  const fallback = uniqueResults
    .map((item) => {
      const haystack = buildHaystack(item)
      const tokenMatches = countQueryTokenMatches(haystack, normalizedQuery)
      const exactQueryBonus = haystack.includes(normalizeText(normalizedQuery)) ? 2 : 0
      const trainingBonus = hasTrainingTerm(haystack) ? 1 : 0

      return {
        item,
        score: tokenMatches + exactQueryBonus + trainingBonus,
      }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .map((entry) => entry.item)

  return fallback.slice(0, 30)
}
