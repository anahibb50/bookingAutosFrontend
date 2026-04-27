import { useEffect, useMemo, useState } from 'react';
import {
  createConductor,
  deleteConductor,
  existsConductorIdentificacion,
  existsConductorLicencia,
  getConductorById,
  searchConductores,
  updateConductor,
} from '../../api/services/api';
import styles from '../shared/CrudPage.module.css';

const initialForm = {
  nombre1: '',
  nombre2: '',
  apellido1: '',
  apellido2: '',
  tipoIdentificacion: 'CEDULA',
  numeroIdentificacion: '',
  numeroLicencia: '',
  fechaVencimientoLicencia: '',
  edad: '',
  telefono: '',
  correo: '',
};

const initialFilters = {
  campoBusqueda: 'numeroIdentificacion',
  valorBusqueda: '',
  estado: '',
  pagina: 1,
  tamano: 10,
};

function normalizeConductor(item) {
  return {
    id: item?.id ?? '',
    guid: item?.guid ?? '',
    codigo: item?.codigo ?? '',
    nombre1: item?.nombre1 ?? '',
    nombre2: item?.nombre2 ?? '',
    apellido1: item?.apellido1 ?? '',
    apellido2: item?.apellido2 ?? '',
    tipoIdentificacion: item?.tipoIdentificacion ?? '',
    numeroIdentificacion: item?.numeroIdentificacion ?? '',
    numeroLicencia: item?.numeroLicencia ?? '',
    fechaVencimientoLicencia: item?.fechaVencimientoLicencia ?? '',
    telefono: item?.telefono ?? '',
    edad: item?.edad ?? '',
    correo: item?.correo ?? '',
    estado: item?.estado ?? 'ACT',
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
    items: Array.isArray(items) ? items.map(normalizeConductor) : [],
    total: Number(total) || 0,
    page: Number(currentPage) || 1,
    pageSize: Number(pageSize) || 10,
  };
}

function extractItem(response) {
  return response?.data ? normalizeConductor(response.data) : null;
}

function buildPayload(filters) {
  const searchValue = String(filters.valorBusqueda || '').trim();
  const searchField = filters.campoBusqueda;
  return {
    ...(searchValue && searchField === 'numeroIdentificacion'
      ? { numeroIdentificacion: searchValue }
      : {}),
    ...(searchValue && searchField === 'numeroLicencia' ? { numeroLicencia: searchValue } : {}),
    ...(searchValue && searchField === 'nombre' ? { nombre: searchValue } : {}),
    ...(filters.estado ? { estado: filters.estado } : {}),
    pagina: Number(filters.pagina) || 1,
    tamano: Number(filters.tamano) || 10,
  };
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('es-EC');
}

function normalizeTipoIdentificacion(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'CED') return 'CEDULA';
  if (normalized === 'PAS') return 'PASAPORTE';
  return normalized;
}

function normalizeIdentificacionByTipo(tipoIdentificacion, identificacion) {
  const tipo = normalizeTipoIdentificacion(tipoIdentificacion);
  const value = String(identificacion || '').trim();
  if (tipo === 'CEDULA' || tipo === 'RUC') {
    const maxLength = tipo === 'CEDULA' ? 10 : 13;
    return value.replace(/\D/g, '').slice(0, maxLength);
  }
  if (tipo === 'PASAPORTE') {
    return value.slice(0, 20);
  }
  return value.slice(0, 20);
}

function normalizeTelefono(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, 10);
}

