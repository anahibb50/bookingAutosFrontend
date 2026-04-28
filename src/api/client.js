const BASE_URL = process.env.REACT_APP_API_BASE_URL;
const TOKEN_KEY = 'budgetCarToken';
const SESSION_KEY = 'budgetCarSession';

if (!BASE_URL) {
  throw new Error('Falta configurar REACT_APP_API_BASE_URL en el archivo .env');
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

function extractBackendMessage(payload, fallbackMessage) {
  if (!payload) {
    return fallbackMessage;
  }

  const collectMessages = (errorsNode) => {
    if (!errorsNode) {
      return [];
    }

    if (Array.isArray(errorsNode)) {
      return errorsNode
        .flatMap((item) => (typeof item === 'string' ? [item] : []))
        .filter((value) => value.trim());
    }

    if (typeof errorsNode === 'object') {
      return Object.values(errorsNode)
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .filter((value) => typeof value === 'string' && value.trim());
    }

    return [];
  };

  // Prioriza mensajes de validacion detallados (ASP.NET ProblemDetails y variantes)
  const detailedMessages = [
    ...collectMessages(payload?.errors),
    ...collectMessages(payload?.errores),
    ...collectMessages(payload?.extensions?.errors),
    ...collectMessages(payload?.extensions?.errores),
    ...collectMessages(payload?.data?.errors),
    ...collectMessages(payload?.data?.errores),
  ];

  if (detailedMessages.length > 0) {
    return detailedMessages.join(' ');
  }

  const directMessage =
    payload?.mensaje ||
    payload?.message ||
    payload?.error ||
    payload?.detalle ||
    payload?.detail ||
    payload?.title;

  if (typeof directMessage === 'string' && directMessage.trim()) {
    return directMessage.trim();
  }

  if (payload?.errors && typeof payload.errors === 'object') {
    const validationMessages = Object.values(payload.errors)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value) => typeof value === 'string' && value.trim());

    if (validationMessages.length > 0) {
      return validationMessages.join(' ');
    }
  }

  return fallbackMessage;
}

async function parseJsonResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const message = extractBackendMessage(payload, `Error HTTP ${response.status}`);

    throw new Error(message);
  }

  return payload;
}

function buildHeaders(extraHeaders = {}) {
  const token = getAuthToken();
  const apiVersion = process.env.REACT_APP_API_VERSION;

  return {
    Accept: 'application/json',
    ...(apiVersion ? { 'X-Version': apiVersion } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
}

async function request(endpoint, options = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: buildHeaders(options.headers),
  });

  return parseJsonResponse(response);
}

export const api = {
  get: async (endpoint) => request(endpoint),

  post: async (endpoint, data) =>
    request(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }),

  put: async (endpoint, data) =>
    request(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    }),

  delete: async (endpoint) =>
    request(endpoint, {
      method: 'DELETE',
    }),

  patch: async (endpoint, data) => {
    const options = {
      method: 'PATCH',
      headers: {},
    };

    if (data !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(data);
    }

    return request(endpoint, options);
  },
};

export { BASE_URL, TOKEN_KEY, SESSION_KEY };
