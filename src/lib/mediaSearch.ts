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

const uniqueStrings = (values: string[]): string[] => Array.from(new Set(values.filter(Boolean)))

const buildSearchQueries = (query: string): string[] => {
  const normalized = normalizeText(query)
  const queries = [query.trim()]

  const queryHasTrainingSignal = hasTrainingTerm(normalized)
  if (!queryHasTrainingSignal) {
    queries.push(`${query} exercise`, `${query} workout`, `${query} gym`)
  }

  if (normalized.includes('bulgarian')) {
    queries.push('bulgarian squat', 'split squat')
  }

  return uniqueStrings(queries)
}

const buildHaystack = (item: InternetMediaResult): string =>
  normalizeText([item.title, item.provider, item.url, item.attribution ?? '', item.license ?? ''].join(' '))

const buildTagHaystack = (item: InternetMediaResult): string =>
  normalizeText(item.tags.join(' '))

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

const scoreResult = (item: InternetMediaResult, query: string): number => {
  const haystack = buildHaystack(item)
  const tagHaystack = buildTagHaystack(item)
  const normalizedQuery = normalizeText(query)
  const queryTokens = tokenize(query)

  const titleHaystack = normalizeText(item.title)
  const urlHaystack = normalizeText(item.url)

  const titleHits = countQueryTokenMatches(titleHaystack, query)
  const urlHits = countQueryTokenMatches(urlHaystack, query)
  const tagHits = countQueryTokenMatches(tagHaystack, query)
  const anyHits = countQueryTokenMatches(haystack, query)

  if (anyHits === 0) {
    return 0
  }

  const exactTitleBonus = titleHaystack.includes(normalizedQuery) ? 4 : 0
  const trainingBonus = hasTrainingTerm(`${haystack} ${tagHaystack}`) ? 3 : 0
  const multiTokenBonus = queryTokens.length > 1 && titleHits > 1 ? 2 : 0

  return titleHits * 5 + urlHits * 2 + tagHits + exactTitleBonus + trainingBonus + multiTokenBonus
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

  const queries = buildSearchQueries(normalizedQuery)
  const queryResults = await Promise.all(
    queries.map(async (candidate) => {
      const [openverseResults, wikimediaResults] = await Promise.all([
        searchOpenverse(candidate),
        searchWikimedia(candidate),
      ])
      return openverseResults.concat(wikimediaResults)
    }),
  )

  const uniqueResults = uniqueByUrl(queryResults.flat())
  const ranked = uniqueResults
    .map((item) => {
      return {
        item,
        score: scoreResult(item, normalizedQuery),
      }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .map((entry) => entry.item)

  return ranked.slice(0, 30)
}
