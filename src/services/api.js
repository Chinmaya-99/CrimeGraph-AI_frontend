const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://sih26189-backend.getvoroa.com';

/*
 * =================================================================
 * AUTHENTICATION HELPERS
 * =================================================================
 */

function getAccessToken() {
  return localStorage.getItem('access_token');
}

function createAuthHeaders(options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getAccessToken();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

/*
 * Wrapper for protected API requests.
 *
 * The JWT is read from localStorage and attached as:
 *
 * Authorization: Bearer <token>
 *
 * IMPORTANT:
 * Do not manually set Content-Type for FormData requests.
 * The browser needs to generate the multipart boundary.
 */
async function authenticatedFetch(url, options = {}) {
  const headers = createAuthHeaders(options);

  return fetch(url, {
    ...options,
    headers,
  });
}

/*
 * =================================================================
 * RESPONSE PARSER
 * =================================================================
 */

async function parseResponse(response) {
  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail =
      payload?.detail ||
      payload?.message ||
      `Backend request failed with status ${response.status}.`;

    const error = new Error(
      typeof detail === 'string'
        ? detail
        : JSON.stringify(detail)
    );

    /*
     * Mark authentication failures so App.jsx can
     * clear the local session and return to Login.
     */
    if (response.status === 401) {
      error.code = 'AUTHENTICATION_REQUIRED';
      error.status = 401;
    } else {
      error.status = response.status;
    }

    throw error;
  }

  return payload;
}

/*
 * =================================================================
 * UPLOAD FIR
 * =================================================================
 *
 * POST /firs/upload
 *
 * Requires:
 * - investigator
 * - admin
 *
 * Backend pipeline:
 *
 * PDF
 *  ↓
 * NER
 *  ↓
 * Cross-database lookup
 *  ↓
 * LLM reasoning
 *  ↓
 * PostgreSQL
 */

