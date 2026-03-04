import { toSlug } from './helpers'
import type { MediaType } from '../types/training'

export type InternetMediaRelevanceTier = 'strict' | 'fallback' | 'broad'

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
  relevanceTier?: InternetMediaRelevanceTier
  score?: number
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
  'shoulder press',
  'overhead press',
  'dumbbell press',
  'bench press',
  'deadlift',
  'squat',
  'pull up',
  'pull-up',
  'inverted row',
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
  'bulgarian split squat',
  'rear foot elevated split squat',
  'split squat',
  'zancada bulgara',
  'lunges',
  'lunge',
  'peso muerto',
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

const NOISE_TERMS = [
  'press conference',
  'conference',
  'premiere',
  'red carpet',
  'campaign',
  'politics',
  'speech',
  'event in',
  'cropped',
  'portrait',
  'expedition',
  'nhq',
  'los angeles',
]

const BASE_QUERY_SUFFIXES = ['exercise', 'workout', 'gym', 'strength training', 'ejercicio']

const EXERCISE_ALIAS_MAP: Array<{ needle: string; aliases: string[] }> = [
  {
    needle: 'sentadilla bulgara',
    aliases: ['bulgarian squat', 'bulgarian split squat', 'split squat', 'rear foot elevated split squat'],
  },
  {
    needle: 'bulgarian squat',
    aliases: ['sentadilla bulgara', 'bulgarian split squat', 'split squat'],
  },
  {
    needle: 'australian pull up',
    aliases: ['australian pull-up', 'inverted row', 'bodyweight row'],
  },
  {
    needle: 'australian pull-up',
    aliases: ['australian pull up', 'inverted row', 'bodyweight row'],
  },
  {
    needle: 'arnold press',
    aliases: ['dumbbell arnold press', 'shoulder dumbbell press', 'overhead dumbbell press'],
  },
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

const hasTrainingTerm = (haystack: string): boolean =>
  TRAINING_TERMS.some((term) => haystack.includes(normalizeText(term)))

const hasNoiseTerm = (haystack: string): boolean =>
  NOISE_TERMS.some((term) => haystack.includes(normalizeText(term)))

type SearchIntent = {
  normalizedQuery: string
  queryTokens: string[]
  aliasPhrases: string[]
  aliasTokens: string[]
  strictMinHits: number
}

const buildAliasPhrases = (normalizedQuery: string): string[] => {
  const aliases = [normalizedQuery]

  EXERCISE_ALIAS_MAP.forEach((entry) => {
    if (normalizedQuery.includes(entry.needle) || entry.needle.includes(normalizedQuery)) {
      aliases.push(entry.needle, ...entry.aliases)
    }
  })

  return uniqueStrings(aliases.map(normalizeText).filter((value) => value.length >= 3))
}

const buildSearchIntent = (query: string): SearchIntent => {
  const normalizedQuery = normalizeText(query)
  const queryTokens = tokenize(normalizedQuery)
  const aliasPhrases = buildAliasPhrases(normalizedQuery)
  const aliasTokens = uniqueStrings(aliasPhrases.flatMap((phrase) => tokenize(phrase)))

  return {
    normalizedQuery,
    queryTokens,
    aliasPhrases,
    aliasTokens,
    strictMinHits: queryTokens.length >= 2 ? 2 : 1,
  }
}

const buildSearchQueries = (query: string, aliasPhrases: string[]): string[] => {
  const trimmed = query.trim()
  const queries = [trimmed]

  BASE_QUERY_SUFFIXES.forEach((suffix) => {
    queries.push(`${trimmed} ${suffix}`)
  })

  aliasPhrases.forEach((alias) => {
    queries.push(alias)
    BASE_QUERY_SUFFIXES.forEach((suffix) => {
      queries.push(`${alias} ${suffix}`)
    })
  })

  return uniqueStrings(queries).slice(0, 10)
}

const countTokenMatches = (haystack: string, tokens: string[]): number => {
  if (tokens.length === 0) {
    return 0
  }
  return tokens.reduce((sum, token) => (haystack.includes(token) ? sum + 1 : sum), 0)
}

const includesAnyPhrase = (haystack: string, phrases: string[]): boolean => {
  return phrases.some((phrase) => phrase.length > 2 && haystack.includes(normalizeText(phrase)))
}

const buildHaystack = (item: InternetMediaResult): string =>
  normalizeText([item.title, item.provider, item.url, item.attribution ?? '', item.license ?? ''].join(' '))

const buildTagHaystack = (item: InternetMediaResult): string =>
  normalizeText(item.tags.join(' '))

type RankedResult = {
  item: InternetMediaResult
  score: number
  relevanceTier: InternetMediaRelevanceTier
}

const scoreResult = (item: InternetMediaResult, intent: SearchIntent): RankedResult | null => {
  const haystack = buildHaystack(item)
  const tagHaystack = buildTagHaystack(item)
  const titleHaystack = normalizeText(item.title)
  const urlHaystack = normalizeText(item.url)
  const semanticHaystack = `${titleHaystack} ${tagHaystack} ${urlHaystack}`

  const queryTitleHits = countTokenMatches(titleHaystack, intent.queryTokens)
  const aliasTitleHits = countTokenMatches(titleHaystack, intent.aliasTokens)
  const queryTagHits = countTokenMatches(tagHaystack, intent.queryTokens)
  const aliasTagHits = countTokenMatches(tagHaystack, intent.aliasTokens)
  const queryUrlHits = countTokenMatches(urlHaystack, intent.queryTokens)
  const aliasUrlHits = countTokenMatches(urlHaystack, intent.aliasTokens)

  const primaryHits = queryTitleHits + queryTagHits + queryUrlHits
  const aliasHits = aliasTitleHits + aliasTagHits + aliasUrlHits
  const semanticHits = Math.max(primaryHits, aliasHits)
  if (semanticHits === 0) {
    return null
  }

  const phraseHit = includesAnyPhrase(`${titleHaystack} ${tagHaystack}`, intent.aliasPhrases)
  const exactTitleBonus = titleHaystack.includes(intent.normalizedQuery) ? 5 : 0
  const trainingSignal = hasTrainingTerm(`${haystack} ${tagHaystack}`)
  const noiseSignal = hasNoiseTerm(semanticHaystack)

  const relevanceTier: InternetMediaRelevanceTier =
    semanticHits >= intent.strictMinHits && trainingSignal && !noiseSignal
      ? 'strict'
      : semanticHits >= 1 && trainingSignal
        ? 'fallback'
        : 'broad'

  const score =
    queryTitleHits * 8 +
    aliasTitleHits * 6 +
    queryTagHits * 5 +
    aliasTagHits * 4 +
    queryUrlHits * 2 +
    aliasUrlHits +
    (phraseHit ? 6 : 0) +
    exactTitleBonus +
    (trainingSignal ? 6 : 0) -
    (noiseSignal ? 9 : 0)

  return {
    item: {
      ...item,
      relevanceTier,
      score,
    },
    score,
    relevanceTier,
  }
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

  const intent = buildSearchIntent(normalizedQuery)
  const queries = buildSearchQueries(normalizedQuery, intent.aliasPhrases)
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
    .map((item) => scoreResult(item, intent))
    .filter((entry): entry is RankedResult => Boolean(entry))
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))

  const strict = ranked.filter((entry) => entry.relevanceTier === 'strict')
  const fallback = ranked.filter((entry) => entry.relevanceTier === 'fallback')
  const broad = ranked.filter((entry) => entry.relevanceTier === 'broad')

  const stagedResults = strict.length > 0 ? strict : fallback.length > 0 ? fallback : broad
  return stagedResults.slice(0, 30).map((entry) => entry.item)
}
