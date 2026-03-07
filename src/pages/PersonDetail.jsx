import { useState } from 'react';
import { useApp } from '../context/useApp';
import {
    calcLoanTotals,
    getLoanStatus,
    calcPersonAggregate,
    formatCurrency,
    formatDate,
    getDaysUntilDue,
} from '../utils/helpers';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import './PersonDetail.css';

export default function PersonDetail({ personId, onNavigate }) {
    const {
        state, editPerson, deletePerson,
        addLoan, editLoan, deleteLoan,
        addTransaction, deleteTransaction, markLoanReceived,
    } = useApp();
    const person = state.people.find((p) => p.id === personId);

    // Modals / forms state
    const [showAddLoanModal, setShowAddLoanModal] = useState(false);
    const [loanForm, setLoanForm] = useState({ purpose: '', principal: '', interest: '', dueDate: '', duration: '2', paymentMode: state.paymentModes?.[0] || 'Cash' });

    const defaultMode = state.paymentModes?.[0] || 'UPI';

    const [addTxnLoanId, setAddTxnLoanId] = useState(null);
    const [txnForm, setTxnForm] = useState({ date: new Date().toISOString().split('T')[0], amount: '', mode: defaultMode, note: '' });

    const [receiveLoanId, setReceiveLoanId] = useState(null);
    const [receiveForm, setReceiveForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], mode: defaultMode });

    const [editLoanId, setEditLoanId] = useState(null);
    const [editLoanForm, setEditLoanForm] = useState({});

    const [deleteLoanId, setDeleteLoanId] = useState(null);
    const [showDeletePerson, setShowDeletePerson] = useState(false);
    const [showEditName, setShowEditName] = useState(false);
    const [editName, setEditName] = useState('');

    if (!person) {
        return (
            <div className="person-detail">
                <button className="person-detail-back" onClick={() => onNavigate('people')}>← Back to People</button>
                <div className="empty-state"><div className="empty-icon">❌</div><p>Person not found</p></div>
            </div>
        );
    }

    const agg = calcPersonAggregate(person);
    const loans = [...(person.loans || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // ── Handlers ───────────────────────────────
    const handleAddLoan = () => {
        if (!loanForm.principal) return;
        const duration = /^\d+$/.test(loanForm.duration.trim())
            ? `${loanForm.duration.trim()} weeks`
            : loanForm.duration.trim() || '2 weeks';
        addLoan(person.id, { ...loanForm, duration, paymentMode: loanForm.paymentMode || state.paymentModes?.[0] || 'Cash' });
        setLoanForm({ purpose: '', principal: '', interest: '', dueDate: '', duration: '2', paymentMode: state.paymentModes?.[0] || 'Cash' });
        setShowAddLoanModal(false);
    };

    const handleAddTxn = () => {
        if (!txnForm.amount || Number(txnForm.amount) <= 0) return;
        addTransaction(person.id, addTxnLoanId, txnForm);
        setTxnForm({ date: new Date().toISOString().split('T')[0], amount: '', mode: state.paymentModes?.[0] || 'UPI', note: '' });
        setAddTxnLoanId(null);
    };

    const handleReceive = () => {
        if (!receiveForm.amount || Number(receiveForm.amount) <= 0) return;
        markLoanReceived(person.id, receiveLoanId, Number(receiveForm.amount), receiveForm.date, receiveForm.mode);
        setReceiveForm({ amount: '', date: new Date().toISOString().split('T')[0], mode: state.paymentModes?.[0] || 'UPI' });
        setReceiveLoanId(null);
    };

    const handleEditLoan = () => {
        const duration = /^\d+$/.test(editLoanForm.duration.trim())
            ? `${editLoanForm.duration.trim()} weeks`
            : editLoanForm.duration.trim() || '2 weeks';
        editLoan(person.id, editLoanId, {
            purpose: editLoanForm.purpose || '',
            interest: Number(editLoanForm.interest) || 0,
            dueDate: editLoanForm.dueDate,
            duration,
        });
        setEditLoanId(null);
    };

    const openEditLoan = (loan) => {
        setEditLoanId(loan.id);
        setEditLoanForm({ purpose: loan.purpose || '', interest: loan.interest, dueDate: loan.dueDate, duration: loan.duration || '' });
    };

    const handleDelete = () => {
        deletePerson(person.id);
        onNavigate('people');
    };

    return (
        <div className="person-detail">
            <button className="person-detail-back" onClick={() => onNavigate('people')}>← Back to People</button>

            {/* ── Person Header ───────────────────── */}
            <div className="person-detail-header">
                <div className="person-detail-info">
                    <div className="person-detail-avatar">{person.name.charAt(0).toUpperCase()}</div>
                    <div className="person-detail-name">
                        <h1>{person.name}</h1>
                        <div className="person-detail-meta">
                            <span>💼 {loans.length} loan{loans.length !== 1 ? 's' : ''} total</span>
                            {agg.activeLoans > 0 && <span>⏳ {agg.activeLoans} active</span>}
                        </div>
                    </div>
                </div>
                <div className="person-detail-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => setShowAddLoanModal(true)}>+ New Loan</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setEditName(person.name); setShowEditName(true); }}>✏️ Rename</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setShowDeletePerson(true)}>🗑️ Delete</button>
                </div>
            </div>

            {/* ── Aggregate Metrics ───────────────── */}
            <div className="person-metrics" style={{ marginBottom: '2rem' }}>
                <div className="person-metric">
                    <div className="person-metric-label">Total Lent (all)</div>
                    <div className="person-metric-value" style={{ color: 'var(--text-primary)' }}>{formatCurrency(agg.totalPrincipal)}</div>
                </div>
                <div className="person-metric">
                    <div className="person-metric-label">Total to Receive</div>
                    <div className="person-metric-value" style={{ color: 'var(--accent-purple)' }}>{formatCurrency(agg.totalReturn)}</div>
                </div>
                <div className="person-metric">
                    <div className="person-metric-label">Total Received</div>
                    <div className="person-metric-value" style={{ color: 'var(--accent-teal)' }}>{formatCurrency(agg.totalReceived)}</div>
                </div>
                <div className="person-metric">
                    <div className="person-metric-label">Total Profit</div>
                    <div className="person-metric-value" style={{ color: 'var(--accent-green)' }}>{formatCurrency(agg.totalProfit)}</div>
                </div>
            </div>

            {/* ── Loan Cards ───────────────────────── */}
            {loans.length === 0 && (
                <div className="empty-state" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    <div className="empty-icon">💸</div>
                    <p>No loans yet. Click "+ New Loan" to get started.</p>
                </div>
            )}

            {loans.map((loan, idx) => {
                const t = calcLoanTotals(loan);
                const status = getLoanStatus(loan);
                const daysLeft = getDaysUntilDue(loan.dueDate);
                const sortedTxns = [...loan.transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
                const loanNumber = loans.length - idx; // newest = highest number

                return (
                    <div key={loan.id} className="loan-card">
                        {/* Loan Header */}
                        <div className="loan-card-header">
                            <div className="loan-card-title">
                                <span className="loan-number">Loan #{loanNumber}</span>
                                <span className="loan-purpose-tag" style={{ background: '#352e22', color: '#fbbf24', border: 'none', padding: '0.2rem 0.6rem', fontSize: '0.75rem', fontWeight: 600 }}>{loan.purpose ? `🏷️ ${loan.purpose}` : '🏷️ LOAN'}</span>
                                <StatusBadge status={status} />
                                {daysLeft !== null && status !== 'Received' && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: daysLeft < 0 ? '#f87171' : daysLeft <= 3 ? '#fbbf24' : '#9ca3af', fontSize: '0.8rem', fontWeight: 500, background: 'rgba(248,113,113,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                        <span style={{ fontSize: '0.6rem' }}>{daysLeft < 0 ? '🚨' : daysLeft > 0 ? '⏰' : '📌'}</span> {daysLeft > 0 ? `${daysLeft}d left` : daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : 'Due today'}
                                    </span>
                                )}
                            </div>
                            <div className="loan-card-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                                {status !== 'Received' && (
                                    <>
                                        <button className="btn btn-sm" style={{ background: '#a78bfa', color: '#111827', fontWeight: 600, border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px' }} onClick={() => { setAddTxnLoanId(loan.id); setTxnForm({ date: new Date().toISOString().split('T')[0], amount: '', mode: state.paymentModes?.[0] || 'UPI', note: '' }); }}>
                                            + Add ₹
                                        </button>
                                        <button className="btn btn-sm btn-secondary" style={{ background: '#1f2937', color: '#e5e7eb', border: '1px solid #374151', padding: '0.4rem 0.8rem', borderRadius: '6px' }} onClick={() => { setReceiveLoanId(loan.id); setReceiveForm({ amount: String(t.remaining), date: new Date().toISOString().split('T')[0], mode: state.paymentModes?.[0] || 'UPI' }); }}>
                                            📥 Receive
                                        </button>
                                    </>
                                )}
                                <button className="btn btn-icon btn-secondary" style={{ background: '#1f2937', color: '#fbbf24', border: 'none', padding: '0.4rem', borderRadius: '6px' }} onClick={() => openEditLoan(loan)} title="Edit loan">✏️</button>
                                {loans.length > 1 && (
                                    <button className="btn btn-icon btn-secondary" style={{ background: '#3f2226', color: '#f87171', border: 'none', padding: '0.4rem', borderRadius: '6px' }} onClick={() => setDeleteLoanId(loan.id)} title="Delete loan">🗑️</button>
                                )}
                            </div>
                        </div>

                        {/* Loan Metrics Vercel Style */}
                        <div className="loan-metrics" style={{
                            display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', padding: '1.25rem 0',
                            borderTop: '1px solid #1f2937', borderBottom: '1px solid #1f2937', margin: '0.5rem 0 1.5rem 0',
                            background: 'transparent', transform: 'none', boxShadow: 'none'
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', marginBottom: '0.2rem' }}>Principal</span>
                                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f3f4f6' }}>{formatCurrency(t.totalPrincipal)}</span>
                            </div>

                            <span style={{ color: '#6b7280', fontSize: '0.8rem', padding: '0 0.25rem', transform: 'translateY(8px)' }}>+</span>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', marginBottom: '0.2rem' }}>Interest</span>
                                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#34d399' }}>{formatCurrency(t.interest)}</span>
                            </div>

                            <span style={{ color: '#6b7280', fontSize: '0.8rem', padding: '0 0.25rem', transform: 'translateY(8px)' }}>=</span>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', marginBottom: '0.2rem' }}>Total Return</span>
                                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#a78bfa' }}>{formatCurrency(t.totalReturn)}</span>
                            </div>

                            <span style={{ color: '#374151', padding: '0 0.75rem', fontSize: '1.2rem', fontWeight: 300, transform: 'translateY(4px)' }}>|</span>

                            {loan.dueDate && (
                                <div style={{ display: 'flex', flexDirection: 'column', marginRight: '1rem' }}>
                                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', marginBottom: '0.2rem' }}>Due Date</span>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#e5e7eb' }}>{formatDate(loan.dueDate)}</span>
                                </div>
                            )}

                            {loan.duration && (
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', marginBottom: '0.2rem' }}>Duration</span>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#e5e7eb' }}>{loan.duration}</span>
                                </div>
                            )}
                        </div>

                        {/* Received banner */}
                        {status === 'Received' && (
                            <div className="loan-received-banner">
                                <span>✅ Fully received on {formatDate(loan.dateReceived)} via {loan.receivedPaymentMode || '—'}</span>
                            </div>
                        )}

                        {/* Transaction Timeline */}
                        {sortedTxns.length > 0 && (
                            <div className="loan-txn-section">
                                <div className="loan-txn-title">Timeline ({sortedTxns.length})</div>
                                <div className="txn-timeline">
                                    {sortedTxns.map((txn) => {
                                        const isReceived = txn.type === 'received';
                                        return (
                                            <div
                                                className="txn-timeline-item"
                                                key={txn.id}
                                                style={isReceived ? { background: 'rgba(52,211,153,0.07)', borderLeft: '3px solid #34d399' } : {}}
                                            >
                                                <div className="txn-info">
                                                    <div className="txn-amount" style={isReceived ? { color: '#34d399' } : {}}>
                                                        {isReceived ? '💰 +' : ''}{formatCurrency(txn.amount)}
                                                    </div>
                                                    <div className="txn-date-mode">{formatDate(txn.date)} • {txn.mode || 'Cash'}</div>
                                                    <div className="txn-note" style={isReceived ? { color: '#6ee7b7' } : {}}>
                                                        {isReceived ? '✅ Received Payment' : txn.note ? `📝 ${txn.note}` : ''}
                                                    </div>
                                                </div>
                                                {status !== 'Received' && !isReceived && (
                                                    <button className="txn-delete" onClick={() => deleteTransaction(person.id, loan.id, txn.id)} title="Delete">✕</button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Empty txn state */}
                        {sortedTxns.length === 0 && status !== 'Received' && (
                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.75rem', paddingLeft: '0.25rem' }}>
                                No installments yet — click "+ Add ₹" to record money given.
                            </p>
                        )}
                    </div>
                );
            })}

            {/* ══ Modals ══ */}

            {/* Add New Loan */}
            {showAddLoanModal && (
                <Modal title="Start New Loan" onClose={() => setShowAddLoanModal(false)} footer={
                    <><button className="btn btn-secondary" onClick={() => setShowAddLoanModal(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleAddLoan}>Start Loan</button></>
                }>
                    <div className="input-group">
                        <label>Business Purpose (e.g. Building PC, Shop Stock) 🏷️</label>
                        <input className="input-field" type="text" placeholder="What is this loan for?" value={loanForm.purpose}
                            onChange={(e) => setLoanForm({ ...loanForm, purpose: e.target.value })} autoFocus />
                    </div>
                    <div className="input-group" style={{ marginBottom: '1rem' }}>
                        <label>Principal Amount (₹) *</label>
                        <input className="input-field" type="number" placeholder="e.g. 50000" value={loanForm.principal}
                            onChange={(e) => setLoanForm({ ...loanForm, principal: e.target.value })} />
                    </div>
                    <div className="form-row">
                        <div className="input-group">
                            <label>Interest Amount (₹)</label>
                            <input className="input-field" type="number" placeholder="e.g. 40000" value={loanForm.interest}
                                onChange={(e) => setLoanForm({ ...loanForm, interest: e.target.value })} />
                        </div>
                        <div className="input-group">
                            <label>Due Date</label>
                            <input className="input-field" type="date" value={loanForm.dueDate}
                                onChange={(e) => setLoanForm({ ...loanForm, dueDate: e.target.value })} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="input-group">
                            <label>Duration in weeks (default: 2)</label>
                            <input className="input-field" type="text" placeholder="e.g. 2" value={loanForm.duration}
                                onChange={(e) => setLoanForm({ ...loanForm, duration: e.target.value })} />
                        </div>
                        <div className="input-group">
                            <label>Payment Mode</label>
                            <select
                                className="input-field"
                                value={loanForm.paymentMode}
                                onChange={(e) => setLoanForm({ ...loanForm, paymentMode: e.target.value })}
                            >
                                {state.paymentModes.map((mode) => (
                                    <option key={mode} value={mode}>{mode}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Add Transaction */}
            {addTxnLoanId && (
                <Modal title="Add Installment" onClose={() => setAddTxnLoanId(null)} footer={
                    <><button className="btn btn-secondary" onClick={() => setAddTxnLoanId(null)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleAddTxn}>Add</button></>
                }>
                    <div className="input-group">
                        <label>Amount (₹) *</label>
                        <input className="input-field" type="number" placeholder="e.g. 50000" value={txnForm.amount}
                            onChange={(e) => setTxnForm({ ...txnForm, amount: e.target.value })} autoFocus />
                    </div>
                    <div className="input-group">
                        <label>Reason / Note (e.g. For GPU, For case, First installment)</label>
                        <input className="input-field" type="text" placeholder="Why is this amount being given?" value={txnForm.note}
                            onChange={(e) => setTxnForm({ ...txnForm, note: e.target.value })} />
                    </div>
                    <div className="form-row">
                        <div className="input-group">
                            <label>Date</label>
                            <input className="input-field" type="date" value={txnForm.date}
                                onChange={(e) => setTxnForm({ ...txnForm, date: e.target.value })} />
                        </div>
                        <div className="input-group">
                            <label>Payment Mode</label>
                            <select className="input-field" value={txnForm.mode} onChange={(e) => setTxnForm({ ...txnForm, mode: e.target.value })}>
                                {state.paymentModes.map((m) => <option key={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Mark Received */}
            {receiveLoanId && (
                <Modal title="Record Payment Received" onClose={() => setReceiveLoanId(null)} footer={
                    <><button className="btn btn-secondary" onClick={() => setReceiveLoanId(null)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleReceive}>Confirm Receipt</button></>
                }>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        Enter the amount received for this loan cycle.
                    </p>
                    <div className="input-group">
                        <label>Amount Received (₹)</label>
                        <input className="input-field" type="number" value={receiveForm.amount}
                            onChange={(e) => setReceiveForm({ ...receiveForm, amount: e.target.value })} autoFocus />
                    </div>
                    <div className="form-row">
                        <div className="input-group">
                            <label>Date Received</label>
                            <input className="input-field" type="date" value={receiveForm.date}
                                onChange={(e) => setReceiveForm({ ...receiveForm, date: e.target.value })} />
                        </div>
                        <div className="input-group">
                            <label>Payment Mode</label>
                            <select className="input-field" value={receiveForm.mode} onChange={(e) => setReceiveForm({ ...receiveForm, mode: e.target.value })}>
                                {state.paymentModes.map((m) => <option key={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Edit Loan */}
            {editLoanId && (
                <Modal title="Edit Loan Details" onClose={() => setEditLoanId(null)} footer={
                    <><button className="btn btn-secondary" onClick={() => setEditLoanId(null)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleEditLoan}>Save</button></>
                }>
                    <div className="input-group">
                        <label>Business Purpose 🏷️</label>
                        <input className="input-field" type="text" placeholder="What is this loan for?" value={editLoanForm.purpose}
                            onChange={(e) => setEditLoanForm({ ...editLoanForm, purpose: e.target.value })} autoFocus />
                    </div>
                    <div className="form-row">
                        <div className="input-group">
                            <label>Interest Amount (₹)</label>
                            <input className="input-field" type="number" value={editLoanForm.interest}
                                onChange={(e) => setEditLoanForm({ ...editLoanForm, interest: e.target.value })} />
                        </div>
                        <div className="input-group">
                            <label>Due Date</label>
                            <input className="input-field" type="date" value={editLoanForm.dueDate}
                                onChange={(e) => setEditLoanForm({ ...editLoanForm, dueDate: e.target.value })} />
                        </div>
                    </div>
                    <div className="input-group">
                        <label>Duration in weeks (default: 2)</label>
                        <input className="input-field" type="text" placeholder="e.g. 2" value={editLoanForm.duration}
                            onChange={(e) => setEditLoanForm({ ...editLoanForm, duration: e.target.value })} />
                    </div>
                </Modal>
            )}

            {/* Delete Loan */}
            {deleteLoanId && (
                <Modal title="Delete Loan" onClose={() => setDeleteLoanId(null)} footer={
                    <><button className="btn btn-secondary" onClick={() => setDeleteLoanId(null)}>Cancel</button>
                        <button className="btn btn-danger" onClick={() => { deleteLoan(person.id, deleteLoanId); setDeleteLoanId(null); }}>Delete</button></>
                }>
                    <p style={{ color: 'var(--text-secondary)' }}>Delete this loan and all its transactions? This cannot be undone.</p>
                </Modal>
            )}

            {/* Rename Person */}
            {showEditName && (
                <Modal title="Rename Person" onClose={() => setShowEditName(false)} footer={
                    <><button className="btn btn-secondary" onClick={() => setShowEditName(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={() => { editPerson(person.id, editName); setShowEditName(false); }}>Save</button></>
                }>
                    <div className="input-group">
                        <label>Name</label>
                        <input className="input-field" type="text" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                    </div>
                </Modal>
            )}

            {/* Delete Person */}
            {showDeletePerson && (
                <Modal title="Delete Person" onClose={() => setShowDeletePerson(false)} footer={
                    <><button className="btn btn-secondary" onClick={() => setShowDeletePerson(false)}>Cancel</button>
                        <button className="btn btn-danger" onClick={handleDelete}>Delete</button></>
                }>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Delete <strong style={{ color: 'var(--text-primary)' }}>{person.name}</strong> and all {loans.length} loan(s)? This cannot be undone.
                    </p>
                </Modal>
            )}
        </div>
    );
}
