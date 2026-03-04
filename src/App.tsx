import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import './App.css'
import {
  normalizeLogsState,
  normalizeMediaState,
  normalizeRoutineBundleState,
  normalizeSettingsState,
  seedMedia,
  seedRoutineBundle,
  seedSettings,
  STORAGE_KEYS,
} from './data/seedRoutine'
import {
  createId,
  emptyWorkoutSet,
  estimateE1rmBrzycki,
  median,
  parseRepTargetAnchor,
  projectLoadFromE1rmBrzycki,
  roundTrainingLoad,
  sortDays,
  sortExercises,
  toSlug,
  toTitle,
} from './lib/helpers'
import { searchInternetMedia, type InternetMediaResult } from './lib/mediaSearch'
import { downloadJson, loadJson, readJsonFile, saveJson } from './lib/storage'
import type {
  AppSettings,
  MediaItem,
  MediaRole,
  MediaType,
  Routine,
  RoutineBundle,
  RoutineDay,
  RoutineExercise,
  WorkoutLog,
  WorkoutSet,
} from './types/training'

type TabKey = 'dashboard' | 'routines' | 'workout' | 'media' | 'settings'
type WorkoutDraft = Record<string, { sets: WorkoutSet[]; notes: string }>
type MediaTypeFilter = 'all' | MediaType
type MediaOriginFilter = 'all' | 'local' | 'external'
type ExerciseE1rmMeta = {
  e1rm: number
  sampleCount: number
  anchorReps: number | null
  suggestedWeight: number | null
}
type SessionExerciseSummary = {
  exerciseName: string
  setCount: number
}
type SessionSummary = {
  id: string
  createdAt: string
  dayName: string
  exerciseCount: number
  totalSets: number
  exercises: SessionExerciseSummary[]
}

type ImportPayload = {
  routineBundle?: unknown
  media?: unknown
  logs?: unknown
  settings?: unknown
  exportedAt?: string
}

const tabs: Array<{ key: TabKey; label: string; iconPath: string }> = [
  { key: 'dashboard', label: 'Inicio', iconPath: 'icons/pixel/home.svg' },
  { key: 'routines', label: 'Rutinas', iconPath: 'icons/pixel/clipboard.svg' },
  { key: 'workout', label: 'Track', iconPath: 'icons/pixel/chart.svg' },
  { key: 'media', label: 'Media', iconPath: 'icons/pixel/image.svg' },
  { key: 'settings', label: 'Ajustes', iconPath: 'icons/pixel/settings-cog.svg' },
]

const MIN_E1RM_SAMPLES = 3

