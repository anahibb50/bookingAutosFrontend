import { useEffect, useMemo, useState } from 'react';
import CategoriasPage from '../Categorias/CategoriasPage';
import ClientesPage from '../Clientes/ClientesPage';
import CiudadesPage from '../Ciudades/CiudadesPage';
import ConductoresPage from '../Conductores/ConductoresPage';
import ExtrasPage from '../Extras/ExtrasPage';
import FacturasPage from '../Facturas/FacturasPage';
import LocalizacionesPage from '../Localizaciones/LocalizacionesPage';
import MarcasPage from '../Marcas/MarcasPage';
import PaisesPage from '../Paises/PaisesPage';
import ReservasPage from '../Reservas/ReservasPage';
import VehiculosPage from '../Vehiculos/VehiculosPage';
import { listClientes, listReservas, listVehiculos } from '../../api/services/api';
import styles from './AdminPage.module.css';

const modules = [
  { key: 'dashboard', title: 'Dashboard', emoji: '📊', description: 'Resumen general del sistema' },
  { key: 'paises', title: 'Paises', emoji: '🌎', description: 'Catalogo de paises y mantenimiento' },
  { key: 'ciudades', title: 'Ciudades', emoji: '🏙️', description: 'Catalogo de ciudades por pais' },
  { key: 'marcas', title: 'Marcas', emoji: '🏷️', description: 'Catalogo de marcas de vehiculos' },
  { key: 'categorias', title: 'Categorias', emoji: '🗂️', description: 'Catalogo base para clasificar vehiculos' },
  { key: 'vehiculos', title: 'Vehiculos', emoji: '🚗', description: 'Inventario, disponibilidad, kilometraje y estado' },
  { key: 'extras', title: 'Extras', emoji: '✨', description: 'Servicios complementarios y precios' },
  { key: 'localizaciones', title: 'Localizaciones', emoji: '📍', description: 'Sucursales, contacto y horarios por ciudad' },
  { key: 'clientes', title: 'Clientes', emoji: '👤', description: 'Clientes, identificacion y ciudad' },
  { key: 'conductores', title: 'Conductores', emoji: '🪪', description: 'Licencias, edad y datos de contacto' },
  { key: 'reservas', title: 'Reservas', emoji: '📅', description: 'Reservas con extras, conductores y disponibilidad' },
  { key: 'facturas', title: 'Facturas', emoji: '🧾', description: 'Facturacion por reserva, aprobacion y anulacion' },
];

