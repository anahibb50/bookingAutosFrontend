import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStoredSession, listCiudades, registerRequest } from '../../api/services/api';
import styles from './LoginPage.module.css';

const initialForm = {
  username: '',
  correo: '',
  password: '',
  identificacion: '',
  nombre: '',
  apellido: '',
  idCiudad: '',
  tipoIdentificacion: 'CEDULA',
  telefono: '',
  direccion: '',
  genero: 'M',
};

function sanitizeIdentificacion(value, tipo) {
  if (tipo === 'CEDULA') {
    return value.replace(/\D/g, '').slice(0, 10);
  }
  if (tipo === 'RUC') {
    return value.replace(/\D/g, '').slice(0, 13);
  }
  return value.replace(/[^A-Za-z0-9]/g, '').slice(0, 20);
}

function validateIdentificacion(raw, tipo) {
  const id = String(raw || '').trim();
  if (!id) {
    return 'Ingresa tu identificacion.';
  }
  if (tipo === 'CEDULA') {
    if (!/^\d{10}$/.test(id)) {
      return 'Cedula: exactamente 10 digitos.';
    }
  } else if (tipo === 'RUC') {
    if (!/^\d{13}$/.test(id)) {
      return 'RUC: exactamente 13 digitos.';
    }
  } else if (tipo === 'PASAPORTE') {
    if (id.length < 7 || id.length > 20) {
      return 'Pasaporte: entre 7 y 20 caracteres (letras y numeros).';
    }
    if (!/^[A-Za-z0-9]+$/.test(id)) {
      return 'Pasaporte: solo letras y numeros.';
    }
  }
  return '';
}

