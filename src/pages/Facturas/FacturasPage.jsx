import { useEffect, useMemo, useState } from 'react';
import {
  approveFactura,
  cancelFactura,
  createFactura,
  getFacturaById,
  getFacturaByReserva,
  getFacturasByCliente,
  listFacturas,
  listReservas,
  searchFacturas,
  updateFactura,
} from '../../api/services/api';
import styles from '../shared/CrudPage.module.css';

const initialForm = {
  idReserva: '',
  descripcion: '',
  origen: '',
};

const initialFilters = {
  idCliente: '',
  idReserva: '',
  estado: '',
  fechaCreacionDesde: '',
  fechaCreacionHasta: '',
  totalMin: '',
  totalMax: '',
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
  return {
    ...(filters.idCliente ? { idCliente: Number(filters.idCliente) } : {}),
    ...(filters.idReserva ? { idReserva: Number(filters.idReserva) } : {}),
    ...(filters.estado ? { estado: filters.estado } : {}),
    ...(filters.fechaCreacionDesde ? { fechaCreacionDesde: filters.fechaCreacionDesde } : {}),
    ...(filters.fechaCreacionHasta ? { fechaCreacionHasta: filters.fechaCreacionHasta } : {}),
    ...(filters.totalMin !== '' ? { totalMin: Number(filters.totalMin) } : {}),
    ...(filters.totalMax !== '' ? { totalMax: Number(filters.totalMax) } : {}),
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

function FacturasPage({ onBack }) {
  const [facturas, setFacturas] = useState([]);
  const [reservas, setReservas] = useState([]);
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

  const formTitle = useMemo(() => (editingId ? 'Editar factura' : 'Crear factura'), [editingId]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize || 1)), [pageSize, total]);

  const loadReservas = async () => {
    const response = await listReservas();
    const items = Array.isArray(response?.data) ? response.data.map(normalizeReserva) : [];
    setReservas(items);
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
          origen: form.origen.trim() || null,
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

      setSelectedFactura(factura);
      setEditingId(factura.id);
      setForm({
        idReserva: factura.idReserva ? String(factura.idReserva) : '',
        descripcion: factura.descripcion || '',
        origen: factura.origen || '',
      });
      setStatusMessage('Factura cargada para edicion.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo obtener la factura.');
    }
  };

  const handleApprove = async (id) => {
    try {
      setErrorMessage('');
      await approveFactura(id);
      setStatusMessage('Factura aprobada correctamente.');
      await loadFacturas(filters);
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo aprobar la factura.');
    }
  };

  const handleCancel = async (id) => {
    const motivo = window.prompt('Ingresa el motivo de anulacion:');

    if (!motivo || !motivo.trim()) {
      return;
    }

    try {
      setErrorMessage('');
      await cancelFactura(id, motivo.trim());
      setStatusMessage('Factura anulada correctamente.');
      await loadFacturas(filters);
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo anular la factura.');
    }
  };

  const handleSearchByCliente = async () => {
    if (!filters.idCliente) {
      await loadFacturas(filters);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');
      const response = await getFacturasByCliente(Number(filters.idCliente));
      const items = Array.isArray(response?.data) ? response.data.map(normalizeFactura) : [];
      setFacturas(items);
      setTotal(items.length);
      setPage(1);
      setStatusMessage(items.length ? 'Facturas encontradas por cliente.' : 'No se encontraron resultados.');
    } catch (error) {
      setFacturas([]);
      setTotal(0);
      setErrorMessage(error.message || 'No se pudo buscar por cliente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchByReserva = async () => {
    if (!filters.idReserva) {
      await loadFacturas(filters);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');
      const response = await getFacturaByReserva(Number(filters.idReserva));
      const factura = response?.data ? normalizeFactura(response.data) : null;
      setFacturas(factura ? [factura] : []);
      setTotal(factura ? 1 : 0);
      setPage(1);
      setStatusMessage(factura ? 'Factura encontrada por reserva.' : 'No existe factura para esa reserva.');
    } catch (error) {
      setFacturas([]);
      setTotal(0);
      setErrorMessage(error.message || 'No se pudo buscar por reserva.');
    } finally {
      setIsLoading(false);
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
              <span>ID cliente</span>
              <input className={styles.input} name="idCliente" type="number" min="1" value={filters.idCliente} onChange={handleFilterChange} />
            </label>

            <label className={styles.fieldCompact}>
              <span>ID reserva</span>
              <input className={styles.input} name="idReserva" type="number" min="1" value={filters.idReserva} onChange={handleFilterChange} />
            </label>

            <label className={styles.fieldCompact}>
              <span>Estado</span>
              <select className={styles.select} name="estado" value={filters.estado} onChange={handleFilterChange}>
                <option value="">Todos</option>
                <option value="PEN">Pendiente</option>
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
              <span>Total minimo</span>
              <input className={styles.input} name="totalMin" type="number" min="0" step="0.01" value={filters.totalMin} onChange={handleFilterChange} />
            </label>

            <label className={styles.fieldCompact}>
              <span>Total maximo</span>
              <input className={styles.input} name="totalMax" type="number" min="0" step="0.01" value={filters.totalMax} onChange={handleFilterChange} />
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
            <button className={styles.secondaryButton} type="button" onClick={handleSearchByReserva}>
              Buscar por reserva
            </button>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={async () => {
                setFilters(initialFilters);
                const response = await listFacturas();
                const items = Array.isArray(response?.data) ? response.data.map(normalizeFactura) : [];
                setFacturas(items);
                setTotal(items.length);
                setPage(1);
                setPageSize(10);
              }}
            >
              Listar todo
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
                    <td>{factura.idCliente || '-'}</td>
                    <td>{formatMoney(factura.total)}</td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          factura.estado === 'APR' || factura.estado === 'ACT'
                            ? styles.badgeActive
                            : styles.badgeInactive
                        }`}
                      >
                        {factura.estado || '-'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.linkButton} type="button" onClick={() => handleEdit(factura.id)}>
                          Editar
                        </button>
                        <button className={styles.linkButton} type="button" onClick={() => handleApprove(factura.id)}>
                          Aprobar
                        </button>
                        <button className={styles.linkDanger} type="button" onClick={() => handleCancel(factura.id)}>
                          Anular
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
                    {reserva.codigo ? `${reserva.codigo} - Cliente ${reserva.idCliente}` : `Reserva ${reserva.id}`}
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

            <label className={styles.field}>
              <span>Origen</span>
              <input
                className={styles.input}
                name="origen"
                type="text"
                value={form.origen}
                onChange={handleFormChange}
                disabled={Boolean(editingId)}
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
    </div>
  );
}

export default FacturasPage;
