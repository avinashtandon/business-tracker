import './SummaryCard.css';

export default function SummaryCard({ icon, label, value, sub, variant = 'teal' }) {
    return (
        <div className={`summary-card variant-${variant}`}>
            <div className="summary-card-header">
                <div className="summary-card-icon">{icon}</div>
                <span className="summary-card-label">{label}</span>
            </div>
            <div className="summary-card-value">{value}</div>
            {sub && <div className="summary-card-sub">{sub}</div>}
        </div>
    );
}
