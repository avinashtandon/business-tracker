import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import People from './pages/People';
import PersonDetail from './pages/PersonDetail';

function AuthScreen({ onAuth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && !name)) {
      setError('Please fill in all fields.');
      setShake(true);
      setTimeout(() => setShake(false), 600);
      return;
    }
    // Mock successful authentication
    onAuth();
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
            <div className="input-group">
              <label>Full Name</label>
              <input
                className="input-field"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                autoFocus={!isLogin}
              />
            </div>
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
          <button type="submit" className="btn btn-primary auth-btn">
            {isLogin ? 'Sign In' : 'Sign Up'}
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
  const [unlocked, setUnlocked] = useState(false);
  const [page, setPage] = useState('dashboard');
  const [selectedPersonId, setSelectedPersonId] = useState(null);

  if (!unlocked) {
    return <AuthScreen onAuth={() => setUnlocked(true)} />;
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
      default:
        return <Dashboard onNavigate={navigate} />;
    }
  };

  return (
    <>
      <Sidebar activePage={page} onNavigate={navigate} />
      <main className="main-content">{renderPage()}</main>
    </>
  );
}

