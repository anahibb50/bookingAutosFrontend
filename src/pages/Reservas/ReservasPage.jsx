import { useEffect, useMemo, useState } from 'react';
import {
  cancelReserva,
  confirmReserva,
  createReserva,
  getReservaById,
  getReservasByCliente,
  getReservasByVehiculo,
  listClientes,
  listConductores,
  listExtrasActivos,
  listLocalizaciones,
  searchReservas,
  updateReserva,
  verifyDisponibilidadReserva,
} from '../../api/services/api';
import styles from '../shared/CrudPage.module.css';

const emptyExtra = {
  idExtra: '',
  cantidad: '1',
};

const emptyConductor = {
  idConductor: '',
  rol: 'TITULAR',
  esPrincipal: true,
  observaciones: '',
};

const initialForm = {
  idCliente: '',
  idVehiculo: '',
  idLocalizacionRecogida: '',
  idLocalizacionEntrega: '',
  cantidadDias: '',
  fechaInicio: '',
  fechaFin: '',
  horaInicio: '',
  horaFin: '',
  descripcion: '',
  extras: [],
  conductores: [{ ...emptyConductor }],
};

const initialFilters = {
  idCliente: '',
  idVehiculo: '',
  idLocalizacionRecogida: '',
  idLocalizacionEntrega: '',
  fechaInicioDesde: '',
  fechaInicioHasta: '',
  fechaFinDesde: '',
  fechaFinHasta: '',
  estado: '',
  codigoReserva: '',
  pagina: 1,
  tamano: 10,
};

function normalizeCliente(item) {
  return {
    id: item?.id ?? '',
    nombre: [item?.nombre, item?.apellido].filter(Boolean).join(' ') || item?.razonSocial || '',
  };
}

function normalizeConductor(item) {
  return {
    id: item?.id ?? '',
    nombre:
      [item?.nombre1, item?.nombre2, item?.apellido1, item?.apellido2].filter(Boolean).join(' ') || '',
    numeroLicencia: item?.numeroLicencia ?? '',
  };
}

function normalizeExtra(item) {
  return {
    id: item?.id ?? '',
    nombre: item?.nombre ?? item?.nombreExtra ?? '',
    precio: Number(item?.precio ?? item?.valor ?? 0),
  };
}

function normalizeLocalizacion(item) {
  return {
    id: item?.id ?? '',
    nombre: item?.nombre ?? '',
    idCiudad: item?.idCiudad ?? '',
  };
}

function normalizeReserva(item) {
  return {
    id: item?.id ?? '',
    guid: item?.guid ?? '',
    codigo: item?.codigo ?? '',
    idCliente: item?.idCliente ?? '',
    idVehiculo: item?.idVehiculo ?? '',
    idLocalizacionRecogida: item?.idLocalizacionRecogida ?? '',
    idLocalizacionEntrega: item?.idLocalizacionEntrega ?? '',
    fechaInicio: item?.fechaInicio ?? '',
    fechaFin: item?.fechaFin ?? '',
    horaInicio: item?.horaInicio ?? '',
    horaFin: item?.horaFin ?? '',
    cantidadDias: item?.cantidadDias ?? '',
    subtotal: Number(item?.subtotal ?? 0),
    iva: Number(item?.iva ?? 0),
    total: Number(item?.total ?? 0),
    descripcion: item?.descripcion ?? '',
    origenCanal: item?.origenCanal ?? '',
    estado: item?.estado ?? '',
    fechaConfirmacionUtc: item?.fechaConfirmacionUtc ?? '',
    fechaCancelacionUtc: item?.fechaCancelacionUtc ?? '',
    motivoCancelacion: item?.motivoCancelacion ?? '',
    extras: Array.isArray(item?.extras) ? item.extras : [],
    conductores: Array.isArray(item?.conductores) ? item.conductores : [],
  };
}

function extractPagedItems(response) {
  const source = response?.data ?? {};
  const items =
    source?.items ??
    source?.registros ??
    source?.records ??
    source?.resultado ??
    source?.data ??
    [];

  const total =
    source?.total ??
    source?.totalRegistros ??
    source?.totalRecords ??
    source?.count ??
    source?.cantidad ??
    items.length;

  const currentPage =
    source?.page ??
    source?.pagina ??
    source?.currentPage ??
    source?.numeroPagina ??
    1;

  const pageSize =
    source?.pageSize ??
    source?.tamano ??
    source?.pageLength ??
    source?.cantidadPorPagina ??
    items.length;

  return {
    items: Array.isArray(items) ? items.map(normalizeReserva) : [],
    total: Number(total) || 0,
    page: Number(currentPage) || 1,
    pageSize: Number(pageSize) || 10,
  };
}

