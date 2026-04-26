import { useEffect, useMemo, useState } from 'react';
import {
  createCiudad,
  deleteCiudad,
  existsCiudad,
  getCiudadById,
  getCiudadesByPais,
  listCiudades,
  listPaises,
  updateCiudad,
} from '../../api/services/api';
import styles from './CiudadesPage.module.css';

const initialForm = {
  nombreCiudad: '',
  codigoPostal: '',
  idPais: '',
};

function normalizeCiudad(item) {
  return {
    id: item?.id ?? item?.Id ?? '',
    nombre: item?.nombre ?? item?.Nombre ?? item?.nombreCiudad ?? '',
    codigoPostal: item?.codigoPostal ?? item?.CodigoPostal ?? '',
    idPais: item?.idPais ?? item?.IdPais ?? '',
    estado: item?.estado ?? item?.Estado ?? '',
    raw: item,
  };
}

function normalizePais(item) {
  return {
    id: item?.id ?? '',
    nombre: item?.nombre ?? '',
  };
}

function extractList(response, mapper) {
  const list = Array.isArray(response?.data) ? response.data : [];
  return list.map(mapper);
}

function extractItem(response, mapper) {
  return response?.data ? mapper(response.data) : null;
}

function extractBoolean(response) {
  return Boolean(response?.data);
}

function keepOnlyDigits(value) {
  return String(value ?? '').replace(/\D+/g, '');
}

function CiudadesPage({ onBack }) {
  const [ciudades, setCiudades] = useState([]);
  const [paises, setPaises] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [searchPaisId, setSearchPaisId] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formTitle = useMemo(() => (editingId ? 'Editar ciudad' : 'Crear ciudad'), [editingId]);

  const loadPaisesForSelect = async () => {
    const response = await listPaises();
    setPaises(extractList(response, normalizePais));
  };

  const loadCiudades = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const response = await listCiudades();
      setCiudades(extractList(response, normalizeCiudad));
      setStatusMessage(response?.mensaje || 'Ciudades cargadas.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo cargar el listado de ciudades.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCiudades();
    loadPaisesForSelect().catch((error) => {
      setErrorMessage(error.message || 'No se pudo cargar el catalogo de paises.');
    });
  }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const getPaisNombre = (idPais) => {
    return paises.find((pais) => String(pais.id) === String(idPais))?.nombre || '-';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.nombreCiudad.trim() || !form.idPais) {
      setErrorMessage('Nombre de ciudad e idPais son obligatorios.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      const existsResponse = await existsCiudad(form.nombreCiudad.trim(), form.idPais);

      if (!editingId && extractBoolean(existsResponse)) {
        setErrorMessage('Ya existe una ciudad con ese nombre para el pais seleccionado.');
        return;
      }

      const payload = {
        nombreCiudad: form.nombreCiudad.trim(),
        codigoPostal: keepOnlyDigits(form.codigoPostal) || null,
        idPais: Number(form.idPais),
      };

      if (editingId) {
        await updateCiudad(editingId, payload);
        setStatusMessage('Ciudad actualizada correctamente.');
      } else {
        await createCiudad(payload);
        setStatusMessage('Ciudad creada correctamente.');
      }

      resetForm();
      await loadCiudades();
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo guardar la ciudad.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (id) => {
    try {
      const response = await getCiudadById(id);
      const ciudad = extractItem(response, normalizeCiudad);

      if (!ciudad) {
        setErrorMessage('No se pudo obtener la ciudad.');
        return;
      }

      setEditingId(ciudad.id);
      setForm({
        nombreCiudad: ciudad.nombre,
        codigoPostal: ciudad.codigoPostal || '',
        idPais: ciudad.idPais ? String(ciudad.idPais) : '',
      });
      setStatusMessage('Ciudad cargada para edicion.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo obtener la ciudad.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta ciudad?')) {
      return;
    }

    try {
      await deleteCiudad(id);
      setStatusMessage('Ciudad eliminada correctamente.');

      if (editingId === id) {
        resetForm();
      }

      await loadCiudades();
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo eliminar la ciudad.');
    }
  };

  const handleFilterByPais = async () => {
    if (!searchPaisId) {
      await loadCiudades();
      return;
    }

    try {
      setIsLoading(true);
      const response = await getCiudadesByPais(searchPaisId);
      setCiudades(extractList(response, normalizeCiudad));
      setStatusMessage('Filtro aplicado por pais.');
    } catch (error) {
      setCiudades([]);
      setErrorMessage(error.message || 'No se pudo filtrar por pais.');
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
          <h2>Ciudades</h2>
          <p>Gestiona ciudades y su relacion con paises.</p>
        </div>
        <button className={styles.secondaryButton} type="button" onClick={loadCiudades}>
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
            <span>{isLoading ? 'Cargando...' : `${ciudades.length} registro(s)`}</span>
          </div>

          <div className={styles.searchRow}>
            <select
              className={styles.select}
              value={searchPaisId}
              onChange={(event) => setSearchPaisId(event.target.value)}
            >
              <option value="">Filtrar por pais</option>
              {paises.map((pais) => (
                <option key={pais.id} value={pais.id}>
                  {pais.nombre}
                </option>
              ))}
            </select>
            <button className={styles.primaryButton} type="button" onClick={handleFilterByPais}>
              Filtrar
            </button>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={() => {
                setSearchPaisId('');
                loadCiudades();
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
                  <th>Codigo Postal</th>
                  <th>Pais</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && ciudades.length === 0 ? (
                  <tr>
                    <td colSpan="6" className={styles.emptyCell}>
                      No hay datos para mostrar.
                    </td>
                  </tr>
                ) : null}

                {ciudades.map((ciudad) => (
                  <tr key={ciudad.id || `${ciudad.nombre}-${ciudad.idPais}`}>
                    <td>{ciudad.id || '-'}</td>
                    <td>{ciudad.nombre || '-'}</td>
                    <td>{ciudad.codigoPostal || '-'}</td>
                    <td>{getPaisNombre(ciudad.idPais)}</td>
                    <td>{ciudad.estado || '-'}</td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.linkButton} type="button" onClick={() => handleEdit(ciudad.id)}>
                          Editar
                        </button>
                        <button className={styles.linkDanger} type="button" onClick={() => handleDelete(ciudad.id)}>
                          Eliminar
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
              <span>Nombre ciudad</span>
              <input
                className={styles.input}
                name="nombreCiudad"
                type="text"
                value={form.nombreCiudad}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    nombreCiudad: event.target.value,
                  }))
                }
                placeholder="Nombre de la ciudad"
              />
            </label>

            <label className={styles.field}>
              <span>Codigo postal</span>
              <input
                className={styles.input}
                name="codigoPostal"
                type="text"
                inputMode="numeric"
                value={form.codigoPostal}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    codigoPostal: keepOnlyDigits(event.target.value),
                  }))
                }
                placeholder="Codigo postal"
              />
            </label>

            <label className={styles.field}>
              <span>Pais</span>
              <select
                className={styles.select}
                name="idPais"
                value={form.idPais}
                onChange={(event) =>
                  setForm((currentForm) => ({
                    ...currentForm,
                    idPais: event.target.value,
                  }))
                }
              >
                <option value="">Selecciona un pais</option>
                {paises.map((pais) => (
                  <option key={pais.id} value={pais.id}>
                    {pais.nombre}
                  </option>
                ))}
              </select>
            </label>

            <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : editingId ? 'Actualizar ciudad' : 'Crear ciudad'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default CiudadesPage;
