import { useEffect, useMemo, useState } from 'react';
import {
  createVehiculo,
  deleteVehiculo,
  existsVehiculoPlaca,
  getVehiculoById,
  listCategorias,
  listVehiculos,
  listLocalizaciones,
  listMarcas,
  searchVehiculos,
  updateVehiculo,
} from '../../api/services/api';
import styles from '../shared/CrudPage.module.css';

const initialForm = {
  placa: '',
  idMarca: '',
  idCategoria: '',
  idLocalizacion: '',
  modelo: '',
  anioFabricacion: '',
  color: 'BLANCO',
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
};

const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1/dttpkxxxw/image/upload';
const CLOUDINARY_UPLOAD_PRESET = 'budgetcar_imagenes';

const initialFilters = {
  campoBusqueda: 'placa',
  valorBusqueda: '',
  idMarca: '',
  idCategoria: '',
  idLocalizacion: '',
  pagina: 1,
  tamano: 10,
};

const colorOptions = [
  'BLANCO',
  'NEGRO',
  'GRIS',
  'PLATEADO',
  'AZUL',
  'ROJO',
  'VERDE',
  'AMARILLO',
  'CAFE',
  'NARANJA',
];

function normalizeMarca(item) {
  return {
    id: item?.id ?? item?.Id ?? item?.idMarca ?? item?.IdMarca ?? '',
    nombre: item?.nombre ?? item?.Nombre ?? item?.nombreMarca ?? item?.NombreMarca ?? '',
  };
}

function normalizeCategoria(item) {
  return {
    id: item?.id ?? item?.Id ?? item?.idCategoria ?? item?.IdCategoria ?? '',
    nombre:
      item?.nombre ?? item?.Nombre ?? item?.nombreCategoria ?? item?.NombreCategoria ?? '',
  };
}

function normalizeLocalizacion(item) {
  return {
    id: item?.id ?? item?.Id ?? item?.idLocalizacion ?? item?.IdLocalizacion ?? '',
    nombre:
      item?.nombre ?? item?.Nombre ?? item?.nombreLocalizacion ?? item?.NombreLocalizacion ?? '',
  };
}

