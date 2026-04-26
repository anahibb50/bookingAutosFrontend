import { useEffect, useMemo, useState } from 'react';
import {
  createCategoria,
  deleteCategoria,
  existsCategoriaNombre,
  getCategoriaById,
  listCategorias,
  updateCategoria,
} from '../../api/services/api';
import styles from '../shared/CrudPage.module.css';

const initialForm = {
  nombre: '',
};

function normalizeCategoria(item) {
  return {
    id: item?.id ?? '',
    nombre: item?.nombre ?? item?.nombreCategoria ?? '',
  };
}

function extractList(response) {
  const list = Array.isArray(response?.data) ? response.data : [];
  return list.map(normalizeCategoria);
}

function extractItem(response) {
  return response?.data ? normalizeCategoria(response.data) : null;
}

function CategoriasPage({ onBack }) {
  const [categorias, setCategorias] = useState([]);
  const [filteredCategorias, setFilteredCategorias] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formTitle = useMemo(
    () => (editingId ? 'Editar categoria' : 'Crear categoria'),
    [editingId]
  );

  const loadCategorias = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const response = await listCategorias();
      const items = extractList(response);
      setCategorias(items);
      setFilteredCategorias(items);
      setStatusMessage(response?.mensaje || 'Categorias cargadas.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo cargar el listado de categorias.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategorias();
  }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.nombre.trim()) {
      setErrorMessage('El nombre de la categoria es obligatorio.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      const existsResponse = await existsCategoriaNombre(form.nombre.trim());

      if (!editingId && existsResponse?.data) {
        setErrorMessage('Ya existe una categoria con ese nombre.');
        return;
      }

      const payload = {
        nombreCategoria: form.nombre.trim(),
      };

      if (editingId) {
        await updateCategoria(editingId, payload);
        setStatusMessage('Categoria actualizada correctamente.');
      } else {
        await createCategoria(payload);
        setStatusMessage('Categoria creada correctamente.');
      }

      resetForm();
      await loadCategorias();
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo guardar la categoria.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (id) => {
    try {
      setErrorMessage('');
      const response = await getCategoriaById(id);
      const categoria = extractItem(response);

      if (!categoria) {
        setErrorMessage('No se pudo obtener la categoria.');
        return;
      }

      setSelectedCategoria(categoria);
      setEditingId(categoria.id);
      setForm({ nombre: categoria.nombre });
      setStatusMessage('Categoria cargada para edicion.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo obtener la categoria.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Seguro que deseas eliminar esta categoria?')) {
      return;
    }

    try {
      setErrorMessage('');
      await deleteCategoria(id);
      setStatusMessage('Categoria eliminada correctamente.');

      if (editingId === id) {
        resetForm();
      }

      await loadCategorias();
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo eliminar la categoria.');
    }
  };

  const handleSearch = () => {
    const value = searchValue.trim().toLowerCase();

    if (!value) {
      setFilteredCategorias(categorias);
      return;
    }

    const filtered = categorias.filter((categoria) =>
      categoria.nombre.toLowerCase().includes(value)
    );

    setFilteredCategorias(filtered);
    setStatusMessage(filtered.length ? 'Busqueda local completada.' : 'No se encontraron coincidencias.');
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <button className={styles.backButton} type="button" onClick={onBack}>
            Regresar
          </button>
          <h2>Categorias</h2>
          <p>Administra el catalogo de categorias usando el contrato del backend.</p>
        </div>
        <button className={styles.secondaryButton} type="button" onClick={loadCategorias}>
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
            <span>{isLoading ? 'Cargando...' : `${filteredCategorias.length} registro(s)`}</span>
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
                setFilteredCategorias(categorias);
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
                {!isLoading && filteredCategorias.length === 0 ? (
                  <tr>
                    <td colSpan="3" className={styles.emptyCell}>
                      No hay datos para mostrar.
                    </td>
                  </tr>
                ) : null}

                {filteredCategorias.map((categoria) => (
                  <tr key={categoria.id || categoria.nombre}>
                    <td>{categoria.id || '-'}</td>
                    <td>{categoria.nombre || '-'}</td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={styles.linkButton}
                          type="button"
                          onClick={() => handleEdit(categoria.id)}
                        >
                          Editar
                        </button>
                        <button
                          className={styles.linkDanger}
                          type="button"
                          onClick={() => handleDelete(categoria.id)}
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
              <span>Nombre categoria</span>
              <input
                className={styles.input}
                name="nombre"
                type="text"
                value={form.nombre}
                onChange={(event) => setForm({ nombre: event.target.value })}
                placeholder="Ej. SUV"
              />
            </label>

            <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : editingId ? 'Actualizar categoria' : 'Crear categoria'}
            </button>
          </form>

          {selectedCategoria ? (
            <div className={styles.detailBox}>
              <h4>Detalle seleccionado</h4>
              <p>
                <strong>ID:</strong> {selectedCategoria.id || '-'}
              </p>
              <p>
                <strong>Nombre:</strong> {selectedCategoria.nombre || '-'}
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

export default CategoriasPage;
