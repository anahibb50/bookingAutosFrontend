import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  getVehiculosDisponibles,
  listCategorias,
  listCiudades,
  listLocalizaciones,
  sessionHasRole,
  verifyDisponibilidadReserva,
} from '../../api/services/api';
import styles from './PublicMarketplacePage.module.css';

const initialSearch = { idLocalizacionRecogida: '', fechaRecogida: '', horaRecogida: '09:00' };

const hourOptions = Array.from({ length: 14 }).map((_, index) =>
  `${String(index + 8).padStart(2, '0')}:00`
);

const categoryImages = [
  '/categorias/economico.png',
  '/categorias/estandar.png',
  '/categorias/deportivo.png',
  '/categorias/SUV.png',
  '/categorias/vans.png',
  '/categorias/hatchback.png',
];

function normalizeVehiculo(item) {
  const pasajeros =
    item?.capacidadPasajeros ??
    item?.CapacidadPasajeros ??
    item?.pasajeros ??
    item?.numeroPasajeros ??
    0;

  const maletas =
    item?.capacidadMaletas ??
    item?.CapacidadMaletas ??
    item?.maletas ??
    item?.numeroMaletas ??
    0;

  const precioBase =
    item?.precioBaseDia ??
    item?.PrecioBaseDia ??
    item?.precioPorDia ??
    item?.precioDia ??
    item?.precio ??
    item?.valor ??
    0;

  return {
    id: item?.id ?? item?.Id ?? '',
    modelo: item?.modelo ?? item?.Modelo ?? 'Vehiculo',
    placa: item?.placa ?? item?.Placa ?? '',
    imagenUrl: item?.imagenUrl ?? item?.ImagenUrl ?? '',
    idCategoria: item?.idCategoria ?? item?.IdCategoria ?? '',
    idLocalizacion: item?.idLocalizacion ?? item?.IdLocalizacion ?? '',
    pasajeros: Number(pasajeros) || 0,
    maletas: Number(maletas) || 0,
    transmision:
      item?.tipoTransmision ??
      item?.TipoTransmision ??
      item?.transmision ??
      'Manual',
    aireAcondicionado: Boolean(item?.aireAcondicionado ?? item?.AireAcondicionado),
    precioPorDia: Number(precioBase) || 0,
  };
}

function normalizeLocalizacion(item) {
  return {
    id: item?.id ?? '',
    nombre: item?.nombre ?? '',
    idCiudad: item?.idCiudad ?? '',
    direccion: item?.direccion ?? 'Sin direccion',
    telefono: item?.telefono ?? '',
    horario: item?.horarioAtencion ?? item?.horario ?? '08:00 - 18:00',
  };
}

function toDateTime(dateValue, timeValue) {
  return `${dateValue}T${timeValue}:00`;
}

/** Query para /reserva (localizacion del vehiculo y categoria) — sobrevive al redirect de login. */
function buildReservaQuery(vehiculo, nombreCategoria) {
  const p = new URLSearchParams();
  if (nombreCategoria) p.set('categoria', nombreCategoria);
  const idLoc = vehiculo?.idLocalizacion ?? vehiculo?.IdLocalizacion;
  if (idLoc !== undefined && idLoc !== null && String(idLoc).trim() !== '') {
    p.set('idLoc', String(idLoc));
  }
  return p.toString();
}

