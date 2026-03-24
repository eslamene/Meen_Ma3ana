/**
 * API Client Utilities
 * Base fetch wrapper with error handling, auth headers, and type-safe API methods
 */

import { defaultLogger } from '@/lib/logger'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  errorCode?: string
  details?: unknown
  correlationId?: string
}

export interface ApiErrorResponse {
  error: string
  errorCode: string
  details?: unknown
  correlationId?: string
}

/**
 * Base API client configuration
 */
class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
  }

  /**
   * Get auth headers from cookies or session
   */
  private async getAuthHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    // Try to get auth token from cookies
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split('; ')
      const authCookie = cookies.find(cookie => cookie.startsWith('sb-'))
      if (authCookie) {
        // Extract token if needed
        // Note: Supabase SSR handles auth via cookies automatically
      }
    }

    return headers
  }

  /**
   * Base fetch method with error handling
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`
    const headers = await this.getAuthHeaders()

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
        credentials: 'include', // Include cookies for auth
      })

      const data = await response.json().catch(() => ({})) as ApiResponse<T> | ApiErrorResponse

      if (!response.ok) {
        const errorData = data as ApiErrorResponse
        defaultLogger.error('API request failed', {
          url,
          status: response.status,
          error: errorData.error || response.statusText,
          errorCode: errorData.errorCode,
        })

        return {
          success: false,
          error: errorData.error || response.statusText,
          errorCode: errorData.errorCode || 'API_ERROR',
          details: errorData.details,
          correlationId: errorData.correlationId,
        }
      }

      const response = data as ApiResponse<T>
      return {
        ...response,
        success: true,
      }
    } catch (error) {
      defaultLogger.error('API request exception', { url, error })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        errorCode: 'NETWORK_ERROR',
      }
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, string | number | boolean | null | undefined>): Promise<ApiResponse<T>> {
    let url = endpoint
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          searchParams.append(key, String(value))
        }
      })
      const queryString = searchParams.toString()
      if (queryString) {
        url += `?${queryString}`
      }
    }
    return this.request<T>(url, { method: 'GET' })
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

// Export singleton instance
export const apiClient = new ApiClient()

// Export class for custom instances
export { ApiClient }

