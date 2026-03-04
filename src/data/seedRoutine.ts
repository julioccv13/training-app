import { mediaCatalog } from './mediaCatalog'
import type {
  AppSettings,
  MediaItem,
  MediaOrigin,
  MediaRole,
  Routine,
  RoutineBundle,
  RoutineDay,
  RoutineExercise,
  WorkoutLog,
} from '../types/training'

const SEED_TIMESTAMP = '2026-03-04T00:00:00.000Z'

export const STORAGE_KEYS = {
  routine: 'training_app:v1:routine',
  media: 'training_app:v1:media',
  logs: 'training_app:v1:logs',
  settings: 'training_app:v1:settings',
} as const

const defaultRoutine: Routine = {
  id: 'routine-default',
  name: 'Rutina Base',
  description: 'Rutina inicial editable',
  createdAt: SEED_TIMESTAMP,
  updatedAt: SEED_TIMESTAMP,
  isArchived: false,
}

const workoutTrackerRoutine: Routine = {
  id: 'routine-workout-tracker',
  name: 'Workout Tracker Split',
  description: 'Rutina importada desde el repo personal workout-tracker (Push/Leg/Pull/Upper/Lower).',
  createdAt: SEED_TIMESTAMP,
  updatedAt: SEED_TIMESTAMP,
  isArchived: false,
}

const dayTemplates: Array<Omit<RoutineDay, 'routineId'>> = [
  { id: 'day-1', name: 'Dia 1', focus: 'Torso A (hombros/espalda)', order: 1 },
  { id: 'day-2', name: 'Dia 2', focus: 'Pierna A (isquios/gluteo)', order: 2 },
  { id: 'day-3', name: 'Dia 3', focus: 'Torso B (pecho/espalda)', order: 3 },
  { id: 'day-4', name: 'Dia 4', focus: 'Pierna B (cuadriceps)', order: 4 },
]

