import { useEffect, useMemo, useState } from 'react';
import {
  createLocalizacion,
  disableLocalizacion,
  existsLocalizacion,
  getLocalizacionById,
  listCiudades,
  listLocalizaciones,
  updateLocalizacion,
} from '../../api/services/api';
import styles from '../shared/CrudPage.module.css';

const initialForm = {
  nombre: '',
  idCiudad: '',
  direccion: '',
  telefono: '',
  correo: '',
  horarioAtencion: '',
  zonaHoraria: '',
};

const initialFilters = {
  nombre: '',
  idCiudad: '',
};

const horarioOptions = [
  'L-V 08:00-18:00',
  'L-V 08:00-17:00',
  'L-V 08:00-20:00',
  'L-D 06:00-22:00',
  'L-D 08:00-20:00',
  'L-S 08:00-18:00',
  'L-S 09:00-17:00',
];

const zonaHorariaOptions = [
  { value: 'America/Guayaquil', label: 'America/Guayaquil (Ecuador)' },
  { value: 'America/Bogota', label: 'America/Bogota (Colombia)' },
  { value: 'America/Lima', label: 'America/Lima (Peru)' },
  { value: 'America/Mexico_City', label: 'America/Mexico_City (Mexico)' },
  { value: 'America/New_York', label: 'America/New_York (Estados Unidos Este)' },
  { value: 'Europe/Madrid', label: 'Europe/Madrid (Espana)' },
  { value: 'UTC', label: 'UTC (Tiempo universal coordinado)' },
];

function normalizeCiudad(item) {
  return {
    id: item?.id ?? item?.idCiudad ?? '',
    nombre: item?.nombre ?? item?.nombreCiudad ?? '',
  };
}

function normalizeLocalizacion(item) {
  return {
    id: item?.id ?? '',
    guid: item?.guid ?? '',
    codigo: item?.codigo ?? '',
    nombre: item?.nombre ?? '',
    idCiudad: item?.idCiudad ?? '',
    direccion: item?.direccion ?? '',
    telefono: item?.telefono ?? '',
    correo: item?.correo ?? '',
    horarioAtencion: item?.horarioAtencion ?? '',
    zonaHoraria: item?.zonaHoraria ?? '',
    estado: item?.estado ?? 'ACT',
  };
}

function extractList(response) {
  const list = Array.isArray(response?.data) ? response.data : [];
  return list.map(normalizeLocalizacion);
}

function extractItem(response) {
  const item = response?.data;

  if (Array.isArray(item)) {
    return item.length ? normalizeLocalizacion(item[0]) : null;
  }

  return item ? normalizeLocalizacion(item) : null;
}