function ConductoresPage({ onBack }) {
  const [conductores, setConductores] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [filters, setFilters] = useState(initialFilters);
  const [editingId, setEditingId] = useState(null);
  const [selectedConductor, setSelectedConductor] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formTitle = useMemo(
    () => (editingId ? 'Editar conductor' : 'Crear conductor'),
    [editingId]
  );
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize || 1)), [pageSize, total]);
  const searchPlaceholder = useMemo(() => {
    if (filters.campoBusqueda === 'numeroLicencia') return 'Buscar por licencia';
    if (filters.campoBusqueda === 'nombre') return 'Buscar por nombre';
    return 'Buscar por identificacion';
  }, [filters.campoBusqueda]);

  const loadConductores = async (nextFilters = filters) => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const response = await searchConductores(buildPayload(nextFilters));
      const result = extractPagedItems(response);
      setConductores(result.items);
      setTotal(result.total);
      setPage(result.page);
      setPageSize(result.pageSize);
      setStatusMessage(response?.mensaje || 'Conductores cargados.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo cargar el listado de conductores.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const boot = async () => {
      await loadConductores(initialFilters);
    };

    boot();
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
      [name]:
        name === 'tipoIdentificacion'
          ? normalizeTipoIdentificacion(value)
          : name === 'numeroIdentificacion'
            ? normalizeIdentificacionByTipo(currentForm.tipoIdentificacion, value)
            : name === 'telefono'
              ? normalizeTelefono(value)
            : value,
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

    if (
      !form.nombre1.trim() ||
      !form.apellido1.trim() ||
      !form.numeroIdentificacion.trim() ||
      !form.numeroLicencia.trim() ||
      !form.fechaVencimientoLicencia ||
      form.edad === '' ||
      !form.telefono.trim() ||
      !form.correo.trim()
    ) {
      setErrorMessage('Completa los campos obligatorios del conductor.');
      return;
    }
    const normalizedTipoIdentificacion = normalizeTipoIdentificacion(form.tipoIdentificacion);
    const normalizedIdentificacion = normalizeIdentificacionByTipo(
      normalizedTipoIdentificacion,
      form.numeroIdentificacion
    );

    if (normalizedTipoIdentificacion === 'CEDULA' && normalizedIdentificacion.length !== 10) {
      setErrorMessage('La cedula debe tener 10 digitos.');
      return;
    }
    if (normalizedTipoIdentificacion === 'RUC' && normalizedIdentificacion.length !== 13) {
      setErrorMessage('El RUC debe tener 13 digitos.');
      return;
    }
    if (
      normalizedTipoIdentificacion === 'PASAPORTE' &&
      (normalizedIdentificacion.length < 7 || normalizedIdentificacion.length > 20)
    ) {
      setErrorMessage('El pasaporte debe tener entre 7 y 20 caracteres.');
      return;
    }
    if (normalizeTelefono(form.telefono).length !== 10) {
      setErrorMessage('El telefono debe tener exactamente 10 digitos.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      const [existsIdentificationResponse, existsLicenseResponse] = await Promise.all([
        existsConductorIdentificacion(form.numeroIdentificacion.trim()),
        existsConductorLicencia(form.numeroLicencia.trim()),
      ]);

      if (!editingId && existsIdentificationResponse?.data) {
        setErrorMessage('Ya existe un conductor con esa identificacion.');
        return;
      }

      if (!editingId && existsLicenseResponse?.data) {
        setErrorMessage('Ya existe un conductor con ese numero de licencia.');
        return;
      }

      const payload = {
        nombre1: form.nombre1.trim(),
        nombre2: form.nombre2.trim() || null,
        apellido1: form.apellido1.trim(),
        apellido2: form.apellido2.trim() || null,
        tipoIdentificacion: normalizedTipoIdentificacion,
        numeroIdentificacion: normalizedIdentificacion,
        numeroLicencia: form.numeroLicencia.trim(),
        fechaVencimientoLicencia: form.fechaVencimientoLicencia,
        edad: Number(form.edad),
        telefono: normalizeTelefono(form.telefono),
        correo: form.correo.trim(),
      };

      if (editingId) {
        await updateConductor(editingId, payload);
        setStatusMessage('Conductor actualizado correctamente.');
      } else {
        await createConductor(payload);
        setStatusMessage('Conductor creado correctamente.');
      }

      resetForm();
      const nextFilters = { ...filters, pagina: 1 };
      setFilters(nextFilters);
      await loadConductores(nextFilters);
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo guardar el conductor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (id) => {
    try {
      setErrorMessage('');
      const response = await getConductorById(id);
      const conductor = extractItem(response);

      if (!conductor) {
        setErrorMessage('No se pudo obtener el conductor.');
        return;
      }

      setSelectedConductor(conductor);
      setEditingId(conductor.id);
      setForm({
        nombre1: conductor.nombre1 || '',
        nombre2: conductor.nombre2 || '',
        apellido1: conductor.apellido1 || '',
        apellido2: conductor.apellido2 || '',
        tipoIdentificacion: normalizeTipoIdentificacion(conductor.tipoIdentificacion) || 'CEDULA',
        numeroIdentificacion: conductor.numeroIdentificacion || '',
        numeroLicencia: conductor.numeroLicencia || '',
        fechaVencimientoLicencia: conductor.fechaVencimientoLicencia
          ? String(conductor.fechaVencimientoLicencia).slice(0, 10)
          : '',
        edad: conductor.edad === 0 ? '0' : String(conductor.edad || ''),
        telefono: conductor.telefono || '',
        correo: conductor.correo || '',
      });
      setStatusMessage('Conductor cargado para edicion.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo obtener el conductor.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Seguro que deseas eliminar este conductor?')) {
      return;
    }

    try {
      setErrorMessage('');
      await deleteConductor(id);
      setStatusMessage('Conductor eliminado correctamente.');

      if (editingId === id) {
        resetForm();
      }

      await loadConductores(filters);
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo eliminar el conductor.');
    }
  };

  const handleFilterSubmit = async () => {
    const nextFilters = { ...filters, pagina: 1 };
    setFilters(nextFilters);
    await loadConductores(nextFilters);
  };

  const changePage = async (nextPage) => {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    const nextFilters = { ...filters, pagina: safePage };
    setFilters(nextFilters);
    await loadConductores(nextFilters);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <button className={styles.backButton} type="button" onClick={onBack}>
            Regresar
          </button>
          <h2>Conductores</h2>
          <p>Administra conductores, licencias y validaciones de identificacion.</p>
        </div>
        <button className={styles.secondaryButton} type="button" onClick={() => loadConductores(filters)}>
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
              <select
                className={styles.select}
                name="campoBusqueda"
                value={filters.campoBusqueda}
                onChange={handleFilterChange}
              >
                <option value="numeroIdentificacion">Identificacion</option>
                <option value="numeroLicencia">Licencia</option>
                <option value="nombre">Nombre</option>
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
              <select
                className={styles.select}
                name="estado"
                value={filters.estado}
                onChange={handleFilterChange}
              >
                <option value="">Todos</option>
                <option value="ACT">Activo</option>
                <option value="INA">Inactivo</option>
              </select>
            </label>

            <label className={styles.fieldCompact}>
              <span>Tamano</span>
              <select
                className={styles.select}
                name="tamano"
                value={filters.tamano}
                onChange={handleFilterChange}
              >
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
                loadConductores(initialFilters);
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
                  <th>Conductor</th>
                  <th>Identificacion</th>
                  <th>Licencia</th>
                  <th>Edad</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && conductores.length === 0 ? (
                  <tr>
                    <td colSpan="7" className={styles.emptyCell}>
                      No hay datos para mostrar.
                    </td>
                  </tr>
                ) : null}

                {conductores.map((conductor) => (
                  <tr key={conductor.id || conductor.guid || conductor.numeroLicencia}>
                    <td>{conductor.id || '-'}</td>
                    <td>
                      {[
                        conductor.nombre1,
                        conductor.nombre2,
                        conductor.apellido1,
                        conductor.apellido2,
                      ]
                        .filter(Boolean)
                        .join(' ') || '-'}
                    </td>
                    <td>{`${conductor.tipoIdentificacion || ''} ${conductor.numeroIdentificacion || ''}`.trim() || '-'}</td>
                    <td>{conductor.numeroLicencia || '-'}</td>
                    <td>{conductor.edad || '-'}</td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          conductor.estado === 'ACT' ? styles.badgeActive : styles.badgeInactive
                        }`}
                      >
                        {conductor.estado || '-'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={styles.linkButton}
                          type="button"
                          onClick={() => handleEdit(conductor.id)}
                        >
                          Editar
                        </button>
                        <button
                          className={styles.linkDanger}
                          type="button"
                          onClick={() => handleDelete(conductor.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <button
              className={styles.secondaryButton}
              type="button"
              disabled={page <= 1}
              onClick={() => changePage(page - 1)}
            >
              Anterior
            </button>
            <span className={styles.muted}>
              Pagina {page} de {totalPages}
            </span>
            <button
              className={styles.secondaryButton}
              type="button"
              disabled={page >= totalPages}
              onClick={() => changePage(page + 1)}
            >
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
            <div className={styles.twoColumns}>
              <label className={styles.field}>
                <span>Primer nombre</span>
                <input
                  className={styles.input}
                  name="nombre1"
                  type="text"
                  value={form.nombre1}
                  onChange={handleFormChange}
                />
              </label>

              <label className={styles.field}>
                <span>Segundo nombre</span>
                <input
                  className={styles.input}
                  name="nombre2"
                  type="text"
                  value={form.nombre2}
                  onChange={handleFormChange}
                />
              </label>
            </div>

            <div className={styles.twoColumns}>
              <label className={styles.field}>
                <span>Primer apellido</span>
                <input
                  className={styles.input}
                  name="apellido1"
                  type="text"
                  value={form.apellido1}
                  onChange={handleFormChange}
                />
              </label>

              <label className={styles.field}>
                <span>Segundo apellido</span>
                <input
                  className={styles.input}
                  name="apellido2"
                  type="text"
                  value={form.apellido2}
                  onChange={handleFormChange}
                />
              </label>
            </div>

            <div className={styles.twoColumns}>
              <label className={styles.field}>
                <span>Tipo identificacion</span>
                <select
                  className={styles.select}
                  name="tipoIdentificacion"
                  value={form.tipoIdentificacion}
                  onChange={handleFormChange}
                >
                  <option value="CEDULA">CEDULA</option>
                  <option value="PASAPORTE">PASAPORTE</option>
                  <option value="RUC">RUC</option>
                </select>
              </label>

              <label className={styles.field}>
                <span>Numero identificacion</span>
                <input
                  className={styles.input}
                  name="numeroIdentificacion"
                  type="text"
                  value={form.numeroIdentificacion}
                  onChange={handleFormChange}
                  maxLength={
                    form.tipoIdentificacion === 'CEDULA'
                      ? 10
                      : form.tipoIdentificacion === 'RUC'
                        ? 13
                        : 20
                  }
                />
              </label>
            </div>

            <div className={styles.twoColumns}>
              <label className={styles.field}>
                <span>Numero licencia</span>
                <input
                  className={styles.input}
                  name="numeroLicencia"
                  type="text"
                  value={form.numeroLicencia}
                  onChange={handleFormChange}
                />
              </label>

              <label className={styles.field}>
                <span>Vence licencia</span>
                <input
                  className={styles.input}
                  name="fechaVencimientoLicencia"
                  type="date"
                  value={form.fechaVencimientoLicencia}
                  onChange={handleFormChange}
                />
              </label>
            </div>

            <div className={styles.twoColumns}>
              <label className={styles.field}>
                <span>Edad</span>
                <input
                  className={styles.input}
                  name="edad"
                  type="number"
                  min="18"
                  value={form.edad}
                  onChange={handleFormChange}
                />
              </label>

              <label className={styles.field}>
                <span>Telefono</span>
                <input
                  className={styles.input}
                  name="telefono"
                  type="text"
                  value={form.telefono}
                  onChange={handleFormChange}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={10}
                />
              </label>
            </div>

            <label className={styles.field}>
              <span>Correo</span>
              <input
                className={styles.input}
                name="correo"
                type="email"
                value={form.correo}
                onChange={handleFormChange}
              />
            </label>

            <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : editingId ? 'Actualizar conductor' : 'Crear conductor'}
            </button>
          </form>

          {selectedConductor ? (
            <div className={styles.detailBox}>
              <h4>Detalle seleccionado</h4>
              <p>
                <strong>Codigo:</strong> {selectedConductor.codigo || '-'}
              </p>
              <p>
                <strong>Licencia:</strong> {selectedConductor.numeroLicencia || '-'}
              </p>
              <p>
                <strong>Vencimiento:</strong> {formatDate(selectedConductor.fechaVencimientoLicencia)}
              </p>
              <p>
                <strong>Correo:</strong> {selectedConductor.correo || '-'}
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

export default ConductoresPage;
