import { useEffect, useMemo, useState } from 'react';
import {
  createCliente,
  deleteCliente,
  existsClienteIdentificacion,
  getClienteById,
  getClienteByIdentificacion,
  listCiudades,
  searchClientes,
  updateCliente,
} from '../../api/services/api';
import styles from '../shared/CrudPage.module.css';

const initialForm = {
  nombre: '',
  apellido: '',
  razonSocial: '',
  tipoIdentificacion: 'CEDULA',
  identificacion: '',
  idCiudad: '',
  direccion: '',
  genero: 'M',
  telefono: '',
  email: '',
};

const initialFilters = {
  nombre: '',
  apellido: '',
  identificacion: '',
  tipoIdentificacion: '',
  idCiudad: '',
  estado: '',
  email: '',
  pagina: 1,
  tamano: 10,
};

function normalizeCliente(item) {
  return {
    id: item?.id ?? '',
    guid: item?.guid ?? '',
    nombre: item?.nombre ?? '',
    apellido: item?.apellido ?? '',
    razonSocial: item?.razonSocial ?? '',
    tipoIdentificacion: item?.tipoIdentificacion ?? '',
    identificacion: item?.identificacion ?? '',
    idCiudad: item?.idCiudad ?? '',
    direccion: item?.direccion ?? '',
    genero: item?.genero ?? '',
    telefono: item?.telefono ?? '',
    email: item?.email ?? '',
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
    items: Array.isArray(items) ? items.map(normalizeCliente) : [],
    total: Number(total) || 0,
    page: Number(currentPage) || 1,
    pageSize: Number(pageSize) || 10,
  };
}

function extractItem(response) {
  return response?.data ? normalizeCliente(response.data) : null;
}

function normalizeCiudad(item) {
  return {
    id: item?.id ?? item?.idCiudad ?? '',
    nombre: item?.nombre ?? item?.nombreCiudad ?? '',
  };
}

function buildFiltersPayload(filters) {
  return {
    ...(filters.nombre.trim() ? { nombre: filters.nombre.trim() } : {}),
    ...(filters.apellido.trim() ? { apellido: filters.apellido.trim() } : {}),
    ...(filters.identificacion.trim()
      ? { identificacion: filters.identificacion.trim() }
      : {}),
    ...(filters.tipoIdentificacion ? { tipoIdentificacion: filters.tipoIdentificacion } : {}),
    ...(filters.idCiudad ? { idCiudad: Number(filters.idCiudad) } : {}),
    ...(filters.estado ? { estado: filters.estado } : {}),
    ...(filters.email.trim() ? { email: filters.email.trim() } : {}),
    pagina: Number(filters.pagina) || 1,
    tamano: Number(filters.tamano) || 10,
  };
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
    return value.replace(/\D/g, '');
  }
  return value;
}

function normalizeTelefono(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, 10);
}

