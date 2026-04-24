import { useMemo, useState } from 'react';
import CiudadesPage from '../Ciudades/CiudadesPage';
import MarcasPage from '../Marcas/MarcasPage';
import PaisesPage from '../Paises/PaisesPage';
import styles from './AdminPage.module.css';

const modules = [
  { key: 'dashboard', title: 'Dashboard', description: 'Resumen general del sistema' },
  { key: 'paises', title: 'Paises', description: 'Catalogo de paises y mantenimiento' },
  { key: 'ciudades', title: 'Ciudades', description: 'Catalogo de ciudades por pais' },
  { key: 'marcas', title: 'Marcas', description: 'Catalogo de marcas de vehiculos' },
  { key: 'categorias', title: 'Categorias', description: 'Pendiente de implementacion' },
  { key: 'vehiculos', title: 'Vehiculos', description: 'Pendiente de implementacion' },
  { key: 'extras', title: 'Extras', description: 'Pendiente de implementacion' },
  { key: 'localizaciones', title: 'Localizaciones', description: 'Pendiente de implementacion' },
  { key: 'clientes', title: 'Clientes', description: 'Pendiente de implementacion' },
  { key: 'conductores', title: 'Conductores', description: 'Pendiente de implementacion' },
  { key: 'reservas', title: 'Reservas', description: 'Pendiente de implementacion' },
  { key: 'facturas', title: 'Facturas', description: 'Pendiente de implementacion' },
  { key: 'auditoria', title: 'Auditoria', description: 'Pendiente de implementacion' },
];

function AdminPage({ session, onLogout }) {
  const [activeModule, setActiveModule] = useState('dashboard');

  const userLabel = useMemo(() => {
    return (
      session?.usuario?.nombre ||
      session?.usuario?.username ||
      session?.usuario?.userName ||
      session?.usuario?.correo ||
      'Usuario autenticado'
    );
  }, [session]);

  const renderContent = () => {
    if (activeModule === 'dashboard') {
      return (
        <>
          <section className={styles.gridSection}>
            {modules
              .filter((module) => module.key !== 'dashboard')
              .map((module) => (
                <button
                  key={module.key}
                  type="button"
                  className={styles.moduleCard}
                  onClick={() => setActiveModule(module.key)}
                >
                  <strong>{module.title}</strong>
                  <span>{module.description}</span>
                </button>
              ))}
          </section>

          <section className={styles.contentSection}>
            <div className={styles.placeholderPanel}>
              <h2>Administracion Budget Car</h2>
              <p>
                Selecciona un modulo para abrirlo en una vista separada. Ya estan listos
                Paises, Ciudades y Marcas conectados al backend.
              </p>
            </div>
          </section>
        </>
      );
    }

    if (activeModule === 'paises') {
      return <PaisesPage onBack={() => setActiveModule('dashboard')} />;
    }

    if (activeModule === 'ciudades') {
      return <CiudadesPage onBack={() => setActiveModule('dashboard')} />;
    }

    if (activeModule === 'marcas') {
      return <MarcasPage onBack={() => setActiveModule('dashboard')} />;
    }

    return (
      <section className={styles.contentSection}>
        <div className={styles.placeholderPanel}>
          <button className={styles.backButton} type="button" onClick={() => setActiveModule('dashboard')}>
            Regresar
          </button>
          <h2>{modules.find((module) => module.key === activeModule)?.title}</h2>
          <p>Este modulo queda reservado y lo construimos en el siguiente bloque.</p>
        </div>
      </section>
    );
  };

  return (
    <div className={styles.adminPage}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Panel de administracion</p>
          <h1 className={styles.brand}>Budget Car</h1>
        </div>

        <div className={styles.headerActions}>
          <span className={styles.userBadge}>{userLabel}</span>
          <button className={styles.logoutButton} type="button" onClick={onLogout}>
            Cerrar sesion
          </button>
        </div>
      </header>

      {renderContent()}
    </div>
  );
}

export default AdminPage;
