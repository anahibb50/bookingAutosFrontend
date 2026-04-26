import { useEffect, useMemo, useState } from 'react';
import {
  createVehiculo,
  deleteVehiculo,
  existsVehiculoPlaca,
  getVehiculoById,
  getVehiculoByPlaca,
  getVehiculosByCategoria,
  getVehiculosByMarca,
  getVehiculosByPrecio,
  getVehiculosDisponibles,
  listCategorias,
  listLocalizaciones,
  listMarcas,
  searchVehiculos,
  updateVehiculo,
  updateVehiculoEstado,
  updateVehiculoKilometraje,
} from '../../api/services/api';
import styles from '../shared/CrudPage.module.css';

const initialForm = {
  placa: '',
  idMarca: '',
  idCategoria: '',
  idLocalizacion: '',
  modelo: '',
  anioFabricacion: '',
  color: '',
  tipoCombustible: 'GASOLINA',
  tipoTransmision: 'AUTOMATICA',
  capacidadPasajeros: '',
  capacidadMaletas: '',
  numeroPuertas: '',
  observaciones: '',
  kilometrajeActual: '',
  aireAcondicionado: 'true',
  precioBaseDia: '',
  imagenUrl: '',
  estado: 'ACT',
};

const initialFilters = {
  idMarca: '',
  idCategoria: '',
  idLocalizacion: '',
  precioMin: '',
  precioMax: '',
  fechaInicio: '',
  fechaFin: '',
  estado: '',
  tipoTransmision: '',
  tipoCombustible: '',
  capacidadMinPasajeros: '',
  aireAcondicionado: '',
  modelo: '',
  placa: '',
  pagina: 1,
  tamano: 10,
};

function normalizeMarca(item) {
  return {
    id: item?.id ?? '',
    nombre: item?.nombre ?? item?.nombreMarca ?? '',
  };
}

function normalizeCategoria(item) {
  return {
    id: item?.id ?? '',
    nombre: item?.nombre ?? item?.nombreCategoria ?? '',
  };
}

function normalizeLocalizacion(item) {
  return {
    id: item?.id ?? '',
    nombre: item?.nombre ?? '',
  };
}

function normalizeVehiculo(item) {
  return {
    id: item?.id ?? '',
    guid: item?.guid ?? '',
    codigoInterno: item?.codigoInterno ?? '',
    placa: item?.placa ?? '',
    idMarca: item?.idMarca ?? '',
    idCategoria: item?.idCategoria ?? '',
    idLocalizacion: item?.idLocalizacion ?? '',
    modelo: item?.modelo ?? '',
    anioFabricacion: item?.anioFabricacion ?? '',
    color: item?.color ?? '',
    tipoCombustible: item?.tipoCombustible ?? '',
    tipoTransmision: item?.tipoTransmision ?? '',
    capacidadPasajeros: item?.capacidadPasajeros ?? '',
    capacidadMaletas: item?.capacidadMaletas ?? '',
    numeroPuertas: item?.numeroPuertas ?? '',
    aireAcondicionado: Boolean(item?.aireAcondicionado),
    precioBaseDia: Number(item?.precioBaseDia ?? 0),
    kilometrajeActual: item?.kilometrajeActual ?? 0,
    observaciones: item?.observaciones ?? '',
    imagenUrl: item?.imagenUrl ?? '',
    estado: item?.estado ?? '',
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
    items: Array.isArray(items) ? items.map(normalizeVehiculo) : [],
    total: Number(total) || 0,
    page: Number(currentPage) || 1,
    pageSize: Number(pageSize) || 10,
  };
}

function extractItem(response) {
  return response?.data ? normalizeVehiculo(response.data) : null;
}

