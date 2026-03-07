import { useState, useEffect } from 'react';
import { useApp } from './context/useApp';
import { setAuthToken } from './utils/helpers';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import People from './pages/People';
import PersonDetail from './pages/PersonDetail';
import Crypto from './pages/Crypto';

function AuthScreen({ onAuth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && (!username || !firstName || !lastName))) {
      setError('Please fill in all fields.');
      setShake(true);
      setTimeout(() => setShake(false), 600);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (!isLogin) {
        // Call Registration Endpoint
        const res = await fetch('/api/v1/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            password: password,
            username: username,
            first_name: firstName,
            last_name: lastName
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.message || data.error || 'Registration failed');
        }

        // Successfully registered! Let's authorize them
        const userInfo = data.data?.user || {};
        const userData = {
          email: userInfo.email || email,
          username: username,
          first_name: userInfo.first_name || firstName,
          last_name: userInfo.last_name || lastName,
          ...data.data
        };
        localStorage.setItem('auth_user', JSON.stringify(userData));
        if (data.data?.access_token) {
          localStorage.setItem('access_token', data.data.access_token);
          setAuthToken(data.data.access_token);
          window.dispatchEvent(new Event("storage"));
        }
        onAuth(userData);
      } else {
        // Call Login Endpoint
        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            password: password
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.message || data.error || 'Login failed');
        }

        // Successfully logged in! Let's authorize them
        const userInfo = data.data?.user || {};
        const userData = {
          email: userInfo.email || email,
          first_name: userInfo.first_name || '',
          last_name: userInfo.last_name || '',
          ...data.data
        };
        localStorage.setItem('auth_user', JSON.stringify(userData));
        if (data.data?.access_token) {
          localStorage.setItem('access_token', data.data.access_token);
          setAuthToken(data.data.access_token);
          window.dispatchEvent(new Event("storage"));
        }
        onAuth(userData);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className={`auth-card ${shake ? 'lock-shake' : ''}`}>
        <div className="auth-icon">{isLogin ? '👋' : '✨'}</div>
        <h1 className="auth-title">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
        <p className="auth-subtitle">
          {isLogin ? 'Enter your details to sign in' : 'Sign up to get started'}
        </p>
        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>First Name</label>
                  <input
                    className="input-field"
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => { setFirstName(e.target.value); setError(''); }}
                    autoFocus={!isLogin}
                  />
                </div>
                <div className="input-group" style={{ flex: 1 }}>
                  <label>Last Name</label>
                  <input
                    className="input-field"
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => { setLastName(e.target.value); setError(''); }}
                  />
                </div>
              </div>
              <div className="input-group">
                <label>Username</label>
                <input
                  className="input-field"
                  type="text"
                  placeholder="boss_guy"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(''); }}
                />
              </div>
            </>
          )}
          <div className="input-group">
            <label>Email Address</label>
            <input
              className="input-field"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              autoFocus={isLogin}
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input
              className="input-field"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
            />
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="btn btn-primary auth-btn" disabled={isLoading}>
            {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>
        <div className="auth-toggle">
          <p>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              className="auth-toggle-btn"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { refreshData, clearData } = useApp();
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [selectedPersonId, setSelectedPersonId] = useState(null);
  const [isMounting, setIsMounting] = useState(true);

  useEffect(() => {
    // Try to load user from localStorage on initial render
    const savedUser = localStorage.getItem('auth_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('auth_user');
      }
    }
    setIsMounting(false);
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem("access_token");
      const savedUser = localStorage.getItem("auth_user");

      if (!token || !savedUser) {
        setUser(null);
        return;
      }

      try {
        setUser(JSON.parse(savedUser));
      } catch {
        setUser(null);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('access_token');
    setAuthToken(null);
    window.dispatchEvent(new Event("storage"));
    clearData();    // ← wipe all in-memory loan/people data immediately
    setUser(null);
  };

  if (isMounting) {
    return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Loading...</div>;
  }

  if (!user) {
    return <AuthScreen onAuth={(userData) => {
      clearData();   // ← always wipe any previous user's data first
      setUser(userData || { email: 'user@example.com' });
      refreshData();
    }} />;
  }

  const navigate = (target, personId = null) => {
    setPage(target);
    if (target === 'person' && personId) {
      setSelectedPersonId(personId);
    }
  };

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard onNavigate={navigate} />;
      case 'people':
        return <People onNavigate={navigate} />;
      case 'person':
        return <PersonDetail personId={selectedPersonId} onNavigate={navigate} />;
      case 'crypto':
        return <Crypto />;
      default:
        return <Dashboard onNavigate={navigate} />;
    }
  };

  return (
    <>
      <Sidebar activePage={page} onNavigate={navigate} />
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>
            👤 {user?.first_name || user?.username || (user?.email ? user.email.split('@')[0] : '')}
          </div>
          <button className="btn btn-sm btn-danger" onClick={handleLogout}>Logout</button>
        </div>
        {renderPage()}
      </main>
    </>
  );
}