function AdminPage({ session, onLogout }) {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [hasLogoError, setHasLogoError] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    clientes: 0,
    vehiculos: 0,
    reservas: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState('');
  const logoSrc = '/logoBudgetCar.png';

  const userLabel = useMemo(() => {
    return (
      session?.usuario?.nombre ||
      session?.usuario?.username ||
      session?.usuario?.userName ||
      session?.usuario?.correo ||
      'Usuario autenticado'
    );
  }, [session]);

  const activeModuleLabel = useMemo(
    () => modules.find((module) => module.key === activeModule)?.title || 'Dashboard',
    [activeModule]
  );

  const loadDashboardStats = async () => {
    try {
      setIsLoadingStats(true);
      setStatsError('');
      const [clientesResponse, vehiculosResponse, reservasResponse] = await Promise.all([
        listClientes(),
        listVehiculos(),
        listReservas(),
      ]);
      setDashboardStats({
        clientes: Array.isArray(clientesResponse?.data) ? clientesResponse.data.length : 0,
        vehiculos: Array.isArray(vehiculosResponse?.data) ? vehiculosResponse.data.length : 0,
        reservas: Array.isArray(reservasResponse?.data) ? reservasResponse.data.length : 0,
      });
    } catch (error) {
      setStatsError(error.message || 'No se pudieron cargar los indicadores del dashboard.');
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    if (activeModule === 'dashboard') {
      loadDashboardStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModule]);

  const renderContent = () => {
    if (activeModule === 'dashboard') {
      return (
        <div className={styles.dashboardWrap}>
          <div className={styles.summaryHeader}>
            <div>
              <p className={styles.summaryKicker}>Resumen general</p>
              <h2 className={styles.summaryTitle}>Dashboard</h2>
            </div>
            <button className={styles.refreshButton} type="button" onClick={loadDashboardStats} disabled={isLoadingStats}>
              {isLoadingStats ? 'Actualizando...' : 'Actualizar'}
            </button>
          </div>

          {statsError ? <div className={styles.statsError}>{statsError}</div> : null}

          <section className={styles.statsGrid}>
            <article className={styles.statCard}>
              <span className={styles.statLabel}>👤 Clientes</span>
              <strong className={styles.statValue}>{dashboardStats.clientes}</strong>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statLabel}>🚗 Vehiculos</span>
              <strong className={styles.statValue}>{dashboardStats.vehiculos}</strong>
            </article>
            <article className={styles.statCard}>
              <span className={styles.statLabel}>📅 Reservas</span>
              <strong className={styles.statValue}>{dashboardStats.reservas}</strong>
            </article>
          </section>
        </div>
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

    if (activeModule === 'categorias') {
      return <CategoriasPage onBack={() => setActiveModule('dashboard')} />;
    }

    if (activeModule === 'extras') {
      return <ExtrasPage onBack={() => setActiveModule('dashboard')} />;
    }

    if (activeModule === 'vehiculos') {
      return <VehiculosPage onBack={() => setActiveModule('dashboard')} />;
    }

    if (activeModule === 'localizaciones') {
      return <LocalizacionesPage onBack={() => setActiveModule('dashboard')} />;
    }

    if (activeModule === 'clientes') {
      return <ClientesPage onBack={() => setActiveModule('dashboard')} />;
    }

    if (activeModule === 'conductores') {
      return <ConductoresPage onBack={() => setActiveModule('dashboard')} />;
    }

    if (activeModule === 'reservas') {
      return <ReservasPage onBack={() => setActiveModule('dashboard')} />;
    }

    if (activeModule === 'facturas') {
      return <FacturasPage onBack={() => setActiveModule('dashboard')} />;
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
      <aside className={styles.sidebar}>
        <div className={styles.brandBlock}>
          <img
            className={styles.logoImage}
            src={logoSrc}
            alt="Budget Car logo"
            onError={() => setHasLogoError(true)}
          />
          <div className={styles.logoInfoBox}>
            <p className={styles.logoInfoTitle}>Estado del sistema</p>
            <p className={styles.logoInfoText}>
              {hasLogoError
                ? 'Tu mejor opcion para alquiler de autos, rapido y seguro.'
                : 'Alquila tu auto ideal al mejor precio: rapido, confiable y sin complicaciones.'}
            </p>
          </div>
          <div className={styles.brandText}>
            <p className={styles.kicker}>Panel administrativo</p>
            <h1 className={styles.brand}>Budget Car</h1>
          </div>
        </div>

        <nav className={styles.sidebarNav}>
          {modules.map((module) => {
            const isActive = module.key === activeModule;
            return (
              <button
                key={module.key}
                type="button"
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                onClick={() => setActiveModule(module.key)}
              >
                <span className={styles.moduleEmoji} aria-hidden="true">
                  {module.emoji || '📌'}
                </span>
                <span>{module.title}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className={styles.mainPanel}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>Sesion activa</p>
            <h2 className={styles.mainTitle}>{userLabel}</h2>
          </div>

          <div className={styles.headerActions}>
            <span className={styles.userBadge}>Modulo: {activeModuleLabel}</span>
            <button className={styles.logoutButton} type="button" onClick={onLogout}>
              Salir
            </button>
          </div>
        </header>

        <section className={styles.contentSection}>{renderContent()}</section>
      </main>
    </div>
  );
}

export default AdminPage;