const buildE1rmMetaByExercise = (
  routineLogs: WorkoutLog[],
  routineExercises: RoutineExercise[],
  units: 'kg' | 'lb',
): Map<string, ExerciseE1rmMeta> => {
  const rawSamplesByExercise = new Map<string, number[]>()
  const logsSortedByDate = [...routineLogs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  logsSortedByDate.forEach((log) => {
    log.sets.forEach((set) => {
      const estimated = estimateE1rmBrzycki(set.weight, set.reps)
      if (!estimated) {
        return
      }

      const current = rawSamplesByExercise.get(log.exerciseId) ?? []
      current.push(estimated)
      rawSamplesByExercise.set(log.exerciseId, current)
    })
  })

  const result = new Map<string, ExerciseE1rmMeta>()
  routineExercises.forEach((exercise) => {
    const samples = rawSamplesByExercise.get(exercise.id) ?? []
    const sampleCount = samples.length
    if (sampleCount === 0) {
      return
    }

    const stableWindow = samples.slice(0, 12)
    const e1rm = median(stableWindow)
    if (!e1rm) {
      return
    }

    const anchorReps = parseRepTargetAnchor(exercise.targetReps)
    const projected = anchorReps ? projectLoadFromE1rmBrzycki(e1rm, anchorReps) : null
    const suggestedWeight = projected ? roundTrainingLoad(projected, units) : null

    result.set(exercise.id, {
      e1rm,
      sampleCount,
      anchorReps,
      suggestedWeight,
    })
  })

  return result
}

const resolveMediaPath = (path: string | null): string | null => {
  if (!path) {
    return null
  }
  return `${import.meta.env.BASE_URL}${path}`
}

const resolveStaticPath = (path: string): string => `${import.meta.env.BASE_URL}${path}`

const buildInitialState = (): {
  routineBundle: RoutineBundle
  media: MediaItem[]
  logs: WorkoutLog[]
  settings: AppSettings
} => {
  const rawRoutine = loadJson<unknown>(STORAGE_KEYS.routine, seedRoutineBundle)
  const routineBundle = normalizeRoutineBundleState(rawRoutine)

  const rawMedia = loadJson<unknown>(STORAGE_KEYS.media, seedMedia)
  const media = normalizeMediaState(rawMedia)

  const rawLogs = loadJson<unknown>(STORAGE_KEYS.logs, [])
  const logs = normalizeLogsState(rawLogs, routineBundle)

  const rawSettings = loadJson<unknown>(STORAGE_KEYS.settings, seedSettings)
  const settings = normalizeSettingsState(rawSettings, routineBundle)

  return { routineBundle, media, logs, settings }
}

function App() {
  const initialState = useMemo(buildInitialState, [])

  const [activeTab, setActiveTab] = useState<TabKey>('dashboard')
  const [routineBundle, setRoutineBundle] = useState<RoutineBundle>(initialState.routineBundle)
  const [media, setMedia] = useState<MediaItem[]>(initialState.media)
  const [logs, setLogs] = useState<WorkoutLog[]>(initialState.logs)
  const [settings, setSettings] = useState<AppSettings>(initialState.settings)

  const [routineEditorDayId, setRoutineEditorDayId] = useState<string>('')
  const [trackDayId, setTrackDayId] = useState<string>('')

  const [newRoutineName, setNewRoutineName] = useState('')
  const [newRoutineDescription, setNewRoutineDescription] = useState('')
  const [newDayName, setNewDayName] = useState('')
  const [newDayFocus, setNewDayFocus] = useState('')
  const [newExerciseName, setNewExerciseName] = useState('')
  const [newExerciseGroup, setNewExerciseGroup] = useState('')

  const [workoutDraft, setWorkoutDraft] = useState<WorkoutDraft>({})
  const [uiMessage, setUiMessage] = useState('')

  const [mediaSearchTerm, setMediaSearchTerm] = useState('')
  const [mediaTypeFilter, setMediaTypeFilter] = useState<MediaTypeFilter>('all')
  const [mediaOriginFilter, setMediaOriginFilter] = useState<MediaOriginFilter>('all')

  const [internetQuery, setInternetQuery] = useState('')
  const [internetResults, setInternetResults] = useState<InternetMediaResult[]>([])
  const [internetLoading, setInternetLoading] = useState(false)
  const [internetError, setInternetError] = useState('')

  useEffect(() => {
    saveJson(STORAGE_KEYS.routine, routineBundle)
  }, [routineBundle])

  useEffect(() => {
    saveJson(STORAGE_KEYS.media, media)
  }, [media])

  useEffect(() => {
    saveJson(STORAGE_KEYS.logs, logs)
  }, [logs])

  useEffect(() => {
    saveJson(STORAGE_KEYS.settings, settings)
  }, [settings])

  const nonArchivedRoutines = useMemo(
    () => routineBundle.routines.filter((routine) => !routine.isArchived),
    [routineBundle.routines],
  )

  const routineById = useMemo(
    () => new Map(routineBundle.routines.map((routine) => [routine.id, routine])),
    [routineBundle.routines],
  )

  useEffect(() => {
    if (nonArchivedRoutines.length === 0) {
      return
    }

    const selectedRoutineId = settings.selectedRoutineId
    if (!selectedRoutineId || !routineById.has(selectedRoutineId) || routineById.get(selectedRoutineId)?.isArchived) {
      setSettings((prev) => ({
        ...prev,
        selectedRoutineId: nonArchivedRoutines[0].id,
      }))
    }
  }, [settings.selectedRoutineId, routineById, nonArchivedRoutines])

  const activeRoutine = useMemo(() => {
    if (!settings.selectedRoutineId) {
      return nonArchivedRoutines[0] ?? null
    }
    const candidate = routineById.get(settings.selectedRoutineId)
    if (!candidate || candidate.isArchived) {
      return nonArchivedRoutines[0] ?? null
    }
    return candidate
  }, [settings.selectedRoutineId, routineById, nonArchivedRoutines])

  const activeRoutineId = activeRoutine?.id ?? ''

  const routineDays = useMemo(
    () => sortDays(routineBundle.days.filter((day) => day.routineId === activeRoutineId)),
    [routineBundle.days, activeRoutineId],
  )

  const allExercisesForActiveRoutine = useMemo(
    () => routineBundle.exercises.filter((exercise) => exercise.routineId === activeRoutineId),
    [routineBundle.exercises, activeRoutineId],
  )

  const exercisesByDay = useMemo(() => {
    const map = new Map<string, RoutineExercise[]>()
    routineDays.forEach((day) => {
      map.set(
        day.id,
        sortExercises(allExercisesForActiveRoutine.filter((exercise) => exercise.dayId === day.id)),
      )
    })
    return map
  }, [routineDays, allExercisesForActiveRoutine])

  useEffect(() => {
    if (routineDays.length === 0) {
      setRoutineEditorDayId('')
      setTrackDayId('')
      return
    }

    if (!routineDays.some((day) => day.id === routineEditorDayId)) {
      setRoutineEditorDayId(routineDays[0].id)
    }

    if (!routineDays.some((day) => day.id === trackDayId)) {
      setTrackDayId(routineDays[0].id)
    }
  }, [routineDays, routineEditorDayId, trackDayId])

  const routineEditorDay = routineDays.find((day) => day.id === routineEditorDayId) ?? null
  const trackDay = routineDays.find((day) => day.id === trackDayId) ?? null

  const editorExercises = useMemo(
    () => exercisesByDay.get(routineEditorDayId) ?? [],
    [exercisesByDay, routineEditorDayId],
  )
  const trackExercises = useMemo(
    () => exercisesByDay.get(trackDayId) ?? [],
    [exercisesByDay, trackDayId],
  )

  useEffect(() => {
    setWorkoutDraft((prev) => {
      const next = { ...prev }
      trackExercises.forEach((exercise) => {
        if (!next[exercise.id]) {
          next[exercise.id] = {
            sets: Array.from({ length: Math.max(exercise.targetSets, 1) }, emptyWorkoutSet),
            notes: '',
          }
        }
      })
      return next
    })
  }, [trackExercises])

  const requestRoutineChange = (nextRoutineId: string, reason: 'manual' | 'system' = 'manual'): boolean => {
    if (!nextRoutineId || nextRoutineId === settings.selectedRoutineId) {
      return true
    }

    const shouldConfirm =
      reason === 'manual' &&
      settings.routineLockEnabled &&
      Boolean(settings.selectedRoutineId)

    if (shouldConfirm) {
      const ok = window.confirm(
        'Cambiar la rutina activa de este dispositivo puede mezclar el flujo de tracking. Quieres cambiar la rutina que estas registrando?',
      )
      if (!ok) {
        return false
      }
    }

    setSettings((prev) => ({
      ...prev,
      selectedRoutineId: nextRoutineId,
      routineLockConfirmedAt: new Date().toISOString(),
    }))

    return true
  }

  const updateRoutineBundle = (updater: (current: RoutineBundle) => RoutineBundle): void => {
    setRoutineBundle((current) => updater(current))
  }

  const updateActiveRoutineField = (field: 'name' | 'description', value: string): void => {
    if (!activeRoutine) {
      return
    }

    updateRoutineBundle((current) => ({
      ...current,
      routines: current.routines.map((routine) =>
        routine.id === activeRoutine.id
          ? {
              ...routine,
              [field]: field === 'name' ? toTitle(value) : value,
              updatedAt: new Date().toISOString(),
            }
          : routine,
      ),
    }))
  }

  const createRoutine = (): void => {
    const name = newRoutineName.trim()
    if (!name) {
      return
    }

    const timestamp = new Date().toISOString()
    const routineId = createId('routine')
    const dayId = createId('day')

    const routine: Routine = {
      id: routineId,
      name: toTitle(name),
      description: newRoutineDescription.trim(),
      createdAt: timestamp,
      updatedAt: timestamp,
      isArchived: false,
    }

    const firstDay: RoutineDay = {
      id: dayId,
      routineId,
      name: 'Dia 1',
      focus: 'Nuevo foco',
      order: 1,
    }

    updateRoutineBundle((current) => ({
      routines: [...current.routines, routine],
      days: [...current.days, firstDay],
      exercises: current.exercises,
    }))

    setNewRoutineName('')
    setNewRoutineDescription('')
    setUiMessage('Rutina creada. Si quieres usarla en este dispositivo, seleccionala y confirma el cambio.')
  }

  const archiveRoutine = (routineId: string, archive: boolean): void => {
    const routine = routineById.get(routineId)
    if (!routine) {
      return
    }

    if (routine.id === activeRoutineId && archive) {
      setUiMessage('No puedes archivar la rutina activa. Cambia de rutina primero.')
      return
    }

    updateRoutineBundle((current) => ({
      ...current,
      routines: current.routines.map((item) =>
        item.id === routineId
          ? {
              ...item,
              isArchived: archive,
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    }))
  }

  const addDay = (): void => {
    if (!activeRoutine) {
      return
    }

    const name = newDayName.trim()
    if (!name) {
      return
    }

    const nextDay: RoutineDay = {
      id: createId('day'),
      routineId: activeRoutine.id,
      name: toTitle(name),
      focus: newDayFocus.trim() || 'Sin foco definido',
      order: routineDays.length + 1,
    }

    updateRoutineBundle((current) => ({
      ...current,
      days: [...current.days, nextDay],
    }))

    setRoutineEditorDayId(nextDay.id)
    setTrackDayId(nextDay.id)
    setNewDayName('')
    setNewDayFocus('')
  }

  const updateDayField = (dayId: string, field: 'name' | 'focus', value: string): void => {
    updateRoutineBundle((current) => ({
      ...current,
      days: current.days.map((day) =>
        day.id === dayId
          ? {
              ...day,
              [field]: field === 'name' ? toTitle(value) : value,
            }
          : day,
      ),
    }))
  }

  const deleteDay = (dayId: string): void => {
    if (!window.confirm('Eliminar dia y ejercicios asociados?')) {
      return
    }

    const removedExerciseIds = new Set(
      routineBundle.exercises.filter((exercise) => exercise.dayId === dayId).map((exercise) => exercise.id),
    )

    updateRoutineBundle((current) => ({
      routines: current.routines,
      days: current.days
        .filter((day) => day.id !== dayId)
        .map((day) => {
          if (day.routineId !== activeRoutineId) {
            return day
          }
          const sorted = sortDays(current.days.filter((item) => item.routineId === activeRoutineId && item.id !== dayId))
          const nextOrder = sorted.findIndex((item) => item.id === day.id) + 1
          return nextOrder > 0 ? { ...day, order: nextOrder } : day
        }),
      exercises: current.exercises.filter((exercise) => !removedExerciseIds.has(exercise.id)),
    }))

    setLogs((current) => current.filter((log) => log.dayId !== dayId && !removedExerciseIds.has(log.exerciseId)))
  }

  const addExercise = (): void => {
    if (!activeRoutine || !routineEditorDayId) {
      return
    }

    const name = newExerciseName.trim()
    if (!name) {
      return
    }

    const dayExercises = exercisesByDay.get(routineEditorDayId) ?? []

    const exercise: RoutineExercise = {
      id: createId('ex'),
      routineId: activeRoutine.id,
      dayId: routineEditorDayId,
      slug: toSlug(name),
      name: toTitle(name),
      muscleGroup: newExerciseGroup.trim() || 'General',
      targetSets: 4,
      targetReps: '8-12',
      targetWeight: 0,
      restSeconds: 60,
      notes: '',
      order: dayExercises.length + 1,
    }

    updateRoutineBundle((current) => ({
      ...current,
      exercises: [...current.exercises, exercise],
    }))

    setNewExerciseName('')
    setNewExerciseGroup('')
  }

  const updateExercise = (exerciseId: string, patch: Partial<RoutineExercise>): void => {
    updateRoutineBundle((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              ...patch,
              slug: patch.name ? toSlug(patch.name) : exercise.slug,
            }
          : exercise,
      ),
    }))
  }

  const applySuggestedTargetWeight = (exercise: RoutineExercise): void => {
    const meta = e1rmByExercise.get(exercise.id)
    if (!meta || meta.sampleCount < MIN_E1RM_SAMPLES || !meta.suggestedWeight) {
      setUiMessage('Faltan datos para sugerir un peso objetivo estable en este ejercicio.')
      return
    }

    updateExercise(exercise.id, { targetWeight: meta.suggestedWeight })
    setUiMessage(`Objetivo de ${exercise.name} actualizado a ${meta.suggestedWeight} ${settings.units} (e1RM).`)
  }

  const deleteExercise = (exerciseId: string): void => {
    if (!window.confirm('Eliminar ejercicio?')) {
      return
    }

    updateRoutineBundle((current) => ({
      ...current,
      exercises: current.exercises.filter((exercise) => exercise.id !== exerciseId),
    }))

    setLogs((current) => current.filter((log) => log.exerciseId !== exerciseId))
  }

  const moveExercise = (exerciseId: string, direction: 'up' | 'down'): void => {
    const currentDayExercises = [...(exercisesByDay.get(routineEditorDayId) ?? [])]
    const index = currentDayExercises.findIndex((exercise) => exercise.id === exerciseId)
    if (index < 0) {
      return
    }

    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= currentDayExercises.length) {
      return
    }

    const reordered = [...currentDayExercises]
    const [item] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, item)

    const orderMap = new Map(reordered.map((exercise, order) => [exercise.id, order + 1]))

    updateRoutineBundle((current) => ({
      ...current,
      exercises: current.exercises.map((exercise) =>
        orderMap.has(exercise.id)
          ? {
              ...exercise,
              order: orderMap.get(exercise.id) ?? exercise.order,
            }
          : exercise,
      ),
    }))
  }

  const updateWorkoutSet = (
    exerciseId: string,
    setId: string,
    field: keyof WorkoutSet,
    rawValue: string | boolean,
  ): void => {
    setWorkoutDraft((prev) => {
      const draft = prev[exerciseId]
      if (!draft) {
        return prev
      }

      const sets = draft.sets.map((set) => {
        if (set.id !== setId) {
          return set
        }

        if (field === 'done') {
          return { ...set, done: Boolean(rawValue) }
        }

        const numericValue = Number(rawValue)
        if (!Number.isFinite(numericValue)) {
          return set
        }

        return { ...set, [field]: numericValue }
      })

      return {
        ...prev,
        [exerciseId]: {
          ...draft,
          sets,
        },
      }
    })
  }

  const updateWorkoutNotes = (exerciseId: string, value: string): void => {
    setWorkoutDraft((prev) => {
      const draft = prev[exerciseId]
      if (!draft) {
        return prev
      }

      return {
        ...prev,
        [exerciseId]: {
          ...draft,
          notes: value,
        },
      }
    })
  }

  const addWorkoutSet = (exerciseId: string): void => {
    setWorkoutDraft((prev) => {
      const draft = prev[exerciseId]
      if (!draft) {
        return prev
      }

      return {
        ...prev,
        [exerciseId]: {
          ...draft,
          sets: [...draft.sets, emptyWorkoutSet()],
        },
      }
    })
  }

  const removeWorkoutSet = (exerciseId: string, setId: string): void => {
    setWorkoutDraft((prev) => {
      const draft = prev[exerciseId]
      if (!draft || draft.sets.length <= 1) {
        return prev
      }

      return {
        ...prev,
        [exerciseId]: {
          ...draft,
          sets: draft.sets.filter((set) => set.id !== setId),
        },
      }
    })
  }

  const saveWorkoutSession = (): void => {
    if (!activeRoutine || !trackDay) {
      return
    }

    const now = new Date().toISOString()
    const entries: WorkoutLog[] = []

    trackExercises.forEach((exercise) => {
      const draft = workoutDraft[exercise.id]
      if (!draft) {
        return
      }

      const relevantSets = draft.sets.filter((set) => set.done || set.reps > 0 || set.weight > 0)

      if (relevantSets.length === 0 && !draft.notes.trim()) {
        return
      }

      entries.push({
        id: createId('log'),
        createdAt: now,
        routineId: activeRoutine.id,
        routineName: activeRoutine.name,
        dayId: trackDay.id,
        dayName: trackDay.name,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        sets: relevantSets.length > 0 ? relevantSets : draft.sets,
        notes: draft.notes,
      })
    })

    if (entries.length === 0) {
      setUiMessage('No hay sets cargados para guardar.')
      return
    }

    const nextLogs = [...entries, ...logs]
    setLogs(nextLogs)

    const nextRoutineLogs = nextLogs.filter((log) => log.routineId === activeRoutine.id)
    const nextE1rmByExercise = buildE1rmMetaByExercise(nextRoutineLogs, allExercisesForActiveRoutine, settings.units)
    const suggestedWeightByExerciseId = new Map<string, number>()

    trackExercises.forEach((exercise) => {
      const meta = nextE1rmByExercise.get(exercise.id)
      if (!meta || meta.sampleCount < MIN_E1RM_SAMPLES || meta.suggestedWeight === null) {
        return
      }
      suggestedWeightByExerciseId.set(exercise.id, meta.suggestedWeight)
    })

    if (suggestedWeightByExerciseId.size > 0) {
      updateRoutineBundle((current) => ({
        ...current,
        exercises: current.exercises.map((exercise) =>
          suggestedWeightByExerciseId.has(exercise.id)
            ? {
                ...exercise,
                targetWeight: suggestedWeightByExerciseId.get(exercise.id) ?? exercise.targetWeight,
              }
            : exercise,
        ),
      }))
    }

    setWorkoutDraft((prev) => {
      const next = { ...prev }
      trackExercises.forEach((exercise) => {
        next[exercise.id] = {
          sets: Array.from({ length: Math.max(exercise.targetSets, 1) }, emptyWorkoutSet),
          notes: '',
        }
      })
      return next
    })

    const autoUpdated = suggestedWeightByExerciseId.size
    const suffix =
      autoUpdated > 0
        ? ` Objetivos actualizados automaticamente por e1RM en ${autoUpdated} ejercicios.`
        : ' No hubo actualizacion automatica de objetivos (faltan datos o reps objetivo fuera de 1-10).'
    setUiMessage(`Sesion guardada: ${entries.length} ejercicios registrados en ${activeRoutine.name}.${suffix}`)
  }

  const updateMediaRole = (mediaId: string, role: MediaRole): void => {
    setMedia((current) => current.map((item) => (item.id === mediaId ? { ...item, role } : item)))
  }

  const removeExternalMedia = (mediaId: string): void => {
    setMedia((current) => current.filter((item) => !(item.id === mediaId && item.origin === 'external')))
  }

  const localFilteredMedia = useMemo(() => {
    const query = mediaSearchTerm.trim().toLowerCase()

    return media.filter((item) => {
      if (mediaTypeFilter !== 'all' && item.type !== mediaTypeFilter) {
        return false
      }
      if (mediaOriginFilter !== 'all' && item.origin !== mediaOriginFilter) {
        return false
      }

      if (!query) {
        return true
      }

      const haystack = [
        item.title,
        item.slug,
        item.provider,
        item.license ?? '',
        item.attribution ?? '',
        item.path ?? '',
        item.externalUrl ?? '',
        item.tags.join(' '),
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [media, mediaSearchTerm, mediaTypeFilter, mediaOriginFilter])

  const searchInternet = async (): Promise<void> => {
    const query = internetQuery.trim()
    if (!query) {
      return
    }

    setInternetLoading(true)
    setInternetError('')

    try {
      const results = await searchInternetMedia(query)
      setInternetResults(results)
      if (results.length === 0) {
        setInternetError('No se encontraron resultados externos para esa busqueda.')
      }
    } catch {
      setInternetError('No fue posible consultar fuentes externas en este momento.')
    } finally {
      setInternetLoading(false)
    }
  }

  const clearInternetSearch = (): void => {
    setInternetQuery('')
    setInternetResults([])
    setInternetError('')
  }

  const addExternalMediaToLibrary = (result: InternetMediaResult): void => {
    setMedia((current) => {
      const exists = current.some((item) => item.externalUrl === result.url)
      if (exists) {
        return current
      }

      const item: MediaItem = {
        id: createId('external-media'),
        title: result.title,
        slug: toSlug(result.title),
        type: result.type,
        role: 'reference',
        origin: 'external',
        provider: result.provider,
        path: null,
        externalUrl: result.url,
        thumbnailUrl: result.thumbnailUrl,
        license: result.license,
        attribution: result.attribution,
        tags: result.tags,
        isDuplicate: false,
        checksum: null,
        createdAt: new Date().toISOString(),
      }

      return [item, ...current]
    })

    setUiMessage('Recurso externo agregado a tu biblioteca de media.')
  }

  const logsForActiveRoutine = useMemo(
    () => logs.filter((log) => log.routineId === activeRoutineId),
    [logs, activeRoutineId],
  )

  const e1rmByExercise = useMemo(() => {
    return buildE1rmMetaByExercise(logsForActiveRoutine, allExercisesForActiveRoutine, settings.units)
  }, [logsForActiveRoutine, allExercisesForActiveRoutine, settings.units])

  const e1rmReadyExerciseCount = useMemo(
    () =>
      allExercisesForActiveRoutine.filter((exercise) => {
        const meta = e1rmByExercise.get(exercise.id)
        return Boolean(meta && meta.sampleCount >= MIN_E1RM_SAMPLES)
      }).length,
    [allExercisesForActiveRoutine, e1rmByExercise],
  )

  const recentSessions = useMemo(() => {
    const sessionMap = new Map<
      string,
      {
        id: string
        createdAt: string
        dayName: string
        totalSets: number
        exercisesByName: Map<string, number>
      }
    >()

    logsForActiveRoutine.forEach((log) => {
      const sessionId = `${log.createdAt}::${log.routineId}::${log.dayId}`
      const setCount = log.sets.length
      const existing = sessionMap.get(sessionId)
      if (!existing) {
        sessionMap.set(sessionId, {
          id: sessionId,
          createdAt: log.createdAt,
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
      .slice(0, 8)
      .map(
        (session): SessionSummary => ({
          id: session.id,
          createdAt: session.createdAt,
          dayName: session.dayName,
          totalSets: session.totalSets,
          exerciseCount: session.exercisesByName.size,
          exercises: Array.from(session.exercisesByName.entries())
            .map(([exerciseName, setCount]) => ({ exerciseName, setCount }))
            .sort((a, b) => b.setCount - a.setCount || a.exerciseName.localeCompare(b.exerciseName)),
        }),
      )
  }, [logsForActiveRoutine])

  const dayStats = useMemo(
    () =>
      routineDays.map((day) => ({
        ...day,
        exerciseCount: (exercisesByDay.get(day.id) ?? []).length,
        logCount: logsForActiveRoutine.filter((log) => log.dayId === day.id).length,
      })),
    [routineDays, exercisesByDay, logsForActiveRoutine],
  )

  const mediaCounts = useMemo(
    () => ({
      total: media.length,
      local: media.filter((item) => item.origin === 'local').length,
      external: media.filter((item) => item.origin === 'external').length,
      images: media.filter((item) => item.type === 'image').length,
      videos: media.filter((item) => item.type === 'video').length,
    }),
    [media],
  )

  const exportBackup = (): void => {
    downloadJson(`training-app-backup-${new Date().toISOString().slice(0, 10)}.json`, {
      routineBundle,
      media,
      logs,
      settings,
      exportedAt: new Date().toISOString(),
    })
  }

  const importBackup = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const parsed = await readJsonFile<ImportPayload>(file)
      const nextRoutineBundle = normalizeRoutineBundleState(parsed.routineBundle)
      const nextMedia = normalizeMediaState(parsed.media)
      const nextLogs = normalizeLogsState(parsed.logs, nextRoutineBundle)
      let nextSettings = normalizeSettingsState(parsed.settings, nextRoutineBundle)

      if (
        settings.routineLockEnabled &&
        nextSettings.selectedRoutineId &&
        settings.selectedRoutineId &&
        nextSettings.selectedRoutineId !== settings.selectedRoutineId
      ) {
        const confirmed = window.confirm(
          'El backup tiene una rutina activa diferente. Quieres cambiar la rutina activa de este dispositivo?',
        )

        if (!confirmed) {
          nextSettings = {
            ...nextSettings,
            selectedRoutineId: settings.selectedRoutineId,
          }
        }
      }

      setRoutineBundle(nextRoutineBundle)
      setMedia(nextMedia)
      setLogs(nextLogs)
      setSettings(nextSettings)
      setUiMessage('Backup importado correctamente.')
    } catch {
      setUiMessage('No se pudo importar el archivo.')
    } finally {
      event.target.value = ''
    }
  }

  const resetAllData = (): void => {
    if (!window.confirm('Resetear rutinas, media y registros?')) {
      return
    }

    setRoutineBundle(seedRoutineBundle)
    setMedia(seedMedia)
    setLogs([])
    setSettings(seedSettings)
    setWorkoutDraft({})
    setUiMessage('Datos restaurados a la configuracion inicial.')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Training App</h1>
          <p className="topbar-tagline">
            <img src={resolveStaticPath('icons/pixel/home.svg')} alt="" aria-hidden="true" />
            Entrena con foco cada dia.
          </p>
        </div>
        <span className="badge">{settings.units.toUpperCase()}</span>
      </header>

      <nav className="tabbar" aria-label="Navegacion principal">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={tab.key === activeTab ? 'tab active' : 'tab'}
            onClick={() => setActiveTab(tab.key)}
          >
            <img src={resolveStaticPath(tab.iconPath)} alt="" aria-hidden="true" className="tab-icon" />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <main className="content">
        {uiMessage && (
          <section className="panel full">
            <p className="hint">{uiMessage}</p>
          </section>
        )}

        {activeTab === 'dashboard' && (
          <section className="panel-grid">
            <article className="panel stat">
              <h2>Rutina activa</h2>
              <p>{activeRoutine?.name ?? 'Sin rutina'}</p>
              <p>Rutinas disponibles: {nonArchivedRoutines.length}</p>
              <p>Dias de la rutina activa: {routineDays.length}</p>
              <p>Ejercicios de la rutina activa: {allExercisesForActiveRoutine.length}</p>
            </article>

            <article className="panel stat">
              <h2>Tracking</h2>
              <p>{logsForActiveRoutine.length} registros en rutina activa</p>
              <p>e1RM disponible en {e1rmReadyExerciseCount}/{allExercisesForActiveRoutine.length} ejercicios</p>
              <p>Lock rutina por dispositivo: {settings.routineLockEnabled ? 'Activo' : 'Inactivo'}</p>
            </article>

            <article className="panel stat">
              <h2>Media</h2>
              <p>{mediaCounts.total} recursos</p>
              <p>{mediaCounts.local} locales</p>
              <p>{mediaCounts.external} externos (URL)</p>
              <p>{mediaCounts.videos} videos</p>
            </article>

            <article className="panel full">
              <h2 className="heading-with-icon">
                <img src={resolveStaticPath('icons/pixel/calendar.svg')} alt="" aria-hidden="true" />
                Dias de la rutina activa
              </h2>
              <div className="day-overview">
                {dayStats.map((day) => (
                  <button
                    key={day.id}
                    type="button"
                    className="day-chip"
                    onClick={() => {
                      setTrackDayId(day.id)
                      setActiveTab('workout')
                    }}
                  >
                    <strong>{day.name}</strong>
                    <span>{day.focus}</span>
                    <span>{day.exerciseCount} ejercicios</span>
                    <span>{day.logCount} logs</span>
                  </button>
                ))}
              </div>
            </article>

            <article className="panel full">
              <h2>Sesiones recientes (rutina activa)</h2>
              <div className="logs-list">
                {recentSessions.length === 0 && <p>No hay sesiones registradas para esta rutina.</p>}
                {recentSessions.map((session) => (
                  <div key={session.id} className="log-row">
                    <strong>{new Date(session.createdAt).toLocaleString()}</strong>
                    <span>{session.dayName}</span>
                    <span>{session.exerciseCount} ejercicios | {session.totalSets} sets</span>
                    <span>
                      {session.exercises.map((exercise) => `${exercise.exerciseName}: ${exercise.setCount} sets`).join(' | ')}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          </section>
        )}

        {activeTab === 'routines' && (
          <section className="panel-grid">
            <article className="panel full">
              <h2>Seleccion de rutina (dispositivo)</h2>
              <label>
                Rutina activa
                <select
                  value={activeRoutineId}
                  onChange={(event) => requestRoutineChange(event.target.value, 'manual')}
                >
                  {nonArchivedRoutines.map((routine) => (
                    <option key={routine.id} value={routine.id}>
                      {routine.name}
                    </option>
                  ))}
                </select>
              </label>
              <p className="hint">
                Este dispositivo recuerda la rutina seleccionada y pedira confirmacion antes de cambiarla.
              </p>
            </article>

            <article className="panel full">
              <h2>Crear rutina desde cero (UI)</h2>
              <div className="inline-form">
                <input
                  value={newRoutineName}
                  placeholder="Nombre de rutina"
                  onChange={(event) => setNewRoutineName(event.target.value)}
                />
                <input
                  value={newRoutineDescription}
                  placeholder="Descripcion"
                  onChange={(event) => setNewRoutineDescription(event.target.value)}
                />
                <button type="button" onClick={createRoutine}>
                  Crear rutina
                </button>
              </div>
              <p className="hint">La rutina nueva incluye un Dia 1 base para empezar a cargar ejercicios.</p>
            </article>

            <article className="panel full">
              <h2>Rutinas disponibles</h2>
              <div className="day-list">
                {routineBundle.routines.map((routine) => (
                  <div key={routine.id} className={routine.id === activeRoutineId ? 'day-card selected' : 'day-card'}>
                    <label>
                      Nombre
                      <input
                        value={routine.name}
                        disabled={routine.id !== activeRoutineId}
                        onChange={(event) => updateActiveRoutineField('name', event.target.value)}
                      />
                    </label>
                    <label>
                      Descripcion
                      <input
                        value={routine.description}
                        disabled={routine.id !== activeRoutineId}
                        onChange={(event) => updateActiveRoutineField('description', event.target.value)}
                      />
                    </label>
                    <div className="row-actions">
                      <button type="button" onClick={() => requestRoutineChange(routine.id, 'manual')}>
                        Usar en este dispositivo
                      </button>
                      <button
                        type="button"
                        className="danger"
                        onClick={() => archiveRoutine(routine.id, !routine.isArchived)}
                        disabled={routine.id === activeRoutineId && !routine.isArchived}
                      >
                        {routine.isArchived ? 'Desarchivar' : 'Archivar'}
                      </button>
                    </div>
                    <p className="hint">Estado: {routine.isArchived ? 'Archivada' : 'Activa'}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel full">
              <h2>Dias de {activeRoutine?.name ?? 'rutina'}</h2>
              <div className="inline-form">
                <input value={newDayName} placeholder="Nuevo dia" onChange={(event) => setNewDayName(event.target.value)} />
                <input value={newDayFocus} placeholder="Foco" onChange={(event) => setNewDayFocus(event.target.value)} />
                <button type="button" onClick={addDay} disabled={!activeRoutine}>
                  Agregar dia
                </button>
              </div>

              <div className="day-list">
                {routineDays.map((day) => (
                  <div key={day.id} className={day.id === routineEditorDayId ? 'day-card selected' : 'day-card'}>
                    <label>
                      Nombre
                      <input value={day.name} onChange={(event) => updateDayField(day.id, 'name', event.target.value)} />
                    </label>
                    <label>
                      Foco
                      <input value={day.focus} onChange={(event) => updateDayField(day.id, 'focus', event.target.value)} />
                    </label>
                    <div className="row-actions">
                      <button type="button" onClick={() => setRoutineEditorDayId(day.id)}>
                        Editar ejercicios
                      </button>
                      <button type="button" onClick={() => setTrackDayId(day.id)}>
                        Usar en tracking
                      </button>
                      <button type="button" className="danger" onClick={() => deleteDay(day.id)}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel full">
              <h2>Ejercicios de {routineEditorDay?.name ?? 'dia'}</h2>
              <div className="inline-form">
                <input
                  value={newExerciseName}
                  placeholder="Nuevo ejercicio"
                  onChange={(event) => setNewExerciseName(event.target.value)}
                />
                <input
                  value={newExerciseGroup}
                  placeholder="Grupo muscular"
                  onChange={(event) => setNewExerciseGroup(event.target.value)}
                />
                <button type="button" onClick={addExercise} disabled={!routineEditorDayId}>
                  Agregar ejercicio
                </button>
              </div>

              <div className="exercise-list">
                {editorExercises.map((exercise, index) => {
                  const e1rmMeta = e1rmByExercise.get(exercise.id)
                  const hasStableE1rm = Boolean(e1rmMeta && e1rmMeta.sampleCount >= MIN_E1RM_SAMPLES)

                  return (
                    <article key={exercise.id} className="exercise-card">
                      <div className="exercise-head">
                        <h3>
                          {index + 1}. {exercise.name}
                        </h3>
                        <div className="row-actions">
                          <button type="button" onClick={() => moveExercise(exercise.id, 'up')}>
                            Subir
                          </button>
                          <button type="button" onClick={() => moveExercise(exercise.id, 'down')}>
                            Bajar
                          </button>
                          <button type="button" className="danger" onClick={() => deleteExercise(exercise.id)}>
                            Eliminar
                          </button>
                        </div>
                      </div>

                      <div className="grid-two">
                        <label>
                          Nombre
                          <input
                            value={exercise.name}
                            onChange={(event) => updateExercise(exercise.id, { name: event.target.value })}
                          />
                        </label>
                        <label>
                          Grupo
                          <input
                            value={exercise.muscleGroup}
                            onChange={(event) => updateExercise(exercise.id, { muscleGroup: event.target.value })}
                          />
                        </label>
                        <label>
                          Sets objetivo
                          <input
                            type="number"
                            min={1}
                            value={exercise.targetSets}
                            onChange={(event) =>
                              updateExercise(exercise.id, { targetSets: Math.max(1, Number(event.target.value) || 1) })
                            }
                          />
                        </label>
                        <label>
                          Reps objetivo
                          <input
                            value={exercise.targetReps}
                            onChange={(event) => updateExercise(exercise.id, { targetReps: event.target.value })}
                          />
                        </label>
                        <label>
                          Peso objetivo ({settings.units})
                          <input
                            type="number"
                            min={0}
                            value={exercise.targetWeight}
                            onChange={(event) =>
                              updateExercise(exercise.id, { targetWeight: Math.max(0, Number(event.target.value) || 0) })
                            }
                          />
                        </label>
                      </div>

                      {hasStableE1rm ? (
                        <div className="hint">
                          e1RM estimado: {e1rmMeta?.e1rm.toFixed(1)} {settings.units} ({e1rmMeta?.sampleCount} sets validos).
                          {e1rmMeta?.suggestedWeight && e1rmMeta.anchorReps
                            ? ` Sugerencia: ${e1rmMeta.suggestedWeight} ${settings.units} para ${e1rmMeta.anchorReps} reps.`
                            : ' Sin sugerencia de carga: usa objetivo de reps dentro de 1-10 para este metodo.'}
                        </div>
                      ) : (
                        <p className="hint">
                          e1RM: faltan datos (minimo {MIN_E1RM_SAMPLES} sets validos entre 1 y 10 reps).
                        </p>
                      )}

                      {hasStableE1rm && e1rmMeta?.suggestedWeight ? (
                        <div className="row-actions">
                          <button type="button" onClick={() => applySuggestedTargetWeight(exercise)}>
                            Usar peso sugerido e1RM
                          </button>
                        </div>
                      ) : null}

                      <label>
                        Notas
                        <textarea
                          value={exercise.notes}
                          onChange={(event) => updateExercise(exercise.id, { notes: event.target.value })}
                        />
                      </label>
                    </article>
                  )
                })}
              </div>
            </article>
          </section>
        )}

        {activeTab === 'workout' && (
          <section className="panel-grid">
            <article className="panel full">
              <h2>Tracking por dia</h2>
              <label>
                Rutina activa
                <select
                  value={activeRoutineId}
                  onChange={(event) => requestRoutineChange(event.target.value, 'manual')}
                >
                  {nonArchivedRoutines.map((routine) => (
                    <option key={routine.id} value={routine.id}>
                      {routine.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Dia
                <select value={trackDayId} onChange={(event) => setTrackDayId(event.target.value)}>
                  {routineDays.map((day) => (
                    <option key={day.id} value={day.id}>
                      {day.name} - {day.focus}
                    </option>
                  ))}
                </select>
              </label>
              <p className="hint">Fecha: {new Date().toLocaleDateString()}</p>
            </article>

            {trackExercises.map((exercise) => {
              const draft = workoutDraft[exercise.id]
              const e1rmMeta = e1rmByExercise.get(exercise.id)
              const hasStableE1rm = Boolean(e1rmMeta && e1rmMeta.sampleCount >= MIN_E1RM_SAMPLES)

              return (
                <article key={exercise.id} className="panel full exercise-session">
                  <div className="exercise-head">
                    <h3>{exercise.name}</h3>
                    <p>
                      Objetivo: {exercise.targetSets}x{exercise.targetReps} - {exercise.targetWeight} {settings.units}
                    </p>
                  </div>

                  {hasStableE1rm ? (
                    <p className="hint">
                      e1RM: {e1rmMeta?.e1rm.toFixed(1)} {settings.units} ({e1rmMeta?.sampleCount} sets validos).
                      {e1rmMeta?.suggestedWeight && e1rmMeta.anchorReps
                        ? ` Peso sugerido: ${e1rmMeta.suggestedWeight} ${settings.units} para ${e1rmMeta.anchorReps} reps.`
                        : ' Sin sugerencia de carga por objetivo de reps fuera de 1-10.'}
                    </p>
                  ) : (
                    <p className="hint">e1RM dinamico disponible cuando registres al menos 3 sets validos (1-10 reps).</p>
                  )}

                  {hasStableE1rm && e1rmMeta?.suggestedWeight ? (
                    <div className="row-actions">
                      <button type="button" onClick={() => applySuggestedTargetWeight(exercise)}>
                        Aplicar peso sugerido
                      </button>
                    </div>
                  ) : null}

                  <div className="sets-table-wrap">
                    <table className="sets-table">
                      <thead>
                        <tr>
                          <th>Set</th>
                          <th>Reps</th>
                          <th>Peso</th>
                          <th>OK</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(draft?.sets ?? []).map((set, index) => (
                          <tr key={set.id}>
                            <td>{index + 1}</td>
                            <td>
                              <input
                                type="number"
                                min={0}
                                value={set.reps}
                                onChange={(event) => updateWorkoutSet(exercise.id, set.id, 'reps', event.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min={0}
                                value={set.weight}
                                onChange={(event) => updateWorkoutSet(exercise.id, set.id, 'weight', event.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="checkbox"
                                checked={set.done}
                                onChange={(event) => updateWorkoutSet(exercise.id, set.id, 'done', event.target.checked)}
                              />
                            </td>
                            <td>
                              <button type="button" onClick={() => removeWorkoutSet(exercise.id, set.id)}>
                                -
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="row-actions">
                    <button type="button" onClick={() => addWorkoutSet(exercise.id)}>
                      Agregar set
                    </button>
                  </div>

                  <label>
                    Notas de ejercicio
                    <textarea
                      value={draft?.notes ?? ''}
                      onChange={(event) => updateWorkoutNotes(exercise.id, event.target.value)}
                    />
                  </label>
                </article>
              )
            })}

            <article className="panel full">
              <div className="row-actions">
                <button type="button" className="primary" onClick={saveWorkoutSession}>
                  Guardar sesion del dia
                </button>
              </div>
            </article>
          </section>
        )}

        {activeTab === 'media' && (
          <section className="panel-grid">
            <article className="panel full">
              <h2>Busqueda local en biblioteca</h2>
              <div className="inline-form">
                <input
                  value={mediaSearchTerm}
                  placeholder="Buscar por nombre, tag, proveedor, url"
                  onChange={(event) => setMediaSearchTerm(event.target.value)}
                />
                <select value={mediaTypeFilter} onChange={(event) => setMediaTypeFilter(event.target.value as MediaTypeFilter)}>
                  <option value="all">Todos los tipos</option>
                  <option value="image">Imagenes</option>
                  <option value="video">Videos</option>
                </select>
                <select
                  value={mediaOriginFilter}
                  onChange={(event) => setMediaOriginFilter(event.target.value as MediaOriginFilter)}
                >
                  <option value="all">Todos los origenes</option>
                  <option value="local">Locales</option>
                  <option value="external">Externos</option>
                </select>
              </div>
            </article>

            <article className="panel full">
              <h2>Busqueda en internet</h2>
              <div className="inline-form">
                <input
                  value={internetQuery}
                  placeholder="Buscar en Openverse y Wikimedia"
                  onChange={(event) => setInternetQuery(event.target.value)}
                />
                <button type="button" onClick={searchInternet} disabled={internetLoading}>
                  {internetLoading ? 'Buscando...' : 'Buscar'}
                </button>
                <button
                  type="button"
                  onClick={clearInternetSearch}
                  disabled={internetLoading}
                >
                  Cerrar busqueda
                </button>
              </div>
              {internetError && <p className="hint">{internetError}</p>}
              <p className="hint">
                Los resultados externos se guardan como URL en la biblioteca. Para dejarlos permanentes en el repo, usa pin manual desde codigo.
              </p>
              <p className="hint">
                La busqueda externa prioriza entrenamiento y, si queda vacia, aplica fallback por coincidencia con la consulta.
              </p>
            </article>

            {internetResults.length > 0 && (
              <article className="panel full">
                <div className="exercise-head">
                  <h2>Resultados internet</h2>
                  <div className="row-actions">
                    <button type="button" onClick={clearInternetSearch}>
                      Cerrar resultados
                    </button>
                  </div>
                </div>
                <div className="media-results-grid">
                  {internetResults.map((result) => (
                    <div key={`${result.provider}-${result.id}`} className="media-result-card">
                      <strong>{result.title}</strong>
                      <span className="hint">{result.provider} - {result.type}</span>

                      {result.type === 'image' && result.thumbnailUrl && (
                        <img src={result.thumbnailUrl} alt={result.title} loading="lazy" />
                      )}

                      {result.type === 'video' && (
                        <video controls muted playsInline preload="metadata" src={result.url} />
                      )}

                      <div className="row-actions">
                        <button type="button" onClick={() => addExternalMediaToLibrary(result)}>
                          Guardar URL en biblioteca
                        </button>
                        <a href={result.url} target="_blank" rel="noreferrer" className="link-button">
                          Abrir / Descargar
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            )}

            <article className="panel full">
              <h2>Biblioteca media</h2>
              <div className="media-library-grid">
                {localFilteredMedia.map((item) => {
                  const previewUrl = item.origin === 'local' ? resolveMediaPath(item.path) : (item.externalUrl ?? item.thumbnailUrl)
                  const resourceUrl = item.origin === 'external' ? item.externalUrl : previewUrl

                  return (
                    <article key={item.id} className="panel media-card">
                      <header>
                        <h3>{item.title}</h3>
                        <p>{item.type.toUpperCase()} | {item.origin.toUpperCase()}</p>
                        <p>{item.provider}</p>
                      </header>

                      {item.type === 'video' ? (
                        <video controls muted playsInline preload="metadata" src={previewUrl ?? undefined} />
                      ) : (
                        <img src={previewUrl ?? undefined} alt={item.title} loading="lazy" />
                      )}

                      <label>
                        Rol
                        <select
                          value={item.role}
                          onChange={(event) => updateMediaRole(item.id, event.target.value as MediaRole)}
                        >
                          <option value="single">single</option>
                          <option value="multi">multi</option>
                          <option value="reference">reference</option>
                        </select>
                      </label>

                      <p className="hint">Tags: {item.tags.length > 0 ? item.tags.join(', ') : 'sin tags'}</p>
                      {item.license && <p className="hint">Licencia: {item.license}</p>}

                      <div className="row-actions">
                        {resourceUrl && (
                          <a href={resourceUrl} target="_blank" rel="noreferrer" className="link-button">
                            Abrir recurso
                          </a>
                        )}
                        {item.origin === 'external' && (
                          <button type="button" className="danger" onClick={() => removeExternalMedia(item.id)}>
                            Quitar externo
                          </button>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            </article>
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="panel-grid">
            <article className="panel full">
              <h2>Preferencias</h2>
              <label>
                Unidad de peso
                <select
                  value={settings.units}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      units: event.target.value as 'kg' | 'lb',
                    }))
                  }
                >
                  <option value="kg">kg</option>
                  <option value="lb">lb</option>
                </select>
              </label>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={settings.routineLockEnabled}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      routineLockEnabled: event.target.checked,
                    }))
                  }
                />
                <span>Solicitar confirmacion al cambiar rutina activa en este dispositivo</span>
              </label>

              <p className="hint">Schema version: {settings.schemaVersion}</p>
            </article>

            <article className="panel full">
              <h2>Backup</h2>
              <div className="row-actions">
                <button type="button" onClick={exportBackup}>
                  Exportar JSON
                </button>
                <label className="file-input">
                  Importar JSON
                  <input type="file" accept="application/json" onChange={importBackup} />
                </label>
                <button type="button" className="danger" onClick={resetAllData}>
                  Reset total
                </button>
              </div>
            </article>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
