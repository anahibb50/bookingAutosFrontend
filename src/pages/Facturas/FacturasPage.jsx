import { useEffect, useMemo, useState } from 'react';
import {
  approveFactura,
  cancelFactura,
  createFactura,
  getFacturaById,
  getReservaById,
  listClientes,
  listConductores,
  listExtrasActivos,
  listReservas,
  searchFacturas,
  updateFactura,
} from '../../api/services/api';
import styles from '../shared/CrudPage.module.css';

const initialForm = {
  idReserva: '',
  descripcion: '',
};

const initialFilters = {
  campoBusqueda: 'idCliente',
  valorBusqueda: '',
  estado: '',
  fechaCreacionDesde: '',
  fechaCreacionHasta: '',
  pagina: 1,
  tamano: 10,
};

function normalizeFactura(item) {
  return {
    id: item?.id ?? '',
    guid: item?.guid ?? '',
    idReserva: item?.idReserva ?? '',
    idCliente: item?.idCliente ?? '',
    descripcion: item?.descripcion ?? '',
    origen: item?.origen ?? '',
    subtotal: Number(item?.subtotal ?? 0),
    iva: Number(item?.iva ?? 0),
    total: Number(item?.total ?? 0),
    estado: item?.estado ?? '',
    fechaAprobacion: item?.fechaAprobacion ?? '',
    fechaAnulacion: item?.fechaAnulacion ?? '',
    motivoAnulacion: item?.motivoAnulacion ?? '',
  };
}

function normalizeReserva(item) {
  return {
    id: item?.id ?? '',
    codigo: item?.codigo ?? '',
    idCliente: item?.idCliente ?? '',
  };
}

function normalizeCliente(item) {
  return {
    id: item?.id ?? '',
    nombre:
      [item?.nombre, item?.apellido].filter(Boolean).join(' ') ||
      item?.razonSocial ||
      `Cliente ${item?.id ?? ''}`,
  };
}

function normalizeExtra(item) {
  const precio =
    item?.precio ??
    item?.valor ??
    item?.valorUnitario ??
    item?.ValorUnitario ??
    item?.precioUnitario ??
    item?.precioDia ??
    item?.precioPorDia ??
    item?.monto ??
    0;
  return {
    id: item?.id ?? '',
    nombre: item?.nombre ?? item?.nombreExtra ?? `Extra ${item?.id ?? ''}`,
    precio: Number(precio),
  };
}

function normalizeConductor(item) {
  return {
    id: item?.id ?? '',
    nombre:
      [item?.nombre1, item?.nombre2, item?.apellido1, item?.apellido2].filter(Boolean).join(' ') ||
      `Conductor ${item?.id ?? ''}`,
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
    items: Array.isArray(items) ? items.map(normalizeFactura) : [],
    total: Number(total) || 0,
    page: Number(currentPage) || 1,
    pageSize: Number(pageSize) || 10,
  };
}

function extractItem(response) {
  return response?.data ? normalizeFactura(response.data) : null;
}

function buildFiltersPayload(filters) {
  const searchValue = String(filters.valorBusqueda || '').trim();
  const parsedId = Number(searchValue);
  const hasNumericId = Number.isFinite(parsedId) && parsedId > 0;

  return {
    ...(searchValue && filters.campoBusqueda === 'idCliente' && hasNumericId
      ? { idCliente: parsedId }
      : {}),
    ...(searchValue && filters.campoBusqueda === 'idReserva' && hasNumericId
      ? { idReserva: parsedId }
      : {}),
    ...(filters.estado ? { estado: filters.estado } : {}),
    ...(filters.fechaCreacionDesde ? { fechaCreacionDesde: filters.fechaCreacionDesde } : {}),
    ...(filters.fechaCreacionHasta ? { fechaCreacionHasta: filters.fechaCreacionHasta } : {}),
    pagina: Number(filters.pagina) || 1,
    tamano: Number(filters.tamano) || 10,
  };
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('es-EC');
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('es-EC', {
    style: 'currency',
    currency: 'USD',
  });
}

function normalizeEstadoFactura(value) {
  return String(value || '').trim().toUpperCase();
}

function isFacturaAbierta(estado) {
  const normalized = normalizeEstadoFactura(estado);
  return normalized === 'ABI' || normalized === 'ABIERTA';
}

