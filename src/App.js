import { useMemo, useState, useCallback } from 'react';
import './App.css';
import { clearSession, getStoredSession, sessionHasRole, sessionIsStaff } from './api/services/api';
import LoginPage from './pages/Login/LoginPage';
import RegisterPage from './pages/Login/RegisterPage';
import AdminPage from './pages/Dashboard/AdminPage';
import CrearReservaPage from './pages/Cliente/CrearReservaPage';
import MisReservasClientePage from './pages/Cliente/MisReservasClientePage';
import PublicMarketplacePage from './pages/Public/PublicMarketplacePage';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';

function postAuthPath(session) {
  if (sessionIsStaff(session)) {
    return '/admin';
  }
  if (sessionHasRole('CLIENTE', session)) {
    return '/';
  }
  return '/admin';
}

function MarketplaceRoute({ session, onLogout }) {
  return <PublicMarketplacePage session={session} onLogout={onLogout} />;
}

function App() {
  const initialSession = useMemo(() => getStoredSession(), []);
  const [session, setSession] = useState(initialSession);
  const navigate = useNavigate();

  const handleAuthSuccess = useCallback(
    (nextSession, redirectTo) => {
      setSession(nextSession);
      navigate(redirectTo || postAuthPath(nextSession), { replace: true });
    },
    [navigate]
  );

  const handleLogout = useCallback(() => {
    clearSession();
    setSession(null);
    navigate('/', { replace: true });
  }, [navigate]);

  const staff = sessionIsStaff(session);
  const authenticated = Boolean(session?.token);

  return (
    <main className="appShell">
      <Routes>
        <Route path="/" element={<MarketplaceRoute session={session} onLogout={handleLogout} />} />
        <Route path="/vehiculos" element={<MarketplaceRoute session={session} onLogout={handleLogout} />} />
        <Route path="/localidades" element={<MarketplaceRoute session={session} onLogout={handleLogout} />} />
        <Route path="/acerca" element={<MarketplaceRoute session={session} onLogout={handleLogout} />} />

        <Route
          path="/admin/login"
          element={
            authenticated ? (
              <Navigate to={postAuthPath(session)} replace />
            ) : (
              <LoginPage onLoginSuccess={handleAuthSuccess} onBack={() => navigate('/')} />
            )
          }
        />
        <Route
          path="/registro"
          element={
            authenticated ? (
              <Navigate to={postAuthPath(session)} replace />
            ) : (
              <RegisterPage onRegisterSuccess={handleAuthSuccess} onBack={() => navigate('/')} />
            )
          }
        />

        <Route path="/reserva/:idVehiculo" element={<CrearReservaPage session={session} onLogout={handleLogout} />} />
        <Route path="/mis-reservas" element={<MisReservasClientePage session={session} onLogout={handleLogout} />} />

        <Route
          path="/admin"
          element={
            authenticated && staff ? (
              <AdminPage session={session} onLogout={handleLogout} />
            ) : (
              <Navigate to={authenticated ? '/' : '/admin/login'} replace />
            )
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  );
}

export default App;
