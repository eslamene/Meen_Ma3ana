/**
 * Safe fetch utility that handles JSON parsing errors
 */
export async function safeFetch(url: string, options?: RequestInit) {
  try {
    const response = await fetch(url, options)
    
    // Check content type before parsing
    const contentType = response.headers.get('content-type')
    const isJson = contentType?.includes('application/json')
    
    if (!isJson) {
      // If not JSON, return error object
      return {
        ok: false,
        status: response.status,
        error: `Expected JSON but got ${contentType || 'unknown'}`,
        data: null
      }
    }
    
    const data = await response.json()
    
    return {
      ok: response.ok,
      status: response.status,
      data,
      error: response.ok ? null : (data.error || 'Unknown error')
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error instanceof Error ? error.message : 'Network error',
      data: null
    }
  }
}

