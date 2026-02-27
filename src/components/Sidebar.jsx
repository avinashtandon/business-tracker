import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { calcPersonAggregate, formatCurrency } from '../utils/helpers';
import './Sidebar.css';

function getInitialTheme() {
    try {
        return localStorage.getItem('theme') || 'dark';
    } catch {
        return 'dark';
    }
}

export default function Sidebar({ activePage, onNavigate }) {
    const { state } = useApp();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [theme, setTheme] = useState(getInitialTheme);

    // Apply theme to <html> whenever it changes
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        try { localStorage.setItem('theme', theme); } catch { }
    }, [theme]);

    const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

    const totalInvested = state.people.reduce((sum, p) => {
        const { totalPrincipal } = calcPersonAggregate(p);
        return sum + totalPrincipal;
    }, 0);

    const activePeople = state.people.length;

    const navItems = [
        { id: 'dashboard', icon: '📊', label: 'Dashboard' },
        { id: 'people', icon: '👥', label: 'People' },
    ];

    const handleNav = (id) => {
        onNavigate(id);
        setMobileOpen(false);
    };

    return (
        <>
            <button
                className="sidebar-toggle"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle sidebar"
            >
                {mobileOpen ? '✕' : '☰'}
            </button>
            <div
                className={`sidebar-overlay ${mobileOpen ? 'open' : ''}`}
                onClick={() => setMobileOpen(false)}
            />
            <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <div className="sidebar-logo-icon">💰</div>
                        <div>
                            <h1>LendTrack</h1>
                            <span>Business Money Tracker</span>
                        </div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            className={`sidebar-nav-item ${activePage === item.id ? 'active' : ''}`}
                            onClick={() => handleNav(item.id)}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-stat">
                        <span className="sidebar-stat-label">Total Invested</span>
                        <span className="sidebar-stat-value">{formatCurrency(totalInvested)}</span>
                    </div>
                    <div className="sidebar-stat">
                        <span className="sidebar-stat-label">Active People</span>
                        <span className="sidebar-stat-value">{activePeople}</span>
                    </div>

                    {/* Theme Toggle */}
                    <button
                        className="theme-toggle-btn"
                        onClick={toggleTheme}
                        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    >
                        <span className="theme-toggle-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
                        <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
