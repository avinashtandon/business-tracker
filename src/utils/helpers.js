/**
 * Format a number as Indian Rupees (₹)
 * e.g. 2000000 → ₹20,00,000
 */
export function formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
    const num = Number(amount);
    return '₹' + num.toLocaleString('en-IN', {
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
    });
}

/**
 * Format a date string to locale display
 */
export function formatDate(dateStr) {
    if (!dateStr) return '—';
    let d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

/**
 * Get number of days until due date (negative if overdue)
 */
export function getDaysUntilDue(dueDateStr) {
    if (!dueDateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let due = new Date(dueDateStr + 'T00:00:00');
    if (isNaN(due.getTime())) due = new Date(dueDateStr);
    if (isNaN(due.getTime())) return null;
    return Math.ceil((due - today) / (1000 * 60 * 60 * 24));
}

/**
 * Calculate derived values for a single LOAN
 */
export function calcLoanTotals(loan) {
    const totalPrincipal = (loan.transactions || []).reduce(
        (sum, t) => sum + (Number(t.amount) || 0),
        0
    );
    const interest = Number(loan.interest) || 0;
    const totalReturn = totalPrincipal + interest;
    const amountReceived = Number(loan.amountReceived) || 0;
    const remaining = totalReturn - amountReceived;
    return { totalPrincipal, interest, totalReturn, amountReceived, remaining };
}

/**
 * Get status string for a single LOAN
 */
export function getLoanStatus(loan) {
    const { remaining } = calcLoanTotals(loan);
    if (remaining <= 0) return 'Received';
    if (loan.dueDate) {
        const days = getDaysUntilDue(loan.dueDate);
        if (days !== null && days < 0) return 'Overdue';
    }
    return 'Pending';
}

/**
 * Aggregate totals across all loans for a person
 */
export function calcPersonAggregate(person) {
    let totalPrincipal = 0;
    let totalReturn = 0;
    let totalReceived = 0;
    let totalProfit = 0;
    let activeLoans = 0;

    (person.loans || []).forEach((loan) => {
        const t = calcLoanTotals(loan);
        const status = getLoanStatus(loan);
        totalPrincipal += t.totalPrincipal;
        totalReturn += t.totalReturn;
        totalReceived += t.amountReceived;
        if (status === 'Received') totalProfit += t.interest;
        if (status !== 'Received') activeLoans++;
    });

    return { totalPrincipal, totalReturn, totalReceived, totalProfit, activeLoans };
}

/**
 * Generate a unique ID
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Payment mode options
 */
export const PAYMENT_MODES = ['UPI', 'Net Banking', 'Cash', 'Cheque', 'Other'];

/**
 * Export all lending data as a CSV file (opens cleanly in Excel / Google Sheets).
 * Contains two sections: Master Summary and Transaction Details.
 */
export function exportData(people) {
    const rows = [];

    // ── SECTION 1: Master Summary ──────────────────
    rows.push(['MASTER SUMMARY']);
    rows.push([
        'Person Name', 'Loan #', 'Principal (Rs)', 'Interest (Rs)', 'Total Return (Rs)',
        'Amount Received (Rs)', 'Remaining (Rs)', 'Duration', 'Due Date',
        'Date Received', 'Payment Mode (Received)', 'Status',
    ]);

    people.forEach((person) => {
        const loans = [...(person.loans || [])].sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
        loans.forEach((loan, idx) => {
            const t = calcLoanTotals(loan);
            const status = getLoanStatus(loan);
            rows.push([
                person.name,
                idx + 1,
                t.totalPrincipal,
                t.interest,
                t.totalReturn,
                t.amountReceived,
                Math.max(0, t.remaining),
                loan.duration || '',
                loan.dueDate || '',
                loan.dateReceived || '',
                loan.receivedPaymentMode || '',
                status,
            ]);
        });
    });

    rows.push([]); // blank separator

    // ── SECTION 2: Transaction Details ─────────────
    rows.push(['TRANSACTION DETAILS']);
    rows.push(['Person Name', 'Loan #', 'Date Given', 'Amount Given (Rs)', 'Payment Mode']);

    people.forEach((person) => {
        const loans = [...(person.loans || [])].sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
        loans.forEach((loan, loanIdx) => {
            const txns = [...loan.transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
            txns.forEach((txn) => {
                rows.push([person.name, loanIdx + 1, txn.date, txn.amount, txn.mode]);
            });
        });
    });

    rows.push([]); // blank separator

    // ── SECTION 3: Received Payments ───────────────
    rows.push(['RECEIVED PAYMENTS']);
    rows.push(['Person Name', 'Loan #', 'Date Received', 'Amount Received (Rs)', 'Payment Mode']);

    people.forEach((person) => {
        const loans = [...(person.loans || [])].sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
        loans.forEach((loan, loanIdx) => {
            const amt = Number(loan.amountReceived) || 0;
            if (amt > 0) {
                rows.push([
                    person.name,
                    loanIdx + 1,
                    loan.dateReceived || '',
                    amt,
                    loan.receivedPaymentMode || '',
                ]);
            }
        });
    });

    // ── Build & download CSV ────────────────────────
    const escape = (v) => {
        const s = String(v ?? '');
        return s.includes(',') || s.includes('"') || s.includes('\n')
            ? `"${s.replace(/"/g, '""')}"`
            : s;
    };
    const csv = rows.map((r) => r.map(escape).join(',')).join('\n');

    // UTF-8 BOM so Excel reads special characters correctly
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().split('T')[0];
    const a = document.createElement('a');
    a.href = url;
    a.download = `LendTrack_${date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

