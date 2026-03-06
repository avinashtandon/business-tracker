import { useState, useEffect, useCallback } from 'react';
import Modal from '../components/Modal';
import './Crypto.css';

const POPULAR_COINS = [
    { name: 'Bitcoin', symbol: 'BTC', emoji: '₿', geckoId: 'bitcoin' },
    { name: 'Ethereum', symbol: 'ETH', emoji: 'Ξ', geckoId: 'ethereum' },
    { name: 'BNB', symbol: 'BNB', emoji: '◈', geckoId: 'binancecoin' },
    { name: 'Solana', symbol: 'SOL', emoji: '◎', geckoId: 'solana' },
    { name: 'XRP', symbol: 'XRP', emoji: '✕', geckoId: 'ripple' },
    { name: 'Dogecoin', symbol: 'DOGE', emoji: 'Ð', geckoId: 'dogecoin' },
    { name: 'Cardano', symbol: 'ADA', emoji: '₳', geckoId: 'cardano' },
    { name: 'Polygon', symbol: 'MATIC', emoji: '⬡', geckoId: 'matic-network' },
    { name: 'Tron', symbol: 'TRX', emoji: '🔺', geckoId: 'tron' },
    { name: 'Other', symbol: '', emoji: '🪙', geckoId: null },
];

// Backend proxy — handles CoinGecko ID mapping & 60s cache
const PRICES_API = '/api/v1/crypto/prices';

const EXCHANGES = ['WazirX', 'CoinDCX', 'Binance', 'Coinbase', 'Bybit', 'KuCoin', 'Other'];
const API_BASE = '/api/v1/crypto';

