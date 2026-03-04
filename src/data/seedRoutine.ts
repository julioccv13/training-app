import type { AppSettings, MediaItem, RoutineState } from '../types/training'
import { mediaCatalog } from './mediaCatalog'

export const STORAGE_KEYS = {
  routine: 'training_app:v1:routine',
  media: 'training_app:v1:media',
  logs: 'training_app:v1:logs',
  settings: 'training_app:v1:settings',
} as const

export const seedRoutine: RoutineState = {
  days: [
    { id: 'day-1', name: 'Dia 1', focus: 'Torso A (hombros/espalda)', order: 1 },
    { id: 'day-2', name: 'Dia 2', focus: 'Pierna A (isquios/gluteo)', order: 2 },
    { id: 'day-3', name: 'Dia 3', focus: 'Torso B (pecho/espalda)', order: 3 },
    { id: 'day-4', name: 'Dia 4', focus: 'Pierna B (cuadriceps)', order: 4 },
  ],
  exercises: [
    {
      id: 'ex-encogimientos', dayId: 'day-1', slug: 'encogimientos', name: 'Encogimientos',
      muscleGroup: 'Trapecios', targetSets: 4, targetReps: '10-12', targetWeight: 25, restSeconds: 75,
      notes: 'Controla la elevacion del hombro.', order: 1, mediaIds: [],
    },
    {
      id: 'ex-face-pull', dayId: 'day-1', slug: 'face-pull', name: 'Face Pull',
      muscleGroup: 'Deltoides posterior', targetSets: 4, targetReps: '12-15', targetWeight: 15, restSeconds: 60,
      notes: 'Foco en retraccion escapular.', order: 2, mediaIds: [],
    },
    {
      id: 'ex-remo-en-t', dayId: 'day-1', slug: 'remo-en-t', name: 'Remo en T',
      muscleGroup: 'Romboides', targetSets: 4, targetReps: '8-10', targetWeight: 30, restSeconds: 90,
      notes: 'Mantener espalda neutra.', order: 3, mediaIds: [],
    },
    {
      id: 'ex-jalon-al-pecho', dayId: 'day-1', slug: 'jalon-al-pecho', name: 'Jalon al pecho',
      muscleGroup: 'Dorsales', targetSets: 4, targetReps: '8-12', targetWeight: 35, restSeconds: 90,
      notes: 'Pausa de 1 segundo abajo.', order: 4, mediaIds: [],
    },
    {
      id: 'ex-dominadas', dayId: 'day-1', slug: 'dominadas', name: 'Dominadas',
      muscleGroup: 'Dorsales', targetSets: 3, targetReps: '6-10', targetWeight: 0, restSeconds: 120,
      notes: 'Usar asistencia si hace falta.', order: 5, mediaIds: [],
    },
    {
      id: 'ex-hiperextensiones', dayId: 'day-1', slug: 'hiperextensiones', name: 'Hiperextensiones',
      muscleGroup: 'Erectores espinales', targetSets: 3, targetReps: '12-15', targetWeight: 10, restSeconds: 75,
      notes: 'No hiperextender cuello.', order: 6, mediaIds: [],
    },
    {
      id: 'ex-rack-pull', dayId: 'day-1', slug: 'rack-pull', name: 'Rack Pull',
      muscleGroup: 'Erectores espinales', targetSets: 3, targetReps: '5-8', targetWeight: 60, restSeconds: 120,
      notes: 'Manten barra cerca del cuerpo.', order: 7, mediaIds: [],
    },

    {
      id: 'ex-hip-thrust', dayId: 'day-2', slug: 'hip-thrust', name: 'Hip Thrust',
      muscleGroup: 'Gluteos', targetSets: 4, targetReps: '8-12', targetWeight: 50, restSeconds: 90,
      notes: 'Pausa arriba 1 segundo.', order: 1, mediaIds: [],
    },
    {
      id: 'ex-peso-muerto-rumano', dayId: 'day-2', slug: 'peso-muerto-rumano', name: 'Peso muerto rumano',
      muscleGroup: 'Isquiostibiales', targetSets: 4, targetReps: '8-10', targetWeight: 45, restSeconds: 120,
      notes: 'Controla el descenso.', order: 2, mediaIds: [],
    },
    {
      id: 'ex-curl-femoral', dayId: 'day-2', slug: 'curl-femoral', name: 'Curl femoral',
      muscleGroup: 'Isquiostibiales', targetSets: 4, targetReps: '10-12', targetWeight: 25, restSeconds: 75,
      notes: 'Sin impulso de cadera.', order: 3, mediaIds: [],
    },
    {
      id: 'ex-bulgaras', dayId: 'day-2', slug: 'bulgaras', name: 'Bulgaras',
      muscleGroup: 'Gluteos', targetSets: 3, targetReps: '8-10 por pierna', targetWeight: 20, restSeconds: 90,
      notes: 'Tronco levemente inclinado.', order: 4, mediaIds: [],
    },
    {
      id: 'ex-copenhagen-adduction', dayId: 'day-2', slug: 'copenhagen-adduction', name: 'Copenhagen Adduction',
      muscleGroup: 'Aductores', targetSets: 3, targetReps: '10-12 por lado', targetWeight: 0, restSeconds: 60,
      notes: 'Controlar todo el rango.', order: 5, mediaIds: [],
    },
    {
      id: 'ex-elevaciones-tibiales', dayId: 'day-2', slug: 'elevaciones-tibiales', name: 'Elevaciones tibiales',
      muscleGroup: 'Tibiales', targetSets: 3, targetReps: '15-20', targetWeight: 0, restSeconds: 45,
      notes: 'Sube y baja sin rebote.', order: 6, mediaIds: [],
    },
    {
      id: 'ex-marcha-talon', dayId: 'day-2', slug: 'marcha-talon', name: 'Marcha de talones',
      muscleGroup: 'Tibiales', targetSets: 2, targetReps: '30-45 seg', targetWeight: 0, restSeconds: 45,
      notes: 'Mantener punta del pie elevada.', order: 7, mediaIds: [],
    },

    {
      id: 'ex-aperturas', dayId: 'day-3', slug: 'aperturas', name: 'Aperturas',
      muscleGroup: 'Pecho / deltoides posterior', targetSets: 4, targetReps: '10-15', targetWeight: 12, restSeconds: 60,
      notes: 'Controla el estiramiento.', order: 1, mediaIds: [],
    },
    {
      id: 'ex-remo-con-mancuernas', dayId: 'day-3', slug: 'remo-con-mancuernas', name: 'Remo con mancuernas',
      muscleGroup: 'Dorsales', targetSets: 4, targetReps: '8-12', targetWeight: 25, restSeconds: 90,
      notes: 'No rote el torso.', order: 2, mediaIds: [],
    },
    {
      id: 'ex-jalon-al-pecho-b', dayId: 'day-3', slug: 'jalon-al-pecho-2', name: 'Jalon al pecho (variante)',
      muscleGroup: 'Dorsales', targetSets: 3, targetReps: '10-12', targetWeight: 30, restSeconds: 75,
      notes: 'Agarre variante.', order: 3, mediaIds: [],
    },
    {
      id: 'ex-face-pull-rot-ext', dayId: 'day-3', slug: 'face-pull-rotacion-externa', name: 'Face Pull rotacion externa',
      muscleGroup: 'Redondo menor', targetSets: 3, targetReps: '12-15', targetWeight: 8, restSeconds: 60,
      notes: 'Codos altos al final.', order: 4, mediaIds: [],
    },
    {
      id: 'ex-rot-ext-acostado', dayId: 'day-3', slug: 'rotacion-externa-acostado', name: 'Rotacion externa acostado',
      muscleGroup: 'Manguito rotador', targetSets: 3, targetReps: '12-15', targetWeight: 5, restSeconds: 45,
      notes: 'Movimientos lentos.', order: 5, mediaIds: [],
    },
    {
      id: 'ex-peso-muerto-b', dayId: 'day-3', slug: 'peso-muerto', name: 'Peso muerto',
      muscleGroup: 'Trapecios / espalda', targetSets: 3, targetReps: '5-8', targetWeight: 70, restSeconds: 150,
      notes: 'Tecnica primero, carga despues.', order: 6, mediaIds: [],
    },

    {
      id: 'ex-sentadilla-profunda', dayId: 'day-4', slug: 'sentadilla-profunda', name: 'Sentadilla profunda',
      muscleGroup: 'Gluteos / cuadriceps', targetSets: 4, targetReps: '6-10', targetWeight: 60, restSeconds: 120,
      notes: 'Profundidad segura.', order: 1, mediaIds: [],
    },
    {
      id: 'ex-prensa', dayId: 'day-4', slug: 'prensa', name: 'Prensa',
      muscleGroup: 'Cuadriceps', targetSets: 4, targetReps: '10-15', targetWeight: 90, restSeconds: 90,
      notes: 'Sin despegar lumbar.', order: 2, mediaIds: [],
    },
    {
      id: 'ex-zancadas', dayId: 'day-4', slug: 'zancadas', name: 'Zancadas',
      muscleGroup: 'Cuadriceps / gluteos', targetSets: 3, targetReps: '10 por pierna', targetWeight: 20, restSeconds: 90,
      notes: 'Paso largo y estable.', order: 3, mediaIds: [],
    },
    {
      id: 'ex-extension-cuadriceps', dayId: 'day-4', slug: 'extension-cuadriceps', name: 'Extension cuadriceps',
      muscleGroup: 'Cuadriceps', targetSets: 4, targetReps: '12-15', targetWeight: 30, restSeconds: 60,
      notes: 'Pausa arriba 1 segundo.', order: 4, mediaIds: [],
    },
    {
      id: 'ex-maquina-aductores', dayId: 'day-4', slug: 'maquina-aductores', name: 'Maquina de aductores',
      muscleGroup: 'Aductores', targetSets: 3, targetReps: '12-15', targetWeight: 35, restSeconds: 60,
      notes: 'Control del retorno.', order: 5, mediaIds: [],
    },
    {
      id: 'ex-gemelos-de-pie', dayId: 'day-4', slug: 'extension-gemelos-de-pie', name: 'Gemelos de pie',
      muscleGroup: 'Gemelos', targetSets: 4, targetReps: '12-20', targetWeight: 25, restSeconds: 45,
      notes: 'Rango completo.', order: 6, mediaIds: [],
    },
    {
      id: 'ex-gemelos-sentado', dayId: 'day-4', slug: 'extension-gemelos-sentado', name: 'Gemelos sentado',
      muscleGroup: 'Gemelos', targetSets: 4, targetReps: '12-20', targetWeight: 20, restSeconds: 45,
      notes: 'Subida explosiva y bajada controlada.', order: 7, mediaIds: [],
    },
  ],
}