const exerciseTemplates: Array<Omit<RoutineExercise, 'routineId'>> = [
  {
    id: 'ex-encogimientos', dayId: 'day-1', slug: 'encogimientos', name: 'Encogimientos',
    muscleGroup: 'Trapecios', targetSets: 4, targetReps: '10-12', targetWeight: 25, restSeconds: 75,
    notes: 'Controla la elevacion del hombro.', order: 1,
  },
  {
    id: 'ex-face-pull', dayId: 'day-1', slug: 'face-pull', name: 'Face Pull',
    muscleGroup: 'Deltoides posterior', targetSets: 4, targetReps: '12-15', targetWeight: 15, restSeconds: 60,
    notes: 'Foco en retraccion escapular.', order: 2,
  },
  {
    id: 'ex-remo-en-t', dayId: 'day-1', slug: 'remo-en-t', name: 'Remo en T',
    muscleGroup: 'Romboides', targetSets: 4, targetReps: '8-10', targetWeight: 30, restSeconds: 90,
    notes: 'Mantener espalda neutra.', order: 3,
  },
  {
    id: 'ex-jalon-al-pecho', dayId: 'day-1', slug: 'jalon-al-pecho', name: 'Jalon al pecho',
    muscleGroup: 'Dorsales', targetSets: 4, targetReps: '8-12', targetWeight: 35, restSeconds: 90,
    notes: 'Pausa de 1 segundo abajo.', order: 4,
  },
  {
    id: 'ex-dominadas', dayId: 'day-1', slug: 'dominadas', name: 'Dominadas',
    muscleGroup: 'Dorsales', targetSets: 3, targetReps: '6-10', targetWeight: 0, restSeconds: 120,
    notes: 'Usar asistencia si hace falta.', order: 5,
  },
  {
    id: 'ex-hiperextensiones', dayId: 'day-1', slug: 'hiperextensiones', name: 'Hiperextensiones',
    muscleGroup: 'Erectores espinales', targetSets: 3, targetReps: '12-15', targetWeight: 10, restSeconds: 75,
    notes: 'No hiperextender cuello.', order: 6,
  },
  {
    id: 'ex-rack-pull', dayId: 'day-1', slug: 'rack-pull', name: 'Rack Pull',
    muscleGroup: 'Erectores espinales', targetSets: 3, targetReps: '5-8', targetWeight: 60, restSeconds: 120,
    notes: 'Manten barra cerca del cuerpo.', order: 7,
  },
  {
    id: 'ex-hip-thrust', dayId: 'day-2', slug: 'hip-thrust', name: 'Hip Thrust',
    muscleGroup: 'Gluteos', targetSets: 4, targetReps: '8-12', targetWeight: 50, restSeconds: 90,
    notes: 'Pausa arriba 1 segundo.', order: 1,
  },
  {
    id: 'ex-peso-muerto-rumano', dayId: 'day-2', slug: 'peso-muerto-rumano', name: 'Peso muerto rumano',
    muscleGroup: 'Isquiostibiales', targetSets: 4, targetReps: '8-10', targetWeight: 45, restSeconds: 120,
    notes: 'Controla el descenso.', order: 2,
  },
  {
    id: 'ex-curl-femoral', dayId: 'day-2', slug: 'curl-femoral', name: 'Curl femoral',
    muscleGroup: 'Isquiostibiales', targetSets: 4, targetReps: '10-12', targetWeight: 25, restSeconds: 75,
    notes: 'Sin impulso de cadera.', order: 3,
  },
  {
    id: 'ex-bulgaras', dayId: 'day-2', slug: 'bulgaras', name: 'Bulgaras',
    muscleGroup: 'Gluteos', targetSets: 3, targetReps: '8-10 por pierna', targetWeight: 20, restSeconds: 90,
    notes: 'Tronco levemente inclinado.', order: 4,
  },
  {
    id: 'ex-copenhagen-adduction', dayId: 'day-2', slug: 'copenhagen-adduction', name: 'Copenhagen Adduction',
    muscleGroup: 'Aductores', targetSets: 3, targetReps: '10-12 por lado', targetWeight: 0, restSeconds: 60,
    notes: 'Controlar todo el rango.', order: 5,
  },
  {
    id: 'ex-elevaciones-tibiales', dayId: 'day-2', slug: 'elevaciones-tibiales', name: 'Elevaciones tibiales',
    muscleGroup: 'Tibiales', targetSets: 3, targetReps: '15-20', targetWeight: 0, restSeconds: 45,
    notes: 'Sube y baja sin rebote.', order: 6,
  },
  {
    id: 'ex-marcha-talon', dayId: 'day-2', slug: 'marcha-talon', name: 'Marcha de talones',
    muscleGroup: 'Tibiales', targetSets: 2, targetReps: '30-45 seg', targetWeight: 0, restSeconds: 45,
    notes: 'Mantener punta del pie elevada.', order: 7,
  },
  {
    id: 'ex-aperturas', dayId: 'day-3', slug: 'aperturas', name: 'Aperturas',
    muscleGroup: 'Pecho / deltoides posterior', targetSets: 4, targetReps: '10-15', targetWeight: 12, restSeconds: 60,
    notes: 'Controla el estiramiento.', order: 1,
  },
  {
    id: 'ex-remo-con-mancuernas', dayId: 'day-3', slug: 'remo-con-mancuernas', name: 'Remo con mancuernas',
    muscleGroup: 'Dorsales', targetSets: 4, targetReps: '8-12', targetWeight: 25, restSeconds: 90,
    notes: 'No rote el torso.', order: 2,
  },
  {
    id: 'ex-jalon-al-pecho-b', dayId: 'day-3', slug: 'jalon-al-pecho-2', name: 'Jalon al pecho (variante)',
    muscleGroup: 'Dorsales', targetSets: 3, targetReps: '10-12', targetWeight: 30, restSeconds: 75,
    notes: 'Agarre variante.', order: 3,
  },
  {
    id: 'ex-face-pull-rot-ext', dayId: 'day-3', slug: 'face-pull-rotacion-externa', name: 'Face Pull rotacion externa',
    muscleGroup: 'Redondo menor', targetSets: 3, targetReps: '12-15', targetWeight: 8, restSeconds: 60,
    notes: 'Codos altos al final.', order: 4,
  },
  {
    id: 'ex-rot-ext-acostado', dayId: 'day-3', slug: 'rotacion-externa-acostado', name: 'Rotacion externa acostado',
    muscleGroup: 'Manguito rotador', targetSets: 3, targetReps: '12-15', targetWeight: 5, restSeconds: 45,
    notes: 'Movimientos lentos.', order: 5,
  },
  {
    id: 'ex-peso-muerto-b', dayId: 'day-3', slug: 'peso-muerto', name: 'Peso muerto',
    muscleGroup: 'Trapecios / espalda', targetSets: 3, targetReps: '5-8', targetWeight: 70, restSeconds: 150,
    notes: 'Tecnica primero, carga despues.', order: 6,
  },
  {
    id: 'ex-sentadilla-profunda', dayId: 'day-4', slug: 'sentadilla-profunda', name: 'Sentadilla profunda',
    muscleGroup: 'Gluteos / cuadriceps', targetSets: 4, targetReps: '6-10', targetWeight: 60, restSeconds: 120,
    notes: 'Profundidad segura.', order: 1,
  },
  {
    id: 'ex-prensa', dayId: 'day-4', slug: 'prensa', name: 'Prensa',
    muscleGroup: 'Cuadriceps', targetSets: 4, targetReps: '10-15', targetWeight: 90, restSeconds: 90,
    notes: 'Sin despegar lumbar.', order: 2,
  },
  {
    id: 'ex-zancadas', dayId: 'day-4', slug: 'zancadas', name: 'Zancadas',
    muscleGroup: 'Cuadriceps / gluteos', targetSets: 3, targetReps: '10 por pierna', targetWeight: 20, restSeconds: 90,
    notes: 'Paso largo y estable.', order: 3,
  },
  {
    id: 'ex-extension-cuadriceps', dayId: 'day-4', slug: 'extension-cuadriceps', name: 'Extension cuadriceps',
    muscleGroup: 'Cuadriceps', targetSets: 4, targetReps: '12-15', targetWeight: 30, restSeconds: 60,
    notes: 'Pausa arriba 1 segundo.', order: 4,
  },
  {
    id: 'ex-maquina-aductores', dayId: 'day-4', slug: 'maquina-aductores', name: 'Maquina de aductores',
    muscleGroup: 'Aductores', targetSets: 3, targetReps: '12-15', targetWeight: 35, restSeconds: 60,
    notes: 'Control del retorno.', order: 5,
  },
  {
    id: 'ex-gemelos-de-pie', dayId: 'day-4', slug: 'extension-gemelos-de-pie', name: 'Gemelos de pie',
    muscleGroup: 'Gemelos', targetSets: 4, targetReps: '12-20', targetWeight: 25, restSeconds: 45,
    notes: 'Rango completo.', order: 6,
  },
  {
    id: 'ex-gemelos-sentado', dayId: 'day-4', slug: 'extension-gemelos-sentado', name: 'Gemelos sentado',
    muscleGroup: 'Gemelos', targetSets: 4, targetReps: '12-20', targetWeight: 20, restSeconds: 45,
    notes: 'Subida explosiva y bajada controlada.', order: 7,
  },
]

