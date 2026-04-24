import { useMemo, useState } from 'react';
import './App.css';
import { clearSession, getStoredSession } from './api/services/api';
import LoginPage from './pages/Login/LoginPage';
import AdminPage from './pages/Dashboard/AdminPage';

function App() {
  const initialSession = useMemo(() => getStoredSession(), []);
  const [session, setSession] = useState(initialSession);

  const handleLoginSuccess = (nextSession) => {
    setSession(nextSession);
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
  };

  return (
    <main className="appShell">
      {session?.token ? (
        <AdminPage session={session} onLogout={handleLogout} />
      ) : (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      )}
    </main>
  );
}

export default App;
