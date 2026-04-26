import { useMemo, useState } from 'react';
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
import styles from './AdminPage.module.css';

const modules = [
  { key: 'dashboard', title: 'Dashboard', description: 'Resumen general del sistema' },
  { key: 'paises', title: 'Paises', description: 'Catalogo de paises y mantenimiento' },
  { key: 'ciudades', title: 'Ciudades', description: 'Catalogo de ciudades por pais' },
  { key: 'marcas', title: 'Marcas', description: 'Catalogo de marcas de vehiculos' },
  { key: 'categorias', title: 'Categorias', description: 'Catalogo base para clasificar vehiculos' },
  { key: 'vehiculos', title: 'Vehiculos', description: 'Inventario, disponibilidad, kilometraje y estado' },
  { key: 'extras', title: 'Extras', description: 'Servicios complementarios y precios' },
  { key: 'localizaciones', title: 'Localizaciones', description: 'Sucursales, contacto y horarios por ciudad' },
  { key: 'clientes', title: 'Clientes', description: 'Clientes, identificacion y ciudad' },
  { key: 'conductores', title: 'Conductores', description: 'Licencias, edad y datos de contacto' },
  { key: 'reservas', title: 'Reservas', description: 'Reservas con extras, conductores y disponibilidad' },
  { key: 'facturas', title: 'Facturas', description: 'Facturacion por reserva, aprobacion y anulacion' },
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
                Paises, Ciudades, Marcas, Categorias, Extras, Clientes y Conductores
                conectados al backend.
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
