import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import './App.css'
import { routineWithMedia, seedMedia, seedSettings, STORAGE_KEYS } from './data/seedRoutine'
import { calcWeeklyVolume, createId, emptyWorkoutSet, sortExercises, toSlug, toTitle } from './lib/helpers'
import { downloadJson, loadJson, readJsonFile, saveJson } from './lib/storage'
import type { AppSettings, Exercise, MediaItem, RoutineState, WorkoutLog, WorkoutSet } from './types/training'

type TabKey = 'dashboard' | 'routine' | 'workout' | 'media' | 'settings'

type WorkoutDraft = Record<string, { sets: WorkoutSet[]; notes: string }>

const tabs: { key: TabKey; label: string }[] = [
  { key: 'dashboard', label: 'Inicio' },
  { key: 'routine', label: 'Rutina' },
  { key: 'workout', label: 'Entrenar' },
  { key: 'media', label: 'Media' },
  { key: 'settings', label: 'Ajustes' },
]

const resolveMediaPath = (path: string): string => `${import.meta.env.BASE_URL}${path}`

const buildRoutineWithMedia = (routine: RoutineState, media: MediaItem[]): RoutineState => {
  const map = media.reduce<Record<string, string[]>>((acc, item) => {
    if (!item.exerciseId) {
      return acc
    }
    if (!acc[item.exerciseId]) {
      acc[item.exerciseId] = []
    }
    acc[item.exerciseId].push(item.id)
    return acc
  }, {})

  return {
    ...routine,
    exercises: routine.exercises.map((exercise) => ({
      ...exercise,
      mediaIds: map[exercise.id] ?? [],
    })),
  }
}