function PublicMarketplacePage({ session = null, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState(initialSearch);
  const [vehiculos, setVehiculos] = useState([]);
  const [localizaciones, setLocalizaciones] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [availableIds, setAvailableIds] = useState([]);
  const [searchMessage, setSearchMessage] = useState('');
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const currentPath = location.pathname;
  const isClienteLogged = Boolean(session?.token && sessionHasRole('CLIENTE', session));
  const categoriaQuery = useMemo(
    () => new URLSearchParams(location.search).get('categoria')?.toLowerCase() || '',
    [location.search]
  );

  const categoryMap = useMemo(
    () =>
      categorias.reduce((acc, item) => {
        acc[String(item.id)] = item.nombre;
        return acc;
      }, {}),
    [categorias]
  );

  const cityMap = useMemo(
    () =>
      ciudades.reduce((acc, item) => {
        acc[String(item.id)] = item.nombre;
        return acc;
      }, {}),
    [ciudades]
  );

  useEffect(() => {
    const load = async () => {
      try {
        const [vehiculosResponse, localizacionesResponse, categoriasResponse, ciudadesResponse] =
          await Promise.all([
            getVehiculosDisponibles(),
            listLocalizaciones(),
            listCategorias(),
            listCiudades(),
          ]);
        setVehiculos(
          Array.isArray(vehiculosResponse?.data)
            ? vehiculosResponse.data.map(normalizeVehiculo)
            : []
        );
        setLocalizaciones(
          Array.isArray(localizacionesResponse?.data)
            ? localizacionesResponse.data.map(normalizeLocalizacion)
            : []
        );
        setCategorias(Array.isArray(categoriasResponse?.data) ? categoriasResponse.data : []);
        setCiudades(Array.isArray(ciudadesResponse?.data) ? ciudadesResponse.data : []);
      } catch (error) {
        setSearchError(error.message || 'No se pudieron cargar los datos del marketplace.');
      }
    };
    load();
  }, []);

  const filteredByLocation = useMemo(() => {
    if (!search.idLocalizacionRecogida) return [];
    return vehiculos.filter(
      (item) =>
        String(item.idLocalizacion) === String(search.idLocalizacionRecogida) &&
        (availableIds.length === 0 || availableIds.includes(Number(item.id)))
    );
  }, [availableIds, search.idLocalizacionRecogida, vehiculos]);

  const filteredByCategoria = useMemo(() => {
    if (!categoriaQuery) return vehiculos;
    return vehiculos.filter((vehiculo) =>
      String(categoryMap[String(vehiculo.idCategoria)] || '')
        .toLowerCase()
        .includes(categoriaQuery)
    );
  }, [categoriaQuery, categoryMap, vehiculos]);

  const handleSearch = async () => {
    if (!search.idLocalizacionRecogida || !search.fechaRecogida || !search.horaRecogida) {
      setSearchError('Selecciona localidad, fecha y hora.');
      return;
    }
    setSearchError('');
    setHasSearched(true);
    try {
      setIsSearching(true);
      const inicio = toDateTime(search.fechaRecogida, search.horaRecogida);
      const fin = toDateTime(search.fechaRecogida, '23:59');
      const checks = await Promise.all(
        vehiculos
          .filter((v) => String(v.idLocalizacion) === String(search.idLocalizacionRecogida))
          .map(async (vehiculo) => {
            try {
              const res = await verifyDisponibilidadReserva(Number(vehiculo.id), inicio, fin);
              return res?.data ? Number(vehiculo.id) : null;
            } catch {
              return Number(vehiculo.id);
            }
          })
      );
      const next = checks.filter((id) => Number.isFinite(id));
      setAvailableIds(next);
      setSearchMessage(
        next.length
          ? `Se encontraron ${next.length} vehiculo(s) disponibles.`
          : 'No hay vehiculos disponibles para esa busqueda.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  const irACrearReserva = (vehiculo) => {
    const nombreCat = categoryMap[String(vehiculo.idCategoria)] || '';
    const rq = buildReservaQuery(vehiculo, nombreCat);
    const pathQuery = rq ? `?${rq}` : '';
    if (!session?.token) {
      navigate('/admin/login', { state: { vehiculoId: vehiculo.id, reservaQuery: rq } });
      return;
    }
    if (!sessionHasRole('CLIENTE', session)) {
      navigate('/admin');
      return;
    }
    navigate(`/reserva/${vehiculo.id}${pathQuery}`, {
      state: { vehiculo },
    });
  };

  const handleCategoryClick = (categoryName) => {
    navigate(`/vehiculos?categoria=${encodeURIComponent(categoryName)}`);
  };

  const renderInicio = () => (
    <>
      <header className={styles.hero}>
        <div className={styles.heroOverlay}>
          <div className="container text-center">
            <h1 className={styles.heroTitle}>Conduce la experiencia premium de Budget Car</h1>
            <p className={styles.heroSubtitle}>Reserva en minutos y viaja con total tranquilidad.</p>
            <div className={`row g-2 ${styles.searchRow}`}>
              <div className="col-12 col-md-4">
                <select
                  className="form-select"
                  value={search.idLocalizacionRecogida}
                  onChange={(event) =>
                    setSearch((current) => ({ ...current, idLocalizacionRecogida: event.target.value }))
                  }
                >
                  <option value="">Localidad de recogida</option>
                  {localizaciones.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="col-6 col-md-3">
                <input
                  className="form-control"
                  type="date"
                  value={search.fechaRecogida}
                  onChange={(event) => setSearch((current) => ({ ...current, fechaRecogida: event.target.value }))}
                />
              </div>
              <div className="col-6 col-md-3">
                <select
                  className="form-select"
                  value={search.horaRecogida}
                  onChange={(event) => setSearch((current) => ({ ...current, horaRecogida: event.target.value }))}
                >
                  {hourOptions.map((hour) => <option key={hour} value={hour}>{hour}</option>)}
                </select>
              </div>
              <div className="col-12 col-md-2 d-grid">
                <button className={`btn ${styles.searchButton}`} type="button" onClick={handleSearch} disabled={isSearching}>
                  {isSearching ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
            </div>
            {searchError ? <div className="alert alert-danger mt-3 mb-0">{searchError}</div> : null}
            {searchMessage ? <div className="alert alert-light mt-3 mb-0">{searchMessage}</div> : null}
          </div>
        </div>
      </header>

      <section className={`container ${styles.section}`}>
        <div className={styles.typesSection}>
          <h2 className={styles.typesTitle}>TIPOS DE AUTOS BUDGET</h2>
          <div className={styles.typesRow}>
            {categorias.map((category, index) => (
              <button
                key={category?.id ?? category?.nombre ?? index}
                type="button"
                className={styles.typeItem}
                onClick={() => handleCategoryClick(category?.nombre || '')}
              >
                <img
                  src={categoryImages[index % categoryImages.length]}
                  alt={category?.nombre || `Categoria ${index + 1}`}
                  className={styles.typeImage}
                />
                <span>{category?.nombre || `Categoria ${index + 1}`}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className={`container ${styles.section}`}>
        {!hasSearched ? (
          <div className={styles.motivationBlock}>
            <div className={styles.motivationIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 14a5 5 0 1 1 3.4-8.66l5.2 5.2h2.9l1.5 1.5-1.2 1.2.9.9-1.2 1.2-.9-.9-1.2 1.2-1.5-1.5v-2.9l-5.2-5.2A5 5 0 0 1 7 14Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="7" cy="9" r="1.5" fill="currentColor" />
              </svg>
            </div>
            <h2 className={styles.motivationTitle}>¿Listo para tu proximo viaje?</h2>
            <p className={styles.motivationSubtitle}>
              Selecciona una localidad, fecha y hora para ver los vehiculos disponibles.
            </p>
            <div className={styles.motivationArrow} aria-hidden="true">↑</div>
          </div>
        ) : (
          <>
            <h2 className={styles.sectionTitle}>Vehiculos disponibles</h2>
            <div className="row g-3">
              {filteredByLocation.length === 0 ? (
                <div className="col-12"><div className="alert alert-secondary mb-0">No hay vehiculos disponibles para esa busqueda.</div></div>
              ) : (
                filteredByLocation.map((vehiculo) => (
              <div className="col-12 col-md-6 col-lg-4" key={vehiculo.id}>
                    <article className={styles.carCard}>
                      <img src={vehiculo.imagenUrl || 'https://via.placeholder.com/640x320?text=Vehiculo'} alt={vehiculo.modelo} className={styles.carImage} />
                      <div className={styles.carBody}>
                    <h3 className={styles.carTitle}>{vehiculo.modelo}</h3>
                        <p className={styles.carMeta}>{categoryMap[String(vehiculo.idCategoria)] || 'Categoria general'} · {vehiculo.placa}</p>
                    <p className={styles.specLine}>
                      👥 {vehiculo.pasajeros} · 🧳 {vehiculo.maletas} · ⚙️ {vehiculo.transmision} · ❄️ {vehiculo.aireAcondicionado ? 'Si' : 'No'}
                    </p>
                        <div className={styles.cardFooter}>
                      <strong className={styles.cardPrice}>${vehiculo.precioPorDia.toFixed(2)} / dia</strong>
                          <button className={`btn ${styles.searchButton}`} type="button" onClick={() => irACrearReserva(vehiculo)}>Reservar ahora</button>
                        </div>
                      </div>
                    </article>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </section>
    </>
  );

  const renderVehiculos = () => (
    <section className={`container ${styles.section} ${styles.fullVehiclesSection}`}>
      <h2 className={styles.sectionTitle}>Todos los vehiculos</h2>
      <p className={styles.sectionHint}>
        {categoriaQuery ? `Filtro aplicado por categoria: ${categoriaQuery}` : 'Mostrando todas las categorias.'}
      </p>
      <div className="row g-3">
        {filteredByCategoria.length === 0 ? (
          <div className="col-12"><div className="alert alert-secondary mb-0">No hay vehiculos para esa categoria.</div></div>
        ) : (
          filteredByCategoria.map((vehiculo) => (
            <div className="col-12 col-md-6 col-lg-4" key={`veh-${vehiculo.id}`}>
              <article className={styles.carCard}>
                <img src={vehiculo.imagenUrl || 'https://via.placeholder.com/640x320?text=Vehiculo'} alt={vehiculo.modelo} className={styles.carImage} />
                <div className={styles.carBody}>
                  <h3 className={styles.carTitle}>{vehiculo.modelo}</h3>
                  <p className={styles.carMeta}>{categoryMap[String(vehiculo.idCategoria)] || 'Categoria general'} · {vehiculo.placa}</p>
                  <p className={styles.specLine}>
                    👥 {vehiculo.pasajeros} · 🧳 {vehiculo.maletas} · ⚙️ {vehiculo.transmision} · ❄️ {vehiculo.aireAcondicionado ? 'Si' : 'No'}
                  </p>
                  <div className={styles.cardFooter}>
                    <strong className={styles.cardPrice}>${vehiculo.precioPorDia.toFixed(2)} / dia</strong>
                    <button className={`btn ${styles.searchButton}`} type="button" onClick={() => irACrearReserva(vehiculo)}>Reservar ahora</button>
                  </div>
                </div>
              </article>
            </div>
          ))
        )}
      </div>
    </section>
  );

  const renderLocalidades = () => (
    <section className={`container ${styles.section} ${styles.fullVehiclesSection}`}>
      <header className={styles.localidadesHeader}>
        <h2 className={`${styles.sectionTitle} ${styles.localidadesTitle}`}>Todas nuestras localidades</h2>
        <span className={styles.localidadesDivider} aria-hidden="true" />
      </header>
      <div className="row g-3">
        {localizaciones.map((loc) => (
          <div className="col-12 col-md-6 col-lg-4" key={loc.id}>
            <article className={styles.locationCard}>
              <div className={styles.locationIcon} aria-hidden="true">📍</div>
              <h4>{loc.nombre}</h4>
              <p><span className={styles.locationMetaLabel}>Ciudad:</span> {cityMap[String(loc.idCiudad)] || 'N/D'}</p>
              <p><span className={styles.locationMetaLabel}>Direccion:</span> {loc.direccion}</p>
              <p><span className={styles.locationMetaLabel}>Horario:</span> {loc.horario}</p>
            </article>
          </div>
        ))}
      </div>
    </section>
  );

  const renderAcerca = () => (
    <section className={`container ${styles.section} ${styles.fullVehiclesSection}`}>
      <div className={styles.aboutSection}>
        <header className={styles.aboutHeader}>
          <h2 className={styles.aboutMainTitle}>Acerca de nosotros</h2>
          <p className={styles.aboutMainSubtitle}>Nacimos en 2012 con una idea simple: hacer el alquiler de autos mas rapido, claro y confiable.</p>
          <span className={styles.aboutDivider} />
        </header>
        <article className={styles.aboutStory}>
          <h3>Historia Budget Car</h3>
          <p>Budget Car inicio como un negocio familiar en Quito con solo 8 vehiculos. Hoy operamos en varias ciudades del pais, con procesos digitales y soporte humano.</p>
          <p>Nuestro enfoque combina precios competitivos, atencion cercana y una flota moderna para viajes corporativos, turismo y movilidad urbana.</p>
          <p>Seguimos creciendo con una meta clara: que cada cliente reserve en minutos y conduzca con total tranquilidad.</p>
        </article>
        <div className={styles.aboutStatsGrid}>
          <article className={styles.aboutStatCard}><strong>+12</strong><span>Anos de experiencia</span></article>
          <article className={styles.aboutStatCard}><strong>+4.500</strong><span>Reservas completadas</span></article>
          <article className={styles.aboutStatCard}><strong>9</strong><span>Ciudades activas</span></article>
          <article className={styles.aboutStatCard}><strong>98%</strong><span>Satisfaccion cliente</span></article>
        </div>
      </div>
    </section>
  );

  return (
    <div className={styles.page}>
      <nav className={`navbar navbar-expand-lg navbar-dark ${styles.navbar}`}>
        <div className={`container ${styles.navShell}`}>
          <NavLink className={`navbar-brand d-flex align-items-center gap-2 ${styles.brandButton}`} to="/">
            <img src="/logoBudgetCar.png" alt="Budget Car" className={styles.navLogo} />
            <span>Budget Car</span>
          </NavLink>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#publicNav">
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse" id="publicNav">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item"><NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? styles.activeNavLink : ''}`} end>Inicio</NavLink></li>
              <li className="nav-item"><NavLink to="/vehiculos" className={({ isActive }) => `nav-link ${isActive ? styles.activeNavLink : ''}`}>Vehiculos</NavLink></li>
              {isClienteLogged ? (
                <li className="nav-item">
                  <NavLink to="/mis-reservas" className={({ isActive }) => `nav-link ${isActive ? styles.activeNavLink : ''}`}>
                    Reservas
                  </NavLink>
                </li>
              ) : (
                <>
                  <li className="nav-item"><NavLink to="/localidades" className={({ isActive }) => `nav-link ${isActive ? styles.activeNavLink : ''}`}>Localidades</NavLink></li>
                  <li className="nav-item"><NavLink to="/acerca" className={({ isActive }) => `nav-link ${isActive ? styles.activeNavLink : ''}`}>Acerca de nosotros</NavLink></li>
                </>
              )}
            </ul>
            <div className={`d-flex flex-wrap gap-2 align-items-center justify-content-lg-end ${styles.navAuth}`}>
              {session?.token ? (
                <>
                  <span className={styles.sessionLabel}>
                    {session?.usuario?.username || session?.usuario?.correo || 'Sesion activa'}
                  </span>
                  <button
                    className={`btn btn-outline-light btn-sm ${styles.navGhostBtn}`}
                    type="button"
                    onClick={() => onLogout?.()}
                  >
                    Salir
                  </button>
                </>
              ) : (
                <button
                  className={`btn ${styles.adminButton}`}
                  type="button"
                  onClick={() => navigate('/admin/login')}
                >
                  Iniciar sesión
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {currentPath === '/' ? renderInicio() : null}
      {currentPath === '/vehiculos' ? renderVehiculos() : null}
      {currentPath === '/localidades' ? renderLocalidades() : null}
      {currentPath === '/acerca' ? renderAcerca() : null}

      <footer className={styles.footer}>
        <div className="container d-flex flex-column flex-md-row justify-content-between gap-2">
          <span>Budget Car © {new Date().getFullYear()} - Todos los derechos reservados.</span>
          <span>Alquiler de autos rapido, confiable y sin complicaciones.</span>
        </div>
      </footer>
    </div>
  );
}

export default PublicMarketplacePage;
