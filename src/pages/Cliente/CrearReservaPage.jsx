import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  crearReservaCliente,
  createConductor,
  getConductorByIdentificacion,
  getVehiculoById,
  listCategorias,
  listExtrasActivos,
  listLocalizaciones,
  sessionHasRole,
  getSessionIdCliente,
  getStoredSession,
  hydrateSessionIdClienteFromApi,
  verifyDisponibilidadReserva,
} from '../../api/services/api';
import styles from './CrearReservaPage.module.css';
import marketplaceStyles from '../Public/PublicMarketplacePage.module.css';

function normalizeExtra(item) {
  return {
    id: item?.id ?? item?.Id ?? 0,
    nombre: item?.nombre ?? item?.Nombre ?? 'Extra',
    descripcion: item?.descripcion ?? item?.Descripcion ?? '',
    valorUnitario: Number(item?.valorFijo ?? item?.ValorFijo ?? item?.precio ?? item?.Precio ?? 0) || 0,
  };
}

function normalizeVehiculoApi(item) {
  const precioBase =
    item?.precioBaseDia ??
    item?.PrecioBaseDia ??
    item?.precioPorDia ??
    item?.precioDia ??
    item?.precio ??
    0;
  return {
    id: item?.id ?? item?.Id ?? '',
    modelo: item?.modelo ?? item?.Modelo ?? 'Vehiculo',
    imagenUrl: item?.imagenUrl ?? item?.ImagenUrl ?? '',
    idCategoria: item?.idCategoria ?? item?.IdCategoria ?? '',
    idLocalizacion: item?.idLocalizacion ?? item?.IdLocalizacion ?? '',
    precioPorDia: Number(precioBase) || 0,
  };
}

function normalizeLocalizacion(item) {
  return {
    id: item?.id ?? '',
    nombre: item?.nombre ?? '',
  };
}

function combineDateTimeLocal(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const [y, m, d] = dateStr.split('-').map((n) => Number(n));
  const [hh, mm] = timeStr.split(':').map((n) => Number(n));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, Number.isFinite(hh) ? hh : 0, Number.isFinite(mm) ? mm : 0, 0, 0);
}

function toTimeSpanString(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function toLocalDateTimeString(date) {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  // Evita conversión a UTC (.toISOString) para no mover el día por zona horaria
  return `${y}-${mo}-${d}T${h}:${mi}:${s}`;
}

function calculateRentalDays(fechaInicio, horaInicio, fechaFin, horaFin) {
  if (!fechaInicio || !fechaFin) {
    return { ok: false, days: 0 };
  }
  const hi = horaInicio || '00:00';
  const hf = horaFin || '00:00';
  // Date local (sin UTC) para mantener el mismo criterio del backend
  const inicio = new Date(`${fechaInicio}T${hi}:00`);
  const fin = new Date(`${fechaFin}T${hf}:00`);
  const diffMs = fin.getTime() - inicio.getTime();
  if (diffMs <= 0) {
    return { ok: false, days: 0 };
  }
  const horas = diffMs / (1000 * 60 * 60);
  return { ok: true, days: Math.ceil(horas / 24) };
}

function formatMoney(n) {
  return Number(n || 0).toLocaleString('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });
}

function normalizeTipoIdentificacion(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'CED') return 'CEDULA';
  if (normalized === 'PAS') return 'PASAPORTE';
  return normalized;
}

function normalizeIdentificacionByTipo(tipoIdentificacion, identificacion) {
  const tipo = normalizeTipoIdentificacion(tipoIdentificacion);
  const value = String(identificacion || '').trim();
  if (tipo === 'CEDULA' || tipo === 'RUC') {
    const maxLength = tipo === 'CEDULA' ? 10 : 13;
    return value.replace(/\D/g, '').slice(0, maxLength);
  }
  if (tipo === 'PASAPORTE') {
    return value.replace(/[^A-Za-z0-9]/g, '').slice(0, 20);
  }
  return value.slice(0, 20);
}

function normalizeTelefono(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, 10);
}

function buildDateTimeForDisponibilidad(dateStr, timeStr, isEnd) {
  if (!dateStr) return '';
  const normalizedTime = (timeStr && String(timeStr).trim()) || (isEnd ? '23:59' : '00:00');
  return `${dateStr}T${normalizedTime}:00`;
}

function normalizeRolConductor(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'PRI' || normalized === 'TITULAR' || normalized === 'PRINCIPAL') return 'PRI';
  return 'SEC';
}

function isHttp403Error(error) {
  return String(error?.message || '').toUpperCase().includes('403');
}

const emptyTitularForm = {
  nombre1: '',
  nombre2: '',
  apellido1: '',
  apellido2: '',
  tipoIdentificacion: 'CEDULA',
  numeroIdentificacion: '',
  numeroLicencia: '',
  fechaVencimientoLicencia: '',
  edad: '',
  telefono: '',
  correo: '',
};

const emptyConductorAdicionalForm = {
  nombre1: '',
  nombre2: '',
  apellido1: '',
  apellido2: '',
  tipoIdentificacion: 'CEDULA',
  numeroIdentificacion: '',
  numeroLicencia: '',
  fechaVencimientoLicencia: '',
  edad: '',
  telefono: '',
  correo: '',
  rol: 'SEC',
};

const initialPaymentForm = {
  cardNumber: '',
  cardName: '',
  expiry: '',
  cvv: '',
};

function maskCardNumber(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function normalizeCardName(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z\s]/g, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, 50);
}