function extractItem(response) {
  return response?.data ? normalizeReserva(response.data) : null;
}

function buildFiltersPayload(filters) {
  return {
    ...(filters.idCliente ? { idCliente: Number(filters.idCliente) } : {}),
    ...(filters.idVehiculo ? { idVehiculo: Number(filters.idVehiculo) } : {}),
    ...(filters.idLocalizacionRecogida ? { idLocalizacionRecogida: Number(filters.idLocalizacionRecogida) } : {}),
    ...(filters.idLocalizacionEntrega ? { idLocalizacionEntrega: Number(filters.idLocalizacionEntrega) } : {}),
    ...(filters.fechaInicioDesde ? { fechaInicioDesde: filters.fechaInicioDesde } : {}),
    ...(filters.fechaInicioHasta ? { fechaInicioHasta: filters.fechaInicioHasta } : {}),
    ...(filters.fechaFinDesde ? { fechaFinDesde: filters.fechaFinDesde } : {}),
    ...(filters.fechaFinHasta ? { fechaFinHasta: filters.fechaFinHasta } : {}),
    ...(filters.estado ? { estado: filters.estado } : {}),
    ...(filters.codigoReserva.trim() ? { codigoReserva: filters.codigoReserva.trim() } : {}),
    pagina: Number(filters.pagina) || 1,
    tamano: Number(filters.tamano) || 10,
  };
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('es-EC');
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('es-EC', {
    style: 'currency',
    currency: 'USD',
  });
}

