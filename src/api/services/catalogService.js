import { api } from '../client';

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

export async function listCategorias() {
  return api.get('/categorias');
}

export async function getCategoriaById(id) {
  return api.get(`/categorias/${id}`);
}

export async function existsCategoriaNombre(nombre) {
  return api.get(`/categorias/existe?nombre=${encodeURIComponent(nombre)}`);
}

export async function createCategoria(payload) {
  return api.post('/categorias', payload);
}

export async function updateCategoria(id, payload) {
  return api.put(`/categorias/${id}`, payload);
}

export async function deleteCategoria(id) {
  return api.delete(`/categorias/${id}`);
}

export async function listExtras() {
  return api.get('/extras');
}

export async function listExtrasActivos() {
  return api.get('/extras/activos');
}

export async function getExtraById(id) {
  return api.get(`/extras/${id}`);
}

export async function getExtrasByNombre(nombre) {
  return api.get(`/extras/buscar?nombre=${encodeURIComponent(nombre)}`);
}

export async function createExtra(payload) {
  return api.post('/extras', payload);
}

export async function updateExtra(id, payload) {
  return api.put(`/extras/${id}`, payload);
}

export async function updateExtraPrecio(id, nuevoPrecio) {
  return api.patch(`/extras/${id}/precio?nuevoPrecio=${encodeURIComponent(nuevoPrecio)}`);
}

export async function deleteExtra(id) {
  return api.delete(`/extras/${id}`);
}

export async function listLocalizaciones() {
  return api.get('/localizaciones');
}

export async function getLocalizacionById(id) {
  return api.get(`/localizaciones/${id}`);
}

export async function getLocalizacionesByCiudad(idCiudad) {
  return api.get(`/localizaciones/por-ciudad/${idCiudad}`);
}

export async function getLocalizacionByNombre(nombre) {
  return api.get(`/localizaciones/buscar?nombre=${encodeURIComponent(nombre)}`);
}

export async function existsLocalizacion(nombre, idCiudad) {
  return api.get(
    `/localizaciones/existe?nombre=${encodeURIComponent(nombre)}&idCiudad=${encodeURIComponent(idCiudad)}`
  );
}

export async function createLocalizacion(payload) {
  return api.post('/localizaciones', payload);
}

export async function updateLocalizacion(id, payload) {
  return api.put(`/localizaciones/${id}`, payload);
}

export async function disableLocalizacion(id) {
  return api.patch(`/localizaciones/${id}/inhabilitar`);
}