function buildFiltersPayload(filters) {
  return {
    ...(filters.idMarca ? { idMarca: Number(filters.idMarca) } : {}),
    ...(filters.idCategoria ? { idCategoria: Number(filters.idCategoria) } : {}),
    ...(filters.idLocalizacion ? { idLocalizacion: Number(filters.idLocalizacion) } : {}),
    ...(filters.precioMin !== '' ? { precioMin: Number(filters.precioMin) } : {}),
    ...(filters.precioMax !== '' ? { precioMax: Number(filters.precioMax) } : {}),
    ...(filters.fechaInicio ? { fechaInicio: filters.fechaInicio } : {}),
    ...(filters.fechaFin ? { fechaFin: filters.fechaFin } : {}),
    ...(filters.estado ? { estado: filters.estado } : {}),
    ...(filters.tipoTransmision ? { tipoTransmision: filters.tipoTransmision } : {}),
    ...(filters.tipoCombustible ? { tipoCombustible: filters.tipoCombustible } : {}),
    ...(filters.capacidadMinPasajeros !== ''
      ? { capacidadMinPasajeros: Number(filters.capacidadMinPasajeros) }
      : {}),
    ...(filters.aireAcondicionado !== ''
      ? { aireAcondicionado: filters.aireAcondicionado === 'true' }
      : {}),
    ...(filters.modelo.trim() ? { modelo: filters.modelo.trim() } : {}),
    ...(filters.placa.trim() ? { placa: filters.placa.trim() } : {}),
    pagina: Number(filters.pagina) || 1,
    tamano: Number(filters.tamano) || 10,
  };
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('es-EC', {
    style: 'currency',
    currency: 'USD',
  });
}

