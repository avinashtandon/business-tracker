import { useState, useEffect } from 'react';
import { DEFAULT_PAYMENT_MODES, apiFetch } from '../utils/helpers';
import { AppContext } from './useApp';

export function AppProvider({ children }) {
    const [state, setState] = useState({ people: [], paymentModes: DEFAULT_PAYMENT_MODES });
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(() => localStorage.getItem('access_token'));

    const getToken = () => token;

    const fetchLoans = async () => {
        const token = getToken();
        if (!token) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const res = await apiFetch('/api/v1/loans');

            const json = await res.json();

            if (json.success) {
                const loans = json.data || [];
                const peopleMap = {};

                loans.forEach(loan => {
                    const name = loan.person_name;
                    if (!peopleMap[name]) {
                        peopleMap[name] = { id: name, name: name, createdAt: loan.created_at, loans: [] };
                    }

                    const allTxns = loan.transactions || [];
                    const rxTxns = allTxns.filter(t => t.note === 'Received Payment');
                    const amountReceived = rxTxns.reduce((sum, t) => sum + Number(t.amount), 0);

                    const givenTxns = allTxns.filter(t => t.note !== 'Received Payment');
                    const givenTxnTotal = givenTxns.reduce((sum, t) => sum + Number(t.amount), 0);
                    const basePrin = Math.max(0, loan.principal_amount - givenTxnTotal);

                    let resolvedTxns = [...givenTxns];
                    if (basePrin > 0) {
                        resolvedTxns.push({
                            id: loan.id + '-base-prin',
                            date: loan.created_at,
                            amount: basePrin,
                            mode: loan.payment_mode || 'Cash',
                            note: 'Principal/Money Given'
                        });
                    }
                    resolvedTxns.sort((a, b) => new Date(a.date) - new Date(b.date));

                    peopleMap[name].loans.push({
                        id: loan.id,
                        purpose: loan.purpose,
                        interest: Number(loan.interest_amount) || 0,
                        dueDate: loan.due_date ? loan.due_date.split('T')[0] : '',
                        duration: loan.duration,
                        createdAt: loan.created_at,
                        amountReceived: amountReceived,
                        dateReceived: rxTxns.length ? rxTxns[rxTxns.length - 1].date : '',
                        receivedPaymentMode: rxTxns.length ? rxTxns[rxTxns.length - 1].mode : '',
                        transactions: resolvedTxns
                    });
                });

                setState(prev => ({ ...prev, people: Object.values(peopleMap) }));
            }
        } catch (e) {
            console.error('Failed to fetch loans:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchLoans();
        } else {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    useEffect(() => {
        const handleStorageChange = () => {
            const stored = localStorage.getItem("access_token");
            setToken(prev => prev !== stored ? stored : prev);
        };

        window.addEventListener("storage", handleStorageChange);

        return () => window.removeEventListener("storage", handleStorageChange);
    }, []);

    const addPerson = async (data) => {
        const token = getToken();
        if (!token) return;

        const response = await apiFetch('/api/v1/loans', {
            method: 'POST',
            
            body: JSON.stringify({
                person_name: data.name,
                purpose: data.purpose || 'Business Loan',
                principal_amount: Number(data.principal) || 0,
                interest_amount: Number(data.interest) || 0,
                duration: data.duration || '',
                due_date: data.dueDate ? data.dueDate.split('T')[0] : '',
                payment_mode: data.paymentMode || 'Cash'
            })
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            alert(`Error adding person: ${err?.error?.message || err?.message || response.statusText}`);
        } else {
            const loanData = await response.json().catch(() => null);
            if (loanData?.data?.id && Number(data.principal) > 0) {
                const token2 = getToken();
                await apiFetch(`/api/v1/loans/${loanData.data.id}/transactions`, {
                    method: 'POST',
                    
                    body: JSON.stringify({
                        amount: Number(data.principal),
                        date: new Date().toISOString().split('T')[0],
                        mode: data.paymentMode || 'Cash',
                        note: 'Initial Amount Given'
                    })
                }).catch(() => { });
            }
        }
        await fetchLoans();
    };

    const addLoan = async (personId, data) => {
        const token = getToken();
        if (!token) return;

        const response = await apiFetch('/api/v1/loans', {
            method: 'POST',
            
            body: JSON.stringify({
                person_name: personId,
                purpose: data.purpose || 'Business Loan',
                principal_amount: Number(data.principal) || 0,
                interest_amount: Number(data.interest) || 0,
                duration: data.duration || '',
                due_date: data.dueDate ? data.dueDate.split('T')[0] : '',
                payment_mode: data.paymentMode || 'Cash'
            })
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            alert(`Error adding loan: ${err?.error?.message || err?.message || response.statusText}`);
        } else {
            const loanData = await response.json().catch(() => null);
            if (loanData?.data?.id && Number(data.principal) > 0) {
                const token2 = getToken();
                await apiFetch(`/api/v1/loans/${loanData.data.id}/transactions`, {
                    method: 'POST',
                    
                    body: JSON.stringify({
                        amount: Number(data.principal),
                        date: new Date().toISOString().split('T')[0],
                        mode: data.paymentMode || 'Cash',
                        note: 'Initial Amount Given'
                    })
                }).catch(() => { });
            }
        }
        await fetchLoans();
    };

    const editLoan = async (personId, loanId, updates) => {
        const token = getToken();
        if (!token) return;

        const person = state.people.find(p => p.id === personId);
        const loan = person?.loans.find(l => l.id === loanId);
        const currentPrincipal = loan?.transactions?.[0]?.amount || 0;

        await apiFetch(`/api/v1/loans/${loanId}`, {
            method: 'PUT',
            
            body: JSON.stringify({
                person_name: personId,
                purpose: updates.purpose || loan?.purpose || '',
                principal_amount: currentPrincipal,
                interest_amount: updates.interest !== undefined ? Number(updates.interest) : Number(loan?.interest || 0),
                duration: updates.duration || loan?.duration || '',
                due_date: (updates.dueDate || loan?.dueDate || '') ? (updates.dueDate || loan?.dueDate).split('T')[0] : ''
            })
        });
        await fetchLoans();
    };

    const deleteLoan = async (personId, loanId) => {
        const token = getToken();
        if (!token) return;

        await apiFetch(`/api/v1/loans/${loanId}`, {
            method: 'DELETE' });
        await fetchLoans();
    };

    const deletePerson = async (personId) => {
        const token = getToken();
        if (!token) return;

        const person = state.people.find(p => p.id === personId);
        if (person) {
            for (const loan of person.loans) {
                await apiFetch(`/api/v1/loans/${loan.id}`, {
                    method: 'DELETE' });
            }
        }
        await fetchLoans();
    };

    const editPerson = async (oldName, newName) => {
        const token = getToken();
        if (!token) return;

        const person = state.people.find(p => p.id === oldName);
        if (person) {
            for (const loan of person.loans) {
                const currentPrincipal = loan?.transactions?.[0]?.amount || 0;
                await apiFetch(`/api/v1/loans/${loan.id}`, {
                    method: 'PUT',
                    
                    body: JSON.stringify({
                        person_name: newName,
                        purpose: loan.purpose,
                        principal_amount: currentPrincipal,
                        interest_amount: loan.interest,
                        duration: loan.duration,
                        due_date: loan.dueDate ? loan.dueDate.split('T')[0] : ''
                    })
                });
            }
        }
        await fetchLoans();
    };

    const addTransaction = async (personId, loanId, data) => {
        const token = getToken();
        if (!token) return;

        const person = state.people.find(p => p.id === personId);
        const loan = person?.loans.find(l => l.id === loanId);
        const currentPrincipal = loan?.transactions?.reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0;
        const newPrincipal = currentPrincipal + (Number(data.amount) || 0);

        await apiFetch(`/api/v1/loans/${loanId}`, {
            method: 'PUT',
            
            body: JSON.stringify({
                person_name: personId,
                purpose: loan.purpose,
                principal_amount: newPrincipal,
                interest_amount: loan.interest,
                duration: loan.duration,
                due_date: loan.dueDate ? loan.dueDate.split('T')[0] : ''
            })
        });

        await apiFetch(`/api/v1/loans/${loanId}/transactions`, {
            method: 'POST',
            
            body: JSON.stringify({
                amount: Number(data.amount) || 0,
                date: data.date ? data.date.split('T')[0] : new Date().toISOString().split('T')[0],
                mode: data.mode || 'Cash',
                note: data.note || 'Installment'
            })
        });

        await fetchLoans();
    };

    const deleteTransaction = async (personId, loanId, transactionId) => {
        const token = getToken();
        if (!token) return;

        const person = state.people.find(p => p.id === personId);
        const loan = person?.loans.find(l => l.id === loanId);
        if (!loan) return;

        const txnToDelete = loan.transactions?.find(t => t.id === transactionId);
        const amountToSubtract = txnToDelete && txnToDelete.note !== 'Received Payment' ? Number(txnToDelete.amount) : 0;

        const currentPrincipal = loan.transactions?.reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0;
        const newPrincipal = Math.max(0, currentPrincipal - amountToSubtract);

        // Try DELETE the actual transaction directly if the API supports it
        if (!transactionId.includes('-base-prin')) {
            await apiFetch(`/api/v1/loans/${loanId}/transactions/${transactionId}`, {
                method: 'DELETE' }).catch(() => { });
        }

        if (amountToSubtract > 0) {
            await apiFetch(`/api/v1/loans/${loanId}`, {
                method: 'PUT',
                
                body: JSON.stringify({
                    person_name: personId,
                    purpose: loan.purpose,
                    principal_amount: newPrincipal,
                    interest_amount: loan.interest,
                    duration: loan.duration,
                    due_date: loan.dueDate ? loan.dueDate.split('T')[0] : ''
                })
            });
        }
        await fetchLoans();
    };

    const markLoanReceived = async (personId, loanId, amount, date, mode) => {
        const token = getToken();
        if (!token) return;

        await apiFetch(`/api/v1/loans/${loanId}/transactions`, {
            method: 'POST',
            
            body: JSON.stringify({
                amount: amount,
                date: date ? date.split('T')[0] : new Date().toISOString().split('T')[0],
                mode: mode,
                note: 'Received Payment'
            })
        });
        await fetchLoans();
    };

    const addPaymentMode = (mode) => {
        if (!state.paymentModes.includes(mode)) {
            setState(prev => ({ ...prev, paymentModes: [...prev.paymentModes, mode] }));
            // Add custom localstorage for payment modes since they aren't synced to DB now:
            const saved = JSON.parse(localStorage.getItem('btrack-modes') || '[]');
            saved.push(mode);
            localStorage.setItem('btrack-modes', JSON.stringify(saved));
        }
    };

    const deletePaymentMode = (mode) => {
        setState(prev => ({ ...prev, paymentModes: prev.paymentModes.filter(m => m !== mode) }));
        const saved = JSON.parse(localStorage.getItem('btrack-modes') || '[]');
        localStorage.setItem('btrack-modes', JSON.stringify(saved.filter(m => m !== mode)));
    };

    useEffect(() => {
        const savedModes = JSON.parse(localStorage.getItem('btrack-modes') || '[]');
        if (savedModes.length) {
            setState(prev => ({ ...prev, paymentModes: [...DEFAULT_PAYMENT_MODES, ...savedModes] }));
        }
    }, []);

    const clearData = () => {
        setState({ people: [], paymentModes: DEFAULT_PAYMENT_MODES });
    };

    const actions = {
        addPerson, editPerson, deletePerson,
        addLoan, editLoan, deleteLoan,
        addTransaction, deleteTransaction, markLoanReceived,
        addPaymentMode, deletePaymentMode,
        refreshData: fetchLoans,
        clearData
    };

    return (
        <AppContext.Provider value={{ state, loading, ...actions }}>
            {children}
        </AppContext.Provider>
    );
}
