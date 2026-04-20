import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch'
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
} from './lib/helpers'
import { searchInternetMedia } from './lib/mediaSearch'
import { downloadJson, loadJson, readJsonFile, saveJson } from './lib/storage'
import {
  buildLastPerformanceByExercise,
  buildRecentSessions,
  getSuggestedDay,
  resolveExerciseMedia,
  type ExerciseLastPerformance,
} from './lib/trainingInsights'
import type {
  AppSettings,
  FontScale,
  MediaItem,
  RoutineBundle,
  RoutineExercise,
  WorkoutLog,
  WorkoutSet,
} from './types/training'

type TabKey = 'home' | 'train' | 'settings'
type WorkoutDraft = Record<string, { sets: WorkoutSet[]; notes: string }>
type ExerciseE1rmMeta = {
  e1rm: number
  sampleCount: number
  anchorReps: number | null
  suggestedWeight: number | null
}

type ImportPayload = {
  routineBundle?: unknown
  media?: unknown
  logs?: unknown
  settings?: unknown
  exportedAt?: string
}

const tabs: Array<{ key: TabKey; label: string; iconPath: string }> = [
  { key: 'home', label: 'Inicio', iconPath: 'icons/pixel/home.svg' },
  { key: 'train', label: 'Entreno', iconPath: 'icons/pixel/chart.svg' },
  { key: 'settings', label: 'Ajustes', iconPath: 'icons/pixel/settings-cog.svg' },
]

const FONT_SCALE_LABELS: Record<FontScale, string> = {
  small: 'Pequena',
  medium: 'Mediana',
  large: 'Grande',
}

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

const createDraftForExercise = (
  exercise: RoutineExercise,
  lastPerformance: ExerciseLastPerformance | undefined,
  suggestedWeight: number | null,
): { sets: WorkoutSet[]; notes: string } => {
  const prefilledWeight = lastPerformance?.lastWeight ?? suggestedWeight ?? exercise.targetWeight

  return {
    sets: Array.from({ length: Math.max(exercise.targetSets, 1) }, () => ({
      ...emptyWorkoutSet(),
      weight: prefilledWeight > 0 ? prefilledWeight : 0,
    })),
    notes: '',
  }
}

