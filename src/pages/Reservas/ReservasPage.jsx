import { useEffect, useMemo, useState } from 'react';
import {
  cancelReserva,
  confirmReserva,
  createReserva,
  getVehiculosDisponibles,
  getReservaById,
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
  rol: 'PRI',
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
  campoBusqueda: 'codigoReserva',
  valorBusqueda: '',
  fechaInicioDesde: '',
  fechaInicioHasta: '',
  fechaFinDesde: '',
  fechaFinHasta: '',
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

function normalizeVehiculo(item) {
  return {
    id: item?.id ?? item?.Id ?? '',
    placa: item?.placa ?? item?.Placa ?? '',
    modelo: item?.modelo ?? item?.Modelo ?? '',
    idLocalizacion: item?.idLocalizacion ?? item?.IdLocalizacion ?? '',
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

function buildFiltersPayload(filters, clientes = [], vehiculos = []) {
  const searchValue = String(filters.valorBusqueda || '').trim();
  const searchField = filters.campoBusqueda;
  const parsedId = Number(searchValue);
  const hasNumericId = Number.isFinite(parsedId) && parsedId > 0;
  const normalizedSearch = searchValue.toLowerCase();

  const matchedCliente = !hasNumericId
    ? clientes.find((cliente) => {
        const idText = String(cliente.id || '');
        const nombreText = String(cliente.nombre || '').toLowerCase();
        return idText === searchValue || nombreText.includes(normalizedSearch);
      })
    : null;

  const matchedVehiculo = !hasNumericId
    ? vehiculos.find((vehiculo) => {
        const idText = String(vehiculo.id || '');
        const placaText = String(vehiculo.placa || '').toLowerCase();
        const modeloText = String(vehiculo.modelo || '').toLowerCase();
        return (
          idText === searchValue ||
          placaText.includes(normalizedSearch) ||
          `${placaText} ${modeloText}`.includes(normalizedSearch)
        );
      })
    : null;

  const resolvedClienteId = hasNumericId ? parsedId : Number(matchedCliente?.id || 0);
  const resolvedVehiculoId = hasNumericId ? parsedId : Number(matchedVehiculo?.id || 0);
  const hasClienteId = Number.isFinite(resolvedClienteId) && resolvedClienteId > 0;
  const hasVehiculoId = Number.isFinite(resolvedVehiculoId) && resolvedVehiculoId > 0;

  return {
    ...(searchValue && searchField === 'idCliente' && hasClienteId ? { idCliente: resolvedClienteId } : {}),
    ...(searchValue && searchField === 'idVehiculo' && hasVehiculoId ? { idVehiculo: resolvedVehiculoId } : {}),
    ...(searchValue && searchField === 'codigoReserva' ? { codigoReserva: searchValue } : {}),
    ...(filters.fechaInicioDesde ? { fechaInicioDesde: filters.fechaInicioDesde } : {}),
    ...(filters.fechaInicioHasta ? { fechaInicioHasta: filters.fechaInicioHasta } : {}),
    ...(filters.fechaFinDesde ? { fechaFinDesde: filters.fechaFinDesde } : {}),
    ...(filters.fechaFinHasta ? { fechaFinHasta: filters.fechaFinHasta } : {}),
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

function buildDateTimeForAvailability(dateValue, timeValue, isEnd) {
  if (!dateValue) {
    return '';
  }

  const normalizedTime = timeValue?.trim() || (isEnd ? '23:59' : '00:00');
  return `${dateValue}T${normalizedTime}:00`;
}

function calcularCantidadDias(fechaInicio, horaInicio, fechaFin, horaFin) {
  if (!fechaInicio || !fechaFin) return 0;
  const hi = horaInicio || '00:00';
  const hf = horaFin || '00:00';
  const inicio = new Date(`${fechaInicio}T${hi}:00`);
  const fin = new Date(`${fechaFin}T${hf}:00`);
  const diffMs = fin.getTime() - inicio.getTime();
  if (diffMs <= 0) return 0;
  const horas = diffMs / (1000 * 60 * 60);
  return Math.ceil(horas / 24);
}

function normalizeRolConductor(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'TITULAR' || normalized === 'PRINCIPAL' || normalized === 'PRI') {
    return 'PRI';
  }
  if (normalized === 'SECUNDARIO' || normalized === 'SEC') {
    return 'SEC';
  }
  return 'SEC';
}

function isReservaPendiente(estado) {
  const normalized = String(estado || '').trim().toUpperCase();
  return normalized === 'PEN' || normalized === 'PENDIENTE';
}

function isReservaBloqueada(estado) {
  const normalized = String(estado || '').trim().toUpperCase();
  return normalized === 'CON' || normalized === 'CONFIRMADA' || normalized === 'CAN' || normalized === 'CANCELADA';
}

function ReservasPage({ onBack }) {
  const [reservas, setReservas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [conductoresCatalog, setConductoresCatalog] = useState([]);
  const [extrasCatalog, setExtrasCatalog] = useState([]);
  const [localizaciones, setLocalizaciones] = useState([]);
  const [vehiculosDisponibles, setVehiculosDisponibles] = useState([]);
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
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    action: '',
    targetId: null,
    reason: '',
    error: '',
    detail: null,
  });
  const [isModalSubmitting, setIsModalSubmitting] = useState(false);

  const formTitle = useMemo(() => (editingId ? 'Editar reserva' : 'Crear reserva'), [editingId]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize || 1)), [pageSize, total]);
  const searchPlaceholder = useMemo(() => {
    if (filters.campoBusqueda === 'idCliente') return 'ID o nombre del cliente';
    if (filters.campoBusqueda === 'idVehiculo') return 'ID o placa del vehiculo';
    return 'Buscar por codigo reserva';
  }, [filters.campoBusqueda]);

  const getClienteNombre = (idCliente) =>
    clientes.find((cliente) => String(cliente.id) === String(idCliente))?.nombre || `Cliente ${idCliente}`;

  const getLocalizacionNombre = (idLocalizacion) =>
    localizaciones.find((localizacion) => String(localizacion.id) === String(idLocalizacion))?.nombre ||
    `Loc. ${idLocalizacion}`;

  const getVehiculoLabel = (idVehiculo) => {
    const vehiculo = vehiculosDisponibles.find((item) => String(item.id) === String(idVehiculo));
    if (!vehiculo) {
      return idVehiculo ? `Vehiculo ${idVehiculo}` : '-';
    }

    return `${vehiculo.placa || `Vehiculo ${vehiculo.id}`} ${vehiculo.modelo || ''}`.trim();
  };

  const loadCatalogs = async () => {
    const [clientesResponse, conductoresResponse, extrasResponse, localizacionesResponse, vehiculosResponse] = await Promise.all([
      listClientes(),
      listConductores(),
      listExtrasActivos(),
      listLocalizaciones(),
      getVehiculosDisponibles(),
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
    setVehiculosDisponibles(
      Array.isArray(vehiculosResponse?.data) ? vehiculosResponse.data.map(normalizeVehiculo) : []
    );
  };

  const loadReservas = async (nextFilters = filters) => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const payload = buildFiltersPayload(nextFilters, clientes, vehiculosDisponibles);
      const response = await searchReservas(payload);
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

  const openInfoModal = (title, message) => {
    setModalState({
      isOpen: true,
      title,
      message,
      action: 'info',
      targetId: null,
      reason: '',
      error: '',
      detail: null,
    });
  };

  const openActionModal = (action, targetId, title, message) => {
    setModalState({
      isOpen: true,
      title,
      message,
      action,
      targetId,
      reason: '',
      error: '',
      detail: null,
    });
  };

  const closeModal = (force = false) => {
    if (!force && isModalSubmitting) {
      return;
    }

    setModalState((current) => ({
      ...current,
      isOpen: false,
      error: '',
      detail: null,
    }));
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    if (name === 'idVehiculo') {
      const vehiculo = vehiculosDisponibles.find((item) => String(item.id) === String(value));
      setForm((currentForm) => ({
        ...currentForm,
        idVehiculo: value,
        idLocalizacionRecogida: vehiculo?.idLocalizacion ? String(vehiculo.idLocalizacion) : '',
      }));
      return;
    }

    setForm((currentForm) => {
      const nextForm = {
        ...currentForm,
        [name]: value,
      };
      const dias = calcularCantidadDias(
        nextForm.fechaInicio,
        nextForm.horaInicio,
        nextForm.fechaFin,
        nextForm.horaFin
      );
      return {
        ...nextForm,
        cantidadDias: String(dias),
      };
    });
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
      ...(name !== 'pagina' ? { pagina: 1 } : {}),
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
          idCliente: Number(form.idCliente),
          idVehiculo: Number(form.idVehiculo),
          cantidadDias: Number(form.cantidadDias),
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
              rol: normalizeRolConductor(conductor.rol),
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
      if (!isReservaPendiente(reserva.estado)) {
        setErrorMessage('Solo se puede editar una reserva pendiente.');
        return;
      }

      setSelectedReserva(reserva);
      setEditingId(reserva.id);
      setForm({
        idCliente: reserva.idCliente ? String(reserva.idCliente) : '',
        idVehiculo: reserva.idVehiculo ? String(reserva.idVehiculo) : '',
        idLocalizacionRecogida: reserva.idLocalizacionRecogida ? String(reserva.idLocalizacionRecogida) : '',
        idLocalizacionEntrega: reserva.idLocalizacionEntrega ? String(reserva.idLocalizacionEntrega) : '',
        fechaInicio: String(reserva.fechaInicio || '').slice(0, 10),
        fechaFin: String(reserva.fechaFin || '').slice(0, 10),
        horaInicio: String(reserva.horaInicio || '').slice(0, 5),
        horaFin: String(reserva.horaFin || '').slice(0, 5),
        cantidadDias: (() => {
          const fi = String(reserva.fechaInicio || '').slice(0, 10);
          const ff = String(reserva.fechaFin || '').slice(0, 10);
          const hi = String(reserva.horaInicio || '').slice(0, 5);
          const hf = String(reserva.horaFin || '').slice(0, 5);
          const d = calcularCantidadDias(fi, hi, ff, hf);
          return String(d);
        })(),
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
              rol: normalizeRolConductor(conductor?.rol),
              esPrincipal: Boolean(conductor?.esPrincipal),
              observaciones: conductor?.observaciones || '',
            }))
          : [{ ...emptyConductor }],
      });
      setStatusMessage('Reserva cargada para edicion.');
      setAvailabilityMessage('');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo obtener la reserva.');
    }
  };

  const handleView = async (id) => {
    try {
      setErrorMessage('');
      const response = await getReservaById(id);
      const reserva = extractItem(response);

      if (!reserva) {
        setErrorMessage('No se pudo obtener la reserva.');
        return;
      }

      const extrasText =
        reserva.extras?.length > 0
          ? reserva.extras
              .map((extra) => {
                const extraCatalog = extrasCatalog.find((item) => String(item.id) === String(extra?.idExtra));
                const nombreExtra = extraCatalog?.nombre || `Extra ${extra?.idExtra || '-'}`;
                return `${nombreExtra} x ${extra?.cantidad || 1}`;
              })
              .join('\n')
          : 'Sin extras';

      const conductoresText =
        reserva.conductores?.length > 0
          ? reserva.conductores
              .map((conductor) => {
                const conductorCatalog = conductoresCatalog.find(
                  (item) => String(item.id) === String(conductor?.idConductor)
                );
                const nombreConductor = conductorCatalog?.nombre || `Conductor ${conductor?.idConductor || '-'}`;
                const rol = normalizeRolConductor(conductor?.rol) === 'PRI' ? 'Principal' : 'Secundario';
                return `${nombreConductor} (${rol})`;
              })
              .join('\n')
          : 'Sin conductores';

      setSelectedReserva(reserva);
      setModalState({
        isOpen: true,
        title: `Detalle reserva ${reserva.codigo || reserva.id || ''}`,
        message: 'Informacion completa de la reserva.',
        action: 'view',
        targetId: null,
        reason: '',
        error: '',
        detail: {
          id: reserva.id || '-',
          codigo: reserva.codigo || '-',
          cliente: getClienteNombre(reserva.idCliente),
          vehiculo: getVehiculoLabel(reserva.idVehiculo),
          estado: reserva.estado || '-',
          fechaInicio: formatDate(reserva.fechaInicio),
          fechaFin: formatDate(reserva.fechaFin),
          horaInicio: reserva.horaInicio || '-',
          horaFin: reserva.horaFin || '-',
          dias: reserva.cantidadDias || '-',
          recogida: getLocalizacionNombre(reserva.idLocalizacionRecogida),
          entrega: getLocalizacionNombre(reserva.idLocalizacionEntrega),
          subtotal: formatMoney(reserva.subtotal),
          iva: formatMoney(reserva.iva),
          total: formatMoney(reserva.total),
          descripcion: reserva.descripcion || '-',
          motivoCancelacion: reserva.motivoCancelacion || '-',
          extrasText,
          conductoresText,
        },
      });
      setStatusMessage('Detalle de reserva cargado.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo obtener la reserva.');
    }
  };

  const handleConfirm = async (id) => {
    const reserva = reservas.find((item) => String(item.id) === String(id));
    if (!isReservaPendiente(reserva?.estado)) {
      setErrorMessage('Solo se puede confirmar una reserva pendiente.');
      return;
    }
    openActionModal(
      'confirm',
      id,
      'Confirmar reserva',
      '¿Deseas confirmar esta reserva?'
    );
  };

  const handleCancel = async (id) => {
    const reserva = reservas.find((item) => String(item.id) === String(id));
    if (!isReservaPendiente(reserva?.estado)) {
      setErrorMessage('Solo se puede cancelar una reserva pendiente.');
      return;
    }
    openActionModal(
      'cancel',
      id,
      'Cancelar reserva',
      '¿Deseas cancelar esta reserva? Ingresa el motivo para continuar.'
    );
  };

  const handleCheckAvailability = async () => {
    if (!form.idVehiculo || !form.fechaInicio || !form.fechaFin) {
      setAvailabilityMessage('Ingresa vehiculo y rango de fechas para validar disponibilidad.');
      return;
    }

    try {
      const fechaInicio = buildDateTimeForAvailability(form.fechaInicio, form.horaInicio, false);
      const fechaFin = buildDateTimeForAvailability(form.fechaFin, form.horaFin, true);
      const response = await verifyDisponibilidadReserva(
        Number(form.idVehiculo),
        fechaInicio,
        fechaFin
      );
      if (response?.data) {
        setAvailabilityMessage('Vehiculo disponible.');
        openInfoModal(
          'Disponibilidad',
          'Vehiculo disponible para el rango de fechas/horas seleccionado.'
        );
      } else {
        setAvailabilityMessage('Vehiculo no disponible.');
        openInfoModal('Disponibilidad', 'Vehiculo NO disponible para el rango seleccionado.');
      }
    } catch (error) {
      setAvailabilityMessage(error.message || 'No se pudo verificar la disponibilidad.');
      openInfoModal(
        'Disponibilidad',
        error.message || 'No se pudo verificar la disponibilidad.'
      );
    }
  };

  const handleModalConfirm = async () => {
    if (modalState.action === 'info') {
      closeModal();
      return;
    }

    try {
      setIsModalSubmitting(true);
      setErrorMessage('');

      if (modalState.action === 'confirm' && modalState.targetId) {
        await confirmReserva(modalState.targetId);
        setStatusMessage('Reserva confirmada correctamente.');
        closeModal(true);
        await loadReservas(filters);
        return;
      }

      if (modalState.action === 'cancel' && modalState.targetId) {
        if (!modalState.reason.trim()) {
          setModalState((current) => ({
            ...current,
            error: 'El motivo de cancelacion es obligatorio.',
          }));
          return;
        }

        await cancelReserva(modalState.targetId, modalState.reason.trim());
        setStatusMessage('Reserva cancelada correctamente.');
        closeModal(true);
        await loadReservas(filters);
      }
    } catch (error) {
      setErrorMessage(
        error.message ||
          (modalState.action === 'confirm'
            ? 'No se pudo confirmar la reserva.'
            : 'No se pudo cancelar la reserva.')
      );
    } finally {
      setIsModalSubmitting(false);
    }
  };

  const handleFilterSubmit = async () => {
    const nextFilters = { ...filters, pagina: 1 };
    setFilters(nextFilters);
    await loadReservas(nextFilters);
  };

  useEffect(() => {
    const dias = calcularCantidadDias(form.fechaInicio, form.horaInicio, form.fechaFin, form.horaFin);
    const diasText = String(dias);
    if (form.cantidadDias !== diasText) {
      setForm((currentForm) => ({
        ...currentForm,
        cantidadDias: diasText,
      }));
    }
    // Solo depende de los campos que afectan al cálculo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.fechaInicio, form.horaInicio, form.fechaFin, form.horaFin]);

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
              <span>Buscar por</span>
              <select
                className={styles.select}
                name="campoBusqueda"
                value={filters.campoBusqueda}
                onChange={handleFilterChange}
              >
                <option value="codigoReserva">Codigo</option>
                <option value="idCliente">ID cliente</option>
                <option value="idVehiculo">ID vehiculo</option>
              </select>
            </label>

            <label className={styles.fieldCompact}>
              <span>Valor</span>
              <input
                className={styles.input}
                name="valorBusqueda"
                type="text"
                value={filters.valorBusqueda}
                placeholder={searchPlaceholder}
                onChange={handleFilterChange}
              />
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
              Buscar
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
                    <td>{getVehiculoLabel(reserva.idVehiculo)}</td>
                    <td>
                      {formatDate(reserva.fechaInicio)} - {formatDate(reserva.fechaFin)}
                    </td>
                    <td>{formatMoney(reserva.total)}</td>
                    <td>
                      {(() => {
                        const estado = String(reserva.estado || '').trim().toUpperCase();
                        const badgeClass =
                          estado === 'CON' || estado === 'CONFIRMADA' || estado === 'ACT'
                            ? styles.badgeActive
                            : estado === 'PEN' || estado === 'PENDIENTE'
                              ? styles.badgeWarning
                              : estado === 'CAN' || estado === 'CANCELADA'
                                ? styles.badgeInactive
                                : styles.badgeInactive;

                        return (
                          <span className={`${styles.badge} ${badgeClass}`}>
                            {reserva.estado || '-'}
                          </span>
                        );
                      })()}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        {isReservaPendiente(reserva.estado) ? (
                          <>
                            <button className={styles.linkButton} type="button" onClick={() => handleEdit(reserva.id)}>
                              Editar
                            </button>
                            <button className={styles.linkButton} type="button" onClick={() => handleConfirm(reserva.id)}>
                              Confirmar
                            </button>
                            <button className={styles.linkDanger} type="button" onClick={() => handleCancel(reserva.id)}>
                              Cancelar
                            </button>
                          </>
                        ) : isReservaBloqueada(reserva.estado) ? (
                          <button className={styles.linkButton} type="button" onClick={() => handleView(reserva.id)}>
                            Ver
                          </button>
                        ) : null}
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
              <select className={styles.select} name="idCliente" value={form.idCliente} onChange={handleFormChange}>
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
                <span>Vehiculo</span>
                <select
                  className={styles.select}
                  name="idVehiculo"
                  value={form.idVehiculo}
                  onChange={handleFormChange}
                >
                  <option value="">Selecciona un vehiculo disponible</option>
                  {vehiculosDisponibles.map((vehiculo) => (
                    <option key={vehiculo.id} value={vehiculo.id}>
                      {`${vehiculo.placa || `Vehiculo ${vehiculo.id}`} ${vehiculo.modelo || ''}`.trim()}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Cantidad de dias</span>
                <input
                  className={styles.input}
                  name="cantidadDias"
                  type="number"
                  min="1"
                  value={form.cantidadDias}
                  readOnly
                />
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
                <select
                  className={styles.select}
                  name="idLocalizacionRecogida"
                  value={form.idLocalizacionRecogida}
                  onChange={handleFormChange}
                  disabled
                >
                  <option value="">Selecciona un vehiculo primero</option>
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
                          <option value="PRI">Principal</option>
                          <option value="SEC">Secundario</option>
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

      {modalState.isOpen ? (
        <>
          <div
            className="modal fade show"
            style={{ display: 'block' }}
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
            onClick={() => closeModal()}
          >
            <div
              className="modal-dialog modal-dialog-centered"
              role="document"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{modalState.title}</h5>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Cerrar"
                    onClick={closeModal}
                    disabled={isModalSubmitting}
                  />
                </div>
                <div className="modal-body">
                  <p className="mb-2">{modalState.message}</p>
                  {modalState.action === 'view' && modalState.detail ? (
                    <div className="small">
                      <p className="mb-1"><strong>ID:</strong> {modalState.detail.id}</p>
                      <p className="mb-1"><strong>Codigo:</strong> {modalState.detail.codigo}</p>
                      <p className="mb-1"><strong>Cliente:</strong> {modalState.detail.cliente}</p>
                      <p className="mb-1"><strong>Vehiculo:</strong> {modalState.detail.vehiculo}</p>
                      <p className="mb-1"><strong>Estado:</strong> {modalState.detail.estado}</p>
                      <p className="mb-1"><strong>Fechas:</strong> {modalState.detail.fechaInicio} - {modalState.detail.fechaFin}</p>
                      <p className="mb-1"><strong>Horas:</strong> {modalState.detail.horaInicio} - {modalState.detail.horaFin}</p>
                      <p className="mb-1"><strong>Dias:</strong> {modalState.detail.dias}</p>
                      <p className="mb-1"><strong>Recogida:</strong> {modalState.detail.recogida}</p>
                      <p className="mb-1"><strong>Entrega:</strong> {modalState.detail.entrega}</p>
                      <p className="mb-1"><strong>Subtotal:</strong> {modalState.detail.subtotal}</p>
                      <p className="mb-1"><strong>IVA:</strong> {modalState.detail.iva}</p>
                      <p className="mb-1"><strong>Total:</strong> {modalState.detail.total}</p>
                      <p className="mb-1"><strong>Descripcion:</strong> {modalState.detail.descripcion}</p>
                      <p className="mb-1"><strong>Motivo cancelacion:</strong> {modalState.detail.motivoCancelacion}</p>
                      <p className="mb-1"><strong>Extras:</strong></p>
                      <pre className="bg-light p-2 border rounded">{modalState.detail.extrasText}</pre>
                      <p className="mb-1"><strong>Conductores:</strong></p>
                      <pre className="bg-light p-2 border rounded">{modalState.detail.conductoresText}</pre>
                    </div>
                  ) : null}
                  {modalState.action === 'cancel' ? (
                    <div className="mt-2">
                      <label className="form-label" htmlFor="cancel-reason">
                        Motivo de cancelacion
                      </label>
                      <textarea
                        id="cancel-reason"
                        className="form-control"
                        rows="3"
                        value={modalState.reason}
                        onChange={(event) =>
                          setModalState((current) => ({
                            ...current,
                            reason: event.target.value,
                            error: '',
                          }))
                        }
                        disabled={isModalSubmitting}
                      />
                    </div>
                  ) : null}
                  {modalState.error ? (
                    <div className="text-danger mt-2">{modalState.error}</div>
                  ) : null}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => closeModal()}
                    disabled={isModalSubmitting}
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    className={`btn ${modalState.action === 'cancel' ? 'btn-danger' : 'btn-primary'}`}
                    onClick={handleModalConfirm}
                    disabled={isModalSubmitting || modalState.action === 'view'}
                  >
                    {isModalSubmitting
                      ? 'Procesando...'
                      : modalState.action === 'confirm'
                        ? 'Confirmar'
                        : modalState.action === 'cancel'
                          ? 'Cancelar reserva'
                          : 'Aceptar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      ) : null}
    </div>
  );
}

export default ReservasPage;