const initialRoutine = loadJson<RoutineState>(STORAGE_KEYS.routine, routineWithMedia)
const initialMedia = loadJson<MediaItem[]>(STORAGE_KEYS.media, seedMedia)
const initialLogs = loadJson<WorkoutLog[]>(STORAGE_KEYS.logs, [])
const initialSettings = loadJson<AppSettings>(STORAGE_KEYS.settings, seedSettings)

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard')
  const [routine, setRoutine] = useState<RoutineState>(() => buildRoutineWithMedia(initialRoutine, initialMedia))
  const [media, setMedia] = useState<MediaItem[]>(initialMedia)
  const [logs, setLogs] = useState<WorkoutLog[]>(initialLogs)
  const [settings, setSettings] = useState<AppSettings>(initialSettings)
  const [selectedDayId, setSelectedDayId] = useState<string>(() => routine.days[0]?.id ?? '')
  const [newDayName, setNewDayName] = useState('')
  const [newDayFocus, setNewDayFocus] = useState('')
  const [newExerciseName, setNewExerciseName] = useState('')
  const [newExerciseGroup, setNewExerciseGroup] = useState('')
  const [workoutDraft, setWorkoutDraft] = useState<WorkoutDraft>({})
  const [workoutMessage, setWorkoutMessage] = useState('')

  useEffect(() => {
    saveJson(STORAGE_KEYS.routine, routine)
  }, [routine])

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
    if (routine.days.length === 0) {
      setSelectedDayId('')
      return
    }
    if (!routine.days.some((day) => day.id === selectedDayId)) {
      setSelectedDayId(routine.days[0].id)
    }
  }, [routine.days, selectedDayId])

  const selectedDay = useMemo(
    () => routine.days.sort((a, b) => a.order - b.order).find((day) => day.id === selectedDayId),
    [routine.days, selectedDayId],
  )

  const dayExercises = useMemo(
    () => sortExercises(routine.exercises.filter((exercise) => exercise.dayId === selectedDayId)),
    [routine.exercises, selectedDayId],
  )

  const exerciseById = useMemo(() => {
    const map = new Map<string, Exercise>()
    routine.exercises.forEach((exercise) => map.set(exercise.id, exercise))
    return map
  }, [routine.exercises])

  const dayStats = useMemo(
    () =>
      routine.days
        .sort((a, b) => a.order - b.order)
        .map((day) => ({
          ...day,
          exerciseCount: routine.exercises.filter((exercise) => exercise.dayId === day.id).length,
          logCount: logs.filter((log) => log.dayId === day.id).length,
        })),
    [routine.days, routine.exercises, logs],
  )

  const weeklyVolume = useMemo(() => calcWeeklyVolume(logs), [logs])

  useEffect(() => {
    if (!selectedDayId) {
      return
    }

    setWorkoutDraft((prev) => {
      const next = { ...prev }
      dayExercises.forEach((exercise) => {
        if (!next[exercise.id]) {
          next[exercise.id] = {
            sets: Array.from({ length: Math.max(exercise.targetSets, 1) }, emptyWorkoutSet),
            notes: '',
          }
        }
      })
      return next
    })
  }, [selectedDayId, dayExercises])

  const updateRoutine = (nextRoutine: RoutineState): void => {
    setRoutine(buildRoutineWithMedia(nextRoutine, media))
  }

  const addDay = (): void => {
    const name = newDayName.trim()
    if (!name) {
      return
    }

    const dayId = createId('day')
    const nextDay = {
      id: dayId,
      name: toTitle(name),
      focus: newDayFocus.trim() || 'Sin foco definido',
      order: routine.days.length + 1,
    }

    updateRoutine({
      ...routine,
      days: [...routine.days, nextDay],
    })

    setNewDayName('')
    setNewDayFocus('')
    setSelectedDayId(dayId)
  }

  const updateDayField = (dayId: string, field: 'name' | 'focus', value: string): void => {
    updateRoutine({
      ...routine,
      days: routine.days.map((day) =>
        day.id === dayId
          ? {
              ...day,
              [field]: field === 'name' ? toTitle(value) : value,
            }
          : day,
      ),
    })
  }

  const deleteDay = (dayId: string): void => {
    if (!window.confirm('Eliminar dia y ejercicios asociados?')) {
      return
    }

    const exerciseIds = new Set(routine.exercises.filter((exercise) => exercise.dayId === dayId).map((exercise) => exercise.id))

    const nextRoutine = {
      days: routine.days
        .filter((day) => day.id !== dayId)
        .map((day, idx) => ({
          ...day,
          order: idx + 1,
        })),
      exercises: routine.exercises.filter((exercise) => !exerciseIds.has(exercise.id)),
    }

    const nextMedia = media.map((item) =>
      item.exerciseId && exerciseIds.has(item.exerciseId)
        ? {
            ...item,
            exerciseId: null,
            status: 'unassigned' as const,
          }
        : item,
    )

    setMedia(nextMedia)
    setRoutine(buildRoutineWithMedia(nextRoutine, nextMedia))
    setLogs((current) => current.filter((log) => log.dayId !== dayId && !exerciseIds.has(log.exerciseId)))
  }

  const addExercise = (): void => {
    if (!selectedDayId) {
      return
    }

    const name = newExerciseName.trim()
    if (!name) {
      return
    }

    const exercisesInDay = routine.exercises.filter((exercise) => exercise.dayId === selectedDayId)

    const nextExercise: Exercise = {
      id: createId('ex'),
      dayId: selectedDayId,
      slug: toSlug(name),
      name: toTitle(name),
      muscleGroup: newExerciseGroup.trim() || 'General',
      targetSets: 4,
      targetReps: '8-12',
      targetWeight: 0,
      restSeconds: 60,
      notes: '',
      order: exercisesInDay.length + 1,
      mediaIds: [],
    }

    updateRoutine({
      ...routine,
      exercises: [...routine.exercises, nextExercise],
    })

    setNewExerciseName('')
    setNewExerciseGroup('')
  }

  const updateExercise = (exerciseId: string, patch: Partial<Exercise>): void => {
    updateRoutine({
      ...routine,
      exercises: routine.exercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              ...patch,
              slug: patch.name ? toSlug(patch.name) : exercise.slug,
            }
          : exercise,
      ),
    })
  }

  const deleteExercise = (exerciseId: string): void => {
    if (!window.confirm('Eliminar ejercicio?')) {
      return
    }

    const nextMedia = media.map((item) =>
      item.exerciseId === exerciseId
        ? {
            ...item,
            exerciseId: null,
            status: 'unassigned' as const,
          }
        : item,
    )

    setMedia(nextMedia)
    setLogs((current) => current.filter((log) => log.exerciseId !== exerciseId))
    setRoutine(
      buildRoutineWithMedia(
        {
          ...routine,
          exercises: routine.exercises
            .filter((exercise) => exercise.id !== exerciseId)
            .map((exercise, _, arr) => {
              const sameDay = arr.filter((item) => item.dayId === exercise.dayId).sort((a, b) => a.order - b.order)
              const newOrder = sameDay.findIndex((item) => item.id === exercise.id) + 1
              return { ...exercise, order: newOrder }
            }),
        },
        nextMedia,
      ),
    )
  }

  const moveExercise = (exerciseId: string, direction: 'up' | 'down'): void => {
    const current = sortExercises(routine.exercises.filter((exercise) => exercise.dayId === selectedDayId))
    const idx = current.findIndex((exercise) => exercise.id === exerciseId)
    if (idx < 0) {
      return
    }

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= current.length) {
      return
    }

    const reordered = [...current]
    const [item] = reordered.splice(idx, 1)
    reordered.splice(targetIdx, 0, item)

    const orderMap = new Map(reordered.map((exercise, order) => [exercise.id, order + 1]))
    updateRoutine({
      ...routine,
      exercises: routine.exercises.map((exercise) =>
        orderMap.has(exercise.id)
          ? {
              ...exercise,
              order: orderMap.get(exercise.id) ?? exercise.order,
            }
          : exercise,
      ),
    })
  }

  const updateWorkoutSet = (
    exerciseId: string,
    setId: string,
    field: keyof WorkoutSet,
    rawValue: string | boolean,
  ): void => {
    setWorkoutDraft((prev) => {
      const exerciseDraft = prev[exerciseId]
      if (!exerciseDraft) {
        return prev
      }

      const sets = exerciseDraft.sets.map((set) => {
        if (set.id !== setId) {
          return set
        }

        if (field === 'done') {
          return { ...set, done: Boolean(rawValue) }
        }

        const numeric = Number(rawValue)
        if (!Number.isFinite(numeric)) {
          return set
        }

        return { ...set, [field]: numeric }
      })

      return {
        ...prev,
        [exerciseId]: {
          ...exerciseDraft,
          sets,
        },
      }
    })
  }

  const addWorkoutSet = (exerciseId: string): void => {
    setWorkoutDraft((prev) => {
      const exerciseDraft = prev[exerciseId]
      if (!exerciseDraft) {
        return prev
      }

      return {
        ...prev,
        [exerciseId]: {
          ...exerciseDraft,
          sets: [...exerciseDraft.sets, emptyWorkoutSet()],
        },
      }
    })
  }

  const removeWorkoutSet = (exerciseId: string, setId: string): void => {
    setWorkoutDraft((prev) => {
      const exerciseDraft = prev[exerciseId]
      if (!exerciseDraft || exerciseDraft.sets.length <= 1) {
        return prev
      }

      return {
        ...prev,
        [exerciseId]: {
          ...exerciseDraft,
          sets: exerciseDraft.sets.filter((set) => set.id !== setId),
        },
      }
    })
  }

  const updateWorkoutNotes = (exerciseId: string, value: string): void => {
    setWorkoutDraft((prev) => {
      const exerciseDraft = prev[exerciseId]
      if (!exerciseDraft) {
        return prev
      }

      return {
        ...prev,
        [exerciseId]: {
          ...exerciseDraft,
          notes: value,
        },
      }
    })
  }

  const saveWorkoutSession = (): void => {
    if (!selectedDay) {
      return
    }

    const now = new Date().toISOString()
    const entries: WorkoutLog[] = []

    dayExercises.forEach((exercise) => {
      const draft = workoutDraft[exercise.id]
      if (!draft) {
        return
      }

      const relevantSets = draft.sets.filter(
        (set) => set.done || set.reps > 0 || set.weight > 0 || set.rpe > 0 || set.restSeconds > 0,
      )

      if (relevantSets.length === 0 && !draft.notes.trim()) {
        return
      }

      entries.push({
        id: createId('log'),
        createdAt: now,
        dayId: selectedDay.id,
        dayName: selectedDay.name,
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        sets: relevantSets.length > 0 ? relevantSets : draft.sets,
        notes: draft.notes,
      })
    })

    if (entries.length === 0) {
      setWorkoutMessage('No hay sets cargados para guardar.')
      return
    }

    setLogs((prev) => [...entries, ...prev])

    setWorkoutDraft((prev) => {
      const next = { ...prev }
      dayExercises.forEach((exercise) => {
        next[exercise.id] = {
          sets: Array.from({ length: Math.max(exercise.targetSets, 1) }, emptyWorkoutSet),
          notes: '',
        }
      })
      return next
    })

    setWorkoutMessage(`Sesion guardada: ${entries.length} ejercicios registrados.`)
  }

  const assignMediaToExercise = (mediaId: string, exerciseId: string | null): void => {
    const nextMedia = media.map((item) => {
      if (item.id !== mediaId) {
        return item
      }

      return {
        ...item,
        exerciseId,
        status: exerciseId ? ('assigned' as const) : ('unassigned' as const),
      }
    })

    setMedia(nextMedia)
    setRoutine((prev) => buildRoutineWithMedia(prev, nextMedia))
  }

  const mediaCounts = useMemo(
    () => ({
      total: media.length,
      assigned: media.filter((item) => item.status === 'assigned').length,
      unassigned: media.filter((item) => item.status === 'unassigned').length,
      duplicates: media.filter((item) => item.isDuplicate).length,
    }),
    [media],
  )

  const recentLogs = useMemo(() => logs.slice(0, 12), [logs])

  const exportBackup = (): void => {
    downloadJson(`training-app-backup-${new Date().toISOString().slice(0, 10)}.json`, {
      routine,
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
      const parsed = await readJsonFile<{
        routine: RoutineState
        media: MediaItem[]
        logs: WorkoutLog[]
        settings: AppSettings
      }>(file)

      if (!parsed.routine?.days || !parsed.routine?.exercises || !parsed.media || !parsed.settings) {
        throw new Error('Estructura invalida')
      }

      setMedia(parsed.media)
      setRoutine(buildRoutineWithMedia(parsed.routine, parsed.media))
      setLogs(parsed.logs ?? [])
      setSettings(parsed.settings)
      setWorkoutMessage('Backup importado correctamente.')
    } catch {
      setWorkoutMessage('No se pudo importar el archivo.')
    } finally {
      event.target.value = ''
    }
  }

  const resetAllData = (): void => {
    if (!window.confirm('Resetear rutina, media y registros?')) {
      return
    }

    setRoutine(routineWithMedia)
    setMedia(seedMedia)
    setLogs([])
    setSettings(seedSettings)
    setWorkoutDraft({})
    setSelectedDayId(routineWithMedia.days[0]?.id ?? '')
    setWorkoutMessage('Datos restaurados a la semilla inicial.')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>Training App</h1>
          <p>Rutina de 4 dias, registro local y videos desde docs.</p>
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
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="content">
        {activeTab === 'dashboard' && (
          <section className="panel-grid">
            <article className="panel stat">
              <h2>Resumen</h2>
              <p>{routine.days.length} dias activos</p>
              <p>{routine.exercises.length} ejercicios</p>
              <p>{logs.length} registros</p>
              <p>{Math.round(weeklyVolume)} volumen ultimos 7 dias ({settings.units})</p>
            </article>

            <article className="panel stat">
              <h2>Media</h2>
              <p>{mediaCounts.total} archivos</p>
              <p>{mediaCounts.assigned} asignados</p>
              <p>{mediaCounts.unassigned} sin asignar</p>
              <p>{mediaCounts.duplicates} duplicados archivados</p>
            </article>

            <article className="panel full">
              <h2>Dias de rutina</h2>
              <div className="day-overview">
                {dayStats.map((day) => (
                  <button key={day.id} type="button" className="day-chip" onClick={() => setSelectedDayId(day.id)}>
                    <strong>{day.name}</strong>
                    <span>{day.focus}</span>
                    <span>{day.exerciseCount} ejercicios</span>
                    <span>{day.logCount} logs</span>
                  </button>
                ))}
              </div>
            </article>

            <article className="panel full">
              <h2>Registros recientes</h2>
              <div className="logs-list">
                {recentLogs.length === 0 && <p>No hay sesiones registradas aun.</p>}
                {recentLogs.map((log) => (
                  <div key={log.id} className="log-row">
                    <strong>{log.exerciseName}</strong>
                    <span>{new Date(log.createdAt).toLocaleString()}</span>
                    <span>{log.sets.length} sets</span>
                  </div>
                ))}
              </div>
            </article>
          </section>
        )}

        {activeTab === 'routine' && (
          <section className="panel-grid">
            <article className="panel full">
              <h2>Dias</h2>
              <div className="inline-form">
                <input
                  value={newDayName}
                  placeholder="Nuevo dia"
                  onChange={(event) => setNewDayName(event.target.value)}
                />
                <input
                  value={newDayFocus}
                  placeholder="Foco del dia"
                  onChange={(event) => setNewDayFocus(event.target.value)}
                />
                <button type="button" onClick={addDay}>
                  Agregar dia
                </button>
              </div>

              <div className="day-list">
                {routine.days
                  .sort((a, b) => a.order - b.order)
                  .map((day) => (
                    <div key={day.id} className={day.id === selectedDayId ? 'day-card selected' : 'day-card'}>
                      <label>
                        Nombre
                        <input
                          value={day.name}
                          onChange={(event) => updateDayField(day.id, 'name', event.target.value)}
                        />
                      </label>
                      <label>
                        Foco
                        <input
                          value={day.focus}
                          onChange={(event) => updateDayField(day.id, 'focus', event.target.value)}
                        />
                      </label>
                      <div className="row-actions">
                        <button type="button" onClick={() => setSelectedDayId(day.id)}>
                          Editar ejercicios
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
              <h2>Ejercicios de {selectedDay?.name ?? 'dia'}</h2>

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
                <button type="button" onClick={addExercise} disabled={!selectedDayId}>
                  Agregar ejercicio
                </button>
              </div>

              <div className="exercise-list">
                {dayExercises.map((exercise, index) => (
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
                      <label>
                        Descanso (seg)
                        <input
                          type="number"
                          min={0}
                          value={exercise.restSeconds}
                          onChange={(event) =>
                            updateExercise(exercise.id, { restSeconds: Math.max(0, Number(event.target.value) || 0) })
                          }
                        />
                      </label>
                    </div>

                    <label>
                      Notas
                      <textarea
                        value={exercise.notes}
                        onChange={(event) => updateExercise(exercise.id, { notes: event.target.value })}
                      />
                    </label>

                    <p className="hint">Media asociada: {exercise.mediaIds.length}</p>
                  </article>
                ))}
              </div>
            </article>
          </section>
        )}

        {activeTab === 'workout' && (
          <section className="panel-grid">
            <article className="panel full">
              <h2>Registrar sesion</h2>
              <label>
                Dia de entrenamiento
                <select value={selectedDayId} onChange={(event) => setSelectedDayId(event.target.value)}>
                  {routine.days
                    .sort((a, b) => a.order - b.order)
                    .map((day) => (
                      <option key={day.id} value={day.id}>
                        {day.name} - {day.focus}
                      </option>
                    ))}
                </select>
              </label>
              <p className="hint">Fecha: {new Date().toLocaleDateString()}</p>
            </article>

            {dayExercises.map((exercise) => {
              const draft = workoutDraft[exercise.id]
              const linkedMedia = media.filter((item) => item.exerciseId === exercise.id && item.type === 'video')

              return (
                <article key={exercise.id} className="panel full exercise-session">
                  <div className="exercise-head">
                    <h3>{exercise.name}</h3>
                    <p>
                      Objetivo: {exercise.targetSets}x{exercise.targetReps} - {exercise.targetWeight} {settings.units}
                    </p>
                  </div>

                  {linkedMedia[0] && (
                    <video
                      controls
                      muted
                      playsInline
                      preload="metadata"
                      src={resolveMediaPath(linkedMedia[0].path)}
                      className="exercise-video"
                    />
                  )}

                  <div className="sets-table-wrap">
                    <table className="sets-table">
                      <thead>
                        <tr>
                          <th>Set</th>
                          <th>Reps</th>
                          <th>Peso</th>
                          <th>RPE</th>
                          <th>Descanso</th>
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
                                type="number"
                                min={0}
                                max={10}
                                value={set.rpe}
                                onChange={(event) => updateWorkoutSet(exercise.id, set.id, 'rpe', event.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min={0}
                                value={set.restSeconds}
                                onChange={(event) =>
                                  updateWorkoutSet(exercise.id, set.id, 'restSeconds', event.target.value)
                                }
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
              {workoutMessage && <p className="hint">{workoutMessage}</p>}
            </article>
          </section>
        )}

        {activeTab === 'media' && (
          <section className="panel-grid">
            <article className="panel full">
              <h2>Bandeja de medios</h2>
              <p className="hint">
                Puedes reasignar cualquier archivo. Los duplicados quedaron en archive/duplicates para trazabilidad.
              </p>
            </article>

            {media.map((item) => {
              const linkedExercise = item.exerciseId ? exerciseById.get(item.exerciseId) : undefined

              return (
                <article key={item.id} className="panel media-card">
                  <header>
                    <h3>{item.title}</h3>
                    <p>{item.type.toUpperCase()}</p>
                    <p>{item.isDuplicate ? 'Duplicado' : 'Canonico'}</p>
                  </header>

                  {item.type === 'video' ? (
                    <video controls muted playsInline preload="metadata" src={resolveMediaPath(item.path)} />
                  ) : (
                    <img src={resolveMediaPath(item.path)} alt={item.title} loading="lazy" />
                  )}

                  <label>
                    Asignar a ejercicio
                    <select
                      value={item.exerciseId ?? ''}
                      onChange={(event) => assignMediaToExercise(item.id, event.target.value || null)}
                    >
                      <option value="">Sin asignar</option>
                      {routine.exercises
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((exercise) => (
                          <option key={exercise.id} value={exercise.id}>
                            {exercise.name} ({exercise.muscleGroup})
                          </option>
                        ))}
                    </select>
                  </label>

                  <p className="hint">Asignado: {linkedExercise ? linkedExercise.name : 'No'}</p>
                  <p className="hint">Archivo: {item.path}</p>
                </article>
              )
            })}
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="panel-grid">
            <article className="panel full">
              <h2>Ajustes y respaldo</h2>
              <label>
                Unidad de peso
                <select
                  value={settings.units}
                  onChange={(event) => setSettings((prev) => ({ ...prev, units: event.target.value as 'kg' | 'lb' }))}
                >
                  <option value="kg">kg</option>
                  <option value="lb">lb</option>
                </select>
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
                <button type="button" className="danger" onClick={resetAllData}>
                  Reset total
                </button>
              </div>
              <p className="hint">Schema version: {settings.schemaVersion}</p>
            </article>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
