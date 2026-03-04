import type { RoutineDay, RoutineExercise, WorkoutLog, WorkoutSet } from '../types/training'

const BRZYCKI_MIN_REPS = 1
const BRZYCKI_MAX_REPS = 10

export const createId = (prefix: string): string => {
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${Date.now()}-${rand}`
}

export const toTitle = (value: string): string =>
  value
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')

export const toSlug = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')

export const sortDays = (days: RoutineDay[]): RoutineDay[] =>
  [...days].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))

export const sortExercises = (exercises: RoutineExercise[]): RoutineExercise[] =>
  [...exercises].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))

export const emptyWorkoutSet = (): WorkoutSet => ({
  id: createId('set'),
  reps: 0,
  weight: 0,
  rpe: 0,
  restSeconds: 0,
  done: false,
})

export const calcWeeklyVolume = (logs: WorkoutLog[], routineId?: string): number => {
  const today = new Date()
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 7)

  return logs
    .filter((log) => new Date(log.createdAt) >= sevenDaysAgo)
    .filter((log) => (routineId ? log.routineId === routineId : true))
    .reduce((sum, log) => {
      const logVolume = log.sets.reduce((setSum, set) => setSum + set.weight * set.reps, 0)
      return sum + logVolume
    }, 0)
}

export const parseRepTargetAnchor = (targetReps: string): number | null => {
  const parsed = targetReps
    .match(/\d+/g)
    ?.map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0)

  if (!parsed || parsed.length === 0) {
    return null
  }

  const candidate = parsed[0]
  if (candidate < BRZYCKI_MIN_REPS || candidate > BRZYCKI_MAX_REPS) {
    return null
  }

  return candidate
}

export const estimateE1rmBrzycki = (weight: number, reps: number): number | null => {
  if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0) {
    return null
  }

  const normalizedReps = Math.round(reps)
  if (normalizedReps < BRZYCKI_MIN_REPS || normalizedReps > BRZYCKI_MAX_REPS) {
    return null
  }

  if (normalizedReps === 1) {
    return weight
  }

  const denominator = 1.0278 - 0.0278 * normalizedReps
  if (denominator <= 0) {
    return null
  }

  return weight / denominator
}

export const projectLoadFromE1rmBrzycki = (e1rm: number, reps: number): number | null => {
  if (!Number.isFinite(e1rm) || e1rm <= 0 || !Number.isFinite(reps)) {
    return null
  }

  const normalizedReps = Math.min(Math.max(Math.round(reps), BRZYCKI_MIN_REPS), BRZYCKI_MAX_REPS)
  const factor = 1.0278 - 0.0278 * normalizedReps

  if (factor <= 0) {
    return null
  }

  return e1rm * factor
}

export const median = (values: number[]): number | null => {
  if (values.length === 0) {
    return null
  }

  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

export const roundTrainingLoad = (value: number, units: 'kg' | 'lb'): number => {
  const step = units === 'kg' ? 0.5 : 1
  return Math.round(value / step) * step
}