function RegisterPage({ onRegisterSuccess, onBack }) {
  const [form, setForm] = useState(initialForm);
  const [ciudades, setCiudades] = useState([]);
  const [errors, setErrors] = useState({});
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await listCiudades();
        const list = Array.isArray(res?.data) ? res.data : [];
        if (!cancelled) {
          setCiudades(list);
          if (list.length === 0) {
            setLoadError('No hay ciudades en el catalogo. No es posible completar el registro hasta que exista al menos una ciudad.');
          }
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e.message || 'No se pudieron cargar las ciudades.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === 'telefono') {
      const digits = value.replace(/\D/g, '').slice(0, 10);
      setForm((c) => ({ ...c, telefono: digits }));
      setErrors((c) => ({ ...c, telefono: '' }));
      setStatusMessage('');
      return;
    }

    if (name === 'tipoIdentificacion') {
      setForm((c) => ({
        ...c,
        tipoIdentificacion: value,
        identificacion: '',
      }));
      setErrors((c) => ({ ...c, tipoIdentificacion: '', identificacion: '' }));
      setStatusMessage('');
      return;
    }

    if (name === 'identificacion') {
      const next = sanitizeIdentificacion(value, form.tipoIdentificacion);
      setForm((c) => ({ ...c, identificacion: next }));
      setErrors((c) => ({ ...c, identificacion: '' }));
      setStatusMessage('');
      return;
    }

    setForm((c) => ({ ...c, [name]: value }));
    setErrors((c) => ({ ...c, [name]: '' }));
    setStatusMessage('');
  };

  const validateForm = () => {
    const next = {};

    const u = form.username.trim();
    if (!u) next.username = 'Ingresa un nombre de usuario.';
    else if (u.length < 3 || u.length > 50) next.username = 'Entre 3 y 50 caracteres.';
    else if (/\s/.test(u)) next.username = 'Sin espacios en el usuario.';

    const email = form.correo.trim();
    if (!email) next.correo = 'Ingresa tu correo.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.correo = 'Correo no valido.';

    const p = form.password;
    if (!p) next.password = 'Ingresa una contraseña.';
    else if (p.trim() !== p) next.password = 'Sin espacios al inicio o al final.';
    else if (p.trim().length < 6) next.password = 'Minimo 6 caracteres.';

    const idMsg = validateIdentificacion(form.identificacion, form.tipoIdentificacion);
    if (idMsg) next.identificacion = idMsg;

    if (!form.nombre.trim()) next.nombre = 'Ingresa tu nombre.';
    if (!form.apellido.trim()) next.apellido = 'Ingresa tu apellido.';
    if (!form.idCiudad) next.idCiudad = 'Selecciona tu ciudad.';

    if (form.telefono && form.telefono.length > 10) {
      next.telefono = 'Telefono: maximo 10 digitos.';
    }

    return next;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateForm();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setStatusMessage('Revisa los campos marcados.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({});
      setStatusMessage('Creando tu cuenta...');

      const telefonoDigits = form.telefono.replace(/\D/g, '').slice(0, 10);
      const payload = {
        username: form.username.trim(),
        correo: form.correo.trim(),
        password: form.password.trim(),
        identificacion: form.identificacion.trim(),
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        idCiudad: Number(form.idCiudad),
        tipoIdentificacion: form.tipoIdentificacion || undefined,
      };

      if (telefonoDigits) payload.telefono = telefonoDigits;
      if (form.direccion.trim()) payload.direccion = form.direccion.trim();
      if (form.genero) payload.genero = form.genero;

      await registerRequest(payload);

      const session = getStoredSession();
      if (!session?.token) {
        throw new Error('La API no devolvio una sesion valida.');
      }

      setStatusMessage('Cuenta creada. Bienvenido.');
      onRegisterSuccess?.(session);
    } catch (error) {
      setStatusMessage(error.message || 'No se pudo completar el registro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className={styles.loginPage}>
      <div className={`${styles.loginCard} ${styles.wideCard}`}>
        {onBack ? (
          <button type="button" className={styles.backButton} onClick={onBack}>
            Volver al marketplace
          </button>
        ) : null}
        <div className={styles.brandBlock}>
          <div className={styles.logoBadge}>R</div>
          <div>
            <p className={styles.kicker}>Cuenta de cliente</p>
            <h1 className={styles.title}>Budget Car</h1>
          </div>
        </div>

        <div className={styles.welcomeBlock}>
          <h2 className={styles.heading}>Crear cuenta</h2>
        </div>

        {loadError ? <div className={`${styles.statusMessage} ${styles.statusError}`}>{loadError}</div> : null}

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="username">
              Usuario
            </label>
            <input
              id="username"
              name="username"
              type="text"
              className={`${styles.input} ${errors.username ? styles.inputError : ''}`}
              placeholder="Sin espacios, minimo 3 caracteres"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              disabled={isSubmitting}
            />
            {errors.username ? <span className={styles.errorText}>{errors.username}</span> : null}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="correo">
              Correo
            </label>
            <input
              id="correo"
              name="correo"
              type="email"
              className={`${styles.input} ${errors.correo ? styles.inputError : ''}`}
              placeholder="tu@correo.com"
              value={form.correo}
              onChange={handleChange}
              autoComplete="email"
              disabled={isSubmitting}
            />
            {errors.correo ? <span className={styles.errorText}>{errors.correo}</span> : null}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
              placeholder="Minimo 6 caracteres"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              disabled={isSubmitting}
            />
            {errors.password ? <span className={styles.errorText}>{errors.password}</span> : null}
          </div>

          <div className={styles.formRowTwo}>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="identificacion">
                Identificacion
              </label>
              <input
                id="identificacion"
                name="identificacion"
                type="text"
                inputMode={form.tipoIdentificacion === 'PASAPORTE' ? 'text' : 'numeric'}
                autoComplete="off"
                className={`${styles.input} ${errors.identificacion ? styles.inputError : ''}`}
                placeholder={
                  form.tipoIdentificacion === 'CEDULA'
                    ? '10 digitos'
                    : form.tipoIdentificacion === 'RUC'
                      ? '13 digitos'
                      : '7 a 20 letras o numeros'
                }
                value={form.identificacion}
                onChange={handleChange}
                disabled={isSubmitting}
              />
              {errors.identificacion ? <span className={styles.errorText}>{errors.identificacion}</span> : null}
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="tipoIdentificacion">
                Tipo
              </label>
              <select
                id="tipoIdentificacion"
                name="tipoIdentificacion"
                className={styles.input}
                value={form.tipoIdentificacion}
                onChange={handleChange}
                disabled={isSubmitting}
              >
                <option value="CEDULA">CEDULA</option>
                <option value="RUC">RUC</option>
                <option value="PASAPORTE">PASAPORTE</option>
              </select>
            </div>
          </div>

          <div className={styles.formRowTwo}>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="nombre">
                Nombre
              </label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                className={`${styles.input} ${errors.nombre ? styles.inputError : ''}`}
                value={form.nombre}
                onChange={handleChange}
                autoComplete="given-name"
                disabled={isSubmitting}
              />
              {errors.nombre ? <span className={styles.errorText}>{errors.nombre}</span> : null}
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="apellido">
                Apellido
              </label>
              <input
                id="apellido"
                name="apellido"
                type="text"
                className={`${styles.input} ${errors.apellido ? styles.inputError : ''}`}
                value={form.apellido}
                onChange={handleChange}
                autoComplete="family-name"
                disabled={isSubmitting}
              />
              {errors.apellido ? <span className={styles.errorText}>{errors.apellido}</span> : null}
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="idCiudad">
              Ciudad
            </label>
            <select
              id="idCiudad"
              name="idCiudad"
              className={`${styles.input} ${errors.idCiudad ? styles.inputError : ''}`}
              value={form.idCiudad}
              onChange={handleChange}
              disabled={isSubmitting}
            >
              <option value="">Selecciona ciudad</option>
              {ciudades.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            {errors.idCiudad ? <span className={styles.errorText}>{errors.idCiudad}</span> : null}
          </div>

          <div className={styles.formRowTwo}>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="telefono">
                Telefono
              </label>
              <input
                id="telefono"
                name="telefono"
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                className={`${styles.input} ${errors.telefono ? styles.inputError : ''}`}
                placeholder="Solo numeros"
                value={form.telefono}
                onChange={handleChange}
                autoComplete="tel"
                disabled={isSubmitting}
              />
              {errors.telefono ? <span className={styles.errorText}>{errors.telefono}</span> : null}
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="genero">
                Genero
              </label>
              <select
                id="genero"
                name="genero"
                className={styles.input}
                value={form.genero}
                onChange={handleChange}
                disabled={isSubmitting}
              >
                <option value="F">F</option>
                <option value="M">M</option>
              </select>
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="direccion">
              Direccion
            </label>
            <input
              id="direccion"
              name="direccion"
              type="text"
              className={styles.input}
              value={form.direccion}
              onChange={handleChange}
              autoComplete="street-address"
              disabled={isSubmitting}
            />
          </div>

          {statusMessage ? (
            <div
              className={`${styles.statusMessage} ${
                statusMessage.includes('Revisa') || statusMessage.includes('No se')
                  ? styles.statusError
                  : styles.statusSuccess
              }`}
            >
              {statusMessage}
            </div>
          ) : null}

          <button className={styles.submitButton} type="submit" disabled={isSubmitting || Boolean(loadError)}>
            {isSubmitting ? 'Registrando...' : 'Registrarme'}
          </button>

          <p className={styles.secondaryLink}>
            ¿Ya tienes cuenta? <Link to="/admin/login">Iniciar sesión</Link>
          </p>
        </form>
      </div>
    </section>
  );
}

export default RegisterPage;