const seedDays: RoutineDay[] = dayTemplates.map((day) => ({ ...day, routineId: defaultRoutine.id }))
const seedExercises: RoutineExercise[] = exerciseTemplates.map((exercise) => ({
  ...exercise,
  routineId: defaultRoutine.id,
}))

const workoutTrackerDayTemplates: Array<Omit<RoutineDay, 'routineId'>> = [
  { id: 'wt-day-push', name: 'Push Day', focus: 'Pecho / hombro / triceps', order: 1 },
  { id: 'wt-day-leg', name: 'Leg Day', focus: 'Pierna / abdomen', order: 2 },
  { id: 'wt-day-pull', name: 'Pull Day', focus: 'Espalda / biceps', order: 3 },
  { id: 'wt-day-upper', name: 'Upper Body', focus: 'Torso completo', order: 4 },
  { id: 'wt-day-lower', name: 'Lower Body', focus: 'Posterior pierna / abdomen', order: 5 },
]

const workoutTrackerExerciseTemplates: Array<Omit<RoutineExercise, 'routineId'>> = [
  {
    id: 'wt-ex-incline-barbell-bench-press', dayId: 'wt-day-push', slug: 'incline-barbell-bench-press', name: 'Incline Barbell Bench Press',
    muscleGroup: 'Pecho superior', targetSets: 2, targetReps: '5-8', targetWeight: 0, restSeconds: 120,
    notes: 'Basado en workout-tracker.', order: 1,
  },
  {
    id: 'wt-ex-lateral-raise-push', dayId: 'wt-day-push', slug: 'lateral-raise-push', name: 'Lateral Raise',
    muscleGroup: 'Deltoides lateral', targetSets: 3, targetReps: '10-15', targetWeight: 0, restSeconds: 75,
    notes: 'Basado en workout-tracker.', order: 2,
  },
  {
    id: 'wt-ex-flat-bench', dayId: 'wt-day-push', slug: 'flat-bench', name: 'Flat Bench',
    muscleGroup: 'Pecho', targetSets: 2, targetReps: '5-10', targetWeight: 0, restSeconds: 120,
    notes: 'Basado en workout-tracker.', order: 3,
  },
  {
    id: 'wt-ex-tricep-dips', dayId: 'wt-day-push', slug: 'tricep-dips', name: 'Tricep Dips',
    muscleGroup: 'Triceps', targetSets: 2, targetReps: '5-8', targetWeight: 0, restSeconds: 90,
    notes: 'Basado en workout-tracker.', order: 4,
  },
  {
    id: 'wt-ex-tricep-extension', dayId: 'wt-day-push', slug: 'tricep-extension', name: 'Tricep Extension',
    muscleGroup: 'Triceps', targetSets: 2, targetReps: '5-10', targetWeight: 0, restSeconds: 75,
    notes: 'Basado en workout-tracker.', order: 5,
  },
  {
    id: 'wt-ex-squats', dayId: 'wt-day-leg', slug: 'squats', name: 'Squats',
    muscleGroup: 'Cuadriceps / gluteos', targetSets: 2, targetReps: '5-8', targetWeight: 0, restSeconds: 120,
    notes: 'Basado en workout-tracker.', order: 1,
  },
  {
    id: 'wt-ex-leg-extension-leg', dayId: 'wt-day-leg', slug: 'leg-extension-leg-day', name: 'Leg Extension',
    muscleGroup: 'Cuadriceps', targetSets: 3, targetReps: '5-10', targetWeight: 0, restSeconds: 75,
    notes: 'Basado en workout-tracker.', order: 2,
  },
  {
    id: 'wt-ex-leg-curl-leg', dayId: 'wt-day-leg', slug: 'leg-curl-leg-day', name: 'Leg Curl',
    muscleGroup: 'Isquiotibiales', targetSets: 3, targetReps: '5-10', targetWeight: 0, restSeconds: 75,
    notes: 'Basado en workout-tracker.', order: 3,
  },
  {
    id: 'wt-ex-calf-raise-leg', dayId: 'wt-day-leg', slug: 'calf-raise-leg-day', name: 'Calf Raise',
    muscleGroup: 'Gemelos', targetSets: 3, targetReps: '10-15', targetWeight: 0, restSeconds: 60,
    notes: 'Basado en workout-tracker.', order: 4,
  },
  {
    id: 'wt-ex-ab-crunch-machine-leg', dayId: 'wt-day-leg', slug: 'ab-crunch-machine-leg-day', name: 'Ab Crunch Machine',
    muscleGroup: 'Abdomen', targetSets: 3, targetReps: '10-15', targetWeight: 0, restSeconds: 60,
    notes: 'Basado en workout-tracker.', order: 5,
  },
  {
    id: 'wt-ex-lat-pull-down-pull', dayId: 'wt-day-pull', slug: 'lat-pull-down-pull-day', name: 'Lat Pull Down',
    muscleGroup: 'Dorsales', targetSets: 2, targetReps: '5-10', targetWeight: 0, restSeconds: 90,
    notes: 'Basado en workout-tracker.', order: 1,
  },
  {
    id: 'wt-ex-machine-row-pronated', dayId: 'wt-day-pull', slug: 'machine-row-pronated-grip', name: 'Machine Row (Pronated Grip)',
    muscleGroup: 'Espalda media', targetSets: 2, targetReps: '5-10', targetWeight: 0, restSeconds: 90,
    notes: 'Basado en workout-tracker.', order: 2,
  },
  {
    id: 'wt-ex-close-grip-row', dayId: 'wt-day-pull', slug: 'close-grip-row', name: 'Close Grip Row',
    muscleGroup: 'Dorsales / romboides', targetSets: 2, targetReps: '5-10', targetWeight: 0, restSeconds: 90,
    notes: 'Basado en workout-tracker.', order: 3,
  },
  {
    id: 'wt-ex-bicep-curls-pull', dayId: 'wt-day-pull', slug: 'bicep-curls-pull-day', name: 'Bicep Curls',
    muscleGroup: 'Biceps', targetSets: 3, targetReps: '10-15', targetWeight: 0, restSeconds: 75,
    notes: 'Basado en workout-tracker.', order: 4,
  },
  {
    id: 'wt-ex-rear-delt-fly', dayId: 'wt-day-pull', slug: 'rear-delt-fly', name: 'Rear Delt Fly',
    muscleGroup: 'Deltoides posterior', targetSets: 3, targetReps: '10-15', targetWeight: 0, restSeconds: 75,
    notes: 'Basado en workout-tracker.', order: 5,
  },
  {
    id: 'wt-ex-incline-chest-press', dayId: 'wt-day-upper', slug: 'incline-chest-press', name: 'Incline Chest Press',
    muscleGroup: 'Pecho superior', targetSets: 2, targetReps: '5-10', targetWeight: 0, restSeconds: 90,
    notes: 'Basado en workout-tracker.', order: 1,
  },
  {
    id: 'wt-ex-lateral-raise-upper', dayId: 'wt-day-upper', slug: 'lateral-raise-upper-body', name: 'Lateral Raise',
    muscleGroup: 'Deltoides lateral', targetSets: 3, targetReps: '10-15', targetWeight: 0, restSeconds: 75,
    notes: 'Basado en workout-tracker.', order: 2,
  },
  {
    id: 'wt-ex-lat-pull-down-upper', dayId: 'wt-day-upper', slug: 'lat-pull-down-upper-body', name: 'Lat Pull Down',
    muscleGroup: 'Dorsales', targetSets: 2, targetReps: '5-10', targetWeight: 0, restSeconds: 90,
    notes: 'Basado en workout-tracker.', order: 3,
  },
  {
    id: 'wt-ex-bicep-curls-upper', dayId: 'wt-day-upper', slug: 'bicep-curls-upper-body', name: 'Bicep Curls',
    muscleGroup: 'Biceps', targetSets: 3, targetReps: '10-15', targetWeight: 0, restSeconds: 75,
    notes: 'Basado en workout-tracker.', order: 4,
  },
  {
    id: 'wt-ex-tricep-extensions-upper', dayId: 'wt-day-upper', slug: 'tricep-extensions-upper-body', name: 'Tricep Extensions',
    muscleGroup: 'Triceps', targetSets: 2, targetReps: '5-10', targetWeight: 0, restSeconds: 75,
    notes: 'Basado en workout-tracker.', order: 5,
  },
  {
    id: 'wt-ex-romanian-deadlift', dayId: 'wt-day-lower', slug: 'romanian-deadlift', name: 'Romanian Deadlift',
    muscleGroup: 'Isquiotibiales / gluteos', targetSets: 2, targetReps: '5-8', targetWeight: 0, restSeconds: 120,
    notes: 'Basado en workout-tracker.', order: 1,
  },
  {
    id: 'wt-ex-leg-extension-lower', dayId: 'wt-day-lower', slug: 'leg-extension-lower-body', name: 'Leg Extension',
    muscleGroup: 'Cuadriceps', targetSets: 3, targetReps: '5-10', targetWeight: 0, restSeconds: 75,
    notes: 'Basado en workout-tracker.', order: 2,
  },
  {
    id: 'wt-ex-leg-curl-lower', dayId: 'wt-day-lower', slug: 'leg-curl-lower-body', name: 'Leg Curl',
    muscleGroup: 'Isquiotibiales', targetSets: 3, targetReps: '5-10', targetWeight: 0, restSeconds: 75,
    notes: 'Basado en workout-tracker.', order: 3,
  },
  {
    id: 'wt-ex-calf-raise-lower', dayId: 'wt-day-lower', slug: 'calf-raise-lower-body', name: 'Calf Raise',
    muscleGroup: 'Gemelos', targetSets: 3, targetReps: '10-15', targetWeight: 0, restSeconds: 60,
    notes: 'Basado en workout-tracker.', order: 4,
  },
  {
    id: 'wt-ex-ab-crunch-machine-lower', dayId: 'wt-day-lower', slug: 'ab-crunch-machine-lower-body', name: 'Ab Crunch Machine',
    muscleGroup: 'Abdomen', targetSets: 3, targetReps: '10-15', targetWeight: 0, restSeconds: 60,
    notes: 'Basado en workout-tracker.', order: 5,
  },
]

