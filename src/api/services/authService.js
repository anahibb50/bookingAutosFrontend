import { api, SESSION_KEY, TOKEN_KEY, setAuthToken } from '../client';
import { searchClientes } from './operationsService';

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
  const direct = session?.roles;
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

  return [...new Set([...normalizeRoles(direct), ...normalizeRoles(userRoles), ...normalizeRoles(tokenRoles)])];
}

export function sessionHasRole(role, session = getStoredSession()) {
  return getSessionRoles(session).includes(String(role || '').trim().toUpperCase());
}

export function sessionIsStaff(session = getStoredSession()) {
  return sessionHasRole('ADMIN', session) || sessionHasRole('VENDEDOR', session);
}

function coercePositiveInt(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** idCliente plano o dentro de objeto cliente anidado (LoginResponse). */
function pickIdClienteNestedObject(node) {
  if (!node || typeof node !== 'object') {
    return null;
  }
  let v = coercePositiveInt(
    node.idCliente ?? node.IdCliente ?? node.id_cliente ?? node.ClienteId ?? node.clienteId
  );
  if (v) {
    return v;
  }
  const c = node.cliente ?? node.Cliente;
  if (c && typeof c === 'object') {
    v = coercePositiveInt(c.idCliente ?? c.IdCliente ?? c.id ?? c.Id);
    if (v) {
      return v;
    }
  }
  return null;
}

/**
 * Si la sesion no tiene idCliente pero hay token + correo, intenta resolverlo con busqueda de cliente (misma API).
 * Actualiza localStorage para siguientes pantallas.
 */
export async function hydrateSessionIdClienteFromApi() {
  const session = getStoredSession();
  if (!session?.token) {
    return null;
  }
  const existing = getSessionIdCliente(session);
  if (existing) {
    return existing;
  }
  const correo = String(session.usuario?.correo || session.usuario?.email || '').trim();
  if (!correo) {
    return null;
  }
  try {
    const res = await searchClientes({
      email: correo,
      pagina: 1,
      tamano: 25,
    });
    const source = res?.data ?? {};
    const items =
      source?.items ??
      source?.registros ??
      source?.records ??
      source?.resultado ??
      source?.data ??
      [];
    if (!Array.isArray(items) || items.length === 0) {
      return null;
    }
    const cid = coercePositiveInt(items[0]?.id ?? items[0]?.Id);
    if (!cid) {
      return null;
    }
    const usuarioNext = { ...(session.usuario || {}), idCliente: cid };
    const nextSession = {
      ...session,
      usuario: usuarioNext,
      idCliente: cid,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    return cid;
  } catch {
    return null;
  }
}

/**
 * idCliente: prioridad JSON guardado en sesion (LoginResponse); el JWT solo se usa si existiera claim (no es tu caso).
 */
export function getSessionIdCliente(session = getStoredSession()) {
  if (!session) {
    return null;
  }

  const fromUsuario = coercePositiveInt(
    session.usuario?.idCliente ?? session.usuario?.IdCliente ?? session.usuario?.id_cliente
  );
  if (fromUsuario) {
    return fromUsuario;
  }

  const nestedUsuario = pickIdClienteNestedObject(session.usuario);
  if (nestedUsuario) {
    return nestedUsuario;
  }

  const fromRoot = coercePositiveInt(session.idCliente ?? session.IdCliente);
  if (fromRoot) {
    return fromRoot;
  }

  const payload = decodeJwtPayload(session.token);
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const fromJwt = coercePositiveInt(
    payload.idCliente ??
      payload.IdCliente ??
      payload.cliente_id ??
      payload.id_cliente ??
      payload.ClienteId ??
      payload.clienteId
  );
  if (fromJwt) {
    return fromJwt;
  }

  const claimKeys = Object.keys(payload).filter((k) => /cliente/i.test(k) && /id|^id$/i.test(k));
  for (const key of claimKeys) {
    const v = coercePositiveInt(payload[key]);
    if (v) return v;
  }

  return null;
}

function throwIfApiEnvelopeFailed(response) {
  if (response && typeof response === 'object' && 'success' in response && response.success === false) {
    throw new Error(response.message || 'La operacion no se completó.');
  }
}

function pickToken(node) {
  if (!node || typeof node !== 'object') {
    return '';
  }
  return (
    node.token ??
    node.Token ??
    node.jwt ??
    node.Jwt ??
    node.accessToken ??
    node.AccessToken ??
    ''
  );
}

/**
 * Cuerpo util del login puede estar en response.data, response.Data, o un nivel dentro (p. ej. data.result).
 */
function tryPickLoginObject(response) {
  const roots = [response?.data, response?.Data].filter((x) => x && typeof x === 'object');

  for (const root of roots) {
    if (pickToken(root)) {
      return root;
    }
    for (const value of Object.values(root)) {
      if (value && typeof value === 'object' && !Array.isArray(value) && pickToken(value)) {
        return value;
      }
    }
  }

  if (response && typeof response === 'object' && pickToken(response)) {
    return response;
  }

  return null;
}

/**
 * idCliente solo en JSON de login (no en JWT): buscar en LoginResponse y envoltorio ApiResponse.
 */
function extractIdClienteFromLoginEnvelope(response, loginData) {
  const scanNode = (node) => pickIdClienteNestedObject(node);

  const roots = [loginData, response?.data, response?.Data, response].filter((x) => x && typeof x === 'object');

  for (const root of roots) {
    const direct = scanNode(root);
    if (direct) {
      return direct;
    }
    for (const value of Object.values(root)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const inner = scanNode(value);
        if (inner) {
          return inner;
        }
      }
    }
  }

  return null;
}

/**
 * Resuelve el cuerpo util de login/registro: ApiResponse<LoginResponse> o respuestas legacy.
 */
function resolveLoginPayload(response) {
  throwIfApiEnvelopeFailed(response);

  const picked = tryPickLoginObject(response);
  if (picked) {
    return picked;
  }

  const legacyUser = response?.data?.usuario || response?.data?.user || response?.Data?.usuario;
  const legacyRoot = response?.data ?? response?.Data;
  if (legacyUser && legacyRoot && typeof legacyRoot === 'object' && pickToken(legacyRoot)) {
    return { ...legacyRoot, usuario: legacyUser, ...legacyUser };
  }

  return response?.data ?? response?.Data ?? null;
}

function setStoredSession(response) {
  const loginData = resolveLoginPayload(response);
  const token = pickToken(loginData) || pickToken(response);
  const idClienteFromEnvelope = extractIdClienteFromLoginEnvelope(response, loginData);

  const rolesRaw = loginData?.roles ?? loginData?.Roles ?? [];
  const rolesList = Array.isArray(rolesRaw) ? rolesRaw : [];

  const usuario = {
    username: loginData?.username ?? loginData?.Username ?? loginData?.userName,
    correo: loginData?.correo ?? loginData?.Correo ?? loginData?.email,
    idUsuario: loginData?.idUsuario ?? loginData?.IdUsuario,
    idCliente:
      coercePositiveInt(loginData?.idCliente ?? loginData?.IdCliente ?? loginData?.id_cliente) ??
      idClienteFromEnvelope ??
      null,
    roles: rolesList,
    nombre: loginData?.nombre ?? loginData?.Nombre,
  };

  const legacyNested =
    response?.data?.usuario || response?.data?.user || response?.Data?.usuario || response?.Data?.user;
  if (legacyNested && typeof legacyNested === 'object') {
    if (!usuario.username) usuario.username = legacyNested.username ?? legacyNested.userName;
    if (!usuario.correo) usuario.correo = legacyNested.correo ?? legacyNested.email;
    if (usuario.idUsuario == null) usuario.idUsuario = legacyNested.idUsuario ?? legacyNested.id;
    if (usuario.idCliente == null) {
      usuario.idCliente =
        coercePositiveInt(legacyNested.idCliente ?? legacyNested.IdCliente ?? legacyNested.id_cliente) ??
        idClienteFromEnvelope ??
        null;
    }
    if (!usuario.roles?.length) {
      usuario.roles =
        legacyNested.roles ??
        legacyNested.Roles ??
        legacyNested.rol ??
        legacyNested.perfiles ??
        usuario.roles;
    }
    if (!usuario.nombre) usuario.nombre = legacyNested.nombre;
  }

  const nestedPick =
    pickIdClienteNestedObject(loginData) ??
    pickIdClienteNestedObject(response?.data) ??
    pickIdClienteNestedObject(response?.Data);
  if (usuario.idCliente == null && nestedPick != null) {
    usuario.idCliente = nestedPick;
  }

  if (token) {
    setAuthToken(token);
  }

  const jwtPayload = decodeJwtPayload(token);
  const idClienteFromJwt = jwtPayload
    ? coercePositiveInt(
        jwtPayload.idCliente ??
          jwtPayload.IdCliente ??
          jwtPayload.cliente_id ??
          jwtPayload.id_cliente ??
          jwtPayload.ClienteId ??
          jwtPayload.clienteId
      )
    : null;

  if (usuario.idCliente == null && idClienteFromJwt != null) {
    usuario.idCliente = idClienteFromJwt;
  }
  if (usuario.idCliente == null && idClienteFromEnvelope != null) {
    usuario.idCliente = idClienteFromEnvelope;
  }

  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      token: token || localStorage.getItem(TOKEN_KEY) || '',
      usuario,
      idUsuario: usuario.idUsuario,
      idCliente: usuario.idCliente ?? idClienteFromEnvelope ?? idClienteFromJwt ?? null,
      roles: Array.isArray(usuario.roles) ? usuario.roles : [],
      expiraEn: loginData?.expiraEn ?? loginData?.ExpiraEn,
      tipo: loginData?.tipo ?? loginData?.Tipo,
    })
  );
}

export async function loginRequest(credentials) {
  const response = await api.post('/auth/login', credentials);
  setStoredSession(response);
  return response;
}

export async function registerRequest(payload) {
  const response = await api.post('/auth/register', payload);
  setStoredSession(response);
  return response;
}
