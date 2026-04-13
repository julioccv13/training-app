import type { MediaItem, RoutineDay, RoutineExercise, WorkoutLog, WorkoutSet } from '../types/training'

export interface SessionExerciseSummary {
  exerciseName: string
  setCount: number
}

export interface SessionSummary {
  id: string
  createdAt: string
  dayId: string
  dayName: string
  exerciseCount: number
  totalSets: number
  exercises: SessionExerciseSummary[]
}

export interface ExerciseLastPerformance {
  log: WorkoutLog
  lastWeight: number | null
  completedSets: number
  repsSummary: string
}

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

const countMatches = (haystack: string, needles: string[]): number =>
  needles.reduce((total, needle) => (haystack.includes(needle) ? total + 1 : total), 0)

const getRelevantSets = (sets: WorkoutSet[]): WorkoutSet[] =>
  sets.filter((set) => set.done || set.reps > 0 || set.weight > 0)

export const buildRecentSessions = (logs: WorkoutLog[]): SessionSummary[] => {
  const sessionMap = new Map<
    string,
    {
      id: string
      createdAt: string
      dayId: string
      dayName: string
      totalSets: number
      exercisesByName: Map<string, number>
    }
  >()

  logs.forEach((log) => {
    const sessionId = `${log.createdAt}::${log.routineId}::${log.dayId}`
    const setCount = getRelevantSets(log.sets).length || log.sets.length
    const existing = sessionMap.get(sessionId)

    if (!existing) {
      sessionMap.set(sessionId, {
        id: sessionId,
        createdAt: log.createdAt,
        dayId: log.dayId,
        dayName: log.dayName,
        totalSets: setCount,
        exercisesByName: new Map([[log.exerciseName, setCount]]),
      })
      return
    }

    existing.totalSets += setCount
    existing.exercisesByName.set(log.exerciseName, (existing.exercisesByName.get(log.exerciseName) ?? 0) + setCount)
  })

  return Array.from(sessionMap.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((session) => ({
      id: session.id,
      createdAt: session.createdAt,
      dayId: session.dayId,
      dayName: session.dayName,
      totalSets: session.totalSets,
      exerciseCount: session.exercisesByName.size,
      exercises: Array.from(session.exercisesByName.entries())
        .map(([exerciseName, setCount]) => ({ exerciseName, setCount }))
        .sort((a, b) => b.setCount - a.setCount || a.exerciseName.localeCompare(b.exerciseName)),
    }))
}

export const getSuggestedDay = (
  routineDays: RoutineDay[],
  lastSession: SessionSummary | null,
): RoutineDay | null => {
  if (routineDays.length === 0) {
    return null
  }

  if (!lastSession) {
    return routineDays[0]
  }

  const lastIndex = routineDays.findIndex((day) => day.id === lastSession.dayId)
  if (lastIndex < 0) {
    return routineDays[0]
  }

  const nextIndex = (lastIndex + 1) % routineDays.length
  return routineDays[nextIndex] ?? routineDays[0]
}

const buildRepsSummary = (sets: WorkoutSet[]): string => {
  const reps = getRelevantSets(sets)
    .map((set) => set.reps)
    .filter((value) => value > 0)

  if (reps.length === 0) {
    return 'Sin reps registradas'
  }

  return reps.join(' / ')
}

const getLastWeight = (sets: WorkoutSet[]): number | null => {
  for (let index = sets.length - 1; index >= 0; index -= 1) {
    const candidate = sets[index]
    if (candidate.weight > 0) {
      return candidate.weight
    }
  }

  return null
}

export const buildLastPerformanceByExercise = (logs: WorkoutLog[]): Map<string, ExerciseLastPerformance> => {
  const logsByDate = [...logs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const result = new Map<string, ExerciseLastPerformance>()

  logsByDate.forEach((log) => {
    if (result.has(log.exerciseId)) {
      return
    }

    const relevantSets = getRelevantSets(log.sets)
    result.set(log.exerciseId, {
      log,
      lastWeight: getLastWeight(relevantSets.length > 0 ? relevantSets : log.sets),
      completedSets: relevantSets.length,
      repsSummary: buildRepsSummary(relevantSets.length > 0 ? relevantSets : log.sets),
    })
  })

  return result
}

const scoreMediaForExercise = (exercise: RoutineExercise, item: MediaItem): number => {
  const exerciseSlug = normalizeText(exercise.slug)
  const exerciseName = normalizeText(exercise.name)
  const exerciseTokens = Array.from(new Set(tokenize(`${exercise.slug} ${exercise.name}`)))

  const tagHaystack = normalizeText(item.tags.join(' '))
  const textHaystack = normalizeText(`${item.slug} ${item.title} ${item.provider}`)

  let score = 0

  if (item.tags.some((tag) => normalizeText(tag) === exerciseSlug)) {
    score += 8
  }
  if (item.tags.some((tag) => normalizeText(tag) === exerciseName)) {
    score += 6
  }
  if (tagHaystack.includes(exerciseSlug)) {
    score += 4
  }
  if (textHaystack.includes(exerciseSlug)) {
    score += 3
  }
  if (textHaystack.includes(exerciseName)) {
    score += 2
  }

  score += countMatches(`${tagHaystack} ${textHaystack}`, exerciseTokens)

  if (item.role === 'single') {
    score += 3
  }
  if (item.origin === 'external') {
    score += 2
  }
  if (item.type === 'image') {
    score += 1
  }

  return score
}

export const resolveExerciseMedia = (
  exercise: RoutineExercise,
  media: MediaItem[],
): MediaItem | null => {
  const candidates = media
    .filter((item) => item.type === 'image')
    .map((item) => ({ item, score: scoreMediaForExercise(exercise, item) }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || b.item.createdAt.localeCompare(a.item.createdAt))

  return candidates[0]?.item ?? null
}