const workoutTrackerSeedDays: RoutineDay[] = workoutTrackerDayTemplates.map((day) => ({
  ...day,
  routineId: workoutTrackerRoutine.id,
}))

const workoutTrackerSeedExercises: RoutineExercise[] = workoutTrackerExerciseTemplates.map((exercise) => ({
  ...exercise,
  routineId: workoutTrackerRoutine.id,
}))

export const seedRoutineBundle: RoutineBundle = {
  routines: [defaultRoutine, workoutTrackerRoutine],
  days: [...seedDays, ...workoutTrackerSeedDays],
  exercises: [...seedExercises, ...workoutTrackerSeedExercises],
}

export const seedSettings: AppSettings = {
  units: 'kg',
  schemaVersion: 3,
  selectedRoutineId: defaultRoutine.id,
  routineLockEnabled: true,
  routineLockConfirmedAt: null,
}

const isMediaRole = (value: unknown): value is MediaRole =>
  value === 'single' || value === 'multi' || value === 'reference'

const isMediaOrigin = (value: unknown): value is MediaOrigin =>
  value === 'local' || value === 'external'

const uniqueStrings = (items: string[]): string[] => Array.from(new Set(items.filter(Boolean)))
const createIdFromLegacy = (prefix: string): string =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now()}`

const parseTags = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }
  return uniqueStrings(value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()))
}

const catalogLocalMedia: MediaItem[] = mediaCatalog.map((record) => ({
  id: record.id,
  title: record.title,
  slug: record.slug,
  type: record.type,
  role: record.role,
  origin: 'local',
  provider: 'docs-local',
  path: record.path,
  externalUrl: null,
  thumbnailUrl: null,
  license: null,
  attribution: null,
  tags: uniqueStrings(record.exerciseSlugs.concat(record.slug.split('-'))),
  isDuplicate: record.isDuplicate,
  checksum: record.checksum,
  createdAt: SEED_TIMESTAMP,
}))

export const seedMedia: MediaItem[] = catalogLocalMedia

const sanitizeRoutine = (value: unknown): value is Routine => {
  if (!value || typeof value !== 'object') {
    return false
  }
  const item = value as Record<string, unknown>
  return typeof item.id === 'string' && typeof item.name === 'string'
}

const sanitizeDay = (value: unknown): value is RoutineDay => {
  if (!value || typeof value !== 'object') {
    return false
  }
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    typeof item.routineId === 'string' &&
    typeof item.name === 'string' &&
    typeof item.order === 'number'
  )
}

const sanitizeExercise = (value: unknown): value is RoutineExercise => {
  if (!value || typeof value !== 'object') {
    return false
  }
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    typeof item.routineId === 'string' &&
    typeof item.dayId === 'string' &&
    typeof item.name === 'string' &&
    typeof item.order === 'number'
  )
}

const sanitizeRoutineBundle = (value: unknown): RoutineBundle | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const item = value as Record<string, unknown>
  if (!Array.isArray(item.routines) || !Array.isArray(item.days) || !Array.isArray(item.exercises)) {
    return null
  }

  const routines = item.routines.filter(sanitizeRoutine)
  const days = item.days.filter(sanitizeDay)
  const exercises = item.exercises.filter(sanitizeExercise)

  if (routines.length === 0) {
    return null
  }

  const routineIds = new Set(routines.map((routine) => routine.id))
  const validDays = days.filter((day) => routineIds.has(day.routineId))
  const dayIds = new Set(validDays.map((day) => day.id))
  const validExercises = exercises.filter((exercise) => routineIds.has(exercise.routineId) && dayIds.has(exercise.dayId))

  return {
    routines,
    days: validDays,
    exercises: validExercises,
  }
}

const migrateLegacyRoutineState = (value: unknown): RoutineBundle | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const item = value as Record<string, unknown>
  if (!Array.isArray(item.days) || !Array.isArray(item.exercises)) {
    return null
  }

  const legacyDays = item.days
    .filter((day): day is Record<string, unknown> => Boolean(day) && typeof day === 'object')
    .filter((day) => typeof day.id === 'string' && typeof day.name === 'string')
    .map((day, index) => ({
      id: String(day.id),
      routineId: defaultRoutine.id,
      name: String(day.name),
      focus: typeof day.focus === 'string' ? day.focus : '',
      order: typeof day.order === 'number' ? day.order : index + 1,
    }))

  const dayIdSet = new Set(legacyDays.map((day) => day.id))

  const legacyExercises = item.exercises
    .filter((exercise): exercise is Record<string, unknown> => Boolean(exercise) && typeof exercise === 'object')
    .filter((exercise) => typeof exercise.id === 'string' && typeof exercise.dayId === 'string' && dayIdSet.has(String(exercise.dayId)))
    .map((exercise, index) => ({
      id: String(exercise.id),
      routineId: defaultRoutine.id,
      dayId: String(exercise.dayId),
      slug: typeof exercise.slug === 'string' ? exercise.slug : `exercise-${index + 1}`,
      name: typeof exercise.name === 'string' ? exercise.name : `Exercise ${index + 1}`,
      muscleGroup: typeof exercise.muscleGroup === 'string' ? exercise.muscleGroup : 'General',
      targetSets: typeof exercise.targetSets === 'number' ? exercise.targetSets : 4,
      targetReps: typeof exercise.targetReps === 'string' ? exercise.targetReps : '8-12',
      targetWeight: typeof exercise.targetWeight === 'number' ? exercise.targetWeight : 0,
      restSeconds: typeof exercise.restSeconds === 'number' ? exercise.restSeconds : 60,
      notes: typeof exercise.notes === 'string' ? exercise.notes : '',
      order: typeof exercise.order === 'number' ? exercise.order : index + 1,
    }))

  if (legacyDays.length === 0) {
    return null
  }

  return {
    routines: [defaultRoutine],
    days: legacyDays,
    exercises: legacyExercises,
  }
}

const ensureBuiltInRoutines = (bundle: RoutineBundle): RoutineBundle => {
  const hasWorkoutTracker = bundle.routines.some((routine) => routine.id === workoutTrackerRoutine.id)
  if (hasWorkoutTracker) {
    return bundle
  }

  return {
    routines: [...bundle.routines, workoutTrackerRoutine],
    days: [...bundle.days, ...workoutTrackerSeedDays],
    exercises: [...bundle.exercises, ...workoutTrackerSeedExercises],
  }
}

export const normalizeRoutineBundleState = (rawState: unknown): RoutineBundle => {
  const v3 = sanitizeRoutineBundle(rawState)
  if (v3) {
    return ensureBuiltInRoutines(v3)
  }

  const v2 = migrateLegacyRoutineState(rawState)
  if (v2) {
    return ensureBuiltInRoutines(v2)
  }

  return ensureBuiltInRoutines(seedRoutineBundle)
}

const isLogRecord = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object') {
    return false
  }
  const item = value as Record<string, unknown>
  return (
    typeof item.id === 'string' &&
    typeof item.createdAt === 'string' &&
    typeof item.dayId === 'string' &&
    typeof item.exerciseId === 'string'
  )
}

export const normalizeLogsState = (rawState: unknown, routineBundle: RoutineBundle): WorkoutLog[] => {
  if (!Array.isArray(rawState)) {
    return []
  }

  const routineById = new Map(routineBundle.routines.map((routine) => [routine.id, routine]))
  const dayById = new Map(routineBundle.days.map((day) => [day.id, day]))
  const exerciseById = new Map(routineBundle.exercises.map((exercise) => [exercise.id, exercise]))
  const fallbackRoutine = routineBundle.routines[0]

  return rawState
    .filter(isLogRecord)
    .map((log) => {
      const logId = typeof log.id === 'string' ? log.id : createIdFromLegacy('log')
      const dayId = typeof log.dayId === 'string' ? log.dayId : ''
      const exerciseId = typeof log.exerciseId === 'string' ? log.exerciseId : ''
      const createdAt = typeof log.createdAt === 'string' ? log.createdAt : new Date().toISOString()
      const notes = typeof log.notes === 'string' ? log.notes : ''

      const day = dayById.get(dayId)
      const exercise = exerciseById.get(exerciseId)
      const detectedRoutineId =
        typeof log.routineId === 'string'
          ? String(log.routineId)
          : (exercise?.routineId ?? day?.routineId ?? fallbackRoutine.id)
      const routine = routineById.get(detectedRoutineId) ?? fallbackRoutine
      const sets = Array.isArray(log.sets)
        ? log.sets
            .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
            .map((set) => ({
              id: typeof set.id === 'string' ? set.id : `set-${Math.random().toString(36).slice(2, 8)}`,
              reps: typeof set.reps === 'number' ? set.reps : 0,
              weight: typeof set.weight === 'number' ? set.weight : 0,
              rpe: typeof set.rpe === 'number' ? set.rpe : 0,
              restSeconds: typeof set.restSeconds === 'number' ? set.restSeconds : 0,
              done: Boolean(set.done),
            }))
        : []

      return {
        id: logId,
        createdAt,
        routineId: routine.id,
        routineName:
          typeof log.routineName === 'string'
            ? String(log.routineName)
            : routine.name,
        dayId,
        dayName: typeof log.dayName === 'string' ? String(log.dayName) : (day?.name ?? 'Dia'),
        exerciseId,
        exerciseName:
          typeof log.exerciseName === 'string'
            ? String(log.exerciseName)
            : (exercise?.name ?? 'Ejercicio'),
        sets,
        notes,
      }
    })
}

export const normalizeMediaState = (rawState: unknown): MediaItem[] => {
  const canonicalById = new Map(catalogLocalMedia.map((item) => [item.id, item]))

  if (!Array.isArray(rawState)) {
    return catalogLocalMedia
  }

  const incomingLocalById = new Map<string, Record<string, unknown>>()
  const incomingExternal: MediaItem[] = []

  rawState.forEach((item) => {
    if (!item || typeof item !== 'object') {
      return
    }

    const candidate = item as Record<string, unknown>
    const id = typeof candidate.id === 'string' ? candidate.id : ''
    if (!id) {
      return
    }

    const origin = isMediaOrigin(candidate.origin) ? candidate.origin : null

    if (origin === 'external' || (typeof candidate.externalUrl === 'string' && candidate.externalUrl.length > 0)) {
      const mediaType = candidate.type === 'video' ? 'video' : 'image'
      incomingExternal.push({
        id,
        title: typeof candidate.title === 'string' ? candidate.title : 'External media',
        slug: typeof candidate.slug === 'string' ? candidate.slug : id,
        type: mediaType,
        role: isMediaRole(candidate.role) ? candidate.role : 'reference',
        origin: 'external',
        provider: typeof candidate.provider === 'string' ? candidate.provider : 'external',
        path: null,
        externalUrl: typeof candidate.externalUrl === 'string' ? candidate.externalUrl : null,
        thumbnailUrl: typeof candidate.thumbnailUrl === 'string' ? candidate.thumbnailUrl : null,
        license: typeof candidate.license === 'string' ? candidate.license : null,
        attribution: typeof candidate.attribution === 'string' ? candidate.attribution : null,
        tags: parseTags(candidate.tags),
        isDuplicate: false,
        checksum: null,
        createdAt: typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString(),
      })
      return
    }

    if (canonicalById.has(id)) {
      incomingLocalById.set(id, candidate)
    }
  })

  const normalizedLocal = catalogLocalMedia.map((canonical) => {
    const stored = incomingLocalById.get(canonical.id)
    if (!stored) {
      return canonical
    }

    return {
      ...canonical,
      role: isMediaRole(stored.role) ? stored.role : canonical.role,
      title: typeof stored.title === 'string' ? stored.title : canonical.title,
      tags: parseTags(stored.tags).length > 0 ? parseTags(stored.tags) : canonical.tags,
    }
  })

  return normalizedLocal.concat(incomingExternal)
}

export const normalizeSettingsState = (rawState: unknown, routineBundle: RoutineBundle): AppSettings => {
  const base = { ...seedSettings }

  if (rawState && typeof rawState === 'object') {
    const item = rawState as Record<string, unknown>
    if (item.units === 'kg' || item.units === 'lb') {
      base.units = item.units
    }
    if (typeof item.selectedRoutineId === 'string') {
      base.selectedRoutineId = item.selectedRoutineId
    }
    if (typeof item.routineLockEnabled === 'boolean') {
      base.routineLockEnabled = item.routineLockEnabled
    }
    if (typeof item.routineLockConfirmedAt === 'string') {
      base.routineLockConfirmedAt = item.routineLockConfirmedAt
    }
  }

  const validRoutineIds = new Set(routineBundle.routines.map((routine) => routine.id))
  if (!base.selectedRoutineId || !validRoutineIds.has(base.selectedRoutineId)) {
    base.selectedRoutineId = routineBundle.routines[0]?.id ?? null
  }

  base.schemaVersion = seedSettings.schemaVersion
  return base
}
