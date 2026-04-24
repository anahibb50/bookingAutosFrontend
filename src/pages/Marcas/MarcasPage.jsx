import { useEffect, useMemo, useState } from 'react';
import {
  createMarca,
  deleteMarca,
  existsMarcaNombre,
  getMarcaById,
  getMarcaByNombre,
  listMarcas,
  updateMarca,
} from '../../api/services/api';
import styles from './MarcasPage.module.css';

const initialForm = {
  nombre: '',
};

function normalizeMarca(item) {
  return {
    id: item?.id ?? '',
    nombre: item?.nombre ?? '',
    raw: item,
  };
}

function extractList(response) {
  const list = Array.isArray(response?.data) ? response.data : [];
  return list.map(normalizeMarca);
}

function extractItem(response) {
  return response?.data ? normalizeMarca(response.data) : null;
}

function extractBoolean(response) {
  return Boolean(response?.data);
}

function MarcasPage({ onBack }) {
  const [marcas, setMarcas] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formTitle = useMemo(() => (editingId ? 'Editar marca' : 'Crear marca'), [editingId]);

  const loadMarcas = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const response = await listMarcas();
      setMarcas(extractList(response));
      setStatusMessage(response?.mensaje || 'Marcas cargadas.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo cargar el listado de marcas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMarcas();
  }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.nombre.trim()) {
      setErrorMessage('El nombre es obligatorio.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      const existsResponse = await existsMarcaNombre(form.nombre.trim());

      if (!editingId && extractBoolean(existsResponse)) {
        setErrorMessage('Ya existe una marca con ese nombre.');
        return;
      }

      const payload = {
        nombre: form.nombre.trim(),
      };

      if (editingId) {
        await updateMarca(editingId, payload);
        setStatusMessage('Marca actualizada correctamente.');
      } else {
        await createMarca(payload);
        setStatusMessage('Marca creada correctamente.');
      }

      resetForm();
      await loadMarcas();
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo guardar la marca.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (id) => {
    try {
      const response = await getMarcaById(id);
      const marca = extractItem(response);

      if (!marca) {
        setErrorMessage('No se pudo obtener la marca.');
        return;
      }

      setEditingId(marca.id);
      setForm({ nombre: marca.nombre });
      setStatusMessage('Marca cargada para edicion.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo obtener la marca.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta marca?')) {
      return;
    }

    try {
      await deleteMarca(id);
      setStatusMessage('Marca eliminada correctamente.');

      if (editingId === id) {
        resetForm();
      }

      await loadMarcas();
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo eliminar la marca.');
    }
  };

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      await loadMarcas();
      return;
    }

    try {
      setIsLoading(true);
      const response = await getMarcaByNombre(searchValue.trim());
      const marca = extractItem(response);
      setMarcas(marca ? [marca] : []);
      setStatusMessage(marca ? 'Busqueda completada.' : 'No se encontraron resultados.');
    } catch (error) {
      setMarcas([]);
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
          <h2>Marcas</h2>
          <p>Gestiona las marcas registradas en el catalogo.</p>
        </div>
        <button className={styles.secondaryButton} type="button" onClick={loadMarcas}>
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
            <span>{isLoading ? 'Cargando...' : `${marcas.length} registro(s)`}</span>
          </div>

          <div className={styles.searchRow}>
            <input
              className={styles.input}
              type="text"
              value={searchValue}
              placeholder="Buscar por nombre"
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
                loadMarcas();
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
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && marcas.length === 0 ? (
                  <tr>
                    <td colSpan="3" className={styles.emptyCell}>
                      No hay datos para mostrar.
                    </td>
                  </tr>
                ) : null}

                {marcas.map((marca) => (
                  <tr key={marca.id || marca.nombre}>
                    <td>{marca.id || '-'}</td>
                    <td>{marca.nombre || '-'}</td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.linkButton} type="button" onClick={() => handleEdit(marca.id)}>
                          Editar
                        </button>
                        <button className={styles.linkDanger} type="button" onClick={() => handleDelete(marca.id)}>
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
                onChange={(event) => setForm({ nombre: event.target.value })}
                placeholder="Nombre de la marca"
              />
            </label>

            <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : editingId ? 'Actualizar marca' : 'Crear marca'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

export default MarcasPage;
