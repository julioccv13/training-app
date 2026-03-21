export type MediaType = 'image' | 'video'

export type MediaRole = 'single' | 'multi' | 'reference'
export type MediaOrigin = 'local' | 'external'
export type FontScale = 'small' | 'medium' | 'large'

export interface Routine {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
  isArchived: boolean
}

export interface RoutineDay {
  id: string
  routineId: string
  name: string
  focus: string
  order: number
}

export interface RoutineExercise {
  id: string
  routineId: string
  dayId: string
  slug: string
  name: string
  muscleGroup: string
  targetSets: number
  targetReps: string
  targetWeight: number
  restSeconds: number
  notes: string
  order: number
}

export interface RoutineBundle {
  routines: Routine[]
  days: RoutineDay[]
  exercises: RoutineExercise[]
}

export interface MediaItem {
  id: string
  title: string
  slug: string
  type: MediaType
  role: MediaRole
  origin: MediaOrigin
  provider: string
  path: string | null
  externalUrl: string | null
  thumbnailUrl: string | null
  license: string | null
  attribution: string | null
  tags: string[]
  isDuplicate: boolean
  checksum: string | null
  createdAt: string
}

export interface WorkoutSet {
  id: string
  reps: number
  weight: number
  rpe: number
  restSeconds: number
  done: boolean
}

export interface WorkoutLog {
  id: string
  createdAt: string
  routineId: string
  routineName: string
  dayId: string
  dayName: string
  exerciseId: string
  exerciseName: string
  sets: WorkoutSet[]
  notes: string
}

export interface AppSettings {
  fontScale: FontScale
  units: 'kg' | 'lb'
  schemaVersion: number
  selectedRoutineId: string | null
  routineLockEnabled: boolean
  routineLockConfirmedAt: string | null
}

export interface AppState {
  routineBundle: RoutineBundle
  media: MediaItem[]
  logs: WorkoutLog[]
  settings: AppSettings
}