export const seedSettings: AppSettings = {
  units: 'kg',
  schemaVersion: 1,
}

const cleanupVariant = (slug: string): string => slug.replace(/-2$/, '')

const slugToExerciseId = new Map(seedRoutine.exercises.map((ex) => [cleanupVariant(ex.slug), ex.id]))

export const seedMedia: MediaItem[] = mediaCatalog.map((record) => {
  const normalized = cleanupVariant(record.slug)
  const exerciseId = record.exerciseSlug ? (slugToExerciseId.get(cleanupVariant(record.exerciseSlug)) ?? null) : null

  return {
    id: record.id,
    title: record.title,
    slug: normalized,
    type: record.type,
    path: record.path,
    status: exerciseId ? 'assigned' : 'unassigned',
    exerciseId,
    source: 'docs',
    isDuplicate: record.isDuplicate,
    checksum: record.checksum,
  }
})

export const seedExerciseMediaMap = seedMedia.reduce<Record<string, string[]>>((acc, media) => {
  if (!media.exerciseId) {
    return acc
  }
  if (!acc[media.exerciseId]) {
    acc[media.exerciseId] = []
  }
  acc[media.exerciseId].push(media.id)
  return acc
}, {})

export const routineWithMedia: RoutineState = {
  ...seedRoutine,
  exercises: seedRoutine.exercises.map((exercise) => ({
    ...exercise,
    mediaIds: seedExerciseMediaMap[exercise.id] ?? [],
  })),
}
