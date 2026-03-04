import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import People from './pages/People';
import PersonDetail from './pages/PersonDetail';

const CORRECT_PASSWORD = '077522';

function LockScreen({ onUnlock }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input === CORRECT_PASSWORD) {
      onUnlock();
    } else {
      setError('Wrong password. Please enter the right password first.');
      setShake(true);
      setInput('');
      setTimeout(() => setShake(false), 600);
    }
  };

  return (
    <div className="lock-screen">
      <div className={`lock-card ${shake ? 'lock-shake' : ''}`}>
        <div className="lock-icon">🔒</div>
        <h1 className="lock-title">Business Tracker</h1>
        <p className="lock-subtitle">Enter your password to continue</p>
        <form onSubmit={handleSubmit} className="lock-form">
          <input
            className="input-field lock-input"
            type="password"
            placeholder="Enter password"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(''); }}
            autoFocus
          />
          {error && <p className="lock-error">{error}</p>}
          <button type="submit" className="btn btn-primary lock-btn">
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [page, setPage] = useState('dashboard');
  const [selectedPersonId, setSelectedPersonId] = useState(null);

  if (!unlocked) {
    return <LockScreen onUnlock={() => setUnlocked(true)} />;
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

