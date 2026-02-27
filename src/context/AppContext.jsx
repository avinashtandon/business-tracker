import { useReducer, useEffect } from 'react';
import { generateId, DEFAULT_PAYMENT_MODES } from '../utils/helpers';
import { AppContext } from './useApp';

const STORAGE_KEY = 'business-tracker-data-v2';

function loadFromStorage() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            const parsed = JSON.parse(data);
            if (!parsed.paymentModes) {
                parsed.paymentModes = [...DEFAULT_PAYMENT_MODES];
            }
            return parsed;
        }
    } catch (e) {
        console.error('Failed to load data:', e);
    }
    return { people: [], paymentModes: [...DEFAULT_PAYMENT_MODES] };
}

function saveToStorage(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error('Failed to save data:', e);
    }
}

/**
 * Data shape:
 * people: [
 *   {
 *     id, name, createdAt,
 *     loans: [
 *       {
 *         id, purpose, interest, dueDate, duration, createdAt,
 *         transactions: [{ id, date, amount, mode }],
 *         amountReceived, dateReceived, receivedPaymentMode,
 *       }
 *     ]
 *   }
 * ]
 */
function reducer(state, action) {
    switch (action.type) {
        case 'ADD_PAYMENT_MODE': {
            if (state.paymentModes.includes(action.payload)) return state;
            return { ...state, paymentModes: [...state.paymentModes, action.payload] };
        }

        case 'DELETE_PAYMENT_MODE': {
            return { ...state, paymentModes: state.paymentModes.filter((m) => m !== action.payload) };
        }

        case 'ADD_PERSON': {
            const firstLoan = {
                id: generateId(),
                purpose: action.payload.purpose || '',
                interest: Number(action.payload.interest) || 0,
                dueDate: action.payload.dueDate || '',
                duration: action.payload.duration || '',
                createdAt: new Date().toISOString(),
                transactions: [],
                amountReceived: 0,
                dateReceived: '',
                receivedPaymentMode: '',
            };
            const newPerson = {
                id: generateId(),
                name: action.payload.name,
                createdAt: new Date().toISOString(),
                loans: [firstLoan],
            };
            return { ...state, people: [...state.people, newPerson] };
        }

        case 'EDIT_PERSON': {
            return {
                ...state,
                people: state.people.map((p) =>
                    p.id === action.payload.id ? { ...p, name: action.payload.name } : p
                ),
            };
        }

        case 'DELETE_PERSON': {
            return { ...state, people: state.people.filter((p) => p.id !== action.payload.id) };
        }

        case 'ADD_LOAN': {
            const loan = {
                id: generateId(),
                purpose: action.payload.purpose || '',
                interest: Number(action.payload.interest) || 0,
                dueDate: action.payload.dueDate || '',
                duration: action.payload.duration || '',
                createdAt: new Date().toISOString(),
                transactions: [],
                amountReceived: 0,
                dateReceived: '',
                receivedPaymentMode: '',
            };
            return {
                ...state,
                people: state.people.map((p) =>
                    p.id === action.payload.personId ? { ...p, loans: [...p.loans, loan] } : p
                ),
            };
        }

        case 'EDIT_LOAN': {
            return {
                ...state,
                people: state.people.map((p) =>
                    p.id === action.payload.personId
                        ? {
                            ...p,
                            loans: p.loans.map((l) =>
                                l.id === action.payload.loanId
                                    ? { ...l, ...action.payload.updates }
                                    : l
                            ),
                        }
                        : p
                ),
            };
        }

        case 'DELETE_LOAN': {
            return {
                ...state,
                people: state.people.map((p) =>
                    p.id === action.payload.personId
                        ? { ...p, loans: p.loans.filter((l) => l.id !== action.payload.loanId) }
                        : p
                ),
            };
        }

        case 'ADD_TRANSACTION': {
            const txn = {
                id: generateId(),
                date: action.payload.date,
                amount: Number(action.payload.amount) || 0,
                mode: action.payload.mode || 'UPI',
                note: action.payload.note || '',
            };
            return {
                ...state,
                people: state.people.map((p) =>
                    p.id === action.payload.personId
                        ? {
                            ...p,
                            loans: p.loans.map((l) =>
                                l.id === action.payload.loanId
                                    ? { ...l, transactions: [...l.transactions, txn] }
                                    : l
                            ),
                        }
                        : p
                ),
            };
        }

        case 'DELETE_TRANSACTION': {
            return {
                ...state,
                people: state.people.map((p) =>
                    p.id === action.payload.personId
                        ? {
                            ...p,
                            loans: p.loans.map((l) =>
                                l.id === action.payload.loanId
                                    ? {
                                        ...l,
                                        transactions: l.transactions.filter(
                                            (t) => t.id !== action.payload.transactionId
                                        ),
                                    }
                                    : l
                            ),
                        }
                        : p
                ),
            };
        }

        case 'MARK_LOAN_RECEIVED': {
            return {
                ...state,
                people: state.people.map((p) =>
                    p.id === action.payload.personId
                        ? {
                            ...p,
                            loans: p.loans.map((l) =>
                                l.id === action.payload.loanId
                                    ? {
                                        ...l,
                                        amountReceived:
                                            (Number(l.amountReceived) || 0) + Number(action.payload.amount),
                                        dateReceived: action.payload.date,
                                        receivedPaymentMode: action.payload.mode,
                                    }
                                    : l
                            ),
                        }
                        : p
                ),
            };
        }

        default:
            return state;
    }
}

export function AppProvider({ children }) {
    const [state, dispatch] = useReducer(reducer, null, loadFromStorage);

    useEffect(() => {
        saveToStorage(state);
    }, [state]);

    const actions = {
        addPerson: (data) => dispatch({ type: 'ADD_PERSON', payload: data }),
        editPerson: (id, name) => dispatch({ type: 'EDIT_PERSON', payload: { id, name } }),
        deletePerson: (id) => dispatch({ type: 'DELETE_PERSON', payload: { id } }),
        addLoan: (personId, data) => dispatch({ type: 'ADD_LOAN', payload: { personId, ...data } }),
        addPaymentMode: (mode) => dispatch({ type: 'ADD_PAYMENT_MODE', payload: mode }),
        deletePaymentMode: (mode) => dispatch({ type: 'DELETE_PAYMENT_MODE', payload: mode }),
        editLoan: (personId, loanId, updates) =>
            dispatch({ type: 'EDIT_LOAN', payload: { personId, loanId, updates } }),
        deleteLoan: (personId, loanId) =>
            dispatch({ type: 'DELETE_LOAN', payload: { personId, loanId } }),
        addTransaction: (personId, loanId, data) =>
            dispatch({ type: 'ADD_TRANSACTION', payload: { personId, loanId, ...data } }),
        deleteTransaction: (personId, loanId, transactionId) =>
            dispatch({ type: 'DELETE_TRANSACTION', payload: { personId, loanId, transactionId } }),
        markLoanReceived: (personId, loanId, amount, date, mode) =>
            dispatch({ type: 'MARK_LOAN_RECEIVED', payload: { personId, loanId, amount, date, mode } }),
    };

    return (
        <AppContext.Provider value={{ state, ...actions }}>
            {children}
        </AppContext.Provider>
    );
}