function normalizeVehiculo(item) {
  return {
    id: item?.id ?? '',
    guid: item?.guid ?? '',
    codigoInterno: item?.codigoInterno ?? '',
    placa: item?.placa ?? '',
    idMarca: item?.idMarca ?? item?.IdMarca ?? '',
    idCategoria: item?.idCategoria ?? item?.IdCategoria ?? '',
    idLocalizacion: item?.idLocalizacion ?? item?.IdLocalizacion ?? '',
    modelo: item?.modelo ?? '',
    anioFabricacion: item?.anioFabricacion ?? item?.AnioFabricacion ?? '',
    color: item?.color ?? '',
    tipoCombustible: item?.tipoCombustible ?? item?.TipoCombustible ?? '',
    tipoTransmision: item?.tipoTransmision ?? item?.TipoTransmision ?? '',
    capacidadPasajeros: item?.capacidadPasajeros ?? item?.CapacidadPasajeros ?? '',
    capacidadMaletas: item?.capacidadMaletas ?? item?.CapacidadMaletas ?? '',
    numeroPuertas: item?.numeroPuertas ?? item?.NumeroPuertas ?? '',
    aireAcondicionado: Boolean(item?.aireAcondicionado),
    precioBaseDia: Number(item?.precioBaseDia ?? item?.PrecioBaseDia ?? 0),
    kilometrajeActual: item?.kilometrajeActual ?? item?.KilometrajeActual ?? 0,
    observaciones: item?.observaciones ?? '',
    imagenUrl: item?.imagenUrl ?? item?.ImagenUrl ?? '',
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
  const searchValue = filters.valorBusqueda.trim();
  const searchField = filters.campoBusqueda;
  const idMarca = Number(filters.idMarca);
  const idCategoria = Number(filters.idCategoria);
  const idLocalizacion = Number(filters.idLocalizacion);

  return {
    ...(Number.isFinite(idMarca) && idMarca > 0 ? { idMarca } : {}),
    ...(Number.isFinite(idCategoria) && idCategoria > 0 ? { idCategoria } : {}),
    ...(Number.isFinite(idLocalizacion) && idLocalizacion > 0 ? { idLocalizacion } : {}),
    ...(searchValue && searchField === 'placa' ? { placa: searchValue } : {}),
    ...(searchValue && searchField === 'modelo' ? { modelo: searchValue } : {}),
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
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const formTitle = useMemo(() => (editingId ? 'Editar vehiculo' : 'Crear vehiculo'), [editingId]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize || 1)), [pageSize, total]);
  const searchPlaceholder = useMemo(
    () => (filters.campoBusqueda === 'modelo' ? 'Buscar por modelo' : 'Buscar por placa'),
    [filters.campoBusqueda]
  );

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
    setSelectedImageFile(null);
    setImagePreviewUrl('');
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

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    setSelectedImageFile(file);
    setImagePreviewUrl(file ? URL.createObjectURL(file) : '');
  };

  const extractCloudinaryPublicId = (url) => {
    const value = String(url || '').trim();
    if (!value) {
      return '';
    }

    const match = value.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+(?:\?.*)?$/);
    return match?.[1] ? decodeURIComponent(match[1]) : '';
  };

  const buildCloudinaryPublicId = (placa) => {
    const normalizedPlaca = String(placa || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '-');
    return normalizedPlaca ? `budget-car/vehiculos/${normalizedPlaca}` : '';
  };

  const uploadImageToCloudinary = async (file, options = {}) => {
    const { existingImageUrl = '', placa = '' } = options;
    const sendUploadRequest = async (publicId = '') => {
      const body = new FormData();
      body.append('file', file);
      body.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      if (publicId) {
        body.append('public_id', publicId);
      }

      const response = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: 'POST',
        body,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error?.message || 'No se pudo subir la imagen a Cloudinary.');
      }

      if (!payload?.secure_url) {
        throw new Error('Cloudinary no devolvio secure_url para la imagen.');
      }

      return payload.secure_url;
    };

    const preferredPublicId = extractCloudinaryPublicId(existingImageUrl) || buildCloudinaryPublicId(placa);

    if (!preferredPublicId) {
      return sendUploadRequest();
    }

    try {
      // En unsigned upload no se permite overwrite; intentamos reutilizar public_id.
      return await sendUploadRequest(preferredPublicId);
    } catch (error) {
      // Si Cloudinary rechaza por conflicto/config, volvemos al comportamiento anterior.
      return sendUploadRequest();
    }
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
    if (!editingId && !selectedImageFile) {
      setErrorMessage('Selecciona una imagen del vehiculo.');
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

      let imagenUrl = form.imagenUrl.trim() || null;
      if (selectedImageFile) {
        setIsUploadingImage(true);
        imagenUrl = await uploadImageToCloudinary(selectedImageFile, {
          existingImageUrl: editingId ? form.imagenUrl : '',
          placa: form.placa,
        });
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
        imagenUrl,
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
      setIsUploadingImage(false);
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
      setSelectedImageFile(null);
      setImagePreviewUrl('');
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

  const changePage = async (nextPage) => {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    const nextFilters = { ...filters, pagina: safePage };
    setFilters(nextFilters);
    await loadVehiculos(nextFilters);
  };

  const handleSearchClick = async () => {
    const nextFilters = { ...filters, pagina: 1 };
    setFilters(nextFilters);

    const idMarca = Number(nextFilters.idMarca);
    const idCategoria = Number(nextFilters.idCategoria);
    const idLocalizacion = Number(nextFilters.idLocalizacion);
    const hasIdFilters =
      (Number.isFinite(idMarca) && idMarca > 0) ||
      (Number.isFinite(idCategoria) && idCategoria > 0) ||
      (Number.isFinite(idLocalizacion) && idLocalizacion > 0);

    // Fallback robusto: filtra por IDs sobre el listado completo.
    if (hasIdFilters) {
      try {
        setIsLoading(true);
        setErrorMessage('');
        const response = await listVehiculos();
        const allItems = Array.isArray(response?.data) ? response.data.map(normalizeVehiculo) : [];
        const searchValue = String(nextFilters.valorBusqueda || '').trim().toLowerCase();
        const searchField = nextFilters.campoBusqueda === 'modelo' ? 'modelo' : 'placa';

        const filtered = allItems.filter((vehiculo) => {
          const matchesMarca = !idMarca || Number(vehiculo.idMarca) === idMarca;
          const matchesCategoria = !idCategoria || Number(vehiculo.idCategoria) === idCategoria;
          const matchesLocalizacion = !idLocalizacion || Number(vehiculo.idLocalizacion) === idLocalizacion;
          const fieldValue = String(vehiculo?.[searchField] || '').toLowerCase();
          const matchesText = !searchValue || fieldValue.includes(searchValue);
          return matchesMarca && matchesCategoria && matchesLocalizacion && matchesText;
        });

        setVehiculos(filtered);
        setTotal(filtered.length);
        setPage(1);
        setPageSize(filtered.length || 10);
        setStatusMessage(filtered.length ? 'Busqueda completada.' : 'No se encontraron resultados.');
        return;
      } catch (error) {
        setErrorMessage(error.message || 'No se pudo completar la busqueda por filtros.');
      } finally {
        setIsLoading(false);
      }
    }

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
          <p>Administra vehiculos con busqueda dinamica y filtros amigables.</p>
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
              <span>Buscar por</span>
              <select className={styles.select} name="campoBusqueda" value={filters.campoBusqueda} onChange={handleFilterChange}>
                <option value="placa">Placa</option>
                <option value="modelo">Modelo</option>
              </select>
            </label>

            <label className={styles.fieldCompact}>
              <span>Valor</span>
              <input
                className={styles.input}
                name="valorBusqueda"
                type="text"
                value={filters.valorBusqueda}
                onChange={handleFilterChange}
                placeholder={searchPlaceholder}
              />
            </label>

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
            <button className={styles.primaryButton} type="button" onClick={handleSearchClick}>
              Buscar
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
                <select className={styles.select} name="color" value={form.color} onChange={handleFormChange}>
                  {colorOptions.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
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

            <label className={styles.field}>
              <span>Precio base dia</span>
              <input className={styles.input} name="precioBaseDia" type="number" min="0" step="0.01" value={form.precioBaseDia} onChange={handleFormChange} />
            </label>

            <label className={styles.field}>
              <span>Imagen</span>
              <input
                className={styles.input}
                name="imagenFile"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
            </label>

            {(imagePreviewUrl || form.imagenUrl) && (
              <div className={styles.field}>
                <span>Vista previa</span>
                <img
                  src={imagePreviewUrl || form.imagenUrl}
                  alt="Vista previa vehiculo"
                  style={{ width: '100%', maxWidth: 280, borderRadius: 10, border: '1px solid #dbe3ee' }}
                />
              </div>
            )}

            <label className={styles.field}>
              <span>Observaciones</span>
              <textarea className={styles.textarea} name="observaciones" value={form.observaciones} onChange={handleFormChange} />
            </label>

            <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
              {isSubmitting || isUploadingImage
                ? isUploadingImage
                  ? 'Subiendo imagen...'
                  : 'Guardando...'
                : editingId
                  ? 'Actualizar vehiculo'
                  : 'Crear vehiculo'}
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
              {selectedVehiculo.imagenUrl ? (
                <p>
                  <strong>Imagen:</strong>
                  <br />
                  <img
                    src={selectedVehiculo.imagenUrl}
                    alt={`Vehiculo ${selectedVehiculo.placa || selectedVehiculo.id}`}
                    style={{ width: '100%', maxWidth: 280, borderRadius: 10, border: '1px solid #dbe3ee' }}
                  />
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

export default VehiculosPage;