export async function uploadFIR(file) {
  if (!file) {
    throw new Error('No FIR file selected.');
  }

  const formData = new FormData();
  formData.append('file', file);

  let response;

  try {
    response = await authenticatedFetch(
      `${API_BASE_URL}/firs/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );
  } catch (error) {
    /*
     * Do not replace our own authentication/backend errors
     * with a generic connection error.
     */
    if (
      error?.code === 'AUTHENTICATION_REQUIRED' ||
      error?.status === 401
    ) {
      throw error;
    }

    console.error(
      'Backend connection error:',
      error
    );

    throw new Error(
      `Unable to connect to the backend API at ${API_BASE_URL}. Make sure FastAPI is running.`
    );
  }

  return parseResponse(response);
}

/*
 * =================================================================
 * PROJECT FIR GRAPH
 * =================================================================
 *
 * POST /graphs/{fir_id}/project
 *
 * Requires:
 * - investigator
 * - admin
 *
 * Takes the latest validated LLM reasoning stored in PostgreSQL
 * and projects those relationships into Neo4j.
 */

export async function projectFIRGraph(firId) {
  if (!firId) {
    throw new Error(
      'A FIR id is required to project the graph.'
    );
  }

  let response;

  try {
    response = await authenticatedFetch(
      `${API_BASE_URL}/graphs/${encodeURIComponent(firId)}/project`,
      {
        method: 'POST',
      }
    );
  } catch (error) {
    if (
      error?.code === 'AUTHENTICATION_REQUIRED' ||
      error?.status === 401
    ) {
      throw error;
    }

    console.error(
      'Graph projection connection error:',
      error
    );

    throw new Error(
      `Unable to connect to the graph API at ${API_BASE_URL}.`
    );
  }

  return parseResponse(response);
}

/*
 * =================================================================
 * GET FIR GRAPH
 * =================================================================
 *
 * GET /graphs/{fir_id}
 *
 * Requires:
 * - viewer
 * - investigator
 * - admin
 *
 * This is a READ operation.
 *
 * It does NOT project or modify the graph.
 */

export async function getFIRGraph(firId) {
  if (!firId) {
    throw new Error(
      'A FIR id is required to load the graph.'
    );
  }

  let response;

  try {
    response = await authenticatedFetch(
      `${API_BASE_URL}/graphs/${encodeURIComponent(firId)}`,
      {
        method: 'GET',
      }
    );
  } catch (error) {
    if (
      error?.code === 'AUTHENTICATION_REQUIRED' ||
      error?.status === 401
    ) {
      throw error;
    }

    console.error(
      'Graph API connection error:',
      error
    );

    throw new Error(
      `Unable to connect to the graph API at ${API_BASE_URL}.`
    );
  }

  return parseResponse(response);
}

/*
 * =================================================================
 * RETRIEVE HISTORICAL INTELLIGENCE
 * =================================================================
 *
 * GET /graphs/history?fir_id={fir_id}
 *
 * Requires:
 * - viewer
 * - investigator
 * - admin
 *
 * Retrieves previously persisted LLM reasoning for a specific FIR
 * from PostgreSQL.
 *
 * This does NOT call the LLM again.
 */

export async function getHistoricalIntelligence(firId) {
  if (
    firId === undefined ||
    firId === null ||
    String(firId).trim() === ''
  ) {
    throw new Error(
      'A FIR ID is required to retrieve historical intelligence.'
    );
  }

  const value = String(firId).trim();

  let response;

  try {
    response = await authenticatedFetch(
      `${API_BASE_URL}/graphs/history?fir_id=${encodeURIComponent(value)}`,
      {
        method: 'GET',
      }
    );
  } catch (error) {
    if (
      error?.code === 'AUTHENTICATION_REQUIRED' ||
      error?.status === 401
    ) {
      throw error;
    }

    console.error(
      'Historical intelligence connection error:',
      error
    );

    throw new Error(
      `Unable to connect to the intelligence API at ${API_BASE_URL}.`
    );
  }

  return parseResponse(response);
}

/*
 * =================================================================
 * BACKEND HEALTH
 * =================================================================
 *
 * GET /health
 *
 * This endpoint is intentionally public.
 * No JWT is required.
 */

export async function getBackendHealth() {
  try {
    const response = await fetch(
      `${API_BASE_URL}/health`,
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      return {
        status: 'unhealthy',
      };
    }

    const payload = await response.json();

    return {
      ...payload,
      status:
        payload?.status ||
        'healthy',
    };
  } catch (error) {
    console.error(
      'Backend health check failed:',
      error
    );

    return {
      status: 'unreachable',
    };
  }
}

/*
 * =================================================================
 * ADMIN CREATE USER
 * =================================================================
 *
 * POST /auth/users
 *
 * Requires:
 * - admin
 *
 * Allows an administrator to create:
 * - viewer
 * - investigator
 * - admin
 */

export async function createUser(userData) {
  if (!userData) {
    throw new Error(
      'User data is required.'
    );
  }

  const {
    username,
    email,
    password,
    full_name,
    role,
  } = userData;

  if (!username?.trim()) {
    throw new Error(
      'Username is required.'
    );
  }

  if (!email?.trim()) {
    throw new Error(
      'Email is required.'
    );
  }

  if (!password) {
    throw new Error(
      'Password is required.'
    );
  }

  if (!role) {
    throw new Error(
      'User role is required.'
    );
  }

  let response;

  try {
    response = await authenticatedFetch(
      `${API_BASE_URL}/auth/users`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
          full_name:
            full_name?.trim() || null,
          role: role.trim().toLowerCase(),
        }),
      }
    );
  } catch (error) {
    if (
      error?.code ===
        'AUTHENTICATION_REQUIRED' ||
      error?.status === 401
    ) {
      throw error;
    }

    console.error(
      'Create user connection error:',
      error
    );

    throw new Error(
      `Unable to connect to the authentication API at ${API_BASE_URL}.`
    );
  }

  return parseResponse(response);
}
/*
 * =================================================================
 * API BASE URL
 * =================================================================
 */

export function getApiBaseUrl() {
  return API_BASE_URL;
}