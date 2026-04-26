import { api, SESSION_KEY, TOKEN_KEY, setAuthToken } from '../client';

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

function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const parts = token.split('.');

  if (parts.length < 2) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = atob(padded);
    return JSON.parse(json);
  } catch (error) {
    return null;
  }
}

export function getSessionRoles(session = getStoredSession()) {
  const usuario = session?.usuario;
  const tokenPayload = decodeJwtPayload(session?.token);

  const normalizeRoles = (value) => {
    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return value
        .map((role) => {
          if (typeof role === 'string') {
            return role;
          }

          return role?.nombre ?? role?.name ?? role?.rol ?? role?.role ?? '';
        })
        .filter(Boolean)
        .map((role) => String(role).trim().toUpperCase());
    }

    if (typeof value === 'string') {
      return value
        .split(',')
        .map((role) => role.trim().toUpperCase())
        .filter(Boolean);
    }

    return [];
  };

  const userRoles =
    usuario?.roles ??
    usuario?.Roles ??
    usuario?.rol ??
    usuario?.Rol ??
    usuario?.role ??
    usuario?.Role ??
    usuario?.perfiles ??
    usuario?.Perfiles ??
    [];

  const tokenRoles =
    tokenPayload?.roles ??
    tokenPayload?.role ??
    tokenPayload?.Role ??
    tokenPayload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ??
    tokenPayload?.['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role'] ??
    tokenPayload?.realm_access?.roles ??
    [];

  return [...new Set([...normalizeRoles(userRoles), ...normalizeRoles(tokenRoles)])];
}

export function sessionHasRole(role, session = getStoredSession()) {
  return getSessionRoles(session).includes(String(role || '').trim().toUpperCase());
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
      token: token || localStorage.getItem(TOKEN_KEY) || '',
      usuario,
    })
  );
}

export async function loginRequest(credentials) {
  const response = await api.post('/auth/login', credentials);
  setStoredSession(response);
  return response;
}