function VehiculosPage({ onBack }) {
  const [vehiculos, setVehiculos] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [localizaciones, setLocalizaciones] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [filters, setFilters] = useState(initialFilters);
  const [editingId, setEditingId] = useState(null);
  const [selectedVehiculo, setSelectedVehiculo] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formTitle = useMemo(() => (editingId ? 'Editar vehiculo' : 'Crear vehiculo'), [editingId]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize || 1)), [pageSize, total]);

  const getMarcaNombre = (idMarca) =>
    marcas.find((marca) => String(marca.id) === String(idMarca))?.nombre || '-';

  const getCategoriaNombre = (idCategoria) =>
    categorias.find((categoria) => String(categoria.id) === String(idCategoria))?.nombre || '-';

  const getLocalizacionNombre = (idLocalizacion) =>
    localizaciones.find((localizacion) => String(localizacion.id) === String(idLocalizacion))?.nombre || '-';

  const loadCatalogs = async () => {
    const [marcasResponse, categoriasResponse, localizacionesResponse] = await Promise.all([
      listMarcas(),
      listCategorias(),
      listLocalizaciones(),
    ]);

    setMarcas(Array.isArray(marcasResponse?.data) ? marcasResponse.data.map(normalizeMarca) : []);
    setCategorias(
      Array.isArray(categoriasResponse?.data) ? categoriasResponse.data.map(normalizeCategoria) : []
    );
    setLocalizaciones(
      Array.isArray(localizacionesResponse?.data)
        ? localizacionesResponse.data.map(normalizeLocalizacion)
        : []
    );
  };

  const loadVehiculos = async (nextFilters = filters) => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const response = await searchVehiculos(buildFiltersPayload(nextFilters));
      const result = extractPagedItems(response);
      setVehiculos(result.items);
      setTotal(result.total);
      setPage(result.page);
      setPageSize(result.pageSize);
      setStatusMessage(response?.mensaje || 'Vehiculos cargados.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo cargar el listado de vehiculos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVehiculos(initialFilters);
    loadCatalogs().catch((error) => {
      setErrorMessage(error.message || 'No se pudieron cargar los catalogos de vehiculos.');
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

    if (
      !form.placa.trim() ||
      !form.idMarca ||
      !form.idCategoria ||
      !form.idLocalizacion ||
      !form.modelo.trim() ||
      !form.anioFabricacion ||
      !form.color.trim() ||
      !form.capacidadPasajeros ||
      !form.capacidadMaletas ||
      !form.numeroPuertas ||
      !form.kilometrajeActual ||
      !form.precioBaseDia
    ) {
      setErrorMessage('Completa los campos obligatorios del vehiculo.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      const existsResponse = await existsVehiculoPlaca(form.placa.trim());

      if (!editingId && existsResponse?.data) {
        setErrorMessage('Ya existe un vehiculo con esa placa.');
        return;
      }

      const payload = {
        placa: form.placa.trim(),
        idMarca: Number(form.idMarca),
        idCategoria: Number(form.idCategoria),
        idLocalizacion: Number(form.idLocalizacion),
        modelo: form.modelo.trim(),
        anioFabricacion: Number(form.anioFabricacion),
        color: form.color.trim(),
        tipoCombustible: form.tipoCombustible,
        tipoTransmision: form.tipoTransmision,
        capacidadPasajeros: Number(form.capacidadPasajeros),
        capacidadMaletas: Number(form.capacidadMaletas),
        numeroPuertas: Number(form.numeroPuertas),
        observaciones: form.observaciones.trim() || null,
        kilometrajeActual: Number(form.kilometrajeActual),
        aireAcondicionado: form.aireAcondicionado === 'true',
        precioBaseDia: Number(form.precioBaseDia),
        imagenUrl: form.imagenUrl.trim() || null,
        ...(editingId ? { estado: form.estado } : {}),
      };

      if (editingId) {
        await updateVehiculo(editingId, payload);
        setStatusMessage('Vehiculo actualizado correctamente.');
      } else {
        await createVehiculo(payload);
        setStatusMessage('Vehiculo creado correctamente.');
      }

      resetForm();
      const nextFilters = { ...filters, pagina: 1 };
      setFilters(nextFilters);
      await loadVehiculos(nextFilters);
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo guardar el vehiculo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (id) => {
    try {
      setErrorMessage('');
      const response = await getVehiculoById(id);
      const vehiculo = extractItem(response);

      if (!vehiculo) {
        setErrorMessage('No se pudo obtener el vehiculo.');
        return;
      }

      setSelectedVehiculo(vehiculo);
      setEditingId(vehiculo.id);
      setForm({
        placa: vehiculo.placa || '',
        idMarca: vehiculo.idMarca ? String(vehiculo.idMarca) : '',
        idCategoria: vehiculo.idCategoria ? String(vehiculo.idCategoria) : '',
        idLocalizacion: vehiculo.idLocalizacion ? String(vehiculo.idLocalizacion) : '',
        modelo: vehiculo.modelo || '',
        anioFabricacion: vehiculo.anioFabricacion ? String(vehiculo.anioFabricacion) : '',
        color: vehiculo.color || '',
        tipoCombustible: vehiculo.tipoCombustible || 'GASOLINA',
        tipoTransmision: vehiculo.tipoTransmision || 'AUTOMATICA',
        capacidadPasajeros: vehiculo.capacidadPasajeros ? String(vehiculo.capacidadPasajeros) : '',
        capacidadMaletas: vehiculo.capacidadMaletas ? String(vehiculo.capacidadMaletas) : '',
        numeroPuertas: vehiculo.numeroPuertas ? String(vehiculo.numeroPuertas) : '',
        observaciones: vehiculo.observaciones || '',
        kilometrajeActual: String(vehiculo.kilometrajeActual ?? ''),
        aireAcondicionado: vehiculo.aireAcondicionado ? 'true' : 'false',
        precioBaseDia: String(vehiculo.precioBaseDia ?? ''),
        imagenUrl: vehiculo.imagenUrl || '',
        estado: vehiculo.estado || 'ACT',
      });
      setStatusMessage('Vehiculo cargado para edicion.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo obtener el vehiculo.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Seguro que deseas eliminar este vehiculo?')) {
      return;
    }

    try {
      setErrorMessage('');
      await deleteVehiculo(id);
      setStatusMessage('Vehiculo eliminado correctamente.');

      if (editingId === id) {
        resetForm();
      }

      await loadVehiculos(filters);
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo eliminar el vehiculo.');
    }
  };

  const handleSearchByPlaca = async () => {
    if (!filters.placa.trim()) {
      await loadVehiculos(filters);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');
      const response = await getVehiculoByPlaca(filters.placa.trim());
      const vehiculo = response?.data ? normalizeVehiculo(response.data) : null;
      setVehiculos(vehiculo ? [vehiculo] : []);
      setTotal(vehiculo ? 1 : 0);
      setPage(1);
      setStatusMessage(vehiculo ? 'Vehiculo encontrado.' : 'No se encontraron resultados.');
    } catch (error) {
      setVehiculos([]);
      setTotal(0);
      setErrorMessage(error.message || 'No se pudo buscar por placa.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchByMarca = async () => {
    if (!filters.idMarca) {
      await loadVehiculos(filters);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');
      const response = await getVehiculosByMarca(Number(filters.idMarca));
      const items = Array.isArray(response?.data) ? response.data.map(normalizeVehiculo) : [];
      setVehiculos(items);
      setTotal(items.length);
      setPage(1);
      setStatusMessage(items.length ? 'Vehiculos encontrados por marca.' : 'No se encontraron resultados.');
    } catch (error) {
      setVehiculos([]);
      setTotal(0);
      setErrorMessage(error.message || 'No se pudo buscar por marca.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchByCategoria = async () => {
    if (!filters.idCategoria) {
      await loadVehiculos(filters);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');
      const response = await getVehiculosByCategoria(Number(filters.idCategoria));
      const items = Array.isArray(response?.data) ? response.data.map(normalizeVehiculo) : [];
      setVehiculos(items);
      setTotal(items.length);
      setPage(1);
      setStatusMessage(items.length ? 'Vehiculos encontrados por categoria.' : 'No se encontraron resultados.');
    } catch (error) {
      setVehiculos([]);
      setTotal(0);
      setErrorMessage(error.message || 'No se pudo buscar por categoria.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchByPrecio = async () => {
    if (filters.precioMin === '' || filters.precioMax === '') {
      setErrorMessage('Ingresa precio minimo y maximo para esta busqueda.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');
      const response = await getVehiculosByPrecio(filters.precioMin, filters.precioMax);
      const items = Array.isArray(response?.data) ? response.data.map(normalizeVehiculo) : [];
      setVehiculos(items);
      setTotal(items.length);
      setPage(1);
      setStatusMessage(items.length ? 'Vehiculos encontrados por precio.' : 'No se encontraron resultados.');
    } catch (error) {
      setVehiculos([]);
      setTotal(0);
      setErrorMessage(error.message || 'No se pudo buscar por precio.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchDisponibles = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const response = await getVehiculosDisponibles();
      const items = Array.isArray(response?.data) ? response.data.map(normalizeVehiculo) : [];
      setVehiculos(items);
      setTotal(items.length);
      setPage(1);
      setStatusMessage(items.length ? 'Vehiculos disponibles cargados.' : 'No hay vehiculos disponibles.');
    } catch (error) {
      setVehiculos([]);
      setTotal(0);
      setErrorMessage(error.message || 'No se pudieron cargar los vehiculos disponibles.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateKilometraje = async (vehiculo) => {
    const value = window.prompt('Nuevo kilometraje:', String(vehiculo.kilometrajeActual ?? ''));

    if (value === null || value.trim() === '') {
      return;
    }

    try {
      setErrorMessage('');
      await updateVehiculoKilometraje(vehiculo.id, Number(value));
      setStatusMessage('Kilometraje actualizado correctamente.');
      await loadVehiculos(filters);
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo actualizar el kilometraje.');
    }
  };

  const handleUpdateEstado = async (vehiculo) => {
    const value = window.prompt('Nuevo estado:', vehiculo.estado || '');

    if (value === null || !value.trim()) {
      return;
    }

    try {
      setErrorMessage('');
      await updateVehiculoEstado(vehiculo.id, value.trim());
      setStatusMessage('Estado actualizado correctamente.');
      await loadVehiculos(filters);
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo actualizar el estado.');
    }
  };

  const handleFilterSubmit = async () => {
    const nextFilters = { ...filters, pagina: 1 };
    setFilters(nextFilters);
    await loadVehiculos(nextFilters);
  };

  const changePage = async (nextPage) => {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    const nextFilters = { ...filters, pagina: safePage };
    setFilters(nextFilters);
    await loadVehiculos(nextFilters);
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <button className={styles.backButton} type="button" onClick={onBack}>
            Regresar
          </button>
          <h2>Vehiculos</h2>
          <p>Administra vehiculos, filtros de disponibilidad y operaciones especiales del inventario.</p>
        </div>
        <button className={styles.secondaryButton} type="button" onClick={() => loadVehiculos(filters)}>
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
              <span>Marca</span>
              <select className={styles.select} name="idMarca" value={filters.idMarca} onChange={handleFilterChange}>
                <option value="">Todas</option>
                {marcas.map((marca) => (
                  <option key={marca.id} value={marca.id}>
                    {marca.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.fieldCompact}>
              <span>Categoria</span>
              <select className={styles.select} name="idCategoria" value={filters.idCategoria} onChange={handleFilterChange}>
                <option value="">Todas</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.fieldCompact}>
              <span>Localizacion</span>
              <select className={styles.select} name="idLocalizacion" value={filters.idLocalizacion} onChange={handleFilterChange}>
                <option value="">Todas</option>
                {localizaciones.map((localizacion) => (
                  <option key={localizacion.id} value={localizacion.id}>
                    {localizacion.nombre}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.fieldCompact}>
              <span>Placa</span>
              <input className={styles.input} name="placa" type="text" value={filters.placa} onChange={handleFilterChange} />
            </label>

            <label className={styles.fieldCompact}>
              <span>Modelo</span>
              <input className={styles.input} name="modelo" type="text" value={filters.modelo} onChange={handleFilterChange} />
            </label>

            <label className={styles.fieldCompact}>
              <span>Estado</span>
              <input className={styles.input} name="estado" type="text" value={filters.estado} onChange={handleFilterChange} />
            </label>

            <label className={styles.fieldCompact}>
              <span>Combustible</span>
              <select className={styles.select} name="tipoCombustible" value={filters.tipoCombustible} onChange={handleFilterChange}>
                <option value="">Todos</option>
                <option value="GASOLINA">Gasolina</option>
                <option value="DIESEL">Diesel</option>
                <option value="HIBRIDO">Hibrido</option>
                <option value="ELECTRICO">Electrico</option>
              </select>
            </label>

            <label className={styles.fieldCompact}>
              <span>Transmision</span>
              <select className={styles.select} name="tipoTransmision" value={filters.tipoTransmision} onChange={handleFilterChange}>
                <option value="">Todas</option>
                <option value="AUTOMATICA">Automatica</option>
                <option value="MANUAL">Manual</option>
              </select>
            </label>

            <label className={styles.fieldCompact}>
              <span>Pasajeros min.</span>
              <input className={styles.input} name="capacidadMinPasajeros" type="number" min="1" value={filters.capacidadMinPasajeros} onChange={handleFilterChange} />
            </label>

            <label className={styles.fieldCompact}>
              <span>Aire</span>
              <select className={styles.select} name="aireAcondicionado" value={filters.aireAcondicionado} onChange={handleFilterChange}>
                <option value="">Todos</option>
                <option value="true">Si</option>
                <option value="false">No</option>
              </select>
            </label>

            <label className={styles.fieldCompact}>
              <span>Precio min.</span>
              <input className={styles.input} name="precioMin" type="number" min="0" step="0.01" value={filters.precioMin} onChange={handleFilterChange} />
            </label>

            <label className={styles.fieldCompact}>
              <span>Precio max.</span>
              <input className={styles.input} name="precioMax" type="number" min="0" step="0.01" value={filters.precioMax} onChange={handleFilterChange} />
            </label>

            <label className={styles.fieldCompact}>
              <span>Fecha inicio</span>
              <input className={styles.input} name="fechaInicio" type="date" value={filters.fechaInicio} onChange={handleFilterChange} />
            </label>

            <label className={styles.fieldCompact}>
              <span>Fecha fin</span>
              <input className={styles.input} name="fechaFin" type="date" value={filters.fechaFin} onChange={handleFilterChange} />
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
            <button className={styles.secondaryButton} type="button" onClick={handleSearchByPlaca}>
              Buscar placa
            </button>
            <button className={styles.secondaryButton} type="button" onClick={handleSearchByMarca}>
              Por marca
            </button>
            <button className={styles.secondaryButton} type="button" onClick={handleSearchByCategoria}>
              Por categoria
            </button>
            <button className={styles.secondaryButton} type="button" onClick={handleSearchByPrecio}>
              Por precio
            </button>
            <button className={styles.secondaryButton} type="button" onClick={handleSearchDisponibles}>
              Disponibles
            </button>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={() => {
                setFilters(initialFilters);
                loadVehiculos(initialFilters);
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
                  <th>Placa</th>
                  <th>Vehiculo</th>
                  <th>Catalogos</th>
                  <th>Precio</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && vehiculos.length === 0 ? (
                  <tr>
                    <td colSpan="7" className={styles.emptyCell}>
                      No hay datos para mostrar.
                    </td>
                  </tr>
                ) : null}

                {vehiculos.map((vehiculo) => (
                  <tr key={vehiculo.id || vehiculo.guid || vehiculo.placa}>
                    <td>{vehiculo.id || '-'}</td>
                    <td>{vehiculo.placa || '-'}</td>
                    <td>{`${vehiculo.modelo || '-'} ${vehiculo.anioFabricacion || ''}`.trim()}</td>
                    <td>
                      {getMarcaNombre(vehiculo.idMarca)} / {getCategoriaNombre(vehiculo.idCategoria)}
                    </td>
                    <td>{formatMoney(vehiculo.precioBaseDia)}</td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          vehiculo.estado === 'ACT' || vehiculo.estado === 'DISPONIBLE'
                            ? styles.badgeActive
                            : styles.badgeInactive
                        }`}
                      >
                        {vehiculo.estado || '-'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.linkButton} type="button" onClick={() => handleEdit(vehiculo.id)}>
                          Editar
                        </button>
                        <button className={styles.linkButton} type="button" onClick={() => handleUpdateKilometraje(vehiculo)}>
                          Km
                        </button>
                        <button className={styles.linkButton} type="button" onClick={() => handleUpdateEstado(vehiculo)}>
                          Estado
                        </button>
                        <button className={styles.linkDanger} type="button" onClick={() => handleDelete(vehiculo.id)}>
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
            <div className={styles.twoColumns}>
              <label className={styles.field}>
                <span>Placa</span>
                <input className={styles.input} name="placa" type="text" value={form.placa} onChange={handleFormChange} />
              </label>

              <label className={styles.field}>
                <span>Modelo</span>
                <input className={styles.input} name="modelo" type="text" value={form.modelo} onChange={handleFormChange} />
              </label>
            </div>

            <div className={styles.twoColumns}>
              <label className={styles.field}>
                <span>Marca</span>
                <select className={styles.select} name="idMarca" value={form.idMarca} onChange={handleFormChange}>
                  <option value="">Selecciona una marca</option>
                  {marcas.map((marca) => (
                    <option key={marca.id} value={marca.id}>
                      {marca.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Categoria</span>
                <select className={styles.select} name="idCategoria" value={form.idCategoria} onChange={handleFormChange}>
                  <option value="">Selecciona una categoria</option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className={styles.twoColumns}>
              <label className={styles.field}>
                <span>Localizacion</span>
                <select className={styles.select} name="idLocalizacion" value={form.idLocalizacion} onChange={handleFormChange}>
                  <option value="">Selecciona una localizacion</option>
                  {localizaciones.map((localizacion) => (
                    <option key={localizacion.id} value={localizacion.id}>
                      {localizacion.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Anio fabricacion</span>
                <input className={styles.input} name="anioFabricacion" type="number" min="1900" value={form.anioFabricacion} onChange={handleFormChange} />
              </label>
            </div>

            <div className={styles.twoColumns}>
              <label className={styles.field}>
                <span>Color</span>
                <input className={styles.input} name="color" type="text" value={form.color} onChange={handleFormChange} />
              </label>

              <label className={styles.field}>
                <span>Kilometraje</span>
                <input className={styles.input} name="kilometrajeActual" type="number" min="0" value={form.kilometrajeActual} onChange={handleFormChange} />
              </label>
            </div>

            <div className={styles.twoColumns}>
              <label className={styles.field}>
                <span>Combustible</span>
                <select className={styles.select} name="tipoCombustible" value={form.tipoCombustible} onChange={handleFormChange}>
                  <option value="GASOLINA">Gasolina</option>
                  <option value="DIESEL">Diesel</option>
                  <option value="HIBRIDO">Hibrido</option>
                  <option value="ELECTRICO">Electrico</option>
                </select>
              </label>

              <label className={styles.field}>
                <span>Transmision</span>
                <select className={styles.select} name="tipoTransmision" value={form.tipoTransmision} onChange={handleFormChange}>
                  <option value="AUTOMATICA">Automatica</option>
                  <option value="MANUAL">Manual</option>
                </select>
              </label>
            </div>

            <div className={styles.twoColumns}>
              <label className={styles.field}>
                <span>Pasajeros</span>
                <input className={styles.input} name="capacidadPasajeros" type="number" min="1" value={form.capacidadPasajeros} onChange={handleFormChange} />
              </label>

              <label className={styles.field}>
                <span>Maletas</span>
                <input className={styles.input} name="capacidadMaletas" type="number" min="0" value={form.capacidadMaletas} onChange={handleFormChange} />
              </label>
            </div>

            <div className={styles.twoColumns}>
              <label className={styles.field}>
                <span>Puertas</span>
                <input className={styles.input} name="numeroPuertas" type="number" min="1" value={form.numeroPuertas} onChange={handleFormChange} />
              </label>

              <label className={styles.field}>
                <span>Aire acondicionado</span>
                <select className={styles.select} name="aireAcondicionado" value={form.aireAcondicionado} onChange={handleFormChange}>
                  <option value="true">Si</option>
                  <option value="false">No</option>
                </select>
              </label>
            </div>

            <div className={styles.twoColumns}>
              <label className={styles.field}>
                <span>Precio base dia</span>
                <input className={styles.input} name="precioBaseDia" type="number" min="0" step="0.01" value={form.precioBaseDia} onChange={handleFormChange} />
              </label>

              <label className={styles.field}>
                <span>Estado</span>
                <input className={styles.input} name="estado" type="text" value={form.estado} onChange={handleFormChange} disabled={!editingId} />
              </label>
            </div>

            <label className={styles.field}>
              <span>Imagen URL</span>
              <input className={styles.input} name="imagenUrl" type="text" value={form.imagenUrl} onChange={handleFormChange} />
            </label>

            <label className={styles.field}>
              <span>Observaciones</span>
              <textarea className={styles.textarea} name="observaciones" value={form.observaciones} onChange={handleFormChange} />
            </label>

            <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : editingId ? 'Actualizar vehiculo' : 'Crear vehiculo'}
            </button>
          </form>

          {selectedVehiculo ? (
            <div className={styles.detailBox}>
              <h4>Detalle seleccionado</h4>
              <p>
                <strong>Codigo interno:</strong> {selectedVehiculo.codigoInterno || '-'}
              </p>
              <p>
                <strong>Marca:</strong> {getMarcaNombre(selectedVehiculo.idMarca)}
              </p>
              <p>
                <strong>Categoria:</strong> {getCategoriaNombre(selectedVehiculo.idCategoria)}
              </p>
              <p>
                <strong>Localizacion:</strong> {getLocalizacionNombre(selectedVehiculo.idLocalizacion)}
              </p>
              <p>
                <strong>Precio:</strong> {formatMoney(selectedVehiculo.precioBaseDia)}
              </p>
              <p>
                <strong>Kilometraje:</strong> {selectedVehiculo.kilometrajeActual ?? '-'}
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

export default VehiculosPage;