function maskExpiry(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function cardBrandFromNumber(maskedNumber) {
  const digits = String(maskedNumber || '').replace(/\D/g, '');
  if (digits.startsWith('4')) return 'VISA';
  if (digits.startsWith('5')) return 'MASTERCARD';
  return 'CARD';
}

function validatePaymentForm(form) {
  const errors = {};
  const cardDigits = String(form.cardNumber || '').replace(/\D/g, '');
  if (cardDigits.length !== 16) errors.cardNumber = 'La tarjeta debe tener 16 digitos.';

  const name = String(form.cardName || '').trim();
  if (name.length < 3 || name.length > 50) errors.cardName = 'Nombre: minimo 3 y maximo 50 caracteres.';

  const expiry = String(form.expiry || '').trim();
  const m = expiry.match(/^(\d{2})\/(\d{2})$/);
  if (!m) {
    errors.expiry = 'Formato invalido. Usa MM/AA.';
  } else {
    const mm = Number(m[1]);
    const yy = Number(m[2]);
    if (mm < 1 || mm > 12) {
      errors.expiry = 'Mes invalido (01-12).';
    } else {
      const now = new Date();
      const currentYear2 = now.getFullYear() % 100;
      const currentMonth = now.getMonth() + 1;
      if (yy < currentYear2 || (yy === currentYear2 && mm < currentMonth)) {
        errors.expiry = 'Tarjeta vencida.';
      }
    }
  }

  const cvv = String(form.cvv || '').replace(/\D/g, '');
  if (cvv.length !== 3) errors.cvv = 'El CVV debe tener 3 digitos.';
  return errors;
}

function collectTitularFormErrors(f) {
  const e = {};
  if (!String(f?.nombre1 || '').trim()) e.nombre1 = 'Nombre obligatorio.';
  if (!String(f?.apellido1 || '').trim()) e.apellido1 = 'Apellido obligatorio.';
  if (!String(f?.numeroLicencia || '').trim()) e.numeroLicencia = 'Licencia obligatoria.';
  if (!f?.fechaVencimientoLicencia) e.fechaVencimientoLicencia = 'Vencimiento de licencia obligatorio.';
  if (f?.edad === '' || f?.edad === undefined) e.edad = 'Edad obligatoria.';
  else if (!Number.isFinite(Number(f.edad)) || Number(f.edad) < 1) e.edad = 'Edad invalida.';
  if (!String(f?.telefono || '').trim()) e.telefono = 'Telefono obligatorio.';
  else if (normalizeTelefono(f.telefono).length !== 10) e.telefono = 'El telefono debe tener 10 digitos.';
  if (!String(f?.correo || '').trim()) e.correo = 'Correo obligatorio.';
  const tipo = normalizeTipoIdentificacion(f?.tipoIdentificacion);
  const nid = normalizeIdentificacionByTipo(tipo, f?.numeroIdentificacion);
  if (!nid) e.numeroIdentificacion = 'Identificacion obligatoria.';
  else if (tipo === 'CEDULA' && nid.length !== 10) e.numeroIdentificacion = 'Cedula: exactamente 10 digitos.';
  else if (tipo === 'RUC' && nid.length !== 13) e.numeroIdentificacion = 'RUC: exactamente 13 digitos.';
  else if (tipo === 'PASAPORTE' && (nid.length < 7 || nid.length > 20)) {
    e.numeroIdentificacion = 'Pasaporte: entre 7 y 20 caracteres alfanumericos.';
  }
  return e;
}

function CrearReservaPage({ session: sessionProp, onLogout }) {
  const navigate = useNavigate();
  const locationRouter = useLocation();
  const { idVehiculo } = useParams();
  const [searchParams] = useSearchParams();
  const session = sessionProp ?? getStoredSession();
  const inReservasNav = locationRouter.pathname.startsWith('/reserva') || locationRouter.pathname.startsWith('/mis-reservas');

  const [idCliente, setIdCliente] = useState(null);

  const [loadPhase, setLoadPhase] = useState('loading');
  const [loadError, setLoadError] = useState('');

  const [vehiculo, setVehiculo] = useState(null);
  const [categoriaNombre, setCategoriaNombre] = useState('');
  const [localizaciones, setLocalizaciones] = useState([]);
  const [extrasCatalog, setExtrasCatalog] = useState([]);

  const [idLocRecogida, setIdLocRecogida] = useState('');
  const [idLocEntrega, setIdLocEntrega] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [fechaFin, setFechaFin] = useState('');
  const [horaFin, setHoraFin] = useState('18:00');
  const [descripcion, setDescripcion] = useState('');

  const [extraCantidades, setExtraCantidades] = useState({});

  const [titularResuelto, setTitularResuelto] = useState(null);
  const [titularForm, setTitularForm] = useState(() => ({ ...emptyTitularForm }));
  const [titularVerifyMessage, setTitularVerifyMessage] = useState('');
  const [verifyingTitular, setVerifyingTitular] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState('');
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const [conductoresAdicionales, setConductoresAdicionales] = useState([]);

  const [formErrors, setFormErrors] = useState({});
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState(() => ({ ...initialPaymentForm }));
  const [paymentErrors, setPaymentErrors] = useState({});
  const [showCvv, setShowCvv] = useState(false);
  const [cardFlipped, setCardFlipped] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    document.title = 'Crear reserva · Budget Car';
  }, []);

  useEffect(() => {
    const ses = getStoredSession();
    const correoSes = String(ses?.usuario?.correo ?? ses?.usuario?.email ?? '').trim();
    if (correoSes) {
      setTitularForm((prev) => ({ ...prev, correo: prev.correo?.trim() ? prev.correo : correoSes }));
    }
  }, []);

  const locationState = locationRouter.state ?? null;
  const idLocQuery = searchParams.get('idLoc');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const live = getStoredSession();
      const effective = sessionProp ?? live;
      let sid =
        getSessionIdCliente(live) ?? getSessionIdCliente(sessionProp ?? null);
      if (!sid && effective?.token && sessionHasRole('CLIENTE', effective)) {
        await hydrateSessionIdClienteFromApi();
        sid = getSessionIdCliente(getStoredSession());
      }
      if (!sid) {
        setLoadPhase('error');
        setLoadError(
          'No se pudo obtener el id de cliente. Cierra sesion y vuelve a entrar, o verifica que el login devuelva idCliente y que el correo de tu cuenta coincida con un cliente en el sistema.'
        );
        return;
      }
      if (cancelled) return;
      setIdCliente(sid);

      try {
        setLoadPhase('loading');
        const [locRes, exRes, vRes, catRes] = await Promise.all([
          listLocalizaciones(),
          listExtrasActivos(),
          getVehiculoById(Number(idVehiculo)),
          listCategorias(),
        ]);

        if (cancelled) return;

        const locs = Array.isArray(locRes?.data) ? locRes.data.map(normalizeLocalizacion) : [];
        setLocalizaciones(locs);

        const exList = Array.isArray(exRes?.data) ? exRes.data.map(normalizeExtra) : [];
        setExtrasCatalog(exList);

        const categoriasArr = Array.isArray(catRes?.data) ? catRes.data : [];
        const catMap = categoriasArr.reduce((acc, c) => {
          acc[String(c.id ?? c.Id)] = c.nombre ?? c.Nombre ?? '';
          return acc;
        }, {});

        const rawV = vRes?.data ?? vRes;
        const v = normalizeVehiculoApi(rawV);
        setVehiculo(v);

        const fromQsCat = searchParams.get('categoria');
        const fromState = locationState?.vehiculo;
        const catName =
          (fromQsCat && String(fromQsCat)) ||
          catMap[String(v.idCategoria)] ||
          '';
        setCategoriaNombre(catName);

        const presetLocRaw =
          (idLocQuery && String(idLocQuery).trim()) ||
          (fromState?.idLocalizacion != null && String(fromState.idLocalizacion).trim() !== ''
            ? String(fromState.idLocalizacion)
            : '') ||
          (v.idLocalizacion != null && String(v.idLocalizacion).trim() !== '' ? String(v.idLocalizacion) : '') ||
          '';
        const idSet = new Set(locs.map((l) => String(l.id)));
        const pickLoc = (raw) => {
          if (raw && idSet.has(String(raw))) return String(raw);
          return locs[0]?.id ? String(locs[0].id) : '';
        };
        const chosen = pickLoc(presetLocRaw);
        setIdLocRecogida(chosen);
        setIdLocEntrega(chosen);

        const today = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const f0 = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
        setFechaInicio(f0);
        const t1 = new Date(today);
        t1.setDate(t1.getDate() + 1);
        const f1 = `${t1.getFullYear()}-${pad(t1.getMonth() + 1)}-${pad(t1.getDate())}`;
        setFechaFin(f1);

        setLoadPhase('ready');
      } catch (e) {
        if (!cancelled) {
          setLoadPhase('error');
          setLoadError(e.message || 'No se pudo cargar la informacion.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // No incluir getStoredSession() en deps: devuelve un objeto nuevo cada lectura y re-dispararia el efecto.
    // idLocQuery refleja ?idLoc= tras login desde marketplace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionProp, idVehiculo, idLocQuery]);

  const inicioDt = useMemo(
    () => combineDateTimeLocal(fechaInicio, horaInicio),
    [fechaInicio, horaInicio]
  );
  const finDt = useMemo(() => combineDateTimeLocal(fechaFin, horaFin), [fechaFin, horaFin]);

  const { days, daysOk } = useMemo(() => {
    const r = calculateRentalDays(fechaInicio, horaInicio, fechaFin, horaFin);
    return { days: r.days, daysOk: r.ok };
  }, [fechaInicio, horaInicio, fechaFin, horaFin]);

  const precioDia = vehiculo?.precioPorDia ?? 0;

  const totales = useMemo(() => {
    const tarifaBase = precioDia * days;
    const extraLines = [];
    let sumExtras = 0;
    extrasCatalog.forEach((ex) => {
      const q = extraCantidades[ex.id] || 0;
      if (q > 0) {
        const sub = ex.valorUnitario * q * days;
        sumExtras += sub;
        extraLines.push({ ...ex, cantidad: q, subtotal: sub });
      }
    });
    const subtotal = tarifaBase + sumExtras;
    const iva = subtotal * 0.15;
    const total = subtotal + iva;
    return { tarifaBase, extraLines, subtotal, iva, total };
  }, [days, extraCantidades, extrasCatalog, precioDia]);

  const locNombre = (id) => localizaciones.find((l) => String(l.id) === String(id))?.nombre || '—';

  const setExtraQty = (id, delta) => {
    setExtraCantidades((prev) => {
      const cur = prev[id] || 0;
      const next = Math.max(0, cur + delta);
      return { ...prev, [id]: next };
    });
  };

  const agregarConductorAdicional = () => {
    setConductoresAdicionales((prev) => [...prev, { ...emptyConductorAdicionalForm }]);
  };

  const eliminarConductorAdicional = (idx) => {
    setConductoresAdicionales((prev) => prev.filter((_, i) => i !== idx));
  };

  const validateForm = () => {
    const e = {};
    if (!idLocRecogida) e.idLocRecogida = 'Obligatorio.';
    if (!idLocEntrega) e.idLocEntrega = 'Obligatorio.';
    if (!fechaInicio || !fechaFin) e.fechas = 'Indica fechas completas.';
    if (inicioDt && finDt && finDt <= inicioDt) e.fechas = 'La fecha fin debe ser posterior al inicio.';
    if (!daysOk) e.fechas = e.fechas || 'Combinacion de fechas invalida.';
    if (!titularResuelto?.idConductor) {
      const terr = collectTitularFormErrors(titularForm);
      if (Object.keys(terr).length) {
        e.titular = 'Completa o corrige los datos del conductor titular.';
        Object.assign(
          e,
          Object.fromEntries(Object.entries(terr).map(([k, v]) => [`tf_${k}`, v]))
        );
      }
    }
    return e;
  };

  const armarConductoresPayload = (idTitular, adicionales = []) => {
    return [
      {
        idConductor: Number(idTitular),
        rol: 'PRI',
        esPrincipal: true,
        observaciones: null,
      },
      ...adicionales.map((s) => ({
        idConductor: Number(s.idConductor),
        rol: normalizeRolConductor(s.rol),
        esPrincipal: false,
        observaciones: null,
      })),
    ];
  };

  const verificarConductorTitular = async () => {
    setTitularVerifyMessage('');
    const tipo = normalizeTipoIdentificacion(titularForm.tipoIdentificacion);
    const numId = normalizeIdentificacionByTipo(tipo, titularForm.numeroIdentificacion);
    if (!numId) {
      setTitularVerifyMessage('Indica tipo y numero de identificacion antes de verificar.');
      return;
    }
    setVerifyingTitular(true);
    try {
      let existing = null;
      try {
        const r = await getConductorByIdentificacion(numId);
        existing = r?.data ?? r;
      } catch {
        existing = null;
      }
      if (existing?.id) {
        const nombre = [existing.nombre1, existing.nombre2, existing.apellido1, existing.apellido2]
          .filter(Boolean)
          .join(' ')
          .trim();
        setTitularResuelto({
          idConductor: existing.id,
          nombre: nombre || 'Conductor titular',
          identificacion: existing.numeroIdentificacion ?? numId,
        });
        setTitularVerifyMessage('Conductor encontrado: usaremos este registro al confirmar la reserva.');
      } else {
        setTitularResuelto(null);
        setTitularVerifyMessage(
          'No hay conductor con esa identificacion. Completa nombre, licencia y demas datos; se creara al confirmar.'
        );
      }
    } finally {
      setVerifyingTitular(false);
    }
  };

  const handleVerificarDisponibilidad = async () => {
    setAvailabilityMessage('');
    if (!fechaInicio || !fechaFin) {
      setAvailabilityMessage('Indica fecha de inicio y fecha de fin.');
      return;
    }
    if (!daysOk) {
      setAvailabilityMessage('Las fechas y horas no forman un rango valido.');
      return;
    }
    setCheckingAvailability(true);
    try {
      const fi = buildDateTimeForDisponibilidad(fechaInicio, horaInicio, false);
      const ff = buildDateTimeForDisponibilidad(fechaFin, horaFin, true);
      const disp = await verifyDisponibilidadReserva(Number(idVehiculo), fi, ff);
      if (disp?.data) {
        setAvailabilityMessage('Vehiculo disponible para el rango de fechas y horas seleccionado.');
      } else {
        setAvailabilityMessage('Vehiculo NO disponible en ese rango. Cambia fechas u horas e intenta de nuevo.');
      }
    } catch (err) {
      setAvailabilityMessage(err.message || 'No se pudo verificar la disponibilidad.');
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleTitularFormChange = (event) => {
    const { name, value } = event.target;
    if (name === 'tipoIdentificacion' || name === 'numeroIdentificacion') {
      setTitularResuelto(null);
      setTitularVerifyMessage('');
    }
    if (name === 'telefono') {
      setTitularForm((prev) => ({ ...prev, telefono: value.replace(/\D/g, '').slice(0, 10) }));
      return;
    }
    if (name === 'numeroIdentificacion') {
      setTitularForm((prev) => {
        const tipo = normalizeTipoIdentificacion(prev.tipoIdentificacion);
        if (tipo === 'CEDULA' || tipo === 'RUC') {
          const max = tipo === 'CEDULA' ? 10 : 13;
          return { ...prev, numeroIdentificacion: value.replace(/\D/g, '').slice(0, max) };
        }
        return { ...prev, numeroIdentificacion: value.replace(/[^A-Za-z0-9]/g, '').slice(0, 20) };
      });
      return;
    }
    if (name === 'tipoIdentificacion') {
      setTitularForm((prev) => ({
        ...prev,
        tipoIdentificacion: value,
        numeroIdentificacion: '',
      }));
      return;
    }
    if (name === 'edad') {
      const digits = value.replace(/\D/g, '').slice(0, 3);
      setTitularForm((prev) => ({ ...prev, edad: digits }));
      return;
    }
    setTitularForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleConductorAdicionalChange = (index, event) => {
    const { name, value } = event.target;
    setConductoresAdicionales((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        if (name === 'telefono') return { ...row, telefono: value.replace(/\D/g, '').slice(0, 10) };
        if (name === 'edad') return { ...row, edad: value.replace(/\D/g, '').slice(0, 3) };
        if (name === 'numeroIdentificacion') {
          const tipo = normalizeTipoIdentificacion(row.tipoIdentificacion);
          if (tipo === 'CEDULA' || tipo === 'RUC') {
            const max = tipo === 'CEDULA' ? 10 : 13;
            return { ...row, numeroIdentificacion: value.replace(/\D/g, '').slice(0, max) };
          }
          return { ...row, numeroIdentificacion: value.replace(/[^A-Za-z0-9]/g, '').slice(0, 20) };
        }
        if (name === 'tipoIdentificacion') {
          return { ...row, tipoIdentificacion: value, numeroIdentificacion: '' };
        }
        if (name === 'rol') {
          return { ...row, rol: normalizeRolConductor(value) };
        }
        return { ...row, [name]: value };
      })
    );
  };

  const resolveConductorFromForm = async (form, errorPrefix = 'Conductor') => {
    const tipo = normalizeTipoIdentificacion(form.tipoIdentificacion);
    const numId = normalizeIdentificacionByTipo(tipo, form.numeroIdentificacion);
    if (!numId) {
      throw new Error(`${errorPrefix}: identificacion obligatoria.`);
    }
    let existing = null;
    try {
      const r = await getConductorByIdentificacion(numId);
      existing = r?.data ?? r;
    } catch {
      existing = null;
    }
    if (existing?.id) {
      return { idConductor: existing.id, rol: normalizeRolConductor(form.rol || 'SEC') };
    }
    const terr = collectTitularFormErrors(form);
    if (Object.keys(terr).length) {
      throw new Error(`${errorPrefix}: ${Object.values(terr)[0]}`);
    }
    const payload = {
      nombre1: form.nombre1.trim(),
      nombre2: form.nombre2.trim() || null,
      apellido1: form.apellido1.trim(),
      apellido2: form.apellido2.trim() || null,
      tipoIdentificacion: tipo,
      numeroIdentificacion: numId,
      numeroLicencia: form.numeroLicencia.trim(),
      fechaVencimientoLicencia: form.fechaVencimientoLicencia,
      edad: Number(form.edad),
      telefono: normalizeTelefono(form.telefono),
      correo: form.correo.trim(),
    };
    let createRes;
    try {
      createRes = await createConductor(payload);
    } catch (error) {
      if (isHttp403Error(error)) {
        throw new Error(
          `${errorPrefix}: sin permisos para crear conductor (HTTP 403).`
        );
      }
      throw error;
    }
    const row = createRes?.data ?? createRes;
    const newId = row?.id ?? row?.Id;
    if (!newId) throw new Error(`${errorPrefix}: no se pudo obtener id del conductor creado.`);
    return { idConductor: newId, rol: normalizeRolConductor(form.rol || 'SEC') };
  };

  const resolveTitularConductorId = async () => {
    if (titularResuelto?.idConductor) return titularResuelto.idConductor;
    const terr = collectTitularFormErrors(titularForm);
    if (Object.keys(terr).length) {
      throw new Error(Object.values(terr)[0] || 'Datos del conductor titular incompletos.');
    }
    const tipo = normalizeTipoIdentificacion(titularForm.tipoIdentificacion);
    const numId = normalizeIdentificacionByTipo(tipo, titularForm.numeroIdentificacion);
    let existing = null;
    try {
      const r = await getConductorByIdentificacion(numId);
      existing = r?.data ?? r;
    } catch {
      existing = null;
    }
    if (existing?.id) {
      const nombre = [existing.nombre1, existing.nombre2, existing.apellido1, existing.apellido2]
        .filter(Boolean)
        .join(' ')
        .trim();
      setTitularResuelto({
        idConductor: existing.id,
        nombre: nombre || 'Conductor titular',
        identificacion: existing.numeroIdentificacion ?? numId,
      });
      return existing.id;
    }
    const payload = {
      nombre1: titularForm.nombre1.trim(),
      nombre2: titularForm.nombre2.trim() || null,
      apellido1: titularForm.apellido1.trim(),
      apellido2: titularForm.apellido2.trim() || null,
      tipoIdentificacion: tipo,
      numeroIdentificacion: numId,
      numeroLicencia: titularForm.numeroLicencia.trim(),
      fechaVencimientoLicencia: titularForm.fechaVencimientoLicencia,
      edad: Number(titularForm.edad),
      telefono: normalizeTelefono(titularForm.telefono),
      correo: titularForm.correo.trim(),
    };
    let createRes;
    try {
      createRes = await createConductor(payload);
    } catch (error) {
      if (isHttp403Error(error)) {
        throw new Error(
          'No tienes permisos para crear conductores con tu rol CLIENTE (HTTP 403). El backend debe permitir esta accion o exponer un endpoint para cliente.'
        );
      }
      throw error;
    }
    const row = createRes?.data ?? createRes;
    const newId = row?.id ?? row?.Id;
    if (!newId) {
      throw new Error('El servidor no devolvio el id del conductor creado.');
    }
    const nombre = [titularForm.nombre1, titularForm.nombre2, titularForm.apellido1, titularForm.apellido2]
      .filter(Boolean)
      .join(' ')
      .trim();
    setTitularResuelto({
      idConductor: newId,
      nombre: nombre || 'Conductor titular',
      identificacion: numId,
    });
    return newId;
  };

  const armarExtrasPayload = () => {
    const out = [];
    extrasCatalog.forEach((ex) => {
      const c = extraCantidades[ex.id] || 0;
      if (c > 0) out.push({ idExtra: ex.id, cantidad: c });
    });
    return out;
  };

  const intentarConfirmar = () => {
    const ve = validateForm();
    setFormErrors(ve);
    if (Object.keys(ve).length) return;
    setSubmitError('');
    setPaymentOpen(true);
  };

  const handlePaymentChange = (event) => {
    const { name, value } = event.target;
    setPaymentErrors((prev) => ({ ...prev, [name]: '' }));
    setSubmitError('');
    if (name === 'cardNumber') {
      setPaymentForm((prev) => ({ ...prev, cardNumber: maskCardNumber(value) }));
      return;
    }
    if (name === 'cardName') {
      setPaymentForm((prev) => ({ ...prev, cardName: normalizeCardName(value) }));
      return;
    }
    if (name === 'expiry') {
      setPaymentForm((prev) => ({ ...prev, expiry: maskExpiry(value) }));
      return;
    }
    if (name === 'cvv') {
      const cvv = String(value || '').replace(/\D/g, '').slice(0, 3);
      setPaymentForm((prev) => ({ ...prev, cvv }));
      return;
    }
  };

  const enviarReserva = async () => {
    setSubmitError('');
    setSubmitting(true);
    try {
      const idTitular = await resolveTitularConductorId();
      const adicionalesResueltos = await Promise.all(
        conductoresAdicionales.map((c, idx) => resolveConductorFromForm(c, `Conductor adicional ${idx + 1}`))
      );
      const fi = buildDateTimeForDisponibilidad(fechaInicio, horaInicio, false);
      const ff = buildDateTimeForDisponibilidad(fechaFin, horaFin, true);
      const disp = await verifyDisponibilidadReserva(Number(idVehiculo), fi, ff);
      if (!disp?.data) {
        setSubmitError(
          'El vehiculo no esta disponible en las fechas y horas seleccionadas. Cambia el rango e intenta de nuevo.'
        );
        return;
      }

      const calc = calculateRentalDays(fechaInicio, horaInicio, fechaFin, horaFin);
      if (!calc.ok) {
        throw new Error('Las fechas/horas no forman un rango valido para calcular dias.');
      }

      const payload = {
        idCliente: Number(idCliente),
        idVehiculo: Number(idVehiculo),
        idLocalizacionRecogida: Number(idLocRecogida),
        idLocalizacionEntrega: Number(idLocEntrega),
        cantidadDias: calc.days,
        fechaInicio: toLocalDateTimeString(inicioDt),
        fechaFin: toLocalDateTimeString(finDt),
        horaInicio: toTimeSpanString(inicioDt),
        horaFin: toTimeSpanString(finDt),
        origenCanal: 'WEB',
        extras: armarExtrasPayload(),
        conductores: armarConductoresPayload(idTitular, adicionalesResueltos),
      };
      const dTrim = descripcion.trim();
      if (dTrim) payload.descripcion = dTrim;

      // Debug: validar qué días y fechas se envían realmente al backend
      // eslint-disable-next-line no-console
      console.log('[ReservaDebug] calculoDias', {
        fechaInicio,
        horaInicio,
        fechaFin,
        horaFin,
        daysUI: days,
        daysPayload: calc.days,
        inicioLocal: toLocalDateTimeString(inicioDt),
        finLocal: toLocalDateTimeString(finDt),
      });
      // eslint-disable-next-line no-console
      console.log('[ReservaDebug] payloadReserva', payload);

      await crearReservaCliente(payload);
      setPaymentOpen(false);
      navigate('/mis-reservas', {
        replace: true,
        state: { flashSuccess: '¡Reserva Confirmada!' },
      });
    } catch (err) {
      setSubmitError(err.message || 'No se pudo crear la reserva.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReservarConPago = () => {
    const ve = validatePaymentForm(paymentForm);
    setPaymentErrors(ve);
    if (Object.keys(ve).length) return;
    enviarReserva();
  };

  const resumenConductoresLista = useMemo(() => {
    const titEt =
      titularResuelto?.nombre ||
      [titularForm.nombre1, titularForm.nombre2, titularForm.apellido1, titularForm.apellido2]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      'Conductor titular';
    return [
      { etiqueta: titEt, rol: 'PRI' },
      ...conductoresAdicionales.map((s, idx) => ({
        etiqueta:
          [s.nombre1, s.nombre2, s.apellido1, s.apellido2].filter(Boolean).join(' ').trim() ||
          `Conductor adicional ${idx + 1}`,
        rol: normalizeRolConductor(s.rol),
      })),
    ];
  }, [titularResuelto, titularForm, conductoresAdicionales]);

  const paymentValid = useMemo(
    () => Object.keys(validatePaymentForm(paymentForm)).length === 0,
    [paymentForm]
  );

  if (!session?.token || !sessionHasRole('CLIENTE', session)) {
    navigate('/admin/login', { replace: true, state: { vehiculoId: idVehiculo } });
    return null;
  }

  if (loadPhase === 'loading' || loadPhase === '') {
    return (
      <div className={`${styles.page} ${styles.loadingBlock}`}>
        <div className={styles.spinner} aria-busy />
      </div>
    );
  }

  if (loadPhase === 'error') {
    return (
      <div className={`${styles.page} ${styles.shell}`}>
        <div className="container">
          <div className={styles.card}>
            <p>{loadError}</p>
            <button type="button" className={styles.ctaLarge} onClick={() => navigate('/')}>
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <nav className={`navbar navbar-expand-lg navbar-dark ${marketplaceStyles.navbar}`}>
        <div className={`container ${marketplaceStyles.navShell}`}>
          <NavLink className={`navbar-brand d-flex align-items-center gap-2 ${marketplaceStyles.brandButton}`} to="/">
            <img src="/logoBudgetCar.png" alt="Budget Car" className={marketplaceStyles.navLogo} />
            <span>Budget Car</span>
          </NavLink>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#crearReservaNav">
            <span className="navbar-toggler-icon" />
          </button>
          <div className="collapse navbar-collapse" id="crearReservaNav">
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
                <NavLink
                  to="/mis-reservas"
                  className={({ isActive }) => `nav-link ${isActive || inReservasNav ? marketplaceStyles.activeNavLink : ''}`}
                >
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
        <div className={styles.layout}>
          <div>
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Vehiculo seleccionado</h2>
              <div className={styles.carRow}>
                <img
                  className={styles.carImg}
                  src={vehiculo?.imagenUrl || 'https://via.placeholder.com/320x200?text=Vehiculo'}
                  alt=""
                />
                <div className={styles.carMeta}>
                  <p className={styles.carName}>{vehiculo?.modelo}</p>
                  <p className={styles.carSub}>
                    {categoriaNombre || 'Categoria'} · {formatMoney(precioDia)} / dia
                  </p>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Fechas y ubicacion</h2>
              <div className={styles.formGrid}>
                <div>
                  <span className={styles.label}>Localizacion de recogida</span>
                  <select
                    className={`${styles.select} ${formErrors.idLocRecogida ? styles.inputError : ''}`}
                    value={idLocRecogida}
                    onChange={(e) => setIdLocRecogida(e.target.value)}
                    disabled
                  >
                    <option value="">Selecciona</option>
                    {localizaciones.map((l) => (
                      <option key={l.id} value={String(l.id)}>
                        {l.nombre}
                      </option>
                    ))}
                  </select>
                  <small className="text-muted d-block mt-1">
                    La recogida es fija segun la localizacion del vehiculo seleccionado.
                  </small>
                </div>
                <div>
                  <span className={styles.label}>Localizacion de entrega</span>
                  <select
                    className={`${styles.select} ${formErrors.idLocEntrega ? styles.inputError : ''}`}
                    value={idLocEntrega}
                    onChange={(e) => setIdLocEntrega(e.target.value)}
                  >
                    <option value="">Selecciona</option>
                    {localizaciones.map((l) => (
                      <option key={l.id} value={String(l.id)}>
                        {l.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.twoCol}>
                  <div>
                    <span className={styles.label}>Fecha inicio</span>
                    <input
                      className={styles.input}
                      type="date"
                      value={fechaInicio}
                      onChange={(e) => setFechaInicio(e.target.value)}
                    />
                  </div>
                  <div>
                    <span className={styles.label}>Hora inicio</span>
                    <input
                      className={styles.input}
                      type="time"
                      value={horaInicio}
                      onChange={(e) => setHoraInicio(e.target.value)}
                    />
                  </div>
                </div>
                <div className={styles.twoCol}>
                  <div>
                    <span className={styles.label}>Fecha fin</span>
                    <input
                      className={styles.input}
                      type="date"
                      value={fechaFin}
                      onChange={(e) => setFechaFin(e.target.value)}
                    />
                  </div>
                  <div>
                    <span className={styles.label}>Hora fin</span>
                    <input
                      className={styles.input}
                      type="time"
                      value={horaFin}
                      onChange={(e) => setHoraFin(e.target.value)}
                    />
                  </div>
                </div>
                {formErrors.fechas ? <span className={styles.errorText}>{formErrors.fechas}</span> : null}
                <div className={styles.badgeDays}>{daysOk ? `${days} dia(s)` : 'Selecciona fechas validas'}</div>
                <div style={{ gridColumn: '1 / -1', marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    className={styles.ctaLarge}
                    style={{ height: '44px', marginTop: 0, background: '#5c6b86', width: 'auto', paddingLeft: '1.25rem', paddingRight: '1.25rem' }}
                    onClick={handleVerificarDisponibilidad}
                    disabled={checkingAvailability}
                  >
                    {checkingAvailability ? 'Verificando...' : 'Verificar disponibilidad'}
                  </button>
                  {availabilityMessage ? (
                    <span className={availabilityMessage.includes('NO ') ? styles.errorText : 'text-success'} style={{ flex: '1 1 200px' }}>
                      {availabilityMessage}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Extras</h2>
              <div className={styles.extrasGrid}>
                {extrasCatalog.map((ex) => (
                  <div key={ex.id} className={styles.extraCard}>
                    <div className={styles.extraInfo}>
                      <h4>{ex.nombre}</h4>
                      <p>{ex.descripcion}</p>
                      <p style={{ marginTop: '0.35rem', fontWeight: 700 }}>{formatMoney(ex.valorUnitario)} / dia</p>
                    </div>
                    <div className={styles.counter}>
                      <button
                        type="button"
                        className={styles.counterBtn}
                        onClick={() => setExtraQty(ex.id, -1)}
                        aria-label="Menos"
                      >
                        −
                      </button>
                      <span className={styles.counterVal}>{extraCantidades[ex.id] || 0}</span>
                      <button
                        type="button"
                        className={styles.counterBtn}
                        onClick={() => setExtraQty(ex.id, 1)}
                        aria-label="Mas"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Conductores</h2>
              <p className="small text-muted" style={{ marginBottom: '0.75rem' }}>
                Completa los datos del conductor titular. Puedes comprobar si ya esta registrado con el boton &quot;Verificar identificacion&quot;; si no existe, se creara al confirmar la reserva.
              </p>

              {titularResuelto ? (
                <div className="alert alert-success py-2 d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                  <span>
                    Conductor titular listo: <strong>{titularResuelto.nombre}</strong> — {titularResuelto.identificacion}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                      setTitularResuelto(null);
                      setTitularVerifyMessage('');
                    }}
                  >
                    Cambiar conductor
                  </button>
                </div>
              ) : null}

              {titularVerifyMessage && !titularResuelto ? (
                <div className={`alert ${titularVerifyMessage.includes('No hay') ? 'alert-warning' : 'alert-info'} py-2 mb-2`}>
                  {titularVerifyMessage}
                </div>
              ) : null}

              {!titularResuelto ? (
                <div className={styles.formGrid}>
                  <div className={styles.twoCol} style={{ gridColumn: '1 / -1' }}>
                    <div>
                      <span className={styles.label}>Tipo de identificacion</span>
                      <select
                        className={`${styles.select} ${formErrors.tf_tipoIdentificacion ? styles.inputError : ''}`}
                        name="tipoIdentificacion"
                        value={titularForm.tipoIdentificacion}
                        onChange={handleTitularFormChange}
                      >
                        <option value="CEDULA">Cedula</option>
                        <option value="RUC">RUC</option>
                        <option value="PASAPORTE">Pasaporte</option>
                      </select>
                    </div>
                    <div>
                      <span className={styles.label}>Numero de identificacion</span>
                      <input
                        className={`${styles.input} ${formErrors.tf_numeroIdentificacion ? styles.inputError : ''}`}
                        name="numeroIdentificacion"
                        value={titularForm.numeroIdentificacion}
                        onChange={handleTitularFormChange}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  <div style={{ gridColumn: '1 / -1', marginBottom: '0.35rem' }}>
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={verificarConductorTitular}
                      disabled={verifyingTitular}
                    >
                      {verifyingTitular ? 'Verificando...' : 'Verificar identificacion'}
                    </button>
                  </div>
                  <div className={styles.twoCol} style={{ gridColumn: '1 / -1' }}>
                    <div>
                      <span className={styles.label}>Nombre 1</span>
                      <input
                        className={`${styles.input} ${formErrors.tf_nombre1 ? styles.inputError : ''}`}
                        name="nombre1"
                        value={titularForm.nombre1}
                        onChange={handleTitularFormChange}
                      />
                    </div>
                    <div>
                      <span className={styles.label}>Nombre 2</span>
                      <input className={styles.input} name="nombre2" value={titularForm.nombre2} onChange={handleTitularFormChange} />
                    </div>
                  </div>
                  <div className={styles.twoCol} style={{ gridColumn: '1 / -1' }}>
                    <div>
                      <span className={styles.label}>Apellido 1</span>
                      <input
                        className={`${styles.input} ${formErrors.tf_apellido1 ? styles.inputError : ''}`}
                        name="apellido1"
                        value={titularForm.apellido1}
                        onChange={handleTitularFormChange}
                      />
                    </div>
                    <div>
                      <span className={styles.label}>Apellido 2</span>
                      <input className={styles.input} name="apellido2" value={titularForm.apellido2} onChange={handleTitularFormChange} />
                    </div>
                  </div>
                  <div className={styles.twoCol} style={{ gridColumn: '1 / -1' }}>
                    <div>
                      <span className={styles.label}>Numero de licencia</span>
                      <input
                        className={`${styles.input} ${formErrors.tf_numeroLicencia ? styles.inputError : ''}`}
                        name="numeroLicencia"
                        value={titularForm.numeroLicencia}
                        onChange={handleTitularFormChange}
                      />
                    </div>
                    <div>
                      <span className={styles.label}>Vencimiento licencia</span>
                      <input
                        className={`${styles.input} ${formErrors.tf_fechaVencimientoLicencia ? styles.inputError : ''}`}
                        type="date"
                        name="fechaVencimientoLicencia"
                        value={titularForm.fechaVencimientoLicencia}
                        onChange={handleTitularFormChange}
                      />
                    </div>
                  </div>
                  <div className={styles.twoCol} style={{ gridColumn: '1 / -1' }}>
                    <div>
                      <span className={styles.label}>Edad</span>
                      <input
                        className={`${styles.input} ${formErrors.tf_edad ? styles.inputError : ''}`}
                        name="edad"
                        inputMode="numeric"
                        value={titularForm.edad}
                        onChange={handleTitularFormChange}
                      />
                    </div>
                    <div>
                      <span className={styles.label}>Telefono (10 digitos)</span>
                      <input
                        className={`${styles.input} ${formErrors.tf_telefono ? styles.inputError : ''}`}
                        name="telefono"
                        inputMode="numeric"
                        value={titularForm.telefono}
                        onChange={handleTitularFormChange}
                      />
                    </div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span className={styles.label}>Correo</span>
                    <input
                      className={`${styles.input} ${formErrors.tf_correo ? styles.inputError : ''}`}
                      type="email"
                      name="correo"
                      value={titularForm.correo}
                      onChange={handleTitularFormChange}
                      autoComplete="email"
                    />
                  </div>
                </div>
              ) : null}

              <div className={styles.searchRow}>
                <button type="button" className={styles.ctaLarge} style={{ height: '44px', marginTop: '0', background: '#5c6b86', width: 'auto' }} onClick={agregarConductorAdicional}>
                  Agregar conductor adicional
                </button>
              </div>
              {conductoresAdicionales.map((c, idx) => (
                <div key={`cad-${idx}`} className={`${styles.card} mt-2`} style={{ background: '#f8fbff', borderStyle: 'dashed' }}>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="fw-bold">Conductor adicional {idx + 1}</div>
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => eliminarConductorAdicional(idx)}>
                      Quitar
                    </button>
                  </div>
                  <div className={styles.formGrid}>
                    <div className={styles.twoCol} style={{ gridColumn: '1 / -1' }}>
                      <div>
                        <span className={styles.label}>Tipo de identificacion</span>
                        <select className={styles.select} name="tipoIdentificacion" value={c.tipoIdentificacion} onChange={(e) => handleConductorAdicionalChange(idx, e)}>
                          <option value="CEDULA">Cedula</option>
                          <option value="RUC">RUC</option>
                          <option value="PASAPORTE">Pasaporte</option>
                        </select>
                      </div>
                      <div>
                        <span className={styles.label}>Rol</span>
                        <select className={styles.select} name="rol" value={normalizeRolConductor(c.rol)} onChange={(e) => handleConductorAdicionalChange(idx, e)}>
                          <option value="SEC">SEC</option>
                          <option value="PRI">PRI</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <span className={styles.label}>Numero de identificacion</span>
                      <input className={styles.input} name="numeroIdentificacion" value={c.numeroIdentificacion} onChange={(e) => handleConductorAdicionalChange(idx, e)} />
                    </div>
                    <div>
                      <span className={styles.label}>Numero de licencia</span>
                      <input className={styles.input} name="numeroLicencia" value={c.numeroLicencia} onChange={(e) => handleConductorAdicionalChange(idx, e)} />
                    </div>
                    <div className={styles.twoCol} style={{ gridColumn: '1 / -1' }}>
                      <div>
                        <span className={styles.label}>Nombre 1</span>
                        <input className={styles.input} name="nombre1" value={c.nombre1} onChange={(e) => handleConductorAdicionalChange(idx, e)} />
                      </div>
                      <div>
                        <span className={styles.label}>Nombre 2</span>
                        <input className={styles.input} name="nombre2" value={c.nombre2} onChange={(e) => handleConductorAdicionalChange(idx, e)} />
                      </div>
                    </div>
                    <div className={styles.twoCol} style={{ gridColumn: '1 / -1' }}>
                      <div>
                        <span className={styles.label}>Apellido 1</span>
                        <input className={styles.input} name="apellido1" value={c.apellido1} onChange={(e) => handleConductorAdicionalChange(idx, e)} />
                      </div>
                      <div>
                        <span className={styles.label}>Apellido 2</span>
                        <input className={styles.input} name="apellido2" value={c.apellido2} onChange={(e) => handleConductorAdicionalChange(idx, e)} />
                      </div>
                    </div>
                    <div>
                      <span className={styles.label}>Vencimiento licencia</span>
                      <input className={styles.input} type="date" name="fechaVencimientoLicencia" value={c.fechaVencimientoLicencia} onChange={(e) => handleConductorAdicionalChange(idx, e)} />
                    </div>
                    <div>
                      <span className={styles.label}>Edad</span>
                      <input className={styles.input} name="edad" inputMode="numeric" value={c.edad} onChange={(e) => handleConductorAdicionalChange(idx, e)} />
                    </div>
                    <div>
                      <span className={styles.label}>Telefono</span>
                      <input className={styles.input} name="telefono" inputMode="numeric" value={c.telefono} onChange={(e) => handleConductorAdicionalChange(idx, e)} />
                    </div>
                    <div>
                      <span className={styles.label}>Correo</span>
                      <input className={styles.input} type="email" name="correo" value={c.correo} onChange={(e) => handleConductorAdicionalChange(idx, e)} />
                    </div>
                  </div>
                </div>
              ))}
              {formErrors.titular ? <span className={styles.errorText}>{formErrors.titular}</span> : null}
            </div>

            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Descripcion</h2>
              <textarea className={styles.textarea} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Notas opcionales" />
            </div>

            <button
              type="button"
              className={styles.ctaLarge}
              style={{ background: '#FF6B00' }}
              onClick={intentarConfirmar}
              disabled={submitting}
            >
              SIGUIENTE
            </button>

            {submitError ? <div className="alert alert-danger mt-2">{submitError}</div> : null}
          </div>

          <aside className={`${styles.sidebar} ${styles.card} ${styles.summaryCard}`}>
            <h2 className={styles.sectionTitle}>Resumen de tu reserva</h2>
            <p>
              <strong>🚗 {vehiculo?.modelo}</strong> · {categoriaNombre || 'Categoria'}
            </p>
            <p>
              📅 {fechaInicio} {horaInicio} → {fechaFin} {horaFin}{' '}
              <strong>| {daysOk ? `${days} dia(s)` : '—'}</strong>
            </p>
            <p>
              📍 Recogida: <strong>{locNombre(idLocRecogida)}</strong>
            </p>
            <p>
              📍 Entrega: <strong>{locNombre(idLocEntrega)}</strong>
            </p>
            <div className={styles.summaryDivider} />
            <h3 className="h6 fw-bold mb-2">Desglose de costos</h3>
            <div className={styles.costLine}>
              <span>
                Tarifa base ({days} dia(s))
              </span>
              <span>{formatMoney(totales.tarifaBase)}</span>
            </div>
            {totales.extraLines.map((x) => (
              <div key={x.id} className={styles.costLine}>
                <span>
                  {x.nombre} x{x.cantidad}
                </span>
                <span>{formatMoney(x.subtotal)}</span>
              </div>
            ))}
            <div className={styles.summaryDivider} />
            <div className={styles.costLine}>
              <span>Subtotal</span>
              <span>{formatMoney(totales.subtotal)}</span>
            </div>
            <div className={styles.costLine}>
              <span>IVA (15%)</span>
              <span>{formatMoney(totales.iva)}</span>
            </div>
            <div className={styles.costLineTotal}>
              <span>TOTAL</span>
              <span className={styles.totalHuge}>{formatMoney(totales.total)}</span>
            </div>
            <div className={styles.summaryDivider} />
            <div className="fw-bold mb-1">Conductores</div>
            <div className={styles.conductorList}>
              {resumenConductoresLista.map((c, i) => (
                <div key={i}>
                  👤 {c.etiqueta} — {c.rol}
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>

      {paymentOpen ? (
        <div className={styles.modalBackdrop} role="dialog" aria-modal>
          <div className={styles.modalInner}>
            <h3 className="h5 fw-bold mb-1">💳 Datos de Pago</h3>
            <p className="text-muted small mb-2">
              Vehiculo: <strong>{vehiculo?.modelo}</strong> · {fechaInicio} {horaInicio} → {fechaFin} {horaFin}
            </p>
            <p className="small mb-3">
              Total a pagar: <strong>{formatMoney(totales.total)}</strong>
            </p>

            <div style={{ borderRadius: '12px', padding: '1rem', color: '#fff', marginBottom: '0.9rem', background: cardFlipped ? 'linear-gradient(145deg, #1c1c1c, #2a2a2a)' : 'linear-gradient(145deg, #10224f, #2e3f67)' }}>
              {!cardFlipped ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.9rem', fontSize: '0.8rem', opacity: 0.9 }}>
                    <span>{cardBrandFromNumber(paymentForm.cardNumber)}</span>
                    <span>SIMULADO</span>
                  </div>
                  <div style={{ letterSpacing: '0.08em', fontSize: '1.05rem', fontWeight: 700 }}>
                    {paymentForm.cardNumber || 'XXXX XXXX XXXX XXXX'}
                  </div>
                  <div style={{ marginTop: '0.7rem', fontSize: '0.82rem' }}>
                    {paymentForm.cardName || 'NOMBRE APELLIDO'} · {paymentForm.expiry || 'MM/AA'}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ height: '36px', background: '#111', borderRadius: '4px', marginBottom: '0.8rem' }} />
                  <div style={{ fontSize: '0.82rem' }}>CVV</div>
                  <div style={{ fontWeight: 800, letterSpacing: '0.2em' }}>{paymentForm.cvv ? '•'.repeat(paymentForm.cvv.length) : '•••'}</div>
                </>
              )}
            </div>

            <div className={styles.formGrid}>
              <div>
                <span className={styles.label}>Numero de tarjeta</span>
                <input className={`${styles.input} ${paymentErrors.cardNumber ? styles.inputError : ''}`} name="cardNumber" value={paymentForm.cardNumber} onChange={handlePaymentChange} inputMode="numeric" placeholder="XXXX XXXX XXXX XXXX" />
                {paymentErrors.cardNumber ? <span className={styles.errorText}>{paymentErrors.cardNumber}</span> : null}
              </div>
              <div>
                <span className={styles.label}>Nombre en la tarjeta</span>
                <input className={`${styles.input} ${paymentErrors.cardName ? styles.inputError : ''}`} name="cardName" value={paymentForm.cardName} onChange={handlePaymentChange} placeholder="NOMBRE APELLIDO" />
                {paymentErrors.cardName ? <span className={styles.errorText}>{paymentErrors.cardName}</span> : null}
              </div>
              <div className={styles.twoCol}>
                <div>
                  <span className={styles.label}>Vencimiento</span>
                  <input className={`${styles.input} ${paymentErrors.expiry ? styles.inputError : ''}`} name="expiry" value={paymentForm.expiry} onChange={handlePaymentChange} placeholder="MM/AA" inputMode="numeric" />
                  {paymentErrors.expiry ? <span className={styles.errorText}>{paymentErrors.expiry}</span> : null}
                </div>
                <div>
                  <span className={styles.label}>CVV</span>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <input
                      className={`${styles.input} ${paymentErrors.cvv ? styles.inputError : ''}`}
                      name="cvv"
                      value={paymentForm.cvv}
                      onChange={handlePaymentChange}
                      placeholder="•••"
                      type={showCvv ? 'text' : 'password'}
                      inputMode="numeric"
                      onFocus={() => setCardFlipped(true)}
                      onBlur={() => setCardFlipped(false)}
                    />
                    <button type="button" className={styles.btnGhost} onClick={() => setShowCvv((s) => !s)}>
                      {showCvv ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {paymentErrors.cvv ? <span className={styles.errorText}>{paymentErrors.cvv}</span> : null}
                </div>
              </div>
            </div>

            {submitError ? <div className="alert alert-danger mt-2 py-2 small">{submitError}</div> : null}
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnGhost} onClick={() => setPaymentOpen(false)} disabled={submitting}>
                ← Volver
              </button>
              <button
                type="button"
                className={styles.ctaLarge}
                style={{ width: 'auto', marginTop: 0, background: '#28A745' }}
                onClick={handleReservarConPago}
                disabled={submitting || !paymentValid}
              >
                {submitting ? 'Procesando...' : 'CONFIRMAR PAGO Y RESERVAR'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default CrearReservaPage;
