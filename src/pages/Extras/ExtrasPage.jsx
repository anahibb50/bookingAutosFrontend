import { useEffect, useMemo, useState } from 'react';
import {
  createExtra,
  deleteExtra,
  getExtraById,
  getExtrasByNombre,
  getStoredSession,
  listExtras,
  listExtrasActivos,
  sessionHasRole,
  updateExtra,
  updateExtraPrecio,
} from '../../api/services/api';
import styles from '../shared/CrudPage.module.css';

const initialForm = {
  nombre: '',
  descripcion: '',
  valorFijo: '',
};

function normalizeExtra(item) {
  return {
    id: item?.id ?? '',
    codigo: item?.codigo ?? '',
    nombre: item?.nombre ?? '',
    descripcion: item?.descripcion ?? '',
    valorFijo: item?.valorFijo ?? item?.precio ?? 0,
    estado: item?.estado ?? 'ACT',
  };
}

function extractList(response) {
  const list = Array.isArray(response?.data) ? response.data : [];
  return list.map(normalizeExtra);
}

function extractItem(response) {
  return response?.data ? normalizeExtra(response.data) : null;
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
}

function ExtrasPage({ onBack }) {
  const session = useMemo(() => getStoredSession(), []);
  const isAdmin = useMemo(() => sessionHasRole('ADMIN', session), [session]);
  const [extras, setExtras] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [selectedExtra, setSelectedExtra] = useState(null);
  const [searchMode, setSearchMode] = useState('todos');
  const [searchValue, setSearchValue] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);

  const formTitle = useMemo(() => (editingId ? 'Editar extra' : 'Crear extra'), [editingId]);

  const loadExtras = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const response = await listExtras();
      setExtras(extractList(response));
      setStatusMessage(response?.mensaje || 'Extras cargados.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo cargar el listado de extras.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExtras();
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

    if (!form.nombre.trim() || !form.descripcion.trim() || form.valorFijo === '') {
      setErrorMessage('Nombre, descripcion y valor fijo son obligatorios.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      const payload = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim(),
        valorFijo: editingId ? Number(selectedExtra?.valorFijo ?? 0) : Number(form.valorFijo),
      };

      if (editingId) {
        await updateExtra(editingId, payload);
        setStatusMessage('Extra actualizado correctamente.');
      } else {
        await createExtra(payload);
        setStatusMessage('Extra creado correctamente.');
      }

      resetForm();
      await loadExtras();
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo guardar el extra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (id) => {
    try {
      setErrorMessage('');
      const response = await getExtraById(id);
      const extra = extractItem(response);

      if (!extra) {
        setErrorMessage('No se pudo obtener el extra.');
        return;
      }

      setSelectedExtra(extra);
      setEditingId(extra.id);
      setForm({
        nombre: extra.nombre,
        descripcion: extra.descripcion,
        valorFijo: String(extra.valorFijo ?? ''),
      });
      setStatusMessage('Extra cargado para edicion.');
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo obtener el extra.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Seguro que deseas eliminar este extra?')) {
      return;
    }

    try {
      setErrorMessage('');
      await deleteExtra(id);
      setStatusMessage('Extra eliminado correctamente.');

      if (editingId === id) {
        resetForm();
      }

      await loadExtras();
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo eliminar el extra.');
    }
  };

  const handleQuickPriceUpdate = async () => {
    if (!editingId) {
      setErrorMessage('Selecciona primero un extra para actualizar solo el precio.');
      return;
    }

    const nextPrice = window.prompt(
      'Ingresa el nuevo precio del extra:',
      String(form.valorFijo || selectedExtra?.valorFijo || '')
    );

    if (nextPrice === null) {
      return;
    }

    const normalizedPrice = String(nextPrice).trim();

    if (normalizedPrice === '') {
      setErrorMessage('Ingresa un nuevo precio antes de actualizar.');
      return;
    }

    const numericPrice = Number(normalizedPrice);

    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      setErrorMessage('Ingresa un precio valido mayor o igual a cero.');
      return;
    }

    try {
      setIsUpdatingPrice(true);
      setErrorMessage('');
      await updateExtraPrecio(editingId, numericPrice);
      setForm((currentForm) => ({
        ...currentForm,
        valorFijo: String(numericPrice),
      }));
      setStatusMessage('Precio del extra actualizado correctamente.');
      await loadExtras();
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo actualizar el precio.');
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  const handleSearch = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');

      if (searchMode === 'todos') {
        if (!searchValue.trim()) {
          await loadExtras();
          return;
        }

        const response = await getExtrasByNombre(searchValue.trim());
        const items = extractList(response);
        setExtras(items);
        setStatusMessage(items.length ? 'Busqueda completada.' : 'No se encontraron resultados.');
        return;
      }

      if (searchMode === 'activos') {
        const response = await listExtrasActivos();
        setExtras(extractList(response));
        setStatusMessage('Mostrando extras activos.');
        return;
      }

      if (!searchValue.trim()) {
        setErrorMessage('Ingresa un nombre para buscar.');
        return;
      }

      const response = await getExtrasByNombre(searchValue.trim());
      const items = extractList(response);
      setExtras(items);
      setStatusMessage(items.length ? 'Busqueda completada.' : 'No se encontraron resultados.');
    } catch (error) {
      setExtras([]);
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
          <h2>Extras</h2>
          <p>Gestiona extras, precios fijos y su estado operativo.</p>
        </div>
        <button className={styles.secondaryButton} type="button" onClick={loadExtras}>
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
            <span>{isLoading ? 'Cargando...' : `${extras.length} registro(s)`}</span>
          </div>

          <div className={styles.searchRow}>
            <select
              className={styles.select}
              value={searchMode}
              onChange={(event) => setSearchMode(event.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="activos">Solo activos</option>
              <option value="nombre">Buscar por nombre</option>
            </select>
            <input
              className={styles.input}
              type="text"
              value={searchValue}
              placeholder="Nombre del extra"
              onChange={(event) => {
                setSearchValue(event.target.value);

                if (searchMode !== 'nombre' && event.target.value.trim()) {
                  setSearchMode('nombre');
                }
              }}
            />
            <button className={styles.primaryButton} type="button" onClick={handleSearch}>
              Aplicar
            </button>
            <button
              className={styles.secondaryButton}
              type="button"
              onClick={() => {
                setSearchMode('todos');
                setSearchValue('');
                loadExtras();
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
                  <th>Precio</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && extras.length === 0 ? (
                  <tr>
                    <td colSpan="6" className={styles.emptyCell}>
                      No hay datos para mostrar.
                    </td>
                  </tr>
                ) : null}

                {extras.map((extra) => (
                  <tr key={extra.id || `${extra.codigo}-${extra.nombre}`}>
                    <td>{extra.id || '-'}</td>
                    <td>{extra.codigo || '-'}</td>
                    <td>{extra.nombre || '-'}</td>
                    <td>{formatCurrency(extra.valorFijo)}</td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          extra.estado === 'ACT' ? styles.badgeActive : styles.badgeInactive
                        }`}
                      >
                        {extra.estado || '-'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={styles.linkButton}
                          type="button"
                          onClick={() => handleEdit(extra.id)}
                        >
                          Editar
                        </button>
                        <button
                          className={styles.linkDanger}
                          type="button"
                          onClick={() => handleDelete(extra.id)}
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
                placeholder="Ej. GPS"
              />
            </label>

            <label className={styles.field}>
              <span>Descripcion</span>
              <textarea
                className={styles.textarea}
                name="descripcion"
                value={form.descripcion}
                onChange={handleChange}
                placeholder="Detalle del extra"
              />
            </label>

            <div className={styles.twoColumns}>
              <label className={styles.field}>
                <span>Valor fijo</span>
                <input
                  className={styles.input}
                  name="valorFijo"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valorFijo}
                  onChange={handleChange}
                  placeholder="0.00"
                  disabled={Boolean(editingId)}
                />
              </label>
            </div>

            <div className={styles.inlineActions}>
              <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : editingId ? 'Actualizar extra' : 'Crear extra'}
              </button>

              {isAdmin ? (
                <button
                  className={styles.secondaryButton}
                  type="button"
                  disabled={!editingId || isUpdatingPrice}
                  onClick={handleQuickPriceUpdate}
                >
                  {isUpdatingPrice ? 'Actualizando precio...' : 'Actualizar solo precio'}
                </button>
              ) : null}
            </div>
          </form>

          {selectedExtra ? (
            <div className={styles.detailBox}>
              <h4>Detalle seleccionado</h4>
              <p>
                <strong>Codigo:</strong> {selectedExtra.codigo || '-'}
              </p>
              <p>
                <strong>Nombre:</strong> {selectedExtra.nombre || '-'}
              </p>
              <p>
                <strong>Precio:</strong> {formatCurrency(selectedExtra.valorFijo)}
              </p>
              <p>
                <strong>Estado:</strong> {selectedExtra.estado || '-'}
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

export default ExtrasPage;
