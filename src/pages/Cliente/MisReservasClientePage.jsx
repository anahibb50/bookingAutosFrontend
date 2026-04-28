import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  getReservaById,
  getMisReservasCliente,
  listConductores,
  listVehiculos,
  sessionHasRole,
  getStoredSession,
} from '../../api/services/api';
import styles from './CrearReservaPage.module.css';
import marketplaceStyles from '../Public/PublicMarketplacePage.module.css';
import pageStyles from './MisReservasClientePage.module.css';

function normalizeHoraText(value) {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  const part = raw.includes(':') ? raw : raw.replace('T', ' ');
  const chunks = part.split(':');
  if (chunks.length < 2) return raw;
  const hh = String(chunks[0]).padStart(2, '0');
  const mm = String(chunks[1]).padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatDateWithHora(fechaValue, horaValue) {
  if (!fechaValue) return '—';
  const d = new Date(fechaValue);
  const dateText = Number.isNaN(d.getTime())
    ? String(fechaValue).slice(0, 10)
    : d.toLocaleDateString('es-EC', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const horaText = normalizeHoraText(horaValue);
  return horaText ? `${dateText}, ${horaText}` : dateText;
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
}

function extractApiData(response) {
  if (!response || typeof response !== 'object') return response;
  return response.data ?? response.Data ?? response;
}

function estadoBadge(estadoRaw) {
  const code = String(estadoRaw || '').trim().toUpperCase();
  if (code === 'CON' || code === 'CONFIRMADA') return { label: 'Confirmada', className: pageStyles.badgeCon };
  if (code === 'CAN' || code === 'CANCELADA') return { label: 'Cancelada', className: pageStyles.badgeCan };
  return { label: 'Pendiente', className: pageStyles.badgePen };
}

function MisReservasClientePage({ session: sessionProp, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const session = sessionProp ?? getStoredSession();
  const flashSuccess = location.state?.flashSuccess;
  const [showFlash, setShowFlash] = useState(Boolean(flashSuccess));

  const [items, setItems] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const ok = useMemo(() => Boolean(session?.token && sessionHasRole('CLIENTE', session)), [session]);

  useEffect(() => {
    if (!flashSuccess) return;
    setShowFlash(true);
    const t = setTimeout(() => setShowFlash(false), 5000);
    return () => clearTimeout(t);
  }, [flashSuccess]);

  useEffect(() => {
    if (!ok) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [res, vehRes, condRes] = await Promise.all([
          getMisReservasCliente(),
          listVehiculos(),
          listConductores(),
        ]);
        const listRaw = extractApiData(res);
        const vehRaw = extractApiData(vehRes);
        const condRaw = extractApiData(condRes);
        const list = Array.isArray(listRaw) ? listRaw : [];
        const vehiculos = Array.isArray(vehRaw) ? vehRaw : [];
        const conductores = Array.isArray(condRaw) ? condRaw : [];

        const detailList = await Promise.all(
          list.map(async (r) => {
            const extrasBase = r?.extras ?? r?.Extras;
            const conductoresBase = r?.conductores ?? r?.Conductores;
            if (Array.isArray(extrasBase) || Array.isArray(conductoresBase)) return r;
            const id = r?.id ?? r?.Id;
            if (!id) return r;
            try {
              const detRes = await getReservaById(id);
              const det = extractApiData(detRes);
              return { ...r, ...det };
            } catch {
              return r;
            }
          })
        );

        const vehMap = vehiculos.reduce((acc, v) => {
          acc[String(v?.id ?? v?.Id)] = v?.modelo ?? v?.Modelo ?? '';
          return acc;
        }, {});
        const condMap = conductores.reduce((acc, c) => {
          const id = String(c?.id ?? c?.Id ?? '');
          const nombre = [c?.nombre1, c?.nombre2, c?.apellido1, c?.apellido2]
            .filter(Boolean)
            .join(' ')
            .trim();
          acc[id] = nombre || `Conductor ${id}`;
          return acc;
        }, {});

        const enriched = detailList.map((r) => ({
          ...r,
          _codigo: r?.codigo ?? r?.Codigo ?? r?.guid ?? r?.Guid ?? `RES-${r?.id ?? r?.Id ?? ''}`,
          _estado: r?.estado ?? r?.Estado ?? '',
          _vehiculoNombre:
            r?.modeloVehiculo ??
            r?.ModeloVehiculo ??
            vehMap[String(r?.idVehiculo ?? r?.IdVehiculo ?? '')] ??
            'Vehiculo',
          _conductores: Array.isArray(r?.conductores ?? r?.Conductores)
            ? (r?.conductores ?? r?.Conductores).map((x) => {
                const id = String(x?.idConductor ?? x?.IdConductor ?? '');
                const rol = String(x?.rol ?? x?.Rol ?? '').toUpperCase();
                return {
                  nombre: condMap[id] || `Conductor ${id || '-'}`,
                  rol: rol || 'SEC',
                };
              })
            : [],
          _extras: Array.isArray(r?.extras ?? r?.Extras)
            ? (r?.extras ?? r?.Extras).map((x) => {
                const nombre = x?.nombreExtra ?? x?.NombreExtra ?? `Extra ${x?.idExtra ?? x?.IdExtra ?? ''}`;
                const cantidad = x?.cantidad ?? x?.Cantidad ?? 0;
                const subtotal = x?.subtotal ?? x?.Subtotal ?? 0;
                return { nombre, cantidad, subtotal };
              })
            : [],
          _inicioDisplay: formatDateWithHora(r?.fechaInicio ?? r?.FechaInicio, r?.horaInicio ?? r?.HoraInicio),
          _finDisplay: formatDateWithHora(r?.fechaFin ?? r?.FechaFin, r?.horaFin ?? r?.HoraFin),
        }));

        if (!cancelled) {
          setItems(enriched);
          setErrorMessage('');
        }
      } catch (e) {
        if (!cancelled) setErrorMessage(e.message || 'No se pudieron cargar tus reservas.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ok]);

  if (!session?.token || !sessionHasRole('CLIENTE', session)) {
    navigate('/admin/login', { replace: true });
    return null;
  }

  return (
    <div className={styles.page}>
      <nav className={`navbar navbar-expand-lg navbar-dark ${marketplaceStyles.navbar}`}>
        <div className={`container ${marketplaceStyles.navShell}`}>
          <NavLink className={`navbar-brand d-flex align-items-center gap-2 ${marketplaceStyles.brandButton}`} to="/">
            <img src="/logoBudgetCar.png" alt="Budget Car" className={marketplaceStyles.navLogo} />
            <span>Budget Car</span>
          </NavLink>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#misReservasNav">
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse" id="misReservasNav">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? marketplaceStyles.activeNavLink : ''}`} end>
                  Inicio
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/vehiculos" className={({ isActive }) => `nav-link ${isActive ? marketplaceStyles.activeNavLink : ''}`}>
                  Vehiculos
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/mis-reservas" className={({ isActive }) => `nav-link ${isActive ? marketplaceStyles.activeNavLink : ''}`}>
                  Reservas
                </NavLink>
              </li>
            </ul>
            <div className={`d-flex flex-wrap gap-2 align-items-center justify-content-lg-end ${marketplaceStyles.navAuth}`}>
              <span className={marketplaceStyles.sessionLabel}>
                {session?.usuario?.username || session?.usuario?.correo || 'Sesion activa'}
              </span>
              <button
                className={`btn btn-outline-light btn-sm ${marketplaceStyles.navGhostBtn}`}
                type="button"
                onClick={() => onLogout?.()}
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      </nav>
      <div className={`container ${styles.shell}`}>
        <div className={pageStyles.pageHeader}>
          <h1 className={pageStyles.title}>Mis Reservas</h1>
          <p className={pageStyles.subtitle}>Historial de tus alquileres</p>
        </div>
        {showFlash ? (
          <div className={pageStyles.successBanner}>
            <span className={pageStyles.successIcon}>✅</span>
            <span>¡Reserva Confirmada exitosamente!</span>
          </div>
        ) : null}
        {loading ? (
          <div className={`${styles.loadingBlock} py-4`}>
            <div className={styles.spinner} />
          </div>
        ) : null}
        {errorMessage ? <div className="alert alert-danger">{errorMessage}</div> : null}
        {!loading && !errorMessage && items.length === 0 ? (
          <div className={pageStyles.emptyState}>
            <div className={pageStyles.emptyIcon}>📅</div>
            <h2>Aún no tienes reservas</h2>
            <p>¡Explora nuestros vehículos y haz tu primera reserva!</p>
            <button type="button" className={pageStyles.emptyBtn} onClick={() => navigate('/vehiculos')}>
              Ver Vehículos
            </button>
          </div>
        ) : null}
        {!loading && !errorMessage && items.length > 0 ? (
          <div className={pageStyles.cardsWrap}>
            {items.map((r) => {
              const estado = estadoBadge(r._estado);
              return (
                <article key={r.id ?? r.codigo} className={pageStyles.resCard}>
                  <header className={pageStyles.cardHead}>
                    <div>
                      <h3 className={pageStyles.carTitle}>🚗 {r._vehiculoNombre}</h3>
                      <p className={pageStyles.codeText}>{r._codigo}</p>
                    </div>
                    <span className={`${pageStyles.statusBadge} ${estado.className}`}>{estado.label}</span>
                  </header>

                  <section className={pageStyles.cardGrid}>
                    <div>
                      <div className={pageStyles.sectionLabel}>📅 Fechas</div>
                      <p className={pageStyles.sectionValue}>{r._inicioDisplay} → {r._finDisplay}</p>
                    </div>
                    <div>
                      <div className={pageStyles.sectionLabel}>👤 Conductores</div>
                      {r._conductores?.length ? (
                        <div className={pageStyles.badgesWrap}>
                          {r._conductores.map((c, i) => (
                            <span key={i} className={pageStyles.driverBadge}>
                              {c.nombre} <span className={c.rol === 'PRI' ? pageStyles.rolePri : pageStyles.roleSec}>{c.rol}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className={pageStyles.emptyText}>Sin conductores</p>
                      )}
                    </div>
                    <div>
                      <div className={pageStyles.sectionLabel}>🎁 Extras</div>
                      {r._extras?.length ? (
                        <div className={pageStyles.listStack}>
                          {r._extras.map((x, i) => (
                            <p key={i} className={pageStyles.sectionValue}>
                              {x.nombre} x{x.cantidad} ({formatMoney(x.subtotal)})
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className={pageStyles.emptyText}>Sin extras</p>
                      )}
                    </div>
                  </section>

                  <footer className={pageStyles.cardFoot}>
                    <div>
                      <span className={pageStyles.moneyLabel}>Subtotal</span>
                      <strong>{formatMoney(r.subtotal ?? r.Subtotal)}</strong>
                    </div>
                    <div>
                      <span className={pageStyles.moneyLabel}>IVA</span>
                      <strong>{formatMoney(r.iva ?? r.Iva)}</strong>
                    </div>
                    <div>
                      <span className={pageStyles.moneyLabel}>TOTAL</span>
                      <strong className={pageStyles.totalValue}>{formatMoney(r.total ?? r.Total)}</strong>
                    </div>
                  </footer>
                </article>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default MisReservasClientePage;
