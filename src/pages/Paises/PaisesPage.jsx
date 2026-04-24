import { useEffect, useMemo, useState } from 'react';
import {
  createPais,
  deletePais,
  existsPaisIso,
  existsPaisNombre,
  getPaisById,
  getPaisByIso,
  getPaisByNombre,
  listPaises,
  updatePais,
} from '../../api/services/api';
import styles from './PaisesPage.module.css';

const initialForm = {
  nombre: '',
  codigoIso: '',
};

function normalizePais(item) {
  return {
    id: item?.id ?? item?.idPais ?? item?.paisId ?? '',
    nombre: item?.nombre ?? item?.nombrePais ?? item?.paisNombre ?? '',
    codigoIso: item?.codigoIso ?? item?.codigoISO ?? item?.iso ?? '',
    estado: item?.estado ?? item?.estadoPais ?? (item?.esEliminado ? 'INA' : 'ACT'),
    raw: item,
  };
}

function extractList(response) {
  const list = Array.isArray(response?.data) ? response.data : [];
  return list.map(normalizePais);
}

function extractItem(response) {
  if (!response?.data) {
    return null;
  }

  return normalizePais(response.data);
}

function extractBoolean(response) {
  return Boolean(response?.data);
}

function PaisesPage({ onBack }) {
  const [paises, setPaises] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [selectedPais, setSelectedPais] = useState(null);
  const [searchType, setSearchType] = useState('nombre');
  const [searchValue, setSearchValue] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formTitle = useMemo(() => {
    return editingId ? 'Editar pais' : 'Crear pais';
  }, [editingId]);

  const loadPaises = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const response = await listPaises();
      setPaises(extractList(response));
      setStatusMessage(response?.mensaje || 'Paises cargados.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo cargar el listado de paises.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPaises();
  }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.nombre.trim() || !form.codigoIso.trim()) {
      setErrorMessage('Nombre e ISO son obligatorios.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      const nombreExiste = await existsPaisNombre(form.nombre.trim());
      const isoExiste = await existsPaisIso(form.codigoIso.trim().toUpperCase());

      if (!editingId && extractBoolean(nombreExiste)) {
        setErrorMessage('Ya existe un pais con ese nombre.');
        return;
      }

      if (!editingId && extractBoolean(isoExiste)) {
        setErrorMessage('Ya existe un pais con ese codigo ISO.');
        return;
      }

      const payload = {
        nombre: form.nombre.trim(),
        codigoIso: form.codigoIso.trim().toUpperCase(),
      };

      if (editingId) {
        await updatePais(editingId, payload);
        setStatusMessage('Pais actualizado correctamente.');
      } else {
        await createPais(payload);
        setStatusMessage('Pais creado correctamente.');
      }

      resetForm();
      await loadPaises();
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo guardar el pais.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (id) => {
    try {
      setErrorMessage('');
      const response = await getPaisById(id);
      const pais = extractItem(response);

      if (!pais) {
        setErrorMessage('No se encontraron datos del pais.');
        return;
      }

      setSelectedPais(pais);
      setEditingId(pais.id);
      setForm({
        nombre: pais.nombre,
        codigoIso: pais.codigoIso,
      });
      setStatusMessage('Pais cargado para edicion.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo obtener el pais.');
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm('¿Seguro que deseas eliminar este pais?');

    if (!confirmed) {
      return;
    }

    try {
      setErrorMessage('');
      await deletePais(id);
      setStatusMessage('Pais eliminado correctamente.');

      if (editingId === id) {
        resetForm();
      }

      await loadPaises();
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo eliminar el pais.');
    }
  };

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      await loadPaises();
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');

      const response =
        searchType === 'nombre'
          ? await getPaisByNombre(searchValue.trim())
          : await getPaisByIso(searchValue.trim().toUpperCase());

      const pais = extractItem(response);
      setPaises(pais ? [pais] : []);
      setStatusMessage(pais ? 'Busqueda completada.' : 'No se encontraron resultados.');
    } catch (error) {
      setPaises([]);
      setErrorMessage(error.message || 'No se pudo completar la busqueda.');
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
          <h2>Paises</h2>
          <p>Consulta y administra el catalogo de paises desde el backend.</p>
        </div>
        <button className={styles.secondaryButton} type="button" onClick={loadPaises}>
          Recargar
        </button>
      </div>

      <div className={styles.toolsPanel}>
        <div className={styles.searchGroup}>
          <select
            className={styles.select}
            value={searchType}
            onChange={(event) => setSearchType(event.target.value)}
          >
            <option value="nombre">Buscar por nombre</option>
            <option value="iso">Buscar por ISO</option>
          </select>
          <input
            className={styles.input}
            type="text"
            value={searchValue}
            placeholder={searchType === 'nombre' ? 'Ej. Ecuador' : 'Ej. ECU'}
            onChange={(event) => setSearchValue(event.target.value)}
          />
          <button className={styles.primaryButton} type="button" onClick={handleSearch}>
            Buscar
          </button>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() => {
              setSearchValue('');
              loadPaises();
            }}
          >
            Limpiar
          </button>
        </div>

        {(statusMessage || errorMessage) && (
          <div className={`${styles.message} ${errorMessage ? styles.error : styles.success}`}>
            {errorMessage || statusMessage}
          </div>
        )}
      </div>

      <div className={styles.layout}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3>Listado</h3>
            <span>{isLoading ? 'Cargando...' : `${paises.length} registro(s)`}</span>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>ISO</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && paises.length === 0 ? (
                  <tr>
                    <td colSpan="5" className={styles.emptyCell}>
                      No hay datos para mostrar.
                    </td>
                  </tr>
                ) : null}

                {paises.map((pais) => (
                  <tr key={pais.id || `${pais.nombre}-${pais.codigoIso}`}>
                    <td>{pais.id || '-'}</td>
                    <td>{pais.nombre || '-'}</td>
                    <td>{pais.codigoIso || '-'}</td>
                    <td>{pais.estado || '-'}</td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={styles.linkButton}
                          type="button"
                          onClick={() => handleEdit(pais.id)}
                        >
                          Editar
                        </button>
                        <button
                          className={styles.linkDanger}
                          type="button"
                          onClick={() => handleDelete(pais.id)}
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
              <input
                className={styles.input}
                name="nombre"
                type="text"
                value={form.nombre}
                onChange={handleChange}
                placeholder="Nombre del pais"
              />
            </label>

            <label className={styles.field}>
              <span>Codigo ISO</span>
              <input
                className={styles.input}
                name="codigoIso"
                type="text"
                value={form.codigoIso}
                onChange={handleChange}
                placeholder="ISO"
              />
            </label>

            <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : editingId ? 'Actualizar pais' : 'Crear pais'}
            </button>
          </form>

          {selectedPais ? (
            <div className={styles.detailBox}>
              <h4>Detalle seleccionado</h4>
              <p>
                <strong>ID:</strong> {selectedPais.id || '-'}
              </p>
              <p>
                <strong>Nombre:</strong> {selectedPais.nombre || '-'}
              </p>
              <p>
                <strong>ISO:</strong> {selectedPais.codigoIso || '-'}
              </p>
              <p>
                <strong>Estado:</strong> {selectedPais.estado || '-'}
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

export default PaisesPage;