const formatSessionTimestamp = (value: string): string =>
  new Date(value).toLocaleString('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

function App() {
  const initialState = useMemo(buildInitialState, [])

  const [activeTab, setActiveTab] = useState<TabKey>('home')
  const [routineBundle, setRoutineBundle] = useState<RoutineBundle>(initialState.routineBundle)
  const [media, setMedia] = useState<MediaItem[]>(initialState.media)
  const [logs, setLogs] = useState<WorkoutLog[]>(initialState.logs)
  const [settings, setSettings] = useState<AppSettings>(initialState.settings)
  const [trackDayId, setTrackDayId] = useState<string>('')
  const [workoutDraft, setWorkoutDraft] = useState<WorkoutDraft>({})
  const [uiMessage, setUiMessage] = useState('')
  const [imageSearchState, setImageSearchState] = useState<Record<string, 'idle' | 'loading' | 'done' | 'failed'>>({})
  const [expandedImage, setExpandedImage] = useState<{ url: string; alt: string } | null>(null)

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

  useEffect(() => {
    document.documentElement.dataset.fontScale = settings.fontScale
    return () => {
      delete document.documentElement.dataset.fontScale
    }
  }, [settings.fontScale])

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

  const exercisesByDay = useMemo(() => {
    const map = new Map<string, RoutineExercise[]>()
    const routineExercises = routineBundle.exercises.filter((exercise) => exercise.routineId === activeRoutineId)
    routineDays.forEach((day) => {
      map.set(day.id, sortExercises(routineExercises.filter((exercise) => exercise.dayId === day.id)))
    })
    return map
  }, [routineBundle.exercises, routineDays, activeRoutineId])

  const allExercisesForActiveRoutine = useMemo(
    () => routineDays.flatMap((day) => exercisesByDay.get(day.id) ?? []),
    [routineDays, exercisesByDay],
  )

  const logsForActiveRoutine = useMemo(
    () => logs.filter((log) => log.routineId === activeRoutineId),
    [logs, activeRoutineId],
  )

  const recentSessions = useMemo(() => buildRecentSessions(logsForActiveRoutine), [logsForActiveRoutine])
  const lastSession = recentSessions[0] ?? null
  const suggestedDay = useMemo(() => getSuggestedDay(routineDays, lastSession), [routineDays, lastSession])

  useEffect(() => {
    if (routineDays.length === 0) {
      setTrackDayId('')
      return
    }

    if (!routineDays.some((day) => day.id === trackDayId)) {
      setTrackDayId(suggestedDay?.id ?? routineDays[0].id)
    }
  }, [routineDays, trackDayId, suggestedDay])

  const trackDay = routineDays.find((day) => day.id === trackDayId) ?? suggestedDay ?? routineDays[0] ?? null
  const trackExercises = useMemo(
    () => (trackDay ? exercisesByDay.get(trackDay.id) ?? [] : []),
    [exercisesByDay, trackDay],
  )

  const lastPerformanceByExercise = useMemo(
    () => buildLastPerformanceByExercise(logsForActiveRoutine),
    [logsForActiveRoutine],
  )

  const e1rmByExercise = useMemo(
    () => buildE1rmMetaByExercise(logsForActiveRoutine, allExercisesForActiveRoutine, settings.units),
    [logsForActiveRoutine, allExercisesForActiveRoutine, settings.units],
  )

  const exerciseMediaById = useMemo(() => {
    const map = new Map<string, MediaItem | null>()
    allExercisesForActiveRoutine.forEach((exercise) => {
      map.set(exercise.id, resolveExerciseMedia(exercise, media))
    })
    return map
  }, [allExercisesForActiveRoutine, media])

  useEffect(() => {
    setWorkoutDraft((prev) => {
      const next = { ...prev }

      trackExercises.forEach((exercise) => {
        if (next[exercise.id]) {
          return
        }

        next[exercise.id] = createDraftForExercise(
          exercise,
          lastPerformanceByExercise.get(exercise.id),
          e1rmByExercise.get(exercise.id)?.suggestedWeight ?? null,
        )
      })

      return next
    })
  }, [trackExercises, lastPerformanceByExercise, e1rmByExercise])

  useEffect(() => {
    const missingExercise = trackExercises.find((exercise) => {
      if (exerciseMediaById.get(exercise.id)) {
        return false
      }

      const state = imageSearchState[exercise.id] ?? 'idle'
      return state !== 'loading' && state !== 'done' && state !== 'failed'
    })

    if (!missingExercise) {
      return
    }

    let cancelled = false
    setImageSearchState((prev) => ({ ...prev, [missingExercise.id]: 'loading' }))

    const query = `${missingExercise.name} exercise form`

    searchInternetMedia(query)
      .then((results) => {
        if (cancelled) {
          return
        }

        const imageResult = results.find((result) => result.type === 'image')
        if (!imageResult) {
          setImageSearchState((prev) => ({ ...prev, [missingExercise.id]: 'failed' }))
          return
        }

        setMedia((current) => {
          const existingMatch = resolveExerciseMedia(missingExercise, current)
          if (existingMatch) {
            return current
          }

          const item: MediaItem = {
            id: `auto-image-${missingExercise.id}`,
            title: imageResult.title || missingExercise.name,
            slug: `${missingExercise.slug}-guide`,
            type: 'image',
            role: 'single',
            origin: 'external',
            provider: imageResult.provider,
            path: null,
            externalUrl: imageResult.url,
            thumbnailUrl: imageResult.thumbnailUrl,
            license: imageResult.license,
            attribution: imageResult.attribution,
            tags: Array.from(new Set([missingExercise.slug, missingExercise.name, ...imageResult.tags])),
            isDuplicate: false,
            checksum: null,
            createdAt: new Date().toISOString(),
          }

          return [item, ...current]
        })

        setImageSearchState((prev) => ({ ...prev, [missingExercise.id]: 'done' }))
      })
      .catch(() => {
        if (!cancelled) {
          setImageSearchState((prev) => ({ ...prev, [missingExercise.id]: 'failed' }))
        }
      })

    return () => {
      cancelled = true
    }
  }, [trackExercises, exerciseMediaById, imageSearchState])

  useEffect(() => {
    if (!expandedImage) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setExpandedImage(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [expandedImage])

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
        'Cambiar la rutina activa de este dispositivo puede alterar tu seguimiento. Quieres cambiar la rutina que estas registrando?',
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

    setTrackDayId('')
    setWorkoutDraft({})
    setUiMessage('Rutina activa actualizada para este dispositivo.')
    return true
  }

  const applySuggestedTargetWeight = (exercise: RoutineExercise): void => {
    const meta = e1rmByExercise.get(exercise.id)
    if (!meta || meta.sampleCount < MIN_E1RM_SAMPLES || !meta.suggestedWeight) {
      setUiMessage('Faltan datos para sugerir un peso objetivo estable en este ejercicio.')
      return
    }

    setRoutineBundle((current) => ({
      ...current,
      exercises: current.exercises.map((candidate) =>
        candidate.id === exercise.id
          ? { ...candidate, targetWeight: meta.suggestedWeight ?? candidate.targetWeight }
          : candidate,
      ),
    }))

    setWorkoutDraft((prev) => ({
      ...prev,
      [exercise.id]: createDraftForExercise(exercise, lastPerformanceByExercise.get(exercise.id), meta.suggestedWeight),
    }))

    setUiMessage(`Objetivo de ${exercise.name} actualizado a ${meta.suggestedWeight} ${settings.units} (e1RM).`)
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

      const defaultWeight = draft.sets.at(-1)?.weight ?? 0

      return {
        ...prev,
        [exerciseId]: {
          ...draft,
          sets: [...draft.sets, { ...emptyWorkoutSet(), weight: defaultWeight }],
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
      setRoutineBundle((current) => ({
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
        next[exercise.id] = createDraftForExercise(
          exercise,
          {
            log: entries.find((entry) => entry.exerciseId === exercise.id) ?? lastPerformanceByExercise.get(exercise.id)?.log ?? {
              id: '',
              createdAt: now,
              routineId: activeRoutine.id,
              routineName: activeRoutine.name,
              dayId: trackDay.id,
              dayName: trackDay.name,
              exerciseId: exercise.id,
              exerciseName: exercise.name,
              sets: [],
              notes: '',
            },
            lastWeight:
              entries
                .find((entry) => entry.exerciseId === exercise.id)
                ?.sets.slice()
                .reverse()
                .find((set) => set.weight > 0)?.weight ?? null,
            completedSets: entries.find((entry) => entry.exerciseId === exercise.id)?.sets.length ?? 0,
            repsSummary:
              entries
                .find((entry) => entry.exerciseId === exercise.id)
                ?.sets.map((set) => set.reps).join(' / ') ?? 'Sin reps registradas',
          },
          suggestedWeightByExerciseId.get(exercise.id) ?? e1rmByExercise.get(exercise.id)?.suggestedWeight ?? null,
        )
      })
      return next
    })

    const autoUpdated = suggestedWeightByExerciseId.size
    const suffix =
      autoUpdated > 0
        ? ` Objetivos actualizados automaticamente por e1RM en ${autoUpdated} ejercicios.`
        : ' No hubo actualizacion automatica de objetivos.'
    setUiMessage(`Sesion guardada: ${entries.length} ejercicios registrados en ${trackDay.name}.${suffix}`)
    setActiveTab('home')
  }

  const dayStats = useMemo(
    () =>
      routineDays.map((day) => ({
        ...day,
        exerciseCount: (exercisesByDay.get(day.id) ?? []).length,
        logCount: logsForActiveRoutine.filter((log) => log.dayId === day.id).length,
        isSuggested: suggestedDay?.id === day.id,
        isLast: lastSession?.dayId === day.id,
      })),
    [routineDays, exercisesByDay, logsForActiveRoutine, suggestedDay, lastSession],
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
      setWorkoutDraft({})
      setTrackDayId('')
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
    setTrackDayId('')
    setUiMessage('Datos restaurados a la configuracion inicial.')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Training App</h1>
          <p className="topbar-tagline">
            <img src={resolveStaticPath('icons/pixel/home.svg')} alt="" aria-hidden="true" />
            Abres, ves que toca, y entrenas.
          </p>
          <p className="topbar-routine">{activeRoutine?.name ?? 'Sin rutina activa'}</p>
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
          <section className="panel full message-panel">
            <p className="hint">{uiMessage}</p>
          </section>
        )}

        {activeTab === 'home' && (
          <section className="panel-grid">
            <article className="panel hero-panel">
              <p className="eyebrow">Rutina actual</p>
              <h2>{activeRoutine?.name ?? 'Sin rutina activa'}</h2>
              <p className="hero-copy">
                {lastSession
                  ? `La ultima sesion fue ${lastSession.dayName}. La app te deja listo el siguiente paso para no perder tiempo.`
                  : 'Aun no hay historial en esta rutina. La app te va a sugerir empezar por el primer dia.'}
              </p>
              <label>
                Cambiar rutina
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
                Se mantiene el cambio de rutina desde la app. La edicion simple de rutinas queda como mejora futura.
              </p>
            </article>

            <article className="panel summary-card">
              <p className="eyebrow">Ultima vez</p>
              {lastSession ? (
                <>
                  <h2>{lastSession.dayName}</h2>
                  <p>{formatSessionTimestamp(lastSession.createdAt)}</p>
                  <p>
                    {lastSession.exerciseCount} ejercicios | {lastSession.totalSets} sets
                  </p>
                  <div className="session-pill-list">
                    {lastSession.exercises.map((exercise) => (
                      <span key={`${lastSession.id}-${exercise.exerciseName}`} className="session-pill">
                        {exercise.exerciseName}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h2>Sin historial</h2>
                  <p>Registra tu primera sesion para que la app empiece a sugerir el siguiente dia.</p>
                </>
              )}
            </article>

            <article className="panel summary-card accent-card">
              <p className="eyebrow">Toca hoy</p>
              <h2>{suggestedDay?.name ?? 'Sin dias'}</h2>
              <p>{suggestedDay?.focus ?? 'Agrega o selecciona una rutina con dias disponibles.'}</p>
              <p>{(exercisesByDay.get(suggestedDay?.id ?? '') ?? []).length} ejercicios listos</p>
              <div className="row-actions">
                <button
                  type="button"
                  className="primary"
                  disabled={!suggestedDay}
                  onClick={() => {
                    if (!suggestedDay) {
                      return
                    }
                    setTrackDayId(suggestedDay.id)
                    setActiveTab('train')
                  }}
                >
                  Abrir dia sugerido
                </button>
              </div>
            </article>

            <article className="panel full">
              <h2 className="heading-with-icon">
                <img src={resolveStaticPath('icons/pixel/calendar.svg')} alt="" aria-hidden="true" />
                Dias disponibles
              </h2>
              <div className="day-overview">
                {dayStats.map((day) => (
                  <button
                    key={day.id}
                    type="button"
                    className={[
                      'day-chip',
                      day.isSuggested ? 'is-suggested' : '',
                      day.isLast ? 'is-last' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => {
                      setTrackDayId(day.id)
                      setActiveTab('train')
                    }}
                  >
                    <div className="day-chip-topline">
                      <strong>{day.name}</strong>
                      {day.isSuggested && <span className="status-badge suggested">Sigue</span>}
                      {day.isLast && <span className="status-badge last">Ultimo</span>}
                    </div>
                    <span>{day.focus}</span>
                    <span>{day.exerciseCount} ejercicios</span>
                    <span>{day.logCount} registros</span>
                  </button>
                ))}
              </div>
            </article>
          </section>
        )}

        {activeTab === 'train' && (
          <section className="panel-grid">
            <article className="panel full workout-header-card">
              <div className="workout-header-main">
                <div>
                  <p className="eyebrow">Entreno actual</p>
                  <h2>{trackDay?.name ?? 'Selecciona un dia'}</h2>
                  <p>{trackDay?.focus ?? 'Elige un dia desde Inicio o desde este selector.'}</p>
                  {lastSession ? <p className="hint">Ultima sesion registrada: {lastSession.dayName}</p> : null}
                </div>
                {suggestedDay ? (
                  <button
                    type="button"
                    onClick={() => setTrackDayId(suggestedDay.id)}
                  >
                    Ir al dia sugerido
                  </button>
                ) : null}
              </div>

              <div className="day-overview compact">
                {routineDays.map((day) => (
                  <button
                    key={day.id}
                    type="button"
                    className={day.id === trackDay?.id ? 'day-chip selected' : 'day-chip'}
                    onClick={() => setTrackDayId(day.id)}
                  >
                    <strong>{day.name}</strong>
                    <span>{day.focus}</span>
                  </button>
                ))}
              </div>
            </article>

            {trackExercises.map((exercise) => {
              const draft = workoutDraft[exercise.id]
              const e1rmMeta = e1rmByExercise.get(exercise.id)
              const hasStableE1rm = Boolean(e1rmMeta && e1rmMeta.sampleCount >= MIN_E1RM_SAMPLES)
              const lastPerformance = lastPerformanceByExercise.get(exercise.id)
              const mediaItem = exerciseMediaById.get(exercise.id)
              const mediaUrl =
                mediaItem?.origin === 'local'
                  ? resolveMediaPath(mediaItem.path)
                  : (mediaItem?.externalUrl ?? mediaItem?.thumbnailUrl ?? null)
              const imageState = imageSearchState[exercise.id] ?? 'idle'

              return (
                <article key={exercise.id} className="panel full exercise-session">
                  <div className="exercise-session-layout">
                    <div className="exercise-visual">
                      {mediaUrl ? (
                        <button
                          type="button"
                          className="exercise-image-button"
                          onClick={() => setExpandedImage({
                            url: mediaUrl,
                            alt: `Referencia de ${exercise.name}` ,
                          })}
                          aria-label={`Abrir imagen completa de ${exercise.name}`}
                        >
                          <img src={mediaUrl} alt={`Referencia de ${exercise.name}`} loading="lazy" />
                        </button>
                      ) : (
                        <div className="exercise-image-placeholder">
                          <span>{imageState === 'loading' ? 'Buscando imagen...' : 'Sin imagen aun'}</span>
                        </div>
                      )}
                      {mediaItem?.attribution ? (
                        <p className="media-caption">Fuente: {mediaItem.attribution}</p>
                      ) : mediaItem?.provider ? (
                        <p className="media-caption">Fuente: {mediaItem.provider}</p>
                      ) : null}
                    </div>

                    <div className="exercise-body">
                      <div className="exercise-head">
                        <div>
                          <h3>{exercise.name}</h3>
                          <p>{exercise.muscleGroup}</p>
                        </div>
                        <div className="exercise-objective">
                          <strong>
                            {exercise.targetSets} x {exercise.targetReps}
                          </strong>
                          <span>Objetivo base: {exercise.targetWeight} {settings.units}</span>
                        </div>
                      </div>

                      <div className="stats-grid">
                        <div className="stat-tile">
                          <span className="stat-label">Ultimo peso</span>
                          <strong>
                            {lastPerformance?.lastWeight !== null && lastPerformance?.lastWeight !== undefined
                              ? `${lastPerformance.lastWeight} ${settings.units}`
                              : 'Sin dato'}
                          </strong>
                          <span className="stat-subtle">
                            {lastPerformance
                              ? `${lastPerformance.completedSets || lastPerformance.log.sets.length} sets | reps ${lastPerformance.repsSummary}`
                              : 'Todavia no registras este ejercicio'}
                          </span>
                        </div>

                        <div className="stat-tile">
                          <span className="stat-label">Peso sugerido</span>
                          <strong>
                            {hasStableE1rm && e1rmMeta?.suggestedWeight !== null
                              ? `${e1rmMeta?.suggestedWeight ?? 0} ${settings.units}`
                              : 'Sin sugerencia'}
                          </strong>
                          <span className="stat-subtle">
                            {hasStableE1rm && e1rmMeta?.anchorReps
                              ? `Calculado para ${e1rmMeta?.anchorReps ?? 0} reps`
                              : `Disponible con ${MIN_E1RM_SAMPLES} sets validos`}
                          </span>
                        </div>

                        <div className="stat-tile">
                          <span className="stat-label">Ultimo registro</span>
                          <strong>
                            {lastPerformance ? formatSessionTimestamp(lastPerformance.log.createdAt) : 'Sin historial'}
                          </strong>
                          <span className="stat-subtle">{trackDay?.name ?? ''}</span>
                        </div>
                      </div>

                      {hasStableE1rm && e1rmMeta?.suggestedWeight ? (
                        <div className="row-actions">
                          <button type="button" onClick={() => applySuggestedTargetWeight(exercise)}>
                            Usar peso sugerido
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

                      <div className="sets-mobile-list">
                        {(draft?.sets ?? []).map((set, index) => (
                          <article key={`mobile-${set.id}`} className="set-mobile-card">
                            <div className="set-mobile-head">
                              <strong>Set {index + 1}</strong>
                              <button type="button" onClick={() => removeWorkoutSet(exercise.id, set.id)} aria-label={`Eliminar set ${index + 1}`}>
                                -
                              </button>
                            </div>
                            <div className="set-mobile-grid">
                              <label>
                                Reps
                                <input
                                  type="number"
                                  min={0}
                                  value={set.reps}
                                  onChange={(event) => updateWorkoutSet(exercise.id, set.id, 'reps', event.target.value)}
                                />
                              </label>
                              <label>
                                Peso
                                <input
                                  type="number"
                                  min={0}
                                  value={set.weight}
                                  onChange={(event) => updateWorkoutSet(exercise.id, set.id, 'weight', event.target.value)}
                                />
                              </label>
                            </div>
                            <label className="checkbox-row">
                              <input
                                type="checkbox"
                                checked={set.done}
                                onChange={(event) => updateWorkoutSet(exercise.id, set.id, 'done', event.target.checked)}
                              />
                              <span>Set completado</span>
                            </label>
                          </article>
                        ))}
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
                    </div>
                  </div>
                </article>
              )
            })}

            <article className="panel full">
              <div className="row-actions">
                <button type="button" className="primary" onClick={saveWorkoutSession} disabled={!trackDay}>
                  Guardar sesion del dia
                </button>
              </div>
            </article>
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="panel-grid">
            <article className="panel">
              <h2>Pantalla</h2>
              <label>
                Escala tipografica
                <select
                  value={settings.fontScale}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      fontScale: event.target.value as FontScale,
                    }))
                  }
                >
                  {Object.entries(FONT_SCALE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </article>

            <article className="panel">
              <h2>Unidades</h2>
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
                  <option value="kg">Kilogramos</option>
                  <option value="lb">Libras</option>
                </select>
              </label>
            </article>

            <article className="panel full">
              <h2>Rutina en este dispositivo</h2>
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
                <span>Pedir confirmacion antes de cambiar la rutina activa</span>
              </label>
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
              </div>
              <p className="hint">El backup incluye rutinas, historial, settings y las referencias de imagen guardadas.</p>
            </article>

            <article className="panel full">
              <h2>Reset</h2>
              <div className="row-actions">
                <button type="button" className="danger" onClick={resetAllData}>
                  Restaurar datos iniciales
                </button>
              </div>
              <p className="hint">Schema version: {settings.schemaVersion}</p>
            </article>
          </section>
        )}
      </main>

      {expandedImage ? (
        <div className="image-lightbox" role="dialog" aria-modal="true" onClick={() => setExpandedImage(null)}>
          <button
            type="button"
            className="image-lightbox-close"
            onClick={() => setExpandedImage(null)}
            aria-label="Cerrar imagen"
          >
            ×
          </button>
          <div className="image-lightbox-content" onClick={(event) => event.stopPropagation()}>
            <TransformWrapper
              minScale={1}
              maxScale={6}
              initialScale={1}
              doubleClick={{ mode: 'toggle', step: 2 }}
              wheel={{ step: 0.2 }}
              pinch={{ step: 5 }}
              panning={{ velocityDisabled: true }}
            >
              <TransformComponent
                wrapperClass="image-lightbox-zoom-wrapper"
                contentClass="image-lightbox-zoom-content"
              >
                <img src={expandedImage.url} alt={expandedImage.alt} draggable={false} />
              </TransformComponent>
            </TransformWrapper>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
