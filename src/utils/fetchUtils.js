export async function safeJsonFetch(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...(options.headers ?? {}),
      },
      ...options,
    })

    if (!response.ok) {
      return []
    }

    const text = await response.text()
    if (!text) {
      return []
    }

    try {
      return JSON.parse(text)
    } catch {
      return []
    }
  } catch {
    return []
  }
}
