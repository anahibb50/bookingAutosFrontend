const BASE_URL = process.env.REACT_APP_API_BASE_URL;
const TOKEN_KEY = 'budgetCarToken';
const SESSION_KEY = 'budgetCarSession';

if (!BASE_URL) {
  throw new Error('Falta configurar REACT_APP_API_BASE_URL en el archivo .env');
}

function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setAuthToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export function getStoredSession() {
  const rawSession = localStorage.getItem(SESSION_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession);
  } catch (error) {
    clearSession();
    return null;
  }
}

function setStoredSession(response) {
  const token =
    response?.data?.token ||
    response?.data?.jwt ||
    response?.data?.accessToken ||
    response?.token ||
    response?.jwt ||
    response?.accessToken;

  const usuario =
    response?.data?.usuario ||
    response?.data?.user ||
    response?.usuario ||
    response?.user ||
    null;

  if (token) {
    setAuthToken(token);
  }

  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      token: token || getAuthToken() || '',
      usuario,
    })
  );
}

async function parseJsonResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const message =
      payload?.mensaje ||
      payload?.message ||
      payload?.error ||
      `Error HTTP ${response.status}`;

    throw new Error(message);
  }

  return payload;
}

function buildHeaders(extraHeaders = {}) {
  const token = getAuthToken();

  return {
    Accept: 'application/json',
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
  get: async (endpoint) => {
    return request(endpoint);
  },

  post: async (endpoint, data) => {
    return request(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  put: async (endpoint, data) => {
    return request(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  },

  delete: async (endpoint) => {
    return request(endpoint, {
      method: 'DELETE',
    });
  },
};

export async function loginRequest(credentials) {
  const response = await api.post('/auth/login', credentials);
  setStoredSession(response);
  return response;
}

export async function listPaises() {
  return api.get('/paises');
}

export async function getPaisById(id) {
  return api.get(`/paises/${id}`);
}

export async function getPaisByNombre(nombre) {
  return api.get(`/paises/por-nombre?nombre=${encodeURIComponent(nombre)}`);
}

export async function getPaisByIso(codigoIso) {
  return api.get(`/paises/por-iso?codigoIso=${encodeURIComponent(codigoIso)}`);
}

export async function existsPaisNombre(nombre) {
  return api.get(`/paises/existe-nombre?nombre=${encodeURIComponent(nombre)}`);
}

export async function existsPaisIso(codigoIso) {
  return api.get(`/paises/existe-iso?codigoIso=${encodeURIComponent(codigoIso)}`);
}

export async function createPais(payload) {
  return api.post('/paises', payload);
}

export async function updatePais(id, payload) {
  return api.put(`/paises/${id}`, payload);
}

export async function deletePais(id) {
  return api.delete(`/paises/${id}`);
}

export async function listMarcas() {
  return api.get('/marcas');
}

export async function getMarcaById(id) {
  return api.get(`/marcas/${id}`);
}

export async function getMarcaByNombre(nombre) {
  return api.get(`/marcas/por-nombre?nombre=${encodeURIComponent(nombre)}`);
}

export async function existsMarcaNombre(nombre) {
  return api.get(`/marcas/existe?nombre=${encodeURIComponent(nombre)}`);
}

export async function createMarca(payload) {
  return api.post('/marcas', payload);
}

export async function updateMarca(id, payload) {
  return api.put(`/marcas/${id}`, payload);
}

export async function deleteMarca(id) {
  return api.delete(`/marcas/${id}`);
}

export async function listCiudades() {
  return api.get('/ciudades');
}

export async function getCiudadById(id) {
  return api.get(`/ciudades/${id}`);
}

export async function getCiudadesByPais(idPais) {
  return api.get(`/ciudades/por-pais/${idPais}`);
}

export async function existsCiudad(nombre, idPais) {
  return api.get(
    `/ciudades/existe?nombre=${encodeURIComponent(nombre)}&idPais=${encodeURIComponent(idPais)}`
  );
}

export async function createCiudad(payload) {
  return api.post('/ciudades', payload);
}

export async function updateCiudad(id, payload) {
  return api.put(`/ciudades/${id}`, payload);
}

export async function deleteCiudad(id) {
  return api.delete(`/ciudades/${id}`);
}

export { BASE_URL, TOKEN_KEY, SESSION_KEY };
