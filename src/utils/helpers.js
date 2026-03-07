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
    // Only count given (non-received) transactions toward principal
    const givenTxns = (loan.transactions || []).filter(t => t.type !== 'received');
    const totalPrincipal = givenTxns.reduce(
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
    let totalToReceive = 0; // outstanding balance only (not yet paid)
    let totalReceived = 0;
    let totalProfit = 0;
    let activeLoans = 0;

    (person.loans || []).forEach((loan) => {
        const t = calcLoanTotals(loan);
        const status = getLoanStatus(loan);
        totalPrincipal += t.totalPrincipal;
        totalToReceive += Math.max(0, t.remaining); // only count what's still owed
        totalReceived += t.amountReceived;
        if (status === 'Received') totalProfit += t.interest;
        if (status !== 'Received') activeLoans++;
    });

    return { totalPrincipal, totalReturn: totalToReceive, totalReceived, totalProfit, activeLoans };
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
export const DEFAULT_PAYMENT_MODES = ['UPI', 'Net Banking', 'Cash', 'Cheque', 'Other'];

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
            const txns = [...loan.transactions]
                .filter(t => t.type !== 'received')
                .sort((a, b) => new Date(a.date) - new Date(b.date));
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

/**
 * Fetch helper that automatically attaches Bearer token and handles 401 expiration
 */
let isLoggingOut = false;
let globalTokenExpiry = null;

export function setAuthToken(token) {
    if (!token) {
        globalTokenExpiry = null;
        return;
    }
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        globalTokenExpiry = payload.exp * 1000;
    } catch {
        globalTokenExpiry = null;
    }
}

// Ensure token expiry is pre-cached on hard reload immediately
const initialToken = localStorage.getItem("access_token");
if (initialToken) {
    try {
        setAuthToken(initialToken);
        if (globalTokenExpiry === null) throw new Error("Invalid token");
    } catch {
        localStorage.removeItem("access_token");
        localStorage.removeItem("auth_user");
    }
}

export const AUTH_ERRORS = {
    EXPIRED: "AUTH_EXPIRED",
    UNAUTHORIZED: "AUTH_UNAUTHORIZED"
};

function authLogout() {
    if (isLoggingOut) return;

    isLoggingOut = true;
    globalTokenExpiry = null;
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("auth_user");
    window.dispatchEvent(new Event("storage"));

    // allow future sessions to execute cleanly 
    setTimeout(() => {
        isLoggingOut = false;
    }, 100);
}

let isRefreshing = false;
let refreshPromise = null;

async function attemptRefresh() {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) throw new Error("No refresh token");

    const res = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken })
    });

    if (!res.ok) throw new Error("Refresh failed");

    const json = await res.json();
    if (!json.success || !json.data?.access_token) throw new Error("Invalid refresh response");

    const { access_token, refresh_token } = json.data;
    localStorage.setItem("access_token", access_token);
    if (refresh_token) localStorage.setItem("refresh_token", refresh_token);
    setAuthToken(access_token);
    window.dispatchEvent(new Event("storage")); // inform other tabs
    return access_token;
}

export async function apiFetch(url, options = {}) {
    let token = localStorage.getItem("access_token");

    if (token && globalTokenExpiry === null) {
        try {
            setAuthToken(token);
            if (globalTokenExpiry === null) throw new Error("Invalid token");
        } catch {
            authLogout();
            return new Response(JSON.stringify({ success: false, error: { message: "Unauthorized" } }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }
    }

    // Proactive refresh
    if (token && globalTokenExpiry && Date.now() >= globalTokenExpiry) {
        if (!isRefreshing) {
            isRefreshing = true;
            refreshPromise = attemptRefresh().finally(() => {
                isRefreshing = false;
                refreshPromise = null;
            });
        }

        try {
            token = await refreshPromise;
        } catch (err) {
            authLogout();
            return new Response(JSON.stringify({ success: false, error: { message: "Unauthorized" } }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }
    }

    let res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
    });

    // Reactive refresh if backend still returned 401
    if (res.status === 401) {
        if (!isRefreshing) {
            isRefreshing = true;
            refreshPromise = attemptRefresh().finally(() => {
                isRefreshing = false;
                refreshPromise = null;
            });
        }
        try {
            token = await refreshPromise;
            res = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...(options.headers || {}),
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                }
            });
        } catch (err) {
            authLogout();
            return new Response(JSON.stringify({ success: false, error: { message: "Unauthorized" } }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        if (res.status === 401) {
            authLogout();
            return res;
        }
    }

    return res;
}
