import { useState, useEffect } from 'react';
import { useApp } from '../context/useApp';
import { calcPersonAggregate, formatCurrency } from '../utils/helpers';
import Modal from './Modal';
import './Sidebar.css';

function getInitialTheme() {
    try {
        return localStorage.getItem('theme') || 'dark';
    } catch {
        return 'dark';
    }
}

export default function Sidebar({ activePage, onNavigate }) {
    const { state, addPaymentMode, deletePaymentMode } = useApp();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [theme, setTheme] = useState(getInitialTheme);
    const [showSettings, setShowSettings] = useState(false);
    const [newMode, setNewMode] = useState('');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        try { localStorage.setItem('theme', theme); } catch (e) { console.error('Failed to save theme:', e); }
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

                    {/* Settings Toggle */}
                    <button
                        className="theme-toggle-btn"
                        onClick={() => setShowSettings(true)}
                        title="Settings"
                    >
                        <span className="theme-toggle-icon">⚙️</span>
                        <span>Settings</span>
                    </button>

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

            {/* Settings Modal */}
            {showSettings && (
                <Modal title="Settings" onClose={() => setShowSettings(false)} footer={
                    <button className="btn btn-secondary" onClick={() => setShowSettings(false)}>Close</button>
                }>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>Payment Modes</h3>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                            <input
                                className="input-field"
                                type="text"
                                placeholder="New mode (e.g. Crypto)"
                                value={newMode}
                                onChange={(e) => setNewMode(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newMode.trim()) {
                                        addPaymentMode(newMode.trim());
                                        setNewMode('');
                                    }
                                }}
                            />
                            <button className="btn btn-primary" onClick={() => {
                                if (newMode.trim()) {
                                    addPaymentMode(newMode.trim());
                                    setNewMode('');
                                }
                            }}>Add</button>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {(state.paymentModes || []).map(mode => (
                                <div key={mode} style={{
                                    background: 'var(--bg-secondary)',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: 'var(--radius-sm)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.875rem',
                                    border: '1px solid var(--border-color)'
                                }}>
                                    {mode}
                                    <button
                                        onClick={() => deletePaymentMode(mode)}
                                        style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}
                                        title="Delete mode"
                                    >×</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
}
