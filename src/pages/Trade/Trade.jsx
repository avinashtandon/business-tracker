import { useState, useEffect, useCallback } from 'react';
import Modal from '../../components/Modal';
import { apiFetch } from '../../utils/helpers';
import './Trade.css';

const API_BASE = '/api/v1/trades';

function fmtFull(amount) {
    if (!amount && amount !== 0) return '—';
    return '₹' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function PnlBadge({ value, pct }) {
    if (value === null || value === undefined) return <span className="pnl-na">—</span>;
    const pos = value >= 0;
    return (
        <span className={`pnl-badge ${pos ? 'pnl-pos' : 'pnl-neg'}`}>
            {pos ? '▲' : '▼'} {fmtFull(Math.abs(value))}
            {pct !== null && ` (${Math.abs(pct).toFixed(2)}%)`}
        </span>
    );
}

export default function Trade() {
    const [trades, setTrades] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showAddTrade, setShowAddTrade] = useState(false);
    const [showEditTrade, setShowEditTrade] = useState(null); // hold trade object to edit
    const [deleteTradeId, setDeleteTradeId] = useState(null);
    const [saving, setSaving] = useState(false);

    const emptyTradeForm = {
        name: '',
        quantity: '',
        type: 'Intraday', // Intraday, Swing
        position: 'Long', // Long, Short
        buying_price: '',
        buying_date: new Date().toISOString().split('T')[0],
        selling_price: '',
        selling_date: '',
        status: 'Open', // Open, Closed
    };

    const [tradeForm, setTradeForm] = useState(emptyTradeForm);

    const fetchTrades = useCallback(async () => {
        try {
            const res = await apiFetch(API_BASE);
            if (!res.ok) {
                console.error(`Status: ${res.status}. Endpoint might not be implemented yet.`);
                return;
            }
            const json = await res.json();
            if (json.success) {
                setTrades(json.data || []);
            } else {
                console.error('API Error:', json.error?.message || 'Failed to fetch trades');
            }
        } catch (e) {
            console.error('Failed to fetch trades:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTrades();
    }, [fetchTrades]);

    const handleSaveTrade = async (isEdit) => {
        setSaving(true);
        const { name, quantity, type, position, buying_price, buying_date, selling_price, selling_date, status } = tradeForm;

        const payload = {
            name,
            quantity: Number(quantity),
            type,
            position,
            buying_price: Number(buying_price),
            buying_date,
            selling_price: selling_price ? Number(selling_price) : null,
            selling_date: selling_price ? selling_date || null : null,
            status: selling_price ? 'Closed' : 'Open',
        };

        try {
            const url = isEdit ? `${API_BASE}/${showEditTrade.id}` : API_BASE;
            const res = await apiFetch(url, {
                method: isEdit ? 'PUT' : 'POST',
                body: JSON.stringify(payload),
            });

            let json;
            try {
                json = await res.json();
            } catch (err) {
                throw new Error(`Server returned ${res.status} (Not JSON). Did you implement the backend?`);
            }

            if (json.success) {
                await fetchTrades();
                setShowAddTrade(false);
                setShowEditTrade(null);
                setTradeForm(emptyTradeForm);
            } else {
                alert(json.error?.message || json.message || 'Failed to save trade');
            }
        } catch (e) {
            console.error('Error saving trade:', e);
            alert('Something went wrong while saving the trade.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTrade = async () => {
        if (!deleteTradeId) return;
        setSaving(true);
        try {
            const res = await apiFetch(`${API_BASE}/${deleteTradeId}`, { method: 'DELETE' });

            let json;
            try {
                json = await res.json();
            } catch (err) {
                throw new Error(`Server returned ${res.status} (Not JSON). Did you implement the backend?`);
            }

            if (json.success) {
                setDeleteTradeId(null);
                await fetchTrades();
            } else {
                alert(json.error?.message || json.message || 'Failed to delete trade');
            }
        } catch (e) {
            console.error('Error deleting trade:', e);
            alert('Something went wrong while deleting the trade.');
        } finally {
            setSaving(false);
        }
    };

    // Summary Calculations
    const portfolioStats = trades.reduce((acc, t) => {
        const qty = t.quantity || 1;
        const invested = (t.buying_price || 0) * qty;

        acc.totalInvested += invested;

        if (t.selling_price) {
            const soldVal = t.selling_price * qty;
            acc.totalSoldValue += soldVal;
            
            let pnl = 0;

            if (t.position === 'Long') {
                pnl = soldVal - invested;
            } else {
                pnl = invested - soldVal; // FIXED
            }

            acc.totalPnl += pnl;
        } else {
            // Unsold
            acc.totalSoldValue += invested; // current nominal value
        }
        return acc;
    }, { totalInvested: 0, totalSoldValue: 0, totalPnl: 0 });

    const pnlPct = portfolioStats.totalInvested > 0 ? (portfolioStats.totalPnl / portfolioStats.totalInvested) * 100 : null;

    if (loading) return <div className="trade-page"><div style={{ textAlign: 'center', padding: '3rem' }}>Loading Trades…</div></div>;

    return (
        <div className="trade-page">
            <div className="trade-header">
                <div>
                    <h1 className="page-title">Trades Log</h1>
                    <p className="trade-subtitle">Track your Stock & Crypto swing and intraday trades</p>
                </div>
                <div>
                    <button className="btn btn-primary" onClick={() => { setTradeForm(emptyTradeForm); setShowAddTrade(true); }}>
                        + Add Trade
                    </button>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="trade-overview">
                <div className="trade-stat-card">
                    <div className="trade-stat-label">Total Invested</div>
                    <div className="trade-stat-value" style={{ color: 'var(--accent-purple)' }}>
                        {fmtFull(portfolioStats.totalInvested)}
                    </div>
                </div>
                <div className="trade-stat-card">
                    <div className="trade-stat-label">Current / Sold Value</div>
                    <div className="trade-stat-value" style={{ color: 'var(--accent-teal)' }}>
                        {fmtFull(portfolioStats.totalSoldValue)}
                    </div>
                </div>
                <div className="trade-stat-card">
                    <div className="trade-stat-label">Total P&amp;L (Closed)</div>
                    <div className="trade-stat-value">
                        {portfolioStats.totalPnl !== 0
                            ? <PnlBadge value={portfolioStats.totalPnl} pct={pnlPct} />
                            : <span className="pnl-na">—</span>}
                    </div>
                </div>
                <div className="trade-stat-card">
                    <div className="trade-stat-label">Trades Tracked</div>
                    <div className="trade-stat-value">{trades.length}</div>
                </div>
            </div>

            {trades.length === 0 ? (
                <div className="trade-empty">
                    <div className="trade-empty-icon">📈</div>
                    <h2>No trades recorded</h2>
                    <p>Log your first intraday or swing trade to start tracking.</p>
                    <button className="btn btn-primary" onClick={() => { setTradeForm(emptyTradeForm); setShowAddTrade(true); }}>
                        + Record First Trade
                    </button>
                </div>
            ) : (
                <div className="trade-list">
                    {trades.map(t => {
                        const isLong = t.position === 'Long';
                        const isIntraday = t.type === 'Intraday';
                        const qty = t.quantity || 1;
                        const invested = t.buying_price ? t.buying_price * qty : 0;
                        const soldVal = t.selling_price ? t.selling_price * qty : 0;

                        let pnlAmount = null;
                        let pct = null;
                        if (t.selling_price && t.buying_price) {
                            if (isLong) {
                                pnlAmount = soldVal - invested;
                                pct = invested > 0 ? (pnlAmount / invested) * 100 : 0;
                            } else {
                                pnlAmount = invested - soldVal; // FIXED
                                pct = invested > 0 ? (pnlAmount / invested) * 100 : 0;
                            }
                        }

                        const avatarColor = isLong ? '#22c55e' : '#ef4444';

                        return (
                            <div key={t.id} className="trade-card">
                                <div className="trade-card-header">
                                    <div className="trade-identity">
                                        <div className="trade-avatar" style={{ background: `${avatarColor}22`, color: avatarColor, border: `1px solid ${avatarColor}44` }}>
                                            {isLong ? '📈' : '📉'}
                                        </div>
                                        <div>
                                            <div className="trade-name">{t.name}</div>
                                            <div className="trade-symbol">{t.type} • {t.position}</div>
                                        </div>
                                    </div>

                                    <div className="trade-meta">
                                        <div className="trade-metrics">
                                            <div className="trade-mini-stat">
                                                <span className="trade-mini-label">Invested</span>
                                                <span className="trade-mini-value" style={{ color: 'var(--accent-purple)' }}>{fmtFull(invested)}</span>
                                            </div>
                                            <div className="trade-mini-stat">
                                                <span className="trade-mini-label">Qty</span>
                                                <span className="trade-mini-value">{qty}</span>
                                            </div>
                                            <div className="trade-mini-stat">
                                                <span className="trade-mini-label">Buy Price</span>
                                                <span className="trade-mini-value">{fmtFull(t.buying_price)}</span>
                                            </div>
                                            <div className="trade-mini-stat">
                                                <span className="trade-mini-label">Sell Price</span>
                                                <span className="trade-mini-value" style={{ color: 'var(--accent-teal)' }}>
                                                    {t.selling_price ? fmtFull(t.selling_price) : 'Open'}
                                                </span>
                                            </div>
                                            {pnlAmount !== null && (
                                                <div className="trade-mini-stat">
                                                    <span className="trade-mini-label">P&amp;L</span>
                                                    <PnlBadge value={pnlAmount} pct={pct} />
                                                </div>
                                            )}
                                        </div>

                                        <div className="trade-actions">
                                            <button className="btn btn-sm btn-secondary" onClick={() => {
                                                setTradeForm({
                                                    name: t.name || '',
                                                    quantity: t.quantity || '',
                                                    type: t.type || 'Intraday',
                                                    position: t.position || 'Long',
                                                    buying_price: t.buying_price || '',
                                                    buying_date: t.buying_date ? t.buying_date.split('T')[0] : '',
                                                    selling_price: t.selling_price || '',
                                                    selling_date: t.selling_date ? t.selling_date.split('T')[0] : '',
                                                    status: t.status || 'Open'
                                                });
                                                setShowEditTrade(t);
                                            }}>✎ Edit</button>
                                            <button className="btn btn-icon btn-danger" title="Delete Trade" onClick={() => setDeleteTradeId(t.id)}>🗑️</button>
                                        </div>
                                    </div>
                                </div>

                                {pnlAmount !== null && (
                                    <div className={`trade-pnl-bar ${pnlAmount >= 0 ? 'pnl-bar-pos' : 'pnl-bar-neg'}`}>
                                        <span>Sold Value: <strong>{fmtFull(soldVal)}</strong></span>
                                        <span style={{ margin: '0 0.75rem', opacity: 0.4 }}>|</span>
                                        <span>P&amp;L: <strong><PnlBadge value={pnlAmount} pct={pct} /></strong></span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal for Add or Edit */}
            {(showAddTrade || showEditTrade) && (
                <Modal
                    title={showEditTrade ? 'Edit Trade' : 'Add Trade Log'}
                    onClose={() => { setShowAddTrade(false); setShowEditTrade(null); }}
                    footer={
                        <>
                            <button className="btn btn-secondary" onClick={() => { setShowAddTrade(false); setShowEditTrade(null); }}>Cancel</button>
                            <button className="btn btn-primary" onClick={() => handleSaveTrade(!!showEditTrade)} disabled={saving || !tradeForm.name || !tradeForm.buying_price}>
                                {saving ? 'Saving...' : 'Save Trade'}
                            </button>
                        </>
                    }
                >
                    <div className="input-group">
                        <label>Asset Name (Stock / Crypto / Future & Options) *</label>
                        <input className="input-field" type="text" placeholder="e.g. INFY, ETH, AAPL"
                            value={tradeForm.name}
                            onChange={(e) => setTradeForm({ ...tradeForm, name: e.target.value.toUpperCase() })} autoFocus />
                    </div>
                    <div className="input-group">
                        <label>Quantity *</label>
                        <input className="input-field" type="number" step="any" placeholder="e.g. 100"
                            value={tradeForm.quantity}
                            onChange={(e) => setTradeForm({ ...tradeForm, quantity: e.target.value })} />
                    </div>

                    <div className="form-row">
                        <div className="input-group">
                            <label>Trade Type *</label>
                            <select className="input-field" value={tradeForm.type} onChange={e => setTradeForm({ ...tradeForm, type: e.target.value })}>
                                <option>Intraday</option>
                                <option>Swing</option>
                            </select>
                        </div>
                        <div className="input-group">
                            <label>Position *</label>
                            <select className="input-field" value={tradeForm.position} onChange={e => setTradeForm({ ...tradeForm, position: e.target.value })}>
                                <option>Long</option>
                                <option>Short</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="input-group">
                            <label>Buying Date *</label>
                            <input className="input-field" type="date" value={tradeForm.buying_date}
                                onChange={e => setTradeForm({ ...tradeForm, buying_date: e.target.value })} />
                        </div>
                        <div className="input-group">
                            <label>Buy Price *</label>
                            <input className="input-field" type="number" step="any" placeholder="150" value={tradeForm.buying_price}
                                onChange={e => setTradeForm({ ...tradeForm, buying_price: e.target.value })} />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="input-group">
                            <label>Sell Price (Optional)</label>
                            <input className="input-field" type="number" step="any" placeholder="155" value={tradeForm.selling_price}
                                onChange={e => setTradeForm({ ...tradeForm, selling_price: e.target.value })} />
                            <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.2rem' }}>Leave blank if trade is still open.</small>
                        </div>
                        <div className="input-group">
                            <label>Sell Date (Optional)</label>
                            <input className="input-field" type="date" value={tradeForm.selling_date}
                                onChange={e => setTradeForm({ ...tradeForm, selling_date: e.target.value })} />
                        </div>
                    </div>

                </Modal>
            )}

            {deleteTradeId && (
                <Modal title="Delete Trade?" onClose={() => setDeleteTradeId(null)}
                    footer={
                        <>
                            <button className="btn btn-secondary" onClick={() => setDeleteTradeId(null)}>Cancel</button>
                            <button className="btn btn-danger" onClick={handleDeleteTrade}>Yes, Delete</button>
                        </>
                    }>
                    <p style={{ color: 'var(--text-secondary)' }}>Are you sure you want to permanently delete this trade record?</p>
                </Modal>
            )}

        </div>
    );
}
