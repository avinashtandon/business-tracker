import { useApp } from '../context/useApp';
import {
    calcLoanTotals,
    getLoanStatus,
    formatCurrency,
    formatDate,
    getDaysUntilDue,
    exportData,
} from '../utils/helpers';
import SummaryCard from '../components/SummaryCard';
import StatusBadge from '../components/StatusBadge';
import './Dashboard.css';

export default function Dashboard({ onNavigate }) {
    const { state } = useApp();
    const people = state.people;

    // Flatten all loans across all people
    const allLoans = people.flatMap((p) =>
        (p.loans || []).map((l) => ({ ...l, personName: p.name, personId: p.id }))
    );

    let totalInvested = 0;
    let totalPending = 0;
    let totalReceived = 0;
    let totalProfit = 0;
    let overdueList = [];
    let receivedCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    allLoans.forEach((loan) => {
        const t = calcLoanTotals(loan);
        const status = getLoanStatus(loan);
        totalInvested += t.totalPrincipal;
        totalReceived += t.amountReceived;

        if (status === 'Received') {
            receivedCount++;
            totalProfit += t.interest;
        } else if (status === 'Overdue') {
            overdueCount++;
            totalPending += t.remaining;
            const days = Math.abs(getDaysUntilDue(loan.dueDate) || 0);
            overdueList.push({ ...loan, ...t, status, daysOverdue: days });
        } else {
            pendingCount++;
            totalPending += t.remaining;
        }
    });

    // Recent transactions across all loans, newest first
    const allTransactions = allLoans
        .flatMap((l) =>
            (l.transactions || []).map((t) => ({
                ...t,
                personName: l.personName,
                personId: l.personId,
            }))
        )
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 8);

    // Donut chart
    const total = receivedCount + pendingCount + overdueCount;
    const segments = [
        { pct: total ? (receivedCount / total) * 100 : 0, color: '#34d399', label: 'Received', count: receivedCount },
        { pct: total ? (pendingCount / total) * 100 : 0, color: '#fbbf24', label: 'Pending', count: pendingCount },
        { pct: total ? (overdueCount / total) * 100 : 0, color: '#f87171', label: 'Overdue', count: overdueCount },
    ];
    const circumference = 2 * Math.PI * 45;
    let cumulativeOffset = 0;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div>
                    <h1>Dashboard</h1>
                    <p>Overview of your lending portfolio</p>
                </div>
                <button
                    className="btn btn-secondary"
                    onClick={() => exportData(people)}
                    title="Download as CSV (opens in Excel)"
                >
                    📥 Export CSV
                </button>
            </div>

            <div className="dashboard-cards">
                <SummaryCard icon="💰" label="Total Invested" value={formatCurrency(totalInvested)} sub={`${people.length} people, ${allLoans.length} loans`} variant="teal" />
                <SummaryCard icon="📈" label="Total Profit" value={formatCurrency(totalProfit)} sub={`${receivedCount} completed loans`} variant="green" />
                <SummaryCard icon="⏳" label="Pending Amount" value={formatCurrency(totalPending)} sub={`${pendingCount + overdueCount} loans pending`} variant="purple" />
                <SummaryCard icon="✅" label="Total Received" value={formatCurrency(totalReceived)} sub={`of ${formatCurrency(totalInvested + (totalProfit + totalPending))}`} variant="pink" />
            </div>

            {/* Overdue Alerts */}
            {overdueList.length > 0 && (
                <div className="dashboard-section" style={{ marginTop: '0', marginBottom: '2.5rem' }}>
                    <div className="dashboard-section-header" style={{ marginBottom: '1.25rem' }}>
                        <h2 style={{ fontSize: '1.25rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.1rem' }}>⚠️</span> Overdue Payments ({overdueList.length})
                        </h2>
                    </div>
                    <div className="overdue-alerts" style={{ gap: '0.5rem', marginBottom: '0' }}>
                        {overdueList.map((item) => (
                            <div className="overdue-alert" key={item.id} style={{
                                display: 'flex', alignItems: 'center', gap: '1.25rem',
                                padding: '1.25rem 1.5rem', background: '#251b1f',
                                border: '1px solid #3f2226', borderRadius: '12px',
                                transition: 'all 0.2s ease', cursor: 'pointer'
                            }}
                                onClick={() => onNavigate('person', item.personId)}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#2a1d22'; e.currentTarget.style.borderColor = '#4a262a'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#251b1f'; e.currentTarget.style.borderColor = '#3f2226'; }}
                            >
                                <div className="overdue-alert-icon" style={{ fontSize: '1.75rem', background: '#3b1c20', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: '1px solid #4a262a' }}>🚨</div>
                                <div className="overdue-alert-info" style={{ flex: 1 }}>
                                    <strong style={{ display: 'block', fontSize: '1rem', color: '#f3f4f6', marginBottom: '0.25rem' }}>{item.personName}</strong>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#f87171' }}>
                                        {formatCurrency(item.remaining)} overdue by {item.daysOverdue} day{item.daysOverdue !== 1 ? 's' : ''} <span style={{ opacity: 0.7 }}>(Due: {formatDate(item.dueDate)})</span>
                                    </p>
                                </div>
                                <button className="btn btn-sm btn-secondary" style={{ background: '#2d3345', border: '1px solid #3a4259', color: '#e5e7eb', padding: '0.4rem 0.8rem' }} onClick={(e) => { e.stopPropagation(); onNavigate('person', item.personId); }}>View →</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Donut + Recent Transactions */}
            <div style={{ display: 'grid', gridTemplateColumns: total > 0 ? '280px 1fr' : '1fr', gap: '1rem', alignItems: 'start' }}>
                {total > 0 && (
                    <div className="donut-chart-container" style={{ flexDirection: 'column', alignItems: 'center' }}>
                        <div className="donut-chart">
                            <svg viewBox="0 0 100 100">
                                {segments.map((seg, i) => {
                                    const dashLength = (seg.pct / 100) * circumference;
                                    const offset = cumulativeOffset;
                                    cumulativeOffset += dashLength;
                                    return (
                                        <circle key={i} cx="50" cy="50" r="45" fill="none"
                                            stroke={seg.color} strokeWidth="8"
                                            strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                                            strokeDashoffset={-offset} strokeLinecap="round" />
                                    );
                                })}
                            </svg>
                            <div className="donut-chart-center">
                                <span className="value">{total}</span>
                                <span className="label">Loans</span>
                            </div>
                        </div>
                        <div className="donut-legend">
                            {segments.map((seg, i) => (
                                <div className="donut-legend-item" key={i}>
                                    <span className="donut-legend-dot" style={{ background: seg.color }} />
                                    <span>{seg.label}</span>
                                    <span className="donut-legend-value">{seg.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="dashboard-section" style={{ gridColumn: total > 0 ? 'auto' : '1 / -1' }}>
                    <div className="dashboard-section-header">
                        <h2>Recent Transactions</h2>
                        <button className="btn btn-sm btn-secondary" onClick={() => onNavigate('people')}>View All →</button>
                    </div>
                    <div className="recent-table-container">
                        {allTransactions.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">📋</div>
                                <p>No transactions yet. Add a person and start lending!</p>
                                <button className="btn btn-primary" onClick={() => onNavigate('people')}>Add First Person</button>
                            </div>
                        ) : (
                            <table className="data-table">
                                <thead>
                                    <tr><th>Person</th><th>Date</th><th>Amount</th><th>Mode</th></tr>
                                </thead>
                                <tbody>
                                    {allTransactions.map((t) => (
                                        <tr key={t.id} onClick={() => onNavigate('person', t.personId)}>
                                            <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{t.personName}</td>
                                            <td>{formatDate(t.date)}</td>
                                            <td className="text-currency" style={{ color: 'var(--accent-teal)' }}>{formatCurrency(t.amount)}</td>
                                            <td>{t.mode}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