function ClientesPage({ onBack }) {
  const [clientes, setClientes] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [filters, setFilters] = useState(initialFilters);
  const [editingId, setEditingId] = useState(null);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formTitle = useMemo(() => (editingId ? 'Editar cliente' : 'Crear cliente'), [editingId]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize || 1)), [pageSize, total]);

  const getCiudadNombre = (idCiudad) => {
    return ciudades.find((ciudad) => String(ciudad.id) === String(idCiudad))?.nombre || '-';
  };

  const loadCiudades = async () => {
    const response = await listCiudades();
    const items = Array.isArray(response?.data) ? response.data.map(normalizeCiudad) : [];
    setCiudades(items);
  };

  const loadClientes = async (nextFilters = filters) => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const response = await searchClientes(buildFiltersPayload(nextFilters));
      const result = extractPagedItems(response);
      setClientes(result.items);
      setTotal(result.total);
      setPage(result.page);
      setPageSize(result.pageSize);
      setStatusMessage(response?.mensaje || 'Clientes cargados.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo cargar el listado de clientes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const boot = async () => {
      await loadClientes(initialFilters);
    };

    boot();
    loadCiudades().catch((error) => {
      setErrorMessage(error.message || 'No se pudo cargar el catalogo de ciudades.');
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
      [name]:
        name === 'tipoIdentificacion'
          ? normalizeTipoIdentificacion(value)
          : name === 'identificacion'
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
      [name]: name === 'tipoIdentificacion' ? normalizeTipoIdentificacion(value) : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !form.nombre.trim() ||
      !form.apellido.trim() ||
      !form.identificacion.trim() ||
      !form.idCiudad ||
      !form.genero
    ) {
      setErrorMessage('Nombre, apellido, identificacion, ciudad y genero son obligatorios.');
      return;
    }
    const normalizedTipoIdentificacion = normalizeTipoIdentificacion(form.tipoIdentificacion);
    const normalizedIdentificacion = normalizeIdentificacionByTipo(
      normalizedTipoIdentificacion,
      form.identificacion
    );

    if (normalizedTipoIdentificacion === 'CEDULA' && normalizedIdentificacion.length !== 10) {
      setErrorMessage('La cedula debe tener 10 digitos.');
      return;
    }
    if (normalizedTipoIdentificacion === 'RUC' && normalizedIdentificacion.length !== 13) {
      setErrorMessage('El RUC debe tener 13 digitos.');
      return;
    }
    if (form.telefono.trim() && normalizeTelefono(form.telefono).length !== 10) {
      setErrorMessage('El telefono debe tener exactamente 10 digitos.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      const existsResponse = await existsClienteIdentificacion(form.identificacion.trim());

      if (!editingId && existsResponse?.data) {
        setErrorMessage('Ya existe un cliente con esa identificacion.');
        return;
      }

      const payload = {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        razonSocial: form.razonSocial.trim() || null,
        tipoIdentificacion: normalizedTipoIdentificacion,
        identificacion: normalizedIdentificacion,
        idCiudad: Number(form.idCiudad),
        direccion: form.direccion.trim() || null,
        genero: form.genero,
        telefono: normalizeTelefono(form.telefono) || null,
        email: form.email.trim() || null,
      };

      if (editingId) {
        await updateCliente(editingId, payload);
        setStatusMessage('Cliente actualizado correctamente.');
      } else {
        await createCliente(payload);
        setStatusMessage('Cliente creado correctamente.');
      }

      resetForm();
      const nextFilters = { ...filters, pagina: 1 };
      setFilters(nextFilters);
      await loadClientes(nextFilters);
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo guardar el cliente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (id) => {
    try {
      setErrorMessage('');
      const response = await getClienteById(id);
      const cliente = extractItem(response);

      if (!cliente) {
        setErrorMessage('No se pudo obtener el cliente.');
        return;
      }

      setSelectedCliente(cliente);
      setEditingId(cliente.id);
      setForm({
        nombre: cliente.nombre,
        apellido: cliente.apellido,
        razonSocial: cliente.razonSocial || '',
        tipoIdentificacion: normalizeTipoIdentificacion(cliente.tipoIdentificacion) || 'CEDULA',
        identificacion: cliente.identificacion || '',
        idCiudad: cliente.idCiudad ? String(cliente.idCiudad) : '',
        direccion: cliente.direccion || '',
        genero: cliente.genero || 'M',
        telefono: cliente.telefono || '',
        email: cliente.email || '',
      });
      setStatusMessage('Cliente cargado para edicion.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo obtener el cliente.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Seguro que deseas eliminar este cliente?')) {
      return;
    }

    try {
      setErrorMessage('');
      await deleteCliente(id);
      setStatusMessage('Cliente eliminado correctamente.');

      if (editingId === id) {
        resetForm();
      }

      await loadClientes(filters);
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo eliminar el cliente.');
    }
  };

  const handleSearchByIdentificacion = async () => {
    if (!filters.identificacion.trim()) {
      await loadClientes(filters);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');
      const response = await getClienteByIdentificacion(filters.identificacion.trim());
      const cliente = extractItem(response);
      setClientes(cliente ? [cliente] : []);
      setTotal(cliente ? 1 : 0);
      setPage(1);
      setStatusMessage(cliente ? 'Cliente encontrado.' : 'No se encontraron resultados.');
    } catch (error) {
      setClientes([]);
      setTotal(0);
      setErrorMessage(error.message || 'No se pudo buscar por identificacion.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterSubmit = async () => {
    const nextFilters = { ...filters, pagina: 1 };
    setFilters(nextFilters);
    await loadClientes(nextFilters);
  };

  const changePage = async (nextPage) => {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    const nextFilters = { ...filters, pagina: safePage };
    setFilters(nextFilters);
    await loadClientes(nextFilters);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <button className={styles.backButton} type="button" onClick={onBack}>
            Regresar
          </button>
          <h2>Clientes</h2>
          <p>Gestiona clientes con filtros paginados e identificacion unica.</p>
        </div>
        <button className={styles.secondaryButton} type="button" onClick={() => loadClientes(filters)}>
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
              <span>Nombre</span>
              <input
                className={styles.input}
                name="nombre"
                type="text"
                value={filters.nombre}
                onChange={handleFilterChange}
              />
            </label>

            <label className={styles.fieldCompact}>
              <span>Apellido</span>
              <input
                className={styles.input}
                name="apellido"
                type="text"
                value={filters.apellido}
                onChange={handleFilterChange}
              />
            </label>

            <label className={styles.fieldCompact}>
              <span>Identificacion</span>
              <input
                className={styles.input}
                name="identificacion"
                type="text"
                value={filters.identificacion}
                onChange={handleFilterChange}
              />
            </label>

            <label className={styles.fieldCompact}>
              <span>Tipo</span>
              <select
                className={styles.select}
                name="tipoIdentificacion"
                value={filters.tipoIdentificacion}
                onChange={handleFilterChange}
              >
                <option value="">Todos</option>
                <option value="CEDULA">CEDULA</option>
                <option value="RUC">RUC</option>
                <option value="PASAPORTE">PASAPORTE</option>
              </select>
            </label>

            <label className={styles.fieldCompact}>
              <span>Ciudad</span>
              <select
                className={styles.select}
                name="idCiudad"
                value={filters.idCiudad}
                onChange={handleFilterChange}
              >
                <option value="">Todas</option>
                {ciudades.map((ciudad) => (
                  <option key={ciudad.id} value={ciudad.id}>
                    {ciudad.nombre}
                  </option>
                ))}
              </select>
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
              <span>Email</span>
              <input
                className={styles.input}
                name="email"
                type="text"
                value={filters.email}
                onChange={handleFilterChange}
              />
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
              Buscar con filtros
            </button>
            <button className={styles.secondaryButton} type="button" onClick={handleSearchByIdentificacion}>
              Buscar por identificacion
            </button>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={() => {
                setFilters(initialFilters);
                loadClientes(initialFilters);
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
                  <th>Nombre</th>
                  <th>Identificacion</th>
                  <th>Ciudad</th>
                  <th>Contacto</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && clientes.length === 0 ? (
                  <tr>
                    <td colSpan="7" className={styles.emptyCell}>
                      No hay datos para mostrar.
                    </td>
                  </tr>
                ) : null}

                {clientes.map((cliente) => (
                  <tr key={cliente.id || cliente.guid || cliente.identificacion}>
                    <td>{cliente.id || '-'}</td>
                    <td>{`${cliente.nombre || ''} ${cliente.apellido || ''}`.trim() || '-'}</td>
                    <td>{`${cliente.tipoIdentificacion || ''} ${cliente.identificacion || ''}`.trim() || '-'}</td>
                    <td>{getCiudadNombre(cliente.idCiudad)}</td>
                    <td>{cliente.email || cliente.telefono || '-'}</td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          cliente.estado === 'ACT' ? styles.badgeActive : styles.badgeInactive
                        }`}
                      >
                        {cliente.estado || '-'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={styles.linkButton}
                          type="button"
                          onClick={() => handleEdit(cliente.id)}
                        >
                          Editar
                        </button>
                        <button
                          className={styles.linkDanger}
                          type="button"
                          onClick={() => handleDelete(cliente.id)}
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
                <span>Nombre</span>
                <input
                  className={styles.input}
                  name="nombre"
                  type="text"
                  value={form.nombre}
                  onChange={handleFormChange}
                />
              </label>

              <label className={styles.field}>
                <span>Apellido</span>
                <input
                  className={styles.input}
                  name="apellido"
                  type="text"
                  value={form.apellido}
                  onChange={handleFormChange}
                />
              </label>
            </div>

            <label className={styles.field}>
              <span>Razon social</span>
              <input
                className={styles.input}
                name="razonSocial"
                type="text"
                value={form.razonSocial}
                onChange={handleFormChange}
              />
            </label>

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
                  <option value="RUC">RUC</option>
                  <option value="PASAPORTE">PASAPORTE</option>
                </select>
              </label>

              <label className={styles.field}>
                <span>Identificacion</span>
                <input
                  className={styles.input}
                  name="identificacion"
                  type="text"
                  value={form.identificacion}
                  onChange={handleFormChange}
                />
              </label>
            </div>

            <div className={styles.twoColumns}>
              <label className={styles.field}>
                <span>Ciudad</span>
                <select
                  className={styles.select}
                  name="idCiudad"
                  value={form.idCiudad}
                  onChange={handleFormChange}
                >
                  <option value="">Selecciona una ciudad</option>
                  {ciudades.map((ciudad) => (
                    <option key={ciudad.id} value={ciudad.id}>
                      {ciudad.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Genero</span>
                <select
                  className={styles.select}
                  name="genero"
                  value={form.genero}
                  onChange={handleFormChange}
                >
                  <option value="M">M</option>
                  <option value="F">F</option>
                  <option value="O">O</option>
                </select>
              </label>
            </div>

            <label className={styles.field}>
              <span>Direccion</span>
              <textarea
                className={styles.textarea}
                name="direccion"
                value={form.direccion}
                onChange={handleFormChange}
              />
            </label>

            <div className={styles.twoColumns}>
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

              <label className={styles.field}>
                <span>Email</span>
                <input
                  className={styles.input}
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleFormChange}
                />
              </label>
            </div>

            <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : editingId ? 'Actualizar cliente' : 'Crear cliente'}
            </button>
          </form>

          {selectedCliente ? (
            <div className={styles.detailBox}>
              <h4>Detalle seleccionado</h4>
              <p>
                <strong>Nombre:</strong> {selectedCliente.nombre} {selectedCliente.apellido}
              </p>
              <p>
                <strong>Identificacion:</strong> {selectedCliente.tipoIdentificacion} {selectedCliente.identificacion}
              </p>
              <p>
                <strong>Ciudad:</strong> {getCiudadNombre(selectedCliente.idCiudad)}
              </p>
              <p>
                <strong>Estado:</strong> {selectedCliente.estado || '-'}
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

export default ClientesPage;
