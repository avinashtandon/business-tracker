import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import People from './pages/People';
import PersonDetail from './pages/PersonDetail';

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [selectedPersonId, setSelectedPersonId] = useState(null);

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