function LocalizacionesPage({ onBack }) {
  const [allLocalizaciones, setAllLocalizaciones] = useState([]);
  const [localizaciones, setLocalizaciones] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [filters, setFilters] = useState(initialFilters);
  const [editingId, setEditingId] = useState(null);
  const [selectedLocalizacion, setSelectedLocalizacion] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formTitle = useMemo(
    () => (editingId ? 'Editar localizacion' : 'Crear localizacion'),
    [editingId]
  );

  const getCiudadNombre = (idCiudad) =>
    ciudades.find((ciudad) => String(ciudad.id) === String(idCiudad))?.nombre || '-';

  const loadCiudades = async () => {
    const response = await listCiudades();
    const items = Array.isArray(response?.data) ? response.data.map(normalizeCiudad) : [];
    setCiudades(items);
  };

  const loadLocalizaciones = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const response = await listLocalizaciones();
      const items = extractList(response);
      setAllLocalizaciones(items);
      setLocalizaciones(items);
      setStatusMessage(response?.mensaje || 'Localizaciones cargadas.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo cargar el listado de localizaciones.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLocalizaciones();
    loadCiudades().catch((error) => {
      setErrorMessage(error.message || 'No se pudo cargar el catalogo de ciudades.');
    });
  }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    const nextValue =
      name === 'telefono' ? value.replace(/\D/g, '').slice(0, 10) : value;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: nextValue,
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
      !form.nombre.trim() ||
      !form.idCiudad ||
      !form.direccion.trim() ||
      !form.telefono.trim() ||
      !form.correo.trim() ||
      !form.horarioAtencion.trim() ||
      !form.zonaHoraria.trim()
    ) {
      setErrorMessage('Completa todos los campos obligatorios de la localizacion.');
      return;
    }
    if (!/^\d+$/.test(form.telefono.trim())) {
      setErrorMessage('El telefono solo puede contener numeros.');
      return;
    }
    if (form.telefono.trim().length !== 10) {
      setErrorMessage('El telefono debe tener exactamente 10 digitos.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      const existsResponse = await existsLocalizacion(form.nombre.trim(), Number(form.idCiudad));

      if (!editingId && existsResponse?.data) {
        setErrorMessage('Ya existe una localizacion con ese nombre en la ciudad seleccionada.');
        return;
      }

      const payload = {
        nombre: form.nombre.trim(),
        idCiudad: Number(form.idCiudad),
        direccion: form.direccion.trim(),
        telefono: form.telefono.trim(),
        correo: form.correo.trim(),
        horarioAtencion: form.horarioAtencion.trim(),
        zonaHoraria: form.zonaHoraria.trim(),
      };

      if (editingId) {
        await updateLocalizacion(editingId, payload);
        setStatusMessage('Localizacion actualizada correctamente.');
      } else {
        await createLocalizacion(payload);
        setStatusMessage('Localizacion creada correctamente.');
      }

      resetForm();
      await loadLocalizaciones();
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo guardar la localizacion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (id) => {
    try {
      setErrorMessage('');
      const response = await getLocalizacionById(id);
      const localizacion = extractItem(response);

      if (!localizacion) {
        setErrorMessage('No se pudo obtener la localizacion.');
        return;
      }

      setSelectedLocalizacion(localizacion);
      setEditingId(localizacion.id);
      setForm({
        nombre: localizacion.nombre || '',
        idCiudad: localizacion.idCiudad ? String(localizacion.idCiudad) : '',
        direccion: localizacion.direccion || '',
        telefono: localizacion.telefono || '',
        correo: localizacion.correo || '',
        horarioAtencion: localizacion.horarioAtencion || '',
        zonaHoraria: localizacion.zonaHoraria || '',
      });
      setStatusMessage('Localizacion cargada para edicion.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo obtener la localizacion.');
    }
  };

  const handleDisable = async (id) => {
    if (!window.confirm('Seguro que deseas inhabilitar esta localizacion?')) {
      return;
    }

    try {
      setErrorMessage('');
      await disableLocalizacion(id);
      setStatusMessage('Localizacion inhabilitada correctamente.');

      if (editingId === id) {
        resetForm();
      }

      await loadLocalizaciones();
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo inhabilitar la localizacion.');
    }
  };

  const handleSearch = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const nombreFilter = filters.nombre.trim().toLowerCase();
      const ciudadFilter = filters.idCiudad ? String(filters.idCiudad) : '';

      if (!nombreFilter && !ciudadFilter) {
        await loadLocalizaciones();
        return;
      }

      const filtered = allLocalizaciones.filter((localizacion) => {
        const nombre = String(localizacion.nombre || '').toLowerCase();
        const idCiudad = String(localizacion.idCiudad || '');
        const matchesNombre = !nombreFilter || nombre.startsWith(nombreFilter);
        const matchesCiudad = !ciudadFilter || idCiudad === ciudadFilter;
        return matchesNombre && matchesCiudad;
      });

      setLocalizaciones(filtered);
      setStatusMessage(filtered.length ? 'Busqueda local completada.' : 'No se encontraron coincidencias.');
    } catch (error) {
      setLocalizaciones([]);
      setErrorMessage(error.message || 'No se pudo buscar la localizacion.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <button className={styles.backButton} type="button" onClick={onBack}>
            Regresar
          </button>
          <h2>Localizaciones</h2>
          <p>Administra sucursales, horarios y datos de contacto por ciudad.</p>
        </div>
        <button className={styles.secondaryButton} type="button" onClick={loadLocalizaciones}>
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
            <span>{isLoading ? 'Cargando...' : `${localizaciones.length} registro(s)`}</span>
          </div>

          <div className={styles.searchRow}>
            <input
              className={styles.input}
              name="nombre"
              type="text"
              value={filters.nombre}
              placeholder="Buscar por nombre"
              onChange={handleFilterChange}
            />
            <select
              className={styles.select}
              name="idCiudad"
              value={filters.idCiudad}
              onChange={handleFilterChange}
            >
              <option value="">Filtrar por ciudad</option>
              {ciudades.map((ciudad) => (
                <option key={ciudad.id} value={ciudad.id}>
                  {ciudad.nombre}
                </option>
              ))}
            </select>
            <button className={styles.primaryButton} type="button" onClick={handleSearch}>
              Buscar
            </button>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={() => {
                setFilters(initialFilters);
                loadLocalizaciones();
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
                  <th>Nombre</th>
                  <th>Ciudad</th>
                  <th>Contacto</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && localizaciones.length === 0 ? (
                  <tr>
                    <td colSpan="7" className={styles.emptyCell}>
                      No hay datos para mostrar.
                    </td>
                  </tr>
                ) : null}

                {localizaciones.map((localizacion) => (
                  <tr key={localizacion.id || localizacion.guid || localizacion.codigo}>
                    <td>{localizacion.id || '-'}</td>
                    <td>{localizacion.codigo || '-'}</td>
                    <td>{localizacion.nombre || '-'}</td>
                    <td>{getCiudadNombre(localizacion.idCiudad)}</td>
                    <td>{localizacion.correo || localizacion.telefono || '-'}</td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          localizacion.estado === 'ACT' ? styles.badgeActive : styles.badgeInactive
                        }`}
                      >
                        {localizacion.estado || '-'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={styles.linkButton}
                          type="button"
                          onClick={() => handleEdit(localizacion.id)}
                        >
                          Editar
                        </button>
                        <button
                          className={styles.linkDanger}
                          type="button"
                          onClick={() => handleDisable(localizacion.id)}
                        >
                          Inhabilitar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              <span>Nombre</span>
              <input className={styles.input} name="nombre" type="text" value={form.nombre} onChange={handleFormChange} />
            </label>

            <label className={styles.field}>
              <span>Ciudad</span>
              <select className={styles.select} name="idCiudad" value={form.idCiudad} onChange={handleFormChange}>
                <option value="">Selecciona una ciudad</option>
                {ciudades.map((ciudad) => (
                  <option key={ciudad.id} value={ciudad.id}>
                    {ciudad.nombre}
                  </option>
                ))}
              </select>
            </label>

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
                <span>Correo</span>
                <input className={styles.input} name="correo" type="email" value={form.correo} onChange={handleFormChange} />
              </label>
            </div>

            <div className={styles.twoColumns}>
              <label className={styles.field}>
                <span>Horario</span>
                <select
                  className={styles.select}
                  name="horarioAtencion"
                  value={form.horarioAtencion}
                  onChange={handleFormChange}
                >
                  <option value="">Selecciona un horario</option>
                  {horarioOptions.map((horario) => (
                    <option key={horario} value={horario}>
                      {horario}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Zona horaria</span>
                <select
                  className={styles.select}
                  name="zonaHoraria"
                  value={form.zonaHoraria}
                  onChange={handleFormChange}
                >
                  <option value="">Selecciona una zona horaria</option>
                  {zonaHorariaOptions.map((zona) => (
                    <option key={zona.value} value={zona.value}>
                      {zona.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : editingId ? 'Actualizar localizacion' : 'Crear localizacion'}
            </button>
          </form>

          {selectedLocalizacion ? (
            <div className={styles.detailBox}>
              <h4>Detalle seleccionado</h4>
              <p>
                <strong>Codigo:</strong> {selectedLocalizacion.codigo || '-'}
              </p>
              <p>
                <strong>Ciudad:</strong> {getCiudadNombre(selectedLocalizacion.idCiudad)}
              </p>
              <p>
                <strong>Horario:</strong> {selectedLocalizacion.horarioAtencion || '-'}
              </p>
              <p>
                <strong>Estado:</strong> {selectedLocalizacion.estado || '-'}
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

export default LocalizacionesPage;
