import { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
    calcPersonAggregate,
    getLoanStatus,
    formatCurrency,
    formatDate,
    PAYMENT_MODES,
} from '../utils/helpers';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import './People.css';

// Determine the "worst" status across all a person's active loans
function personOverallStatus(person) {
    const active = (person.loans || []).filter((l) => getLoanStatus(l) !== 'Received');
    if (active.length === 0) return 'Received';
    if (active.some((l) => getLoanStatus(l) === 'Overdue')) return 'Overdue';
    return 'Pending';
}

// Get soonest non-received due date
function personSoonestDue(person) {
    const active = (person.loans || []).filter((l) => getLoanStatus(l) !== 'Received' && l.dueDate);
    if (!active.length) return '—';
    active.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    return formatDate(active[0].dueDate);
}

export default function People({ onNavigate }) {
    const { state, addPerson } = useApp();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [showAddModal, setShowAddModal] = useState(false);
    const [form, setForm] = useState({ name: '', interest: '', dueDate: '', duration: '2' });

    const filtered = state.people
        .map((p) => {
            const agg = calcPersonAggregate(p);
            const status = personOverallStatus(p);
            return { ...p, ...agg, status };
        })
        .filter((p) => {
            if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
            if (statusFilter !== 'All' && p.status !== statusFilter) return false;
            return true;
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const handleAdd = () => {
        if (!form.name.trim()) return;
        const duration = /^\d+$/.test(form.duration.trim())
            ? `${form.duration.trim()} weeks`
            : form.duration.trim() || '2 weeks';
        addPerson({ ...form, duration });
        setForm({ name: '', interest: '', dueDate: '', duration: '2' });
        setShowAddModal(false);
    };

    return (
        <div className="people-page">
            <div className="people-header">
                <h1>People</h1>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>+ Add Person</button>
            </div>

            <div className="people-toolbar">
                <div className="search-input-wrapper">
                    <input
                        className="input-field"
                        type="text"
                        placeholder="Search by name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <select className="input-field filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="All">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Received">Received</option>
                </select>
            </div>

            <div className="people-table-container">
                {filtered.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">👥</div>
                        <p>{state.people.length === 0 ? 'No people added yet.' : 'No results match your search.'}</p>
                        {state.people.length === 0 && (
                            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>Add First Person</button>
                        )}
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Loans</th>
                                <th>Total Lent</th>
                                <th>Total to Receive</th>
                                <th>Total Received</th>
                                <th>Soonest Due</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((p) => (
                                <tr key={p.id} onClick={() => onNavigate('person', p.id)}>
                                    <td>
                                        <div className="person-name-cell">
                                            <div className="person-avatar">{p.name.charAt(0).toUpperCase()}</div>
                                            <div>
                                                <div className="person-name">{p.name}</div>
                                                <div className="person-txn-count">{p.activeLoans} active loan{p.activeLoans !== 1 ? 's' : ''}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{(p.loans || []).length}</td>
                                    <td className="text-currency" style={{ color: 'var(--text-primary)' }}>{formatCurrency(p.totalPrincipal)}</td>
                                    <td className="text-currency" style={{ color: 'var(--accent-purple)' }}>{formatCurrency(p.totalReturn)}</td>
                                    <td className="text-currency-green">{formatCurrency(p.totalReceived)}</td>
                                    <td>{personSoonestDue(p)}</td>
                                    <td><StatusBadge status={p.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Add Person Modal */}
            {showAddModal && (
                <Modal title="Add New Person" onClose={() => setShowAddModal(false)} footer={
                    <><button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleAdd}>Add Person</button></>
                }>
                    <div className="input-group">
                        <label>Person Name *</label>
                        <input className="input-field" type="text" placeholder="e.g. Yash" value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                        First loan details (you can change these and add more loans later)
                    </p>
                    <div className="form-row">
                        <div className="input-group">
                            <label>Interest Amount (₹)</label>
                            <input className="input-field" type="number" placeholder="e.g. 10000" value={form.interest}
                                onChange={(e) => setForm({ ...form, interest: e.target.value })} />
                        </div>
                        <div className="input-group">
                            <label>Due Date</label>
                            <input className="input-field" type="date" value={form.dueDate}
                                onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                        </div>
                    </div>
                    <div className="input-group">
                        <label>Duration in weeks (default: 2)</label>
                        <input className="input-field" type="text" placeholder="e.g. 2" value={form.duration}
                            onChange={(e) => setForm({ ...form, duration: e.target.value })} />
                    </div>
                </Modal>
            )}
        </div>
    );
}