function isFacturaCerrada(estado) {
  const normalized = normalizeEstadoFactura(estado);
  return normalized === 'APR' || normalized === 'APROBADA' || normalized === 'ANU' || normalized === 'ANULADA';
}

function FacturasPage({ onBack }) {
  const [facturas, setFacturas] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [extrasCatalog, setExtrasCatalog] = useState([]);
  const [conductoresCatalog, setConductoresCatalog] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [filters, setFilters] = useState(initialFilters);
  const [editingId, setEditingId] = useState(null);
  const [selectedFactura, setSelectedFactura] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const formTitle = useMemo(() => (editingId ? 'Editar factura' : 'Crear factura'), [editingId]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize || 1)), [pageSize, total]);
  const searchPlaceholder = useMemo(
    () => (filters.campoBusqueda === 'idCliente' ? 'Ingresa ID del cliente' : 'Ingresa ID de la reserva'),
    [filters.campoBusqueda]
  );

  const loadReservas = async () => {
    const response = await listReservas();
    const items = Array.isArray(response?.data) ? response.data.map(normalizeReserva) : [];
    setReservas(items);
  };

  const loadClientes = async () => {
    const response = await listClientes();
    const items = Array.isArray(response?.data) ? response.data.map(normalizeCliente) : [];
    setClientes(items);
  };

  const loadExtras = async () => {
    const response = await listExtrasActivos();
    const items = Array.isArray(response?.data) ? response.data.map(normalizeExtra) : [];
    setExtrasCatalog(items);
  };

  const loadConductores = async () => {
    const response = await listConductores();
    const items = Array.isArray(response?.data) ? response.data.map(normalizeConductor) : [];
    setConductoresCatalog(items);
  };

  const loadFacturas = async (nextFilters = filters) => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const response = await searchFacturas(buildFiltersPayload(nextFilters));
      const result = extractPagedItems(response);
      setFacturas(result.items);
      setTotal(result.total);
      setPage(result.page);
      setPageSize(result.pageSize);
      setStatusMessage(response?.mensaje || 'Facturas cargadas.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo cargar el listado de facturas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFacturas(initialFilters);
    loadReservas().catch(() => {
      setReservas([]);
    });
    loadClientes().catch(() => {
      setClientes([]);
    });
    loadExtras().catch(() => {
      setExtrasCatalog([]);
    });
    loadConductores().catch(() => {
      setConductoresCatalog([]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
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
      ...(name !== 'pagina' ? { pagina: 1 } : {}),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!editingId && !form.idReserva) {
      setErrorMessage('Debes seleccionar una reserva para crear la factura.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      if (editingId) {
        await updateFactura(editingId, {
          descripcion: form.descripcion.trim() || null,
        });
        setStatusMessage('Factura actualizada correctamente.');
      } else {
        await createFactura({
          idReserva: Number(form.idReserva),
          descripcion: form.descripcion.trim() || null,
        });
        setStatusMessage('Factura creada correctamente.');
      }

      resetForm();
      const nextFilters = { ...filters, pagina: 1 };
      setFilters(nextFilters);
      await loadFacturas(nextFilters);
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo guardar la factura.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (id) => {
    try {
      setErrorMessage('');
      const response = await getFacturaById(id);
      const factura = extractItem(response);

      if (!factura) {
        setErrorMessage('No se pudo obtener la factura.');
        return;
      }
      if (!isFacturaAbierta(factura.estado)) {
        setErrorMessage('Solo se puede editar una factura abierta.');
        return;
      }

      setSelectedFactura(factura);
      setEditingId(factura.id);
      setForm({
        idReserva: factura.idReserva ? String(factura.idReserva) : '',
        descripcion: factura.descripcion || '',
      });
      setStatusMessage('Factura cargada para edicion.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo obtener la factura.');
    }
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

  const handleApprove = async (id) => {
    const factura = facturas.find((item) => String(item.id) === String(id));
    if (!isFacturaAbierta(factura?.estado)) {
      setErrorMessage('Solo se puede aprobar una factura abierta.');
      return;
    }
    openActionModal('approve', id, 'Aprobar factura', '¿Deseas aprobar esta factura?');
  };

  const handleCancel = async (id) => {
    const factura = facturas.find((item) => String(item.id) === String(id));
    if (!isFacturaAbierta(factura?.estado)) {
      setErrorMessage('Solo se puede anular una factura abierta.');
      return;
    }
    openActionModal(
      'cancel',
      id,
      'Anular factura',
      '¿Deseas anular esta factura? Ingresa el motivo para continuar.'
    );
  };

  const handleModalConfirm = async () => {
    if (modalState.action === 'view') {
      closeModal();
      return;
    }

    try {
      setIsModalSubmitting(true);
      setErrorMessage('');

      if (modalState.action === 'approve' && modalState.targetId) {
        await approveFactura(modalState.targetId);
        setStatusMessage('Factura aprobada correctamente.');
        closeModal(true);
        await loadFacturas(filters);
        return;
      }

      if (modalState.action === 'cancel' && modalState.targetId) {
        if (!modalState.reason.trim()) {
          setModalState((current) => ({
            ...current,
            error: 'El motivo de anulacion es obligatorio.',
          }));
          return;
        }
        await cancelFactura(modalState.targetId, modalState.reason.trim());
        setStatusMessage('Factura anulada correctamente.');
        closeModal(true);
        await loadFacturas(filters);
      }
    } catch (error) {
      setErrorMessage(
        error.message ||
          (modalState.action === 'approve'
            ? 'No se pudo aprobar la factura.'
            : 'No se pudo anular la factura.')
      );
    } finally {
      setIsModalSubmitting(false);
    }
  };

  const getClienteNombre = (idCliente) =>
    clientes.find((cliente) => String(cliente.id) === String(idCliente))?.nombre || `Cliente ${idCliente}`;

  const getReservaLabel = (idReserva) => {
    const reserva = reservas.find((item) => String(item.id) === String(idReserva));
    if (!reserva) return `Reserva ${idReserva}`;
    const clienteNombre = getClienteNombre(reserva.idCliente);
    return `${reserva.codigo || `Reserva ${reserva.id}`} - ${clienteNombre}`;
  };

  const handleView = async (id) => {
    try {
      setErrorMessage('');
      const facturaResponse = await getFacturaById(id);
      const factura = extractItem(facturaResponse);
      if (!factura) {
        setErrorMessage('No se pudo obtener la factura.');
        return;
      }

      const reservaResponse = await getReservaById(factura.idReserva);
      const reservaData = reservaResponse?.data || {};

      const extrasText =
        Array.isArray(reservaData.extras) && reservaData.extras.length
          ? reservaData.extras
              .map((extra) => {
                const extraCatalog = extrasCatalog.find(
                  (catalogExtra) => String(catalogExtra.id) === String(extra?.idExtra)
                );
                const nombre =
                  extra?.nombreExtra ||
                  extra?.NombreExtra ||
                  extraCatalog?.nombre ||
                  `Extra ${extra?.idExtra || '-'}`;
                const precioFromReserva =
                  extra?.precio ??
                  extra?.valor ??
                  extra?.valorUnitario ??
                  extra?.ValorUnitario ??
                  extra?.precioUnitario ??
                  extra?.precioDia ??
                  extra?.precioPorDia ??
                  extra?.monto;
                const precio =
                  Number(precioFromReserva ?? extraCatalog?.precio ?? 0);
                const cantidad = Number(extra?.cantidad || 1);
                const totalExtra = precio * cantidad;
                return `${nombre} - ${formatMoney(precio)} x ${cantidad} = ${formatMoney(totalExtra)}`;
              })
              .join('\n')
          : 'Sin extras';

      const conductoresText =
        Array.isArray(reservaData.conductores) && reservaData.conductores.length
          ? reservaData.conductores
              .map((conductor) => {
                const conductorCatalog = conductoresCatalog.find(
                  (catalogConductor) =>
                    String(catalogConductor.id) === String(conductor?.idConductor)
                );
                const nombre = conductorCatalog?.nombre || `Conductor ${conductor?.idConductor || '-'}`;
                return `${nombre} (${conductor?.rol || '-'})`;
              })
              .join('\n')
          : 'Sin conductores';

      setSelectedFactura(factura);
      setModalState({
        isOpen: true,
        title: `Factura ${factura.id || '-'}`,
        message: 'Detalle de factura y reserva asociada.',
        action: 'view',
        targetId: null,
        reason: '',
        error: '',
        detail: {
          idFactura: factura.id || '-',
          idReserva: factura.idReserva || '-',
          cliente: getClienteNombre(factura.idCliente),
          estado: factura.estado || '-',
          descripcion: factura.descripcion || '-',
          subtotal: formatMoney(factura.subtotal),
          iva: formatMoney(factura.iva),
          total: formatMoney(factura.total),
          aprobacion: formatDate(factura.fechaAprobacion),
          anulacion: formatDate(factura.fechaAnulacion),
          motivoAnulacion: factura.motivoAnulacion || '-',
          reservaCodigo: reservaData?.codigo || factura.idReserva || '-',
          reservaFechaInicio: formatDate(reservaData?.fechaInicio),
          reservaFechaFin: formatDate(reservaData?.fechaFin),
          reservaDescripcion: reservaData?.descripcion || '-',
          extrasText,
          conductoresText,
        },
      });
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo obtener el detalle de la factura.');
    }
  };

  const handleFilterSubmit = async () => {
    const nextFilters = { ...filters, pagina: 1 };
    setFilters(nextFilters);
    await loadFacturas(nextFilters);
  };

  const changePage = async (nextPage) => {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    const nextFilters = { ...filters, pagina: safePage };
    setFilters(nextFilters);
    await loadFacturas(nextFilters);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <button className={styles.backButton} type="button" onClick={onBack}>
            Regresar
          </button>
          <h2>Facturas</h2>
          <p>Crea, consulta, aprueba y anula facturas ligadas a reservas.</p>
        </div>
        <button className={styles.secondaryButton} type="button" onClick={() => loadFacturas(filters)}>
          Recargar
        </button>
      </div>

      {(statusMessage || errorMessage) && (
        <div className={`${styles.message} ${errorMessage ? styles.error : styles.success}`}>
          {errorMessage || statusMessage}
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
              <select className={styles.select} name="campoBusqueda" value={filters.campoBusqueda} onChange={handleFilterChange}>
                <option value="idCliente">ID cliente</option>
                <option value="idReserva">ID reserva</option>
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
              <span>Estado</span>
              <select className={styles.select} name="estado" value={filters.estado} onChange={handleFilterChange}>
                <option value="">Todos</option>
                <option value="ABI">Abierta</option>
                <option value="APR">Aprobada</option>
                <option value="ANU">Anulada</option>
              </select>
            </label>

            <label className={styles.fieldCompact}>
              <span>Desde</span>
              <input className={styles.input} name="fechaCreacionDesde" type="date" value={filters.fechaCreacionDesde} onChange={handleFilterChange} />
            </label>

            <label className={styles.fieldCompact}>
              <span>Hasta</span>
              <input className={styles.input} name="fechaCreacionHasta" type="date" value={filters.fechaCreacionHasta} onChange={handleFilterChange} />
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
              onClick={async () => {
                setFilters(initialFilters);
                await loadFacturas(initialFilters);
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
                  <th>Reserva</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && facturas.length === 0 ? (
                  <tr>
                    <td colSpan="6" className={styles.emptyCell}>
                      No hay datos para mostrar.
                    </td>
                  </tr>
                ) : null}

                {facturas.map((factura) => (
                  <tr key={factura.id || factura.guid || `${factura.idReserva}-${factura.idCliente}`}>
                    <td>{factura.id || '-'}</td>
                    <td>{factura.idReserva || '-'}</td>
                    <td>{getClienteNombre(factura.idCliente)}</td>
                    <td>{formatMoney(factura.total)}</td>
                    <td>
                      <span className={`${styles.badge} ${
                        normalizeEstadoFactura(factura.estado) === 'ABI' || normalizeEstadoFactura(factura.estado) === 'ABIERTA'
                          ? styles.badgeWarning
                          : normalizeEstadoFactura(factura.estado) === 'ANU' || normalizeEstadoFactura(factura.estado) === 'ANULADA'
                            ? styles.badgeInactive
                            : styles.badgeActive
                      }`}>
                        {factura.estado || '-'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        {isFacturaAbierta(factura.estado) ? (
                          <>
                            <button className={styles.linkButton} type="button" onClick={() => handleEdit(factura.id)}>
                              Editar
                            </button>
                            <button className={styles.linkButton} type="button" onClick={() => handleApprove(factura.id)}>
                              Aprobar
                            </button>
                            <button className={styles.linkDanger} type="button" onClick={() => handleCancel(factura.id)}>
                              Anular
                            </button>
                          </>
                        ) : isFacturaCerrada(factura.estado) ? (
                          <button className={styles.linkButton} type="button" onClick={() => handleView(factura.id)}>
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
              <span>Reserva</span>
              <select
                className={styles.select}
                name="idReserva"
                value={form.idReserva}
                onChange={handleFormChange}
                disabled={Boolean(editingId)}
              >
                <option value="">Selecciona una reserva</option>
                {reservas.map((reserva) => (
                  <option key={reserva.id} value={reserva.id}>
                    {getReservaLabel(reserva.id)}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span>Descripcion</span>
              <textarea
                className={styles.textarea}
                name="descripcion"
                value={form.descripcion}
                onChange={handleFormChange}
              />
            </label>

            <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : editingId ? 'Actualizar factura' : 'Crear factura'}
            </button>
          </form>

          {selectedFactura ? (
            <div className={styles.detailBox}>
              <h4>Detalle seleccionado</h4>
              <p>
                <strong>Subtotal:</strong> {formatMoney(selectedFactura.subtotal)}
              </p>
              <p>
                <strong>IVA:</strong> {formatMoney(selectedFactura.iva)}
              </p>
              <p>
                <strong>Total:</strong> {formatMoney(selectedFactura.total)}
              </p>
              <p>
                <strong>Aprobacion:</strong> {formatDate(selectedFactura.fechaAprobacion)}
              </p>
              <p>
                <strong>Anulacion:</strong> {formatDate(selectedFactura.fechaAnulacion)}
              </p>
              <p>
                <strong>Motivo anulacion:</strong> {selectedFactura.motivoAnulacion || '-'}
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
              className="modal-dialog modal-dialog-centered modal-lg"
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
                      <p className="mb-1"><strong>Factura:</strong> {modalState.detail.idFactura}</p>
                      <p className="mb-1"><strong>Reserva:</strong> {modalState.detail.idReserva}</p>
                      <p className="mb-1"><strong>Cliente:</strong> {modalState.detail.cliente}</p>
                      <p className="mb-1"><strong>Estado:</strong> {modalState.detail.estado}</p>
                      <p className="mb-1"><strong>Descripcion:</strong> {modalState.detail.descripcion}</p>
                      <p className="mb-1"><strong>Subtotal:</strong> {modalState.detail.subtotal}</p>
                      <p className="mb-1"><strong>IVA:</strong> {modalState.detail.iva}</p>
                      <p className="mb-1"><strong>Total:</strong> {modalState.detail.total}</p>
                      <p className="mb-1"><strong>Aprobacion:</strong> {modalState.detail.aprobacion}</p>
                      <p className="mb-1"><strong>Anulacion:</strong> {modalState.detail.anulacion}</p>
                      <p className="mb-1"><strong>Motivo anulacion:</strong> {modalState.detail.motivoAnulacion}</p>
                      <hr />
                      <p className="mb-1"><strong>Reserva codigo:</strong> {modalState.detail.reservaCodigo}</p>
                      <p className="mb-1"><strong>Inicio:</strong> {modalState.detail.reservaFechaInicio}</p>
                      <p className="mb-1"><strong>Fin:</strong> {modalState.detail.reservaFechaFin}</p>
                      <p className="mb-1"><strong>Detalle reserva:</strong> {modalState.detail.reservaDescripcion}</p>
                      <p className="mb-1"><strong>Extras:</strong></p>
                      <pre className="bg-light p-2 border rounded">{modalState.detail.extrasText}</pre>
                      <p className="mb-1"><strong>Conductores:</strong></p>
                      <pre className="bg-light p-2 border rounded">{modalState.detail.conductoresText}</pre>
                    </div>
                  ) : null}
                  {modalState.action === 'cancel' ? (
                    <div className="mt-2">
                      <label className="form-label" htmlFor="cancel-reason-factura">
                        Motivo de anulacion
                      </label>
                      <textarea
                        id="cancel-reason-factura"
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
                      : modalState.action === 'approve'
                        ? 'Aprobar'
                        : modalState.action === 'cancel'
                          ? 'Anular factura'
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

export default FacturasPage;
