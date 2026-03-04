import type { RoutineDay, RoutineExercise, WorkoutLog, WorkoutSet } from '../types/training'

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
