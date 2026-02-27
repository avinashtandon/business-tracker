import './StatusBadge.css';

export default function StatusBadge({ status }) {
    const statusClass = status ? status.toLowerCase() : 'pending';
    return (
        <span className={`status-badge status-${statusClass}`}>
            <span className="status-dot" />
            {status}
        </span>
    );
}
