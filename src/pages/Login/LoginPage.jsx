import { useState } from 'react';
import { getStoredSession, loginRequest } from '../../api/services/api';
import styles from './LoginPage.module.css';

const initialForm = {
  username: '',
  password: '',
};

function LoginPage({ onLoginSuccess, onBack }) {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [statusMessage, setStatusMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: '',
    }));

    setStatusMessage('');
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!form.username.trim()) {
      nextErrors.username = 'Ingresa tu usuario.';
    }

    if (!form.password.trim()) {
      nextErrors.password = 'Ingresa tu contrasena.';
    }

    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = validateForm();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setStatusMessage('Completa los campos obligatorios para continuar.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({});
      setStatusMessage('Validando credenciales...');

      await loginRequest({
        username: form.username.trim(),
        password: form.password,
      });

      const session = getStoredSession();

      if (!session?.token) {
        throw new Error('La API no devolvio una sesion valida.');
      }

      setStatusMessage('Acceso concedido.');
      onLoginSuccess?.(session);
    } catch (error) {
      setStatusMessage(error.message || 'No se pudo iniciar sesion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className={styles.loginPage}>
      <div className={styles.loginCard}>
        {onBack ? (
          <button type="button" className={styles.backButton} onClick={onBack}>
            Volver al marketplace
          </button>
        ) : null}
        <div className={styles.brandBlock}>
          <div className={styles.logoBadge}>R</div>
          <div>
            <p className={styles.kicker}>Backoffice administrativo</p>
            <h1 className={styles.title}>Budget Car</h1>
          </div>
        </div>

        <div className={styles.welcomeBlock}>
          <h2 className={styles.heading}>Iniciar sesion</h2>
          <p className={styles.subtitle}>
            Ingresa tu usuario y contrasena para acceder al sistema.
          </p>
        </div>

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
              placeholder="Ingresa tu usuario"
              value={form.username}
              onChange={handleChange}
              autoComplete="username"
              disabled={isSubmitting}
            />
            {errors.username ? (
              <span className={styles.errorText}>{errors.username}</span>
            ) : null}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="password">
              Contrasena
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
              placeholder="Ingresa tu contrasena"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              disabled={isSubmitting}
            />
            {errors.password ? (
              <span className={styles.errorText}>{errors.password}</span>
            ) : null}
          </div>

          {statusMessage ? (
            <div
              className={`${styles.statusMessage} ${
                Object.keys(errors).length > 0 ? styles.statusError : styles.statusSuccess
              }`}
            >
              {statusMessage}
            </div>
          ) : null}

          <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Ingresando...' : 'Iniciar sesion'}
          </button>
        </form>
      </div>
    </section>
  );
}

export default LoginPage;
