import { useMemo, useState } from 'react';
import './App.css';
import { clearSession, getStoredSession } from './api/services/api';
import LoginPage from './pages/Login/LoginPage';
import AdminPage from './pages/Dashboard/AdminPage';
import PublicMarketplacePage from './pages/Public/PublicMarketplacePage';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';

function App() {
  const initialSession = useMemo(() => getStoredSession(), []);
  const [session, setSession] = useState(initialSession);
  const navigate = useNavigate();

  const handleLoginSuccess = (nextSession) => {
    setSession(nextSession);
    navigate('/admin', { replace: true });
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
    navigate('/', { replace: true });
  };

  return (
    <main className="appShell">
      {session?.token ? (
        <Routes>
          <Route path="/admin" element={<AdminPage session={session} onLogout={handleLogout} />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      ) : (
        <Routes>
          <Route path="/" element={<PublicMarketplacePage />} />
          <Route path="/vehiculos" element={<PublicMarketplacePage />} />
          <Route path="/localidades" element={<PublicMarketplacePage />} />
          <Route path="/acerca" element={<PublicMarketplacePage />} />
          <Route
            path="/admin/login"
            element={<LoginPage onLoginSuccess={handleLoginSuccess} onBack={() => navigate('/')} />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </main>
  );
}

export default App;
