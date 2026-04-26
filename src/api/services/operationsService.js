import { api } from '../client';

export async function listClientes() {
  return api.get('/clientes');
}

export async function searchClientes(payload) {
  return api.post('/clientes/buscar', payload);
}

export async function getClienteById(id) {
  return api.get(`/clientes/${id}`);
}

export async function getClienteByIdentificacion(identificacion) {
  return api.get(`/clientes/por-identificacion/${encodeURIComponent(identificacion)}`);
}

export async function existsClienteIdentificacion(identificacion) {
  return api.get(`/clientes/existe?identificacion=${encodeURIComponent(identificacion)}`);
}

export async function createCliente(payload) {
  return api.post('/clientes', payload);
}

export async function updateCliente(id, payload) {
  return api.put(`/clientes/${id}`, payload);
}

export async function deleteCliente(id) {
  return api.delete(`/clientes/${id}`);
}

export async function listConductores() {
  return api.get('/conductores');
}

export async function searchConductores(payload) {
  return api.post('/conductores/buscar', payload);
}

export async function getConductorById(id) {
  return api.get(`/conductores/${id}`);
}

export async function getConductorByIdentificacion(identificacion) {
  return api.get(`/conductores/por-identificacion/${encodeURIComponent(identificacion)}`);
}

export async function getConductorByLicencia(numeroLicencia) {
  return api.get(`/conductores/por-licencia/${encodeURIComponent(numeroLicencia)}`);
}

export async function existsConductorIdentificacion(identificacion) {
  return api.get(
    `/conductores/existe-identificacion?identificacion=${encodeURIComponent(identificacion)}`
  );
}

export async function existsConductorLicencia(numeroLicencia) {
  return api.get(
    `/conductores/existe-licencia?numeroLicencia=${encodeURIComponent(numeroLicencia)}`
  );
}

export async function createConductor(payload) {
  return api.post('/conductores', payload);
}

export async function updateConductor(id, payload) {
  return api.put(`/conductores/${id}`, payload);
}

export async function deleteConductor(id) {
  return api.delete(`/conductores/${id}`);
}

export async function listVehiculos() {
  return api.get('/vehiculos');
}

export async function searchVehiculos(payload) {
  return api.post('/vehiculos/buscar', payload);
}

export async function getVehiculoById(id) {
  return api.get(`/vehiculos/${id}`);
}

export async function getVehiculoByPlaca(placa) {
  return api.get(`/vehiculos/por-placa?placa=${encodeURIComponent(placa)}`);
}

export async function getVehiculosByMarca(idMarca) {
  return api.get(`/vehiculos/por-marca/${idMarca}`);
}

export async function getVehiculosByCategoria(idCategoria) {
  return api.get(`/vehiculos/por-categoria/${idCategoria}`);
}

export async function getVehiculosDisponibles() {
  return api.get('/vehiculos/disponibles');
}

export async function getVehiculosByPrecio(min, max) {
  return api.get(`/vehiculos/por-precio?min=${encodeURIComponent(min)}&max=${encodeURIComponent(max)}`);
}

export async function existsVehiculoPlaca(placa) {
  return api.get(`/vehiculos/existe-placa?placa=${encodeURIComponent(placa)}`);
}

export async function createVehiculo(payload) {
  return api.post('/vehiculos', payload);
}

export async function updateVehiculo(id, payload) {
  return api.put(`/vehiculos/${id}`, payload);
}

export async function deleteVehiculo(id) {
  return api.delete(`/vehiculos/${id}`);
}

export async function updateVehiculoKilometraje(id, nuevoKilometraje) {
  return api.patch(`/vehiculos/${id}/kilometraje?nuevoKilometraje=${encodeURIComponent(nuevoKilometraje)}`);
}

export async function updateVehiculoEstado(id, estado) {
  return api.patch(`/vehiculos/${id}/estado?estado=${encodeURIComponent(estado)}`);
}

export async function listReservas() {
  return api.get('/reservas');
}

export async function searchReservas(payload) {
  return api.post('/reservas/buscar', payload);
}

export async function getReservaById(id) {
  return api.get(`/reservas/${id}`);
}

export async function getReservasByCliente(idCliente) {
  return api.get(`/reservas/por-cliente/${idCliente}`);
}

export async function getReservasByVehiculo(idVehiculo) {
  return api.get(`/reservas/por-vehiculo/${idVehiculo}`);
}

export async function verifyDisponibilidadReserva(idVehiculo, fechaInicio, fechaFin) {
  const params = new URLSearchParams({
    idVehiculo: String(idVehiculo),
    fechaInicio,
    fechaFin,
  });

  return api.get(`/reservas/disponibilidad?${params.toString()}`);
}

export async function createReserva(payload) {
  return api.post('/reservas', payload);
}

export async function updateReserva(id, payload) {
  return api.put(`/reservas/${id}`, payload);
}

export async function confirmReserva(id) {
  return api.post(`/reservas/${id}/confirmar`, {});
}

export async function cancelReserva(id, motivo) {
  return api.post(`/reservas/${id}/cancelar?motivo=${encodeURIComponent(motivo)}`, {});
}

export async function listFacturas() {
  return api.get('/facturas');
}

export async function searchFacturas(payload) {
  return api.post('/facturas/buscar', payload);
}

export async function getFacturaById(id) {
  return api.get(`/facturas/${id}`);
}

export async function getFacturasByCliente(idCliente) {
  return api.get(`/facturas/por-cliente/${idCliente}`);
}

export async function getFacturaByReserva(idReserva) {
  return api.get(`/facturas/por-reserva/${idReserva}`);
}

export async function createFactura(payload) {
  return api.post('/facturas', payload);
}

export async function updateFactura(id, payload) {
  return api.put(`/facturas/${id}`, payload);
}

export async function approveFactura(id) {
  return api.post(`/facturas/${id}/aprobar`, {});
}

export async function cancelFactura(id, motivo) {
  return api.post(`/facturas/${id}/anular?motivo=${encodeURIComponent(motivo)}`, {});
}