function ReservasPage({ onBack }) {
  const [reservas, setReservas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [conductoresCatalog, setConductoresCatalog] = useState([]);
  const [extrasCatalog, setExtrasCatalog] = useState([]);
  const [localizaciones, setLocalizaciones] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [filters, setFilters] = useState(initialFilters);
  const [editingId, setEditingId] = useState(null);
  const [selectedReserva, setSelectedReserva] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState('');

  const formTitle = useMemo(() => (editingId ? 'Editar reserva' : 'Crear reserva'), [editingId]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize || 1)), [pageSize, total]);

  const getClienteNombre = (idCliente) =>
    clientes.find((cliente) => String(cliente.id) === String(idCliente))?.nombre || `Cliente ${idCliente}`;

  const getLocalizacionNombre = (idLocalizacion) =>
    localizaciones.find((localizacion) => String(localizacion.id) === String(idLocalizacion))?.nombre ||
    `Loc. ${idLocalizacion}`;

  const loadCatalogs = async () => {
    const [clientesResponse, conductoresResponse, extrasResponse, localizacionesResponse] = await Promise.all([
      listClientes(),
      listConductores(),
      listExtrasActivos(),
      listLocalizaciones(),
    ]);

    setClientes(Array.isArray(clientesResponse?.data) ? clientesResponse.data.map(normalizeCliente) : []);
    setConductoresCatalog(
      Array.isArray(conductoresResponse?.data) ? conductoresResponse.data.map(normalizeConductor) : []
    );
    setExtrasCatalog(Array.isArray(extrasResponse?.data) ? extrasResponse.data.map(normalizeExtra) : []);
    setLocalizaciones(
      Array.isArray(localizacionesResponse?.data)
        ? localizacionesResponse.data.map(normalizeLocalizacion)
        : []
    );
  };

  const loadReservas = async (nextFilters = filters) => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const response = await searchReservas(buildFiltersPayload(nextFilters));
      const result = extractPagedItems(response);
      setReservas(result.items);
      setTotal(result.total);
      setPage(result.page);
      setPageSize(result.pageSize);
      setStatusMessage(response?.mensaje || 'Reservas cargadas.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo cargar el listado de reservas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReservas(initialFilters);
    loadCatalogs().catch((error) => {
      setErrorMessage(error.message || 'No se pudieron cargar los catalogos de reservas.');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setAvailabilityMessage('');
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));
  };

  const updateExtraRow = (index, field, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      extras: currentForm.extras.map((extra, extraIndex) =>
        extraIndex === index
          ? {
              ...extra,
              [field]: value,
            }
          : extra
      ),
    }));
  };

  const updateConductorRow = (index, field, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      conductores: currentForm.conductores.map((conductor, conductorIndex) =>
        conductorIndex === index
          ? {
              ...conductor,
              [field]: value,
            }
          : field === 'esPrincipal' && value
            ? { ...conductor, esPrincipal: false }
            : conductor
      ),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !form.idCliente ||
      !form.idVehiculo ||
      !form.idLocalizacionRecogida ||
      !form.idLocalizacionEntrega ||
      !form.cantidadDias ||
      !form.fechaInicio ||
      !form.fechaFin
    ) {
      setErrorMessage('Completa los campos obligatorios de la reserva.');
      return;
    }

    if (!editingId) {
      const validConductores = form.conductores.filter((conductor) => conductor.idConductor);

      if (!validConductores.length) {
        setErrorMessage('Debes agregar al menos un conductor a la reserva.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      if (editingId) {
        await updateReserva(editingId, {
          fechaInicio: form.fechaInicio,
          fechaFin: form.fechaFin,
          horaInicio: form.horaInicio || null,
          horaFin: form.horaFin || null,
          idLocalizacionRecogida: Number(form.idLocalizacionRecogida),
          idLocalizacionEntrega: Number(form.idLocalizacionEntrega),
          descripcion: form.descripcion.trim() || null,
        });
        setStatusMessage('Reserva actualizada correctamente.');
      } else {
        await createReserva({
          idCliente: Number(form.idCliente),
          idVehiculo: Number(form.idVehiculo),
          idLocalizacionRecogida: Number(form.idLocalizacionRecogida),
          idLocalizacionEntrega: Number(form.idLocalizacionEntrega),
          cantidadDias: Number(form.cantidadDias),
          fechaInicio: form.fechaInicio,
          fechaFin: form.fechaFin,
          horaInicio: form.horaInicio || null,
          horaFin: form.horaFin || null,
          descripcion: form.descripcion.trim() || null,
          extras: form.extras
            .filter((extra) => extra.idExtra)
            .map((extra) => ({
              idExtra: Number(extra.idExtra),
              cantidad: Number(extra.cantidad || 1),
            })),
          conductores: form.conductores
            .filter((conductor) => conductor.idConductor)
            .map((conductor) => ({
              idConductor: Number(conductor.idConductor),
              rol: conductor.rol,
              esPrincipal: Boolean(conductor.esPrincipal),
              observaciones: conductor.observaciones.trim() || null,
            })),
        });
        setStatusMessage('Reserva creada correctamente.');
      }

      resetForm();
      const nextFilters = { ...filters, pagina: 1 };
      setFilters(nextFilters);
      await loadReservas(nextFilters);
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo guardar la reserva.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (id) => {
    try {
      setErrorMessage('');
      const response = await getReservaById(id);
      const reserva = extractItem(response);

      if (!reserva) {
        setErrorMessage('No se pudo obtener la reserva.');
        return;
      }

      setSelectedReserva(reserva);
      setEditingId(reserva.id);
      setForm({
        idCliente: reserva.idCliente ? String(reserva.idCliente) : '',
        idVehiculo: reserva.idVehiculo ? String(reserva.idVehiculo) : '',
        idLocalizacionRecogida: reserva.idLocalizacionRecogida ? String(reserva.idLocalizacionRecogida) : '',
        idLocalizacionEntrega: reserva.idLocalizacionEntrega ? String(reserva.idLocalizacionEntrega) : '',
        cantidadDias: reserva.cantidadDias ? String(reserva.cantidadDias) : '',
        fechaInicio: String(reserva.fechaInicio || '').slice(0, 10),
        fechaFin: String(reserva.fechaFin || '').slice(0, 10),
        horaInicio: String(reserva.horaInicio || '').slice(0, 5),
        horaFin: String(reserva.horaFin || '').slice(0, 5),
        descripcion: reserva.descripcion || '',
        extras: Array.isArray(reserva.extras)
          ? reserva.extras.map((extra) => ({
              idExtra: extra?.idExtra ? String(extra.idExtra) : '',
              cantidad: extra?.cantidad ? String(extra.cantidad) : '1',
            }))
          : [],
        conductores: Array.isArray(reserva.conductores)
          ? reserva.conductores.map((conductor) => ({
              idConductor: conductor?.idConductor ? String(conductor.idConductor) : '',
              rol: conductor?.rol || 'SECUNDARIO',
              esPrincipal: Boolean(conductor?.esPrincipal),
              observaciones: conductor?.observaciones || '',
            }))
          : [{ ...emptyConductor }],
      });
      setStatusMessage('Reserva cargada para edicion.');
      setAvailabilityMessage('Al editar solo se actualizan fechas, localizaciones y descripcion.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo obtener la reserva.');
    }
  };

  const handleConfirm = async (id) => {
    try {
      setErrorMessage('');
      await confirmReserva(id);
      setStatusMessage('Reserva confirmada correctamente.');
      await loadReservas(filters);
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo confirmar la reserva.');
    }
  };

  const handleCancel = async (id) => {
    const motivo = window.prompt('Ingresa el motivo de cancelacion:');

    if (!motivo || !motivo.trim()) {
      return;
    }

    try {
      setErrorMessage('');
      await cancelReserva(id, motivo.trim());
      setStatusMessage('Reserva cancelada correctamente.');
      await loadReservas(filters);
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo cancelar la reserva.');
    }
  };

  const handleSearchByCliente = async () => {
    if (!filters.idCliente) {
      await loadReservas(filters);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');
      const response = await getReservasByCliente(Number(filters.idCliente));
      const items = Array.isArray(response?.data) ? response.data.map(normalizeReserva) : [];
      setReservas(items);
      setTotal(items.length);
      setPage(1);
      setStatusMessage(items.length ? 'Reservas encontradas por cliente.' : 'No se encontraron resultados.');
    } catch (error) {
      setReservas([]);
      setTotal(0);
      setErrorMessage(error.message || 'No se pudo buscar por cliente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchByVehiculo = async () => {
    if (!filters.idVehiculo) {
      await loadReservas(filters);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');
      const response = await getReservasByVehiculo(Number(filters.idVehiculo));
      const items = Array.isArray(response?.data) ? response.data.map(normalizeReserva) : [];
      setReservas(items);
      setTotal(items.length);
      setPage(1);
      setStatusMessage(items.length ? 'Reservas encontradas por vehiculo.' : 'No se encontraron resultados.');
    } catch (error) {
      setReservas([]);
      setTotal(0);
      setErrorMessage(error.message || 'No se pudo buscar por vehiculo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckAvailability = async () => {
    if (!form.idVehiculo || !form.fechaInicio || !form.fechaFin) {
      setAvailabilityMessage('Ingresa vehiculo y rango de fechas para validar disponibilidad.');
      return;
    }

    try {
      const response = await verifyDisponibilidadReserva(form.idVehiculo, form.fechaInicio, form.fechaFin);
      setAvailabilityMessage(response?.data ? 'Vehiculo disponible.' : 'Vehiculo no disponible.');
    } catch (error) {
      setAvailabilityMessage(error.message || 'No se pudo verificar la disponibilidad.');
    }
  };

  const handleFilterSubmit = async () => {
    const nextFilters = { ...filters, pagina: 1 };
    setFilters(nextFilters);
    await loadReservas(nextFilters);
  };

  const changePage = async (nextPage) => {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    const nextFilters = { ...filters, pagina: safePage };
    setFilters(nextFilters);
    await loadReservas(nextFilters);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <button className={styles.backButton} type="button" onClick={onBack}>
            Regresar
          </button>
          <h2>Reservas</h2>
          <p>Gestiona reservas con extras y conductores, y consulta disponibilidad por fechas.</p>
        </div>
        <button className={styles.secondaryButton} type="button" onClick={() => loadReservas(filters)}>
          Recargar
        </button>
      </div>

      {(statusMessage || errorMessage || availabilityMessage) && (
        <div className={`${styles.message} ${errorMessage ? styles.error : styles.success}`}>
          {errorMessage || availabilityMessage || statusMessage}
        </div>
      )}

      <div className={styles.layout}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3>Listado</h3>
            <span>{isLoading ? 'Cargando...' : `${total} registro(s)`}</span>
          </div>

          <div className={styles.filterGrid}>
            <label className={styles.fieldCompact}>
              <span>Cliente</span>
              <select className={styles.select} name="idCliente" value={filters.idCliente} onChange={handleFilterChange}>
                <option value="">Todos</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre || `Cliente ${cliente.id}`}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.fieldCompact}>
              <span>ID vehiculo</span>
              <input className={styles.input} name="idVehiculo" type="number" min="1" value={filters.idVehiculo} onChange={handleFilterChange} />
            </label>

            <label className={styles.fieldCompact}>
              <span>Recogida</span>
              <select className={styles.select} name="idLocalizacionRecogida" value={filters.idLocalizacionRecogida} onChange={handleFilterChange}>
                <option value="">Todas</option>
                {localizaciones.map((localizacion) => (
                  <option key={localizacion.id} value={localizacion.id}>
                    {localizacion.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.fieldCompact}>
              <span>Entrega</span>
              <select className={styles.select} name="idLocalizacionEntrega" value={filters.idLocalizacionEntrega} onChange={handleFilterChange}>
                <option value="">Todas</option>
                {localizaciones.map((localizacion) => (
                  <option key={localizacion.id} value={localizacion.id}>
                    {localizacion.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.fieldCompact}>
              <span>Codigo</span>
              <input className={styles.input} name="codigoReserva" type="text" value={filters.codigoReserva} onChange={handleFilterChange} />
            </label>

            <label className={styles.fieldCompact}>
              <span>Estado</span>
              <input className={styles.input} name="estado" type="text" value={filters.estado} onChange={handleFilterChange} />
            </label>

            <label className={styles.fieldCompact}>
              <span>Inicio desde</span>
              <input className={styles.input} name="fechaInicioDesde" type="date" value={filters.fechaInicioDesde} onChange={handleFilterChange} />
            </label>

            <label className={styles.fieldCompact}>
              <span>Inicio hasta</span>
              <input className={styles.input} name="fechaInicioHasta" type="date" value={filters.fechaInicioHasta} onChange={handleFilterChange} />
            </label>

            <label className={styles.fieldCompact}>
              <span>Fin desde</span>
              <input className={styles.input} name="fechaFinDesde" type="date" value={filters.fechaFinDesde} onChange={handleFilterChange} />
            </label>

            <label className={styles.fieldCompact}>
              <span>Fin hasta</span>
              <input className={styles.input} name="fechaFinHasta" type="date" value={filters.fechaFinHasta} onChange={handleFilterChange} />
            </label>

            <label className={styles.fieldCompact}>
              <span>Tamano</span>
              <select className={styles.select} name="tamano" value={filters.tamano} onChange={handleFilterChange}>
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </label>
          </div>

          <div className={styles.searchRow}>
            <button className={styles.primaryButton} type="button" onClick={handleFilterSubmit}>
              Buscar con filtros
            </button>
            <button className={styles.secondaryButton} type="button" onClick={handleSearchByCliente}>
              Buscar por cliente
            </button>
            <button className={styles.secondaryButton} type="button" onClick={handleSearchByVehiculo}>
              Buscar por vehiculo
            </button>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={() => {
                setFilters(initialFilters);
                loadReservas(initialFilters);
              }}
            >
              Limpiar
            </button>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Codigo</th>
                  <th>Cliente</th>
                  <th>Vehiculo</th>
                  <th>Fechas</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && reservas.length === 0 ? (
                  <tr>
                    <td colSpan="8" className={styles.emptyCell}>
                      No hay datos para mostrar.
                    </td>
                  </tr>
                ) : null}

                {reservas.map((reserva) => (
                  <tr key={reserva.id || reserva.guid || reserva.codigo}>
                    <td>{reserva.id || '-'}</td>
                    <td>{reserva.codigo || '-'}</td>
                    <td>{getClienteNombre(reserva.idCliente)}</td>
                    <td>{reserva.idVehiculo || '-'}</td>
                    <td>
                      {formatDate(reserva.fechaInicio)} - {formatDate(reserva.fechaFin)}
                    </td>
                    <td>{formatMoney(reserva.total)}</td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          reserva.estado === 'CONFIRMADA' || reserva.estado === 'ACT'
                            ? styles.badgeActive
                            : styles.badgeInactive
                        }`}
                      >
                        {reserva.estado || '-'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.linkButton} type="button" onClick={() => handleEdit(reserva.id)}>
                          Editar
                        </button>
                        <button className={styles.linkButton} type="button" onClick={() => handleConfirm(reserva.id)}>
                          Confirmar
                        </button>
                        <button className={styles.linkDanger} type="button" onClick={() => handleCancel(reserva.id)}>
                          Cancelar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <button className={styles.secondaryButton} type="button" disabled={page <= 1} onClick={() => changePage(page - 1)}>
              Anterior
            </button>
            <span className={styles.muted}>
              Pagina {page} de {totalPages}
            </span>
            <button className={styles.secondaryButton} type="button" disabled={page >= totalPages} onClick={() => changePage(page + 1)}>
              Siguiente
            </button>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3>{formTitle}</h3>
            {editingId ? (
              <button className={styles.secondaryButton} type="button" onClick={resetForm}>
                Cancelar edicion
              </button>
            ) : null}
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
              <span>Cliente</span>
              <select className={styles.select} name="idCliente" value={form.idCliente} onChange={handleFormChange} disabled={Boolean(editingId)}>
                <option value="">Selecciona un cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre || `Cliente ${cliente.id}`}
                  </option>
                ))}
              </select>
            </label>

            <div className={styles.twoColumns}>
              <label className={styles.field}>
                <span>ID vehiculo</span>
                <input className={styles.input} name="idVehiculo" type="number" min="1" value={form.idVehiculo} onChange={handleFormChange} disabled={Boolean(editingId)} />
              </label>

              <label className={styles.field}>
                <span>Cantidad de dias</span>
                <input className={styles.input} name="cantidadDias" type="number" min="1" value={form.cantidadDias} onChange={handleFormChange} disabled={Boolean(editingId)} />
              </label>
            </div>

            <div className={styles.twoColumns}>
              <label className={styles.field}>
                <span>Fecha inicio</span>
                <input className={styles.input} name="fechaInicio" type="date" value={form.fechaInicio} onChange={handleFormChange} />
              </label>

              <label className={styles.field}>
                <span>Fecha fin</span>
                <input className={styles.input} name="fechaFin" type="date" value={form.fechaFin} onChange={handleFormChange} />
              </label>
            </div>

            <div className={styles.twoColumns}>
              <label className={styles.field}>
                <span>Hora inicio</span>
                <input className={styles.input} name="horaInicio" type="time" value={form.horaInicio} onChange={handleFormChange} />
              </label>

              <label className={styles.field}>
                <span>Hora fin</span>
                <input className={styles.input} name="horaFin" type="time" value={form.horaFin} onChange={handleFormChange} />
              </label>
            </div>

            <div className={styles.twoColumns}>
              <label className={styles.field}>
                <span>Localizacion recogida</span>
                <select className={styles.select} name="idLocalizacionRecogida" value={form.idLocalizacionRecogida} onChange={handleFormChange}>
                  <option value="">Selecciona</option>
                  {localizaciones.map((localizacion) => (
                    <option key={localizacion.id} value={localizacion.id}>
                      {localizacion.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Localizacion entrega</span>
                <select className={styles.select} name="idLocalizacionEntrega" value={form.idLocalizacionEntrega} onChange={handleFormChange}>
                  <option value="">Selecciona</option>
                  {localizaciones.map((localizacion) => (
                    <option key={localizacion.id} value={localizacion.id}>
                      {localizacion.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className={styles.field}>
              <span>Descripcion</span>
              <textarea className={styles.textarea} name="descripcion" value={form.descripcion} onChange={handleFormChange} />
            </label>

            <div className={styles.searchRow}>
              <button className={styles.secondaryButton} type="button" onClick={handleCheckAvailability}>
                Verificar disponibilidad
              </button>
            </div>

            {!editingId ? (
              <>
                <div className={styles.panelHeader}>
                  <h3>Extras</h3>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={() =>
                      setForm((currentForm) => ({
                        ...currentForm,
                        extras: [...currentForm.extras, { ...emptyExtra }],
                      }))
                    }
                  >
                    Agregar extra
                  </button>
                </div>

                {form.extras.map((extra, index) => (
                  <div className={styles.twoColumns} key={`extra-${index}`}>
                    <label className={styles.field}>
                      <span>Extra</span>
                      <select
                        className={styles.select}
                        value={extra.idExtra}
                        onChange={(event) => updateExtraRow(index, 'idExtra', event.target.value)}
                      >
                        <option value="">Selecciona un extra</option>
                        {extrasCatalog.map((catalogExtra) => (
                          <option key={catalogExtra.id} value={catalogExtra.id}>
                            {catalogExtra.nombre}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className={styles.field}>
                      <span>Cantidad</span>
                      <input
                        className={styles.input}
                        type="number"
                        min="1"
                        value={extra.cantidad}
                        onChange={(event) => updateExtraRow(index, 'cantidad', event.target.value)}
                      />
                    </label>

                    <button
                      className={styles.linkDanger}
                      type="button"
                      onClick={() =>
                        setForm((currentForm) => ({
                          ...currentForm,
                          extras: currentForm.extras.filter((_, extraIndex) => extraIndex !== index),
                        }))
                      }
                    >
                      Quitar extra
                    </button>
                  </div>
                ))}

                <div className={styles.panelHeader}>
                  <h3>Conductores</h3>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={() =>
                      setForm((currentForm) => ({
                        ...currentForm,
                        conductores: [...currentForm.conductores, { ...emptyConductor, esPrincipal: false }],
                      }))
                    }
                  >
                    Agregar conductor
                  </button>
                </div>

                {form.conductores.map((conductor, index) => (
                  <div key={`conductor-${index}`} className={styles.form}>
                    <div className={styles.twoColumns}>
                      <label className={styles.field}>
                        <span>Conductor</span>
                        <select
                          className={styles.select}
                          value={conductor.idConductor}
                          onChange={(event) => updateConductorRow(index, 'idConductor', event.target.value)}
                        >
                          <option value="">Selecciona un conductor</option>
                          {conductoresCatalog.map((catalogConductor) => (
                            <option key={catalogConductor.id} value={catalogConductor.id}>
                              {catalogConductor.nombre || `Conductor ${catalogConductor.id}`}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className={styles.field}>
                        <span>Rol</span>
                        <select
                          className={styles.select}
                          value={conductor.rol}
                          onChange={(event) => updateConductorRow(index, 'rol', event.target.value)}
                        >
                          <option value="TITULAR">Titular</option>
                          <option value="SECUNDARIO">Secundario</option>
                        </select>
                      </label>
                    </div>

                    <div className={styles.twoColumns}>
                      <label className={styles.field}>
                        <span>Principal</span>
                        <select
                          className={styles.select}
                          value={conductor.esPrincipal ? 'SI' : 'NO'}
                          onChange={(event) => updateConductorRow(index, 'esPrincipal', event.target.value === 'SI')}
                        >
                          <option value="SI">Si</option>
                          <option value="NO">No</option>
                        </select>
                      </label>

                      <label className={styles.field}>
                        <span>Observaciones</span>
                        <input
                          className={styles.input}
                          type="text"
                          value={conductor.observaciones}
                          onChange={(event) => updateConductorRow(index, 'observaciones', event.target.value)}
                        />
                      </label>
                    </div>

                    <button
                      className={styles.linkDanger}
                      type="button"
                      onClick={() =>
                        setForm((currentForm) => ({
                          ...currentForm,
                          conductores:
                            currentForm.conductores.length === 1
                              ? currentForm.conductores
                              : currentForm.conductores.filter((_, conductorIndex) => conductorIndex !== index),
                        }))
                      }
                    >
                      Quitar conductor
                    </button>
                  </div>
                ))}
              </>
            ) : null}

            <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : editingId ? 'Actualizar reserva' : 'Crear reserva'}
            </button>
          </form>

          {selectedReserva ? (
            <div className={styles.detailBox}>
              <h4>Detalle seleccionado</h4>
              <p>
                <strong>Codigo:</strong> {selectedReserva.codigo || '-'}
              </p>
              <p>
                <strong>Recogida:</strong> {getLocalizacionNombre(selectedReserva.idLocalizacionRecogida)}
              </p>
              <p>
                <strong>Entrega:</strong> {getLocalizacionNombre(selectedReserva.idLocalizacionEntrega)}
              </p>
              <p>
                <strong>Subtotal:</strong> {formatMoney(selectedReserva.subtotal)}
              </p>
              <p>
                <strong>IVA:</strong> {formatMoney(selectedReserva.iva)}
              </p>
              <p>
                <strong>Total:</strong> {formatMoney(selectedReserva.total)}
              </p>
              <p>
                <strong>Conductores:</strong> {selectedReserva.conductores?.length || 0}
              </p>
              <p>
                <strong>Extras:</strong> {selectedReserva.extras?.length || 0}
              </p>
              <p>
                <strong>Motivo cancelacion:</strong> {selectedReserva.motivoCancelacion || '-'}
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

export default ReservasPage;
