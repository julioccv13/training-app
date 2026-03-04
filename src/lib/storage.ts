export const loadJson = <T>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') {
    return fallback
  }

  const raw = window.localStorage.getItem(key)
  if (!raw) {
    return fallback
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export const saveJson = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(key, JSON.stringify(value))
}

export const downloadJson = (fileName: string, payload: unknown): void => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export const readJsonFile = async <T>(file: File): Promise<T> => {
  const text = await file.text()
  return JSON.parse(text) as T
}
