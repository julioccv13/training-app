export type MediaType = 'image' | 'video'

export type MediaStatus = 'assigned' | 'unassigned'
export type MediaRole = 'single' | 'multi' | 'reference'

export interface TrainingDay {
  id: string
  name: string
  focus: string
  order: number
}

export interface Exercise {
  id: string
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
  mediaIds: string[]
}

export interface MediaItem {
  id: string
  title: string
  slug: string
  type: MediaType
  path: string
  role: MediaRole
  status: MediaStatus
  exerciseIds: string[]
  source: 'docs'
  isDuplicate: boolean
  checksum: string | null
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
  dayId: string
  dayName: string
  exerciseId: string
  exerciseName: string
  sets: WorkoutSet[]
  notes: string
}

export interface AppSettings {
  units: 'kg' | 'lb'
  schemaVersion: number
}

export interface RoutineState {
  days: TrainingDay[]
  exercises: Exercise[]
}

export interface AppState {
  routine: RoutineState
  media: MediaItem[]
  logs: WorkoutLog[]
  settings: AppSettings
}