function fmt(amount) {
    if (!amount && amount !== 0) return '₹0';
    const abs = Math.abs(Number(amount));
    if (abs >= 10000000) return '₹' + (Number(amount) / 10000000).toFixed(2) + 'Cr';
    if (abs >= 100000) return '₹' + (Number(amount) / 100000).toFixed(2) + 'L';
    return '₹' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function fmtFull(amount) {
    if (!amount && amount !== 0) return '₹0';
    return '₹' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getCoinMeta(symbol) {
    return POPULAR_COINS.find(c => c.symbol === symbol) || { emoji: '🪙', geckoId: null };
}

function getCoinColor(symbol) {
    const colors = {
        BTC: '#F7931A', ETH: '#627EEA', BNB: '#F3BA2F',
        SOL: '#9945FF', XRP: '#00AAE4', DOGE: '#C2A633',
        ADA: '#0033AD', MATIC: '#8247E5', TRX: '#FF0013',
    };
    return colors[symbol] || '#6366f1';
}

function getToken() { return localStorage.getItem('access_token'); }
function authHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` };
}

// Fetch live INR prices via backend proxy (60s server-side cache)
async function fetchLivePrices(symbols, token) {
    const unique = [...new Set(symbols.filter(Boolean))];
    if (!unique.length) return { prices: {}, stale: false };
    try {
        const res = await fetch(
            `${PRICES_API}?symbols=${unique.join(',')}`,
            { headers: { 'Authorization': `Bearer ${token}` }, signal: AbortSignal.timeout(10000) }
        );
        const json = await res.json();
        if (json.success) {
            return { prices: json.data.prices || {}, stale: json.data.stale || false };
        }
        return { prices: {}, stale: false };
    } catch {
        return { prices: {}, stale: false };
    }
}

function PnlBadge({ value, pct }) {
    if (value === null || value === undefined) return <span className="pnl-na">—</span>;
    const pos = value >= 0;
    return (
        <span className={`pnl-badge ${pos ? 'pnl-pos' : 'pnl-neg'}`}>
            {pos ? '▲' : '▼'} {fmt(Math.abs(value))}
            {pct !== null && ` (${Math.abs(pct).toFixed(2)}%)`}
        </span>
    );
}

export default function Crypto() {
    const [holdings, setHoldings] = useState([]);
    const [prices, setPrices] = useState({});           // { BTC: 7500000, ETH: 310000 }
    const [priceLoading, setPriceLoading] = useState(false);
    const [priceStale, setPriceStale] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [loading, setLoading] = useState(true);

    // Modals
    const [showAddCoin, setShowAddCoin] = useState(false);
    const [addPurchaseCoinId, setAddPurchaseCoinId] = useState(null);
    const [deleteCoinId, setDeleteCoinId] = useState(null);
    const [deletePurchaseInfo, setDeletePurchaseInfo] = useState(null);
    const [expandedCoinId, setExpandedCoinId] = useState(null);

    const emptyAddCoin = { coinName: '', coinSymbol: '', geckoId: null, customName: '', customSymbol: '' };
    const emptyPurchase = { quantity: '', buyPrice: '', date: new Date().toISOString().split('T')[0], exchange: 'WazirX', note: '' };
    const [addCoinForm, setAddCoinForm] = useState(emptyAddCoin);
    const [purchaseForm, setPurchaseForm] = useState(emptyPurchase);
    const [saving, setSaving] = useState(false);

    // ── Fetch holdings ───────────────────────────────────────────────────────
    const fetchHoldings = useCallback(async () => {
        const token = getToken();
        if (!token) return;
        try {
            const res = await fetch(API_BASE, { headers: { 'Authorization': `Bearer ${token}` } });
            const json = await res.json();
            if (json.success) setHoldings(json.data || []);
        } catch (e) { console.error('Failed to fetch holdings:', e); }
        finally { setLoading(false); }
    }, []);

    // ── Fetch live prices via backend proxy ─────────────────────────────────
    const refreshPrices = useCallback(async (currentHoldings) => {
        const h = currentHoldings || holdings;
        const symbols = [...new Set(h.map(c => c.symbol).filter(Boolean))];
        if (!symbols.length) return;
        setPriceLoading(true);
        const token = getToken();
        const { prices: live, stale } = await fetchLivePrices(symbols, token);
        setPrices(live);
        setPriceStale(stale);
        setLastUpdated(new Date());
        setPriceLoading(false);
    }, [holdings]);

    useEffect(() => {
        fetchHoldings().then(() => { });
    }, [fetchHoldings]);

    // Auto-fetch prices once holdings load
    useEffect(() => {
        if (holdings.length > 0) refreshPrices(holdings);
    }, [holdings.length]); // eslint-disable-line

    // ── Compute P&L helpers ──────────────────────────────────────────────────
    function getCoinStats(coin) {
        const purchases = coin.purchases || [];
        const totalQty = purchases.reduce((s, p) => s + Number(p.quantity), 0);
        const totalInvested = purchases.reduce((s, p) => s + Number(p.invested_amount || 0), 0);
        const avgBuy = totalQty > 0 ? totalInvested / totalQty : 0;
        const currentPrice = prices[coin.symbol] ?? null;
        const currentValue = currentPrice !== null ? totalQty * currentPrice : null;
        const pnl = currentValue !== null ? currentValue - totalInvested : null;
        const pnlPct = pnl !== null && totalInvested > 0 ? (pnl / totalInvested) * 100 : null;
        return { totalQty, totalInvested, avgBuy, currentPrice, currentValue, pnl, pnlPct };
    }

    // Portfolio-level aggregates
    const portfolioStats = holdings.reduce((acc, coin) => {
        const s = getCoinStats(coin);
        acc.totalInvested += s.totalInvested;
        if (s.currentValue !== null) {
            acc.totalCurrentValue = (acc.totalCurrentValue ?? 0) + s.currentValue;
            acc.hasPrices = true;
        }
        return acc;
    }, { totalInvested: 0, totalCurrentValue: null, hasPrices: false });

    const portfolioPnl = portfolioStats.hasPrices ? (portfolioStats.totalCurrentValue - portfolioStats.totalInvested) : null;
    const portfolioPnlPct = portfolioPnl !== null && portfolioStats.totalInvested > 0
        ? (portfolioPnl / portfolioStats.totalInvested) * 100 : null;

    // ── CRUD handlers ────────────────────────────────────────────────────────
    const handleAddCoin = async () => {
        const isCustom = addCoinForm.coinName === 'Other';
        const name = isCustom ? addCoinForm.customName.trim() : addCoinForm.coinName;
        const symbol = isCustom ? addCoinForm.customSymbol.trim().toUpperCase() : addCoinForm.coinSymbol;
        if (!name) return;

        const existing = holdings.find(h => h.symbol === symbol && h.name === name);
        if (existing) { setShowAddCoin(false); setAddCoinForm(emptyAddCoin); setAddPurchaseCoinId(existing.id); return; }

        setSaving(true);
        try {
            const res = await fetch(API_BASE, {
                method: 'POST',
                headers: authHeaders(),
                body: JSON.stringify({ name, symbol, coingecko_id: isCustom ? null : addCoinForm.geckoId })
            });
            const json = await res.json();
            if (json.success) {
                await fetchHoldings();
                setShowAddCoin(false); setAddCoinForm(emptyAddCoin); setAddPurchaseCoinId(json.data.id);
            } else { alert(json.error?.message || 'Failed to create holding'); }
        } finally { setSaving(false); }
    };

    const handleAddPurchase = async () => {
        const qty = Number(purchaseForm.quantity);
        const price = Number(purchaseForm.buyPrice);
        if (!qty || !price || qty <= 0 || price <= 0) return;
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/${addPurchaseCoinId}/purchases`, {
                method: 'POST', headers: authHeaders(),
                body: JSON.stringify({
                    quantity: qty, buy_price: price, invested_amount: qty * price,
                    date: purchaseForm.date, exchange: purchaseForm.exchange, note: purchaseForm.note.trim(),
                }),
            });
            const json = await res.json();
            if (json.success) {
                await fetchHoldings();
                setExpandedCoinId(addPurchaseCoinId);
                setPurchaseForm(emptyPurchase); setAddPurchaseCoinId(null);
            } else { alert(json.error?.message || 'Failed to add purchase'); }
        } finally { setSaving(false); }
    };

    const handleDeleteCoin = async () => {
        await fetch(`${API_BASE}/${deleteCoinId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } });
        setDeleteCoinId(null); await fetchHoldings();
    };

    const handleDeletePurchase = async () => {
        const { coinId, purchaseId } = deletePurchaseInfo;
        await fetch(`${API_BASE}/${coinId}/purchases/${purchaseId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getToken()}` } });
        setDeletePurchaseInfo(null); await fetchHoldings();
    };

    if (loading) return <div className="crypto-page"><div className="crypto-loading">Loading portfolio…</div></div>;

    return (
        <div className="crypto-page">
            {/* Header */}
            <div className="crypto-header">
                <div>
                    <h1 className="crypto-title">Crypto Portfolio</h1>
                    <p className="crypto-subtitle">Track your cryptocurrency investments</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => refreshPrices()}
                        disabled={priceLoading || holdings.length === 0}
                        title="Refresh live prices"
                    >
                        {priceLoading ? '⟳ Updating…' : '⟳ Refresh Prices'}
                    </button>
                    {lastUpdated && (
                        <span className={`crypto-last-updated ${priceStale ? 'crypto-stale' : ''}`}>
                            {priceStale ? '⚠️ Stale · ' : ''}
                            Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }).toUpperCase()}
                        </span>
                    )}
                    <button className="btn btn-primary" onClick={() => setShowAddCoin(true)}>+ Add Coin</button>
                </div>
            </div>

            {/* Overview Cards — Portfolio Level */}
            <div className="crypto-overview">
                <div className="crypto-stat-card">
                    <div className="crypto-stat-label">Total Invested</div>
                    <div className="crypto-stat-value" style={{ color: 'var(--accent-purple)' }}>
                        {fmt(portfolioStats.totalInvested)}
                    </div>
                </div>
                <div className="crypto-stat-card">
                    <div className="crypto-stat-label">Current Value</div>
                    <div className="crypto-stat-value" style={{ color: 'var(--accent-teal)' }}>
                        {portfolioStats.totalCurrentValue !== null ? fmt(portfolioStats.totalCurrentValue) : (
                            <span className="pnl-na">{priceLoading ? 'Fetching…' : '—'}</span>
                        )}
                    </div>
                </div>
                <div className="crypto-stat-card">
                    <div className="crypto-stat-label">Total P&amp;L</div>
                    <div className="crypto-stat-value">
                        {portfolioPnl !== null
                            ? <PnlBadge value={portfolioPnl} pct={portfolioPnlPct} />
                            : <span className="pnl-na">{priceLoading ? 'Fetching…' : '—'}</span>
                        }
                    </div>
                </div>
                <div className="crypto-stat-card">
                    <div className="crypto-stat-label">Coins Tracked</div>
                    <div className="crypto-stat-value">{holdings.length}</div>
                </div>
            </div>

            {/* Empty state */}
            {holdings.length === 0 && (
                <div className="crypto-empty">
                    <div className="crypto-empty-icon">₿</div>
                    <h2>No crypto holdings yet</h2>
                    <p>Start tracking your crypto investments by adding your first coin.</p>
                    <button className="btn btn-primary" onClick={() => setShowAddCoin(true)}>+ Add First Coin</button>
                </div>
            )}

            {/* Holdings List */}
            <div className="crypto-holdings">
                {holdings.map(coin => {
                    const { totalQty, totalInvested, avgBuy, currentPrice, currentValue, pnl, pnlPct } = getCoinStats(coin);
                    const purchases = coin.purchases || [];
                    const isExpanded = expandedCoinId === coin.id;
                    const color = getCoinColor(coin.symbol);
                    const meta = getCoinMeta(coin.symbol);
                    const hasPnl = pnl !== null;

                    return (
                        <div key={coin.id} className="crypto-coin-card">
                            <div className="crypto-coin-header">
                                {/* Left: identity */}
                                <div className="crypto-coin-identity">
                                    <div className="crypto-coin-avatar"
                                        style={{ background: `${color}22`, color, border: `1.5px solid ${color}44` }}>
                                        {meta.emoji}
                                    </div>
                                    <div>
                                        <div className="crypto-coin-name">{coin.name}</div>
                                        {coin.symbol && <div className="crypto-coin-symbol">{coin.symbol}</div>}
                                    </div>
                                </div>

                                {/* Right: metrics + P&L + actions */}
                                <div className="crypto-coin-meta">
                                    <div className="crypto-coin-metrics">
                                        <div className="crypto-mini-stat">
                                            <span className="crypto-mini-label">Invested</span>
                                            <span className="crypto-mini-value" style={{ color: 'var(--accent-purple)' }}>
                                                {fmt(totalInvested)}
                                            </span>
                                        </div>
                                        <div className="crypto-mini-stat">
                                            <span className="crypto-mini-label">Qty</span>
                                            <span className="crypto-mini-value">{totalQty.toLocaleString()}</span>
                                        </div>
                                        <div className="crypto-mini-stat">
                                            <span className="crypto-mini-label">Avg Buy</span>
                                            <span className="crypto-mini-value">{fmt(avgBuy)}</span>
                                        </div>
                                        <div className="crypto-mini-stat">
                                            <span className="crypto-mini-label">Live Price</span>
                                            <span className="crypto-mini-value" style={{ color: 'var(--accent-teal)' }}>
                                                {currentPrice !== null ? fmt(currentPrice) : (priceLoading ? '…' : '—')}
                                            </span>
                                        </div>
                                        {hasPnl && (
                                            <div className="crypto-mini-stat">
                                                <span className="crypto-mini-label">P&amp;L</span>
                                                <PnlBadge value={pnl} pct={pnlPct} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="crypto-coin-actions">
                                        <button className="btn btn-sm btn-primary"
                                            onClick={() => { setAddPurchaseCoinId(coin.id); setPurchaseForm(emptyPurchase); }}>
                                            + Buy
                                        </button>
                                        <button className="btn btn-sm btn-secondary"
                                            onClick={() => setExpandedCoinId(isExpanded ? null : coin.id)}>
                                            {isExpanded ? '▲ Hide' : `▼ History (${purchases.length})`}
                                        </button>
                                        <button className="btn btn-icon btn-danger" title="Delete coin"
                                            onClick={() => setDeleteCoinId(coin.id)}>🗑️</button>
                                    </div>
                                </div>
                            </div>

                            {/* Coin-level P&L summary bar */}
                            {hasPnl && (
                                <div className={`crypto-pnl-bar ${pnl >= 0 ? 'pnl-bar-pos' : 'pnl-bar-neg'}`}>
                                    <span>Current Value: <strong>{fmtFull(currentValue)}</strong></span>
                                    <span style={{ margin: '0 0.75rem', opacity: 0.4 }}>|</span>
                                    <span>P&amp;L: <strong><PnlBadge value={pnl} pct={pnlPct} /></strong></span>
                                </div>
                            )}

                            {/* Purchase History */}
                            {isExpanded && (
                                <div className="crypto-purchase-history">
                                    <div className="crypto-history-title">Purchase History ({purchases.length})</div>
                                    {purchases.length === 0 ? (
                                        <p className="crypto-no-purchases">No purchases yet — click "+ Buy" to add one.</p>
                                    ) : (
                                        <div className="crypto-purchase-list">
                                            {purchases.map(p => (
                                                <div key={p.id} className="crypto-purchase-item">
                                                    <div className="crypto-purchase-left">
                                                        <div className="crypto-purchase-qty">
                                                            {Number(p.quantity).toLocaleString()} <span className="crypto-purchase-sym">{coin.symbol}</span>
                                                        </div>
                                                        <div className="crypto-purchase-detail">
                                                            {formatDate(p.date)} • @{fmtFull(p.buy_price)}/coin{p.exchange ? ` • ${p.exchange}` : ''}
                                                        </div>
                                                        {p.note && <div className="crypto-purchase-note">📝 {p.note}</div>}
                                                    </div>
                                                    <div className="crypto-purchase-right">
                                                        <div className="crypto-purchase-cost">{fmtFull(p.invested_amount)}</div>
                                                        <button className="crypto-purchase-delete"
                                                            onClick={() => setDeletePurchaseInfo({ coinId: coin.id, purchaseId: p.id })}
                                                            title="Delete purchase">✕</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── Add Coin Modal ── */}
            {showAddCoin && (
                <Modal title="Add Coin"
                    onClose={() => { setShowAddCoin(false); setAddCoinForm(emptyAddCoin); }}
                    footer={<>
                        <button className="btn btn-secondary" onClick={() => { setShowAddCoin(false); setAddCoinForm(emptyAddCoin); }}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleAddCoin} disabled={!addCoinForm.coinName || saving}>
                            {saving ? 'Adding…' : 'Next →'}
                        </button>
                    </>}
                >
                    <div className="input-group">
                        <label>Select Coin *</label>
                        <div className="crypto-coin-grid">
                            {POPULAR_COINS.map(c => (
                                <button key={c.name}
                                    className={`crypto-coin-chip ${addCoinForm.coinName === c.name ? 'selected' : ''}`}
                                    onClick={() => setAddCoinForm({ coinName: c.name, coinSymbol: c.symbol, geckoId: c.geckoId, customName: '', customSymbol: '' })}
                                >
                                    <span>{c.emoji}</span>
                                    <span>{c.name}</span>
                                    {c.symbol && <span className="chip-symbol">{c.symbol}</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                    {addCoinForm.coinName === 'Other' && (
                        <div className="form-row" style={{ marginTop: '1rem' }}>
                            <div className="input-group">
                                <label>Coin Name *</label>
                                <input className="input-field" type="text" placeholder="e.g. Shiba Inu"
                                    value={addCoinForm.customName}
                                    onChange={e => setAddCoinForm({ ...addCoinForm, customName: e.target.value })} autoFocus />
                            </div>
                            <div className="input-group">
                                <label>Symbol</label>
                                <input className="input-field" type="text" placeholder="e.g. SHIB"
                                    value={addCoinForm.customSymbol}
                                    onChange={e => setAddCoinForm({ ...addCoinForm, customSymbol: e.target.value })} />
                            </div>
                        </div>
                    )}
                </Modal>
            )}

            {/* ── Add Purchase Modal ── */}
            {addPurchaseCoinId && (() => {
                const coin = holdings.find(h => h.id === addPurchaseCoinId);
                if (!coin) return null;
                const qty = Number(purchaseForm.quantity);
                const price = Number(purchaseForm.buyPrice);
                const invested = qty > 0 && price > 0 ? qty * price : null;
                return (
                    <Modal title={`Buy ${coin.name}${coin.symbol ? ` (${coin.symbol})` : ''}`}
                        onClose={() => { setAddPurchaseCoinId(null); setPurchaseForm(emptyPurchase); }}
                        footer={<>
                            <button className="btn btn-secondary" onClick={() => { setAddPurchaseCoinId(null); setPurchaseForm(emptyPurchase); }}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleAddPurchase}
                                disabled={!purchaseForm.quantity || !purchaseForm.buyPrice || saving}>
                                {saving ? 'Saving…' : 'Add Purchase'}
                            </button>
                        </>}
                    >
                        {prices[coin.symbol] && (
                            <div className="crypto-live-price-hint">
                                💡 Live price: <strong>{fmtFull(prices[coin.symbol])}</strong> — you can use this as buy price
                            </div>
                        )}
                        <div className="form-row">
                            <div className="input-group">
                                <label>Quantity ({coin.symbol || 'coins'}) *</label>
                                <input className="input-field" type="number" step="any" min="0" placeholder="e.g. 0.5"
                                    value={purchaseForm.quantity}
                                    onChange={e => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })} autoFocus />
                            </div>
                            <div className="input-group">
                                <label>Buy Price per coin (₹) *</label>
                                <input className="input-field" type="number" step="any" min="0" placeholder="e.g. 250000"
                                    value={purchaseForm.buyPrice}
                                    onChange={e => setPurchaseForm({ ...purchaseForm, buyPrice: e.target.value })} />
                            </div>
                        </div>
                        {invested !== null && (
                            <div className="crypto-invested-preview">
                                💰 Total invested: <strong>{fmtFull(invested)}</strong>
                            </div>
                        )}
                        <div className="form-row">
                            <div className="input-group">
                                <label>Purchase Date</label>
                                <input className="input-field" type="date" value={purchaseForm.date}
                                    onChange={e => setPurchaseForm({ ...purchaseForm, date: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <label>Exchange</label>
                                <select className="input-field" value={purchaseForm.exchange}
                                    onChange={e => setPurchaseForm({ ...purchaseForm, exchange: e.target.value })}>
                                    {EXCHANGES.map(ex => <option key={ex}>{ex}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="input-group">
                            <label>Note (optional)</label>
                            <input className="input-field" type="text" placeholder="e.g. DCA buy, dip buy, long term…"
                                value={purchaseForm.note}
                                onChange={e => setPurchaseForm({ ...purchaseForm, note: e.target.value })} />
                        </div>
                    </Modal>
                );
            })()}

            {/* ── Delete Coin ── */}
            {deleteCoinId && (
                <Modal title="Delete Coin?" onClose={() => setDeleteCoinId(null)}
                    footer={<>
                        <button className="btn btn-secondary" onClick={() => setDeleteCoinId(null)}>Cancel</button>
                        <button className="btn btn-danger" onClick={handleDeleteCoin}>Yes, Delete</button>
                    </>}>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        This will delete the coin and <strong>all its purchase history</strong> permanently.
                    </p>
                </Modal>
            )}

            {/* ── Delete Purchase ── */}
            {deletePurchaseInfo && (
                <Modal title="Delete Purchase?" onClose={() => setDeletePurchaseInfo(null)}
                    footer={<>
                        <button className="btn btn-secondary" onClick={() => setDeletePurchaseInfo(null)}>Cancel</button>
                        <button className="btn btn-danger" onClick={handleDeletePurchase}>Yes, Delete</button>
                    </>}>
                    <p style={{ color: 'var(--text-secondary)' }}>This purchase entry will be permanently deleted.</p>
                </Modal>
            )}
        </div>
    );
}
