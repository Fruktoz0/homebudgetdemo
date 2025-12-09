import React, { useState, useEffect, useMemo } from 'react';
import { 
  getCurrentUser, login, logout, register,
  getHousehold, createHousehold, joinHousehold, 
  getTransactions, addTransaction, deleteTransaction,
  getInvitations, createInvitation, revokeInvitation,
  getRecurringItems, addRecurringItem, updateRecurringItem, deleteRecurringItem,
  getSavings, addSavingGoal, updateSavingBalance, deleteSavingGoal, getSavingLogs,
  approveMember, removeMember, processAutoPayments, getAuditLogs, updateUser
} from './services/mockService';
import { User, Household, Transaction, TransactionType, Invitation, RecurringItem, SavingGoal, SavingLog, AuditLog } from './types';
import { Card, Button, Input, Select } from './components/Components';
import BudgetChart from './components/BudgetChart';
import { CATEGORIES } from './constants';

// --- DATE HELPERS (Replacement for date-fns) ---
const getStartOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const getEndOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

const addMonths = (date: Date, amount: number) => {
    const d = new Date(date);
    const day = d.getDate();
    d.setMonth(d.getMonth() + amount);
    if (d.getDate() !== day) {
        d.setDate(0); 
    }
    return d;
};

const parseISODate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
};

const isWithinInterval = (date: Date, interval: { start: Date, end: Date }) => {
    const time = date.getTime();
    return time >= interval.start.getTime() && time <= interval.end.getTime();
};

const formatToYmd = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const formatToMonthYear = (date: Date) => {
    return new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: 'long' }).format(date);
};

const formatToMonthDay = (date: Date) => {
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${m}.${d}.`;
};

// --- ICONS (SVG) ---
const Icons = {
  Plus: ({ className }: { className?: string }) => <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  Minus: ({ className }: { className?: string }) => <svg className={className || "w-6 h-6"} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>,
  Trash: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  ChevronLeft: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>,
  ChevronRight: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>,
  Recurring: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
  LogOut: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
  Settings: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Refresh: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
  X: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
  Check: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
  Home: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  List: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
  Pencil: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>,
  PiggyBank: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Wallet: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
  History: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Calendar: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  UserGroup: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  UserPlus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>,
  Zap: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  Download: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
  Eye: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
  User: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
  LogoutBox: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
};

// --- COMPONENTS FOR RECURRING ---
const RecurringItemCard: React.FC<{ 
  item: RecurringItem, 
  status: 'paid' | 'pending', 
  paidAmount?: number,
  currency: string,
  onPay: () => void,
  onEdit: () => void,
  onDelete: () => void 
}> = ({ item, status, paidAmount, currency, onPay, onEdit, onDelete }) => {
  const formatMoney = (amount: number) => 
    new Intl.NumberFormat('hu-HU', { style: 'currency', currency }).format(amount);

  return (
    <div className="bg-surface p-4 rounded-xl shadow-sm border border-gray-50 mb-3 relative">
      <div className="flex justify-between items-start mb-2">
        <div>
           <div className="flex items-center gap-2">
              <h4 className="font-bold text-textPrimary text-base">{item.name}</h4>
              {item.autoPay && (
                  <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase border border-yellow-200" title={`Automatikus fizetés minden hónap ${item.payDay || 1}. napján`}>
                      <Icons.Zap /> AUTO ({item.payDay || 1}.)
                  </span>
              )}
           </div>
          <span className="text-xs text-textSecondary uppercase bg-gray-100 px-2 py-0.5 rounded-md mt-1 inline-block">{item.frequency === 'MONTHLY' ? 'Havi' : item.frequency === 'QUARTERLY' ? 'Negyedéves' : 'Éves'}</span>
        </div>
        <div className="flex gap-2">
            <button onClick={onEdit} className="text-textSecondary hover:text-primary p-1" title="Módosítás">
                <Icons.Pencil />
            </button>
            <button onClick={onDelete} className="text-textSecondary hover:text-danger p-1" title="Törlés">
                <Icons.Trash />
            </button>
        </div>
      </div>

      <div className="flex justify-between items-center mt-3">
        <div>
          <div className="text-xs text-textSecondary">Tervezett: {formatMoney(item.amount)}</div>
          {status === 'paid' && (
             <div className="text-xs text-success font-medium">Fizetve: {formatMoney(paidAmount || 0)}</div>
          )}
        </div>
        
        {status === 'paid' ? (
          <div className="flex items-center gap-1 text-success bg-success/10 px-3 py-2 rounded-lg font-bold text-sm">
            <Icons.Check />
            <span>Fizetve</span>
          </div>
        ) : (
          <button onClick={onPay} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md shadow-blue-200 active:scale-95 transition">
            Befizetés
          </button>
        )}
      </div>
    </div>
  );
};

// --- COMPONENT FOR SAVINGS ---
const SavingCard: React.FC<{ 
  item: SavingGoal, 
  currency: string,
  onDeposit: () => void,
  onWithdraw: () => void,
  onDelete: () => void
}> = ({ item, currency, onDeposit, onWithdraw, onDelete }) => {
  const [showHistory, setShowHistory] = useState(false);
  const logs = useMemo(() => showHistory ? getSavingLogs(item.id) : [], [item.id, showHistory]);

  const formatMoney = (amount: number) => 
    new Intl.NumberFormat('hu-HU', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);

  const percent = item.targetAmount ? Math.min(100, Math.round((item.currentAmount / item.targetAmount) * 100)) : 0;

  return (
    <div className="bg-surface p-5 rounded-2xl shadow-sm border border-gray-100 mb-4 relative overflow-hidden">
      {/* Decorative colored bar */}
      <div className="absolute top-0 left-0 bottom-0 w-1.5" style={{ backgroundColor: item.color || '#5D9CEC' }}></div>
      
      <div className="flex justify-between items-start mb-3 pl-3">
        <div>
           <div className="flex items-center gap-2">
              <h4 className="font-bold text-textPrimary text-lg">{item.name}</h4>
              <button onClick={() => setShowHistory(!showHistory)} className="text-textSecondary hover:text-primary transition">
                <Icons.History />
              </button>
           </div>
           <div className="text-2xl font-bold text-textPrimary tracking-tight mt-1">{formatMoney(item.currentAmount)}</div>
           {item.targetAmount && (
             <div className="text-xs text-textSecondary mt-1">Cél: {formatMoney(item.targetAmount)}</div>
           )}
        </div>
        <button onClick={onDelete} className="text-gray-300 hover:text-danger p-1">
          <Icons.Trash />
        </button>
      </div>

      {item.targetAmount && (
        <div className="pl-3 mb-4">
          <div className="flex justify-between text-xs font-medium text-textSecondary mb-1">
             <span>{percent}%</span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
             <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percent}%`, backgroundColor: item.color || '#5D9CEC' }}></div>
          </div>
        </div>
      )}

      <div className="flex gap-2 pl-3 mt-2">
         <button onClick={onDeposit} className="flex-1 bg-success/10 hover:bg-success/20 text-success text-sm font-bold py-2 px-3 rounded-lg transition flex items-center justify-center gap-1">
            <Icons.Plus /> Befizetés
         </button>
         <button onClick={onWithdraw} className="flex-1 bg-gray-100 hover:bg-gray-200 text-textPrimary text-sm font-bold py-2 px-3 rounded-lg transition flex items-center justify-center gap-1">
            <Icons.Minus /> Kivét
         </button>
      </div>

      {/* EXPANDABLE HISTORY */}
      {showHistory && (
        <div className="mt-4 pl-3 pt-3 border-t border-gray-100 animate-fade-in">
           <h5 className="text-xs font-bold text-textSecondary uppercase mb-2">Előzmények</h5>
           {logs.length === 0 ? (
             <div className="text-xs text-textSecondary italic">Nincs még tranzakció.</div>
           ) : (
             <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
               {logs.map(log => (
                 <div key={log.id} className="flex justify-between text-xs">
                    <span className="text-textSecondary">{new Date(log.date).toLocaleDateString('hu-HU')}</span>
                    <span className={log.amount >= 0 ? 'text-success font-medium' : 'text-danger font-medium'}>
                      {log.amount >= 0 ? '+' : ''}{formatMoney(log.amount)}
                    </span>
                 </div>
               ))}
             </div>
           )}
        </div>
      )}
    </div>
  );
};


// --- AUTH & SETUP COMPONENTS ---

const AuthPage: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      if (isLoginMode) {
        if (!email || !password) throw new Error("Minden mező kitöltése kötelező!");
        login(email, password);
      } else {
        if (!email || !password || !displayName) throw new Error("Minden mező kitöltése kötelező!");
        register(email, password, displayName);
      }
      onLogin();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-textPrimary mb-2 text-center">
            {isLoginMode ? 'Bejelentkezés' : 'Regisztráció'}
        </h1>
        <p className="text-textSecondary text-center mb-6">
            {isLoginMode ? 'Add meg az adataidat a belépéshez.' : 'Hozz létre egy új fiókot.'}
        </p>
        
        <form onSubmit={handleSubmit}>
          {!isLoginMode && (
             <Input 
                label="Név"
                placeholder="Pl. Kovács János"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required={!isLoginMode}
             />
          )}
          <Input 
            type="email" 
            label="Email cím"
            placeholder="pelda@email.hu" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
            autoFocus={isLoginMode}
          />
           <Input 
            type="password" 
            label="Jelszó"
            placeholder="******" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
          />
          
          {error && <p className="text-danger text-sm mb-4 text-center bg-red-50 p-2 rounded">{error}</p>}
          
          <Button type="submit" fullWidth>
              {isLoginMode ? 'Belépés' : 'Regisztráció'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
            <span className="text-textSecondary">
                {isLoginMode ? 'Még nincs fiókod?' : 'Már van fiókod?'}
            </span>
            <button 
                onClick={() => {
                    setIsLoginMode(!isLoginMode);
                    setError('');
                }} 
                className="ml-2 font-bold text-primary hover:underline"
            >
                {isLoginMode ? 'Regisztrálj itt' : 'Jelentkezz be'}
            </button>
        </div>
      </Card>
    </div>
  );
};

const HouseholdSetup: React.FC<{ user: User, onComplete: () => void }> = ({ user, onComplete }) => {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    setError('');
    if (mode === 'create') {
      if (!name) return setError('Név megadása kötelező');
      createHousehold(name, user.id);
      onComplete();
    } else {
      if (!code) return setError('Kód megadása kötelező');
      const success = joinHousehold(code, user.id);
      if (success) onComplete();
      else setError('Érvénytelen meghívókód');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <h2 className="text-xl font-bold text-textPrimary mb-6 text-center">Háztartás Beállítás</h2>
        
        <div className="flex gap-2 mb-6">
          <Button 
            className="flex-1" 
            variant={mode === 'create' ? 'primary' : 'outline'} 
            onClick={() => setMode('create')}
          >
            Új Létrehozása
          </Button>
          <Button 
            className="flex-1"
            variant={mode === 'join' ? 'primary' : 'outline'}
            onClick={() => setMode('join')}
          >
            Csatlakozás
          </Button>
        </div>

        {mode === 'create' ? (
          <Input 
            label="Háztartás neve" 
            placeholder="Pl. Otthon" 
            value={name} 
            onChange={e => setName(e.target.value)} 
          />
        ) : (
          <Input 
            label="Meghívó / Belépő Kód" 
            placeholder="Kód" 
            value={code} 
            onChange={e => setCode(e.target.value)} 
          />
        )}

        {error && <p className="text-danger text-sm mb-4">{error}</p>}
        <Button onClick={handleSubmit} fullWidth>Tovább</Button>
      </Card>
    </div>
  );
};

const PendingApprovalPage: React.FC<{ onLogout: () => void }> = ({ onLogout }) => (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8 text-center">
            <div className="mb-6 flex justify-center">
                <div className="w-16 h-16 bg-blue-50 text-primary rounded-full flex items-center justify-center">
                    <Icons.UserGroup />
                </div>
            </div>
            <h2 className="text-xl font-bold text-textPrimary mb-2">Jóváhagyásra vár</h2>
            <p className="text-textSecondary mb-6">
                A csatlakozási kérelmedet elküldtük. Amint a háztartás tulajdonosa jóváhagyja, hozzáférést kapsz a felülethez.
            </p>
            <Button onClick={onLogout} variant="outline" fullWidth>Kijelentkezés</Button>
        </Card>
    </div>
);

const ACTION_LABELS: Record<string, string> = {
  'CREATE_TRANSACTION': 'Új tranzakció',
  'DELETE_TRANSACTION': 'Tranzakció törlése',
  'CREATE_RECURRING': 'Új fix tétel',
  'UPDATE_RECURRING': 'Fix tétel módosítása',
  'DELETE_RECURRING': 'Fix tétel törlése',
  'CREATE_SAVING': 'Új megtakarítási cél',
  'UPDATE_SAVING_BALANCE': 'Egyenleg módosítás',
  'DELETE_SAVING': 'Megtakarítás törlése',
  'CREATE_HOUSEHOLD': 'Háztartás létrehozása',
  'JOIN_HOUSEHOLD': 'Csatlakozás',
  'APPROVE_MEMBER': 'Tag jóváhagyása',
  'REMOVE_MEMBER': 'Tag eltávolítása',
  'UPDATE_USER_PROFILE': 'Profil frissítése'
};

const FIELD_LABELS: Record<string, string> = {
    'amount': 'Összeg',
    'desc': 'Leírás',
    'description': 'Leírás',
    'category': 'Kategória',
    'type': 'Típus',
    'date': 'Dátum',
    'name': 'Megnevezés',
    'target': 'Célösszeg',
    'diff': 'Különbség',
    'memberName': 'Tag neve',
    'code': 'Kód',
    'householdId': 'Háztartás ID',
    'frequency': 'Gyakoriság',
    'active': 'Aktív',
    'autoPay': 'Auto-fizetés',
    'payDay': 'Fordulónap',
    'displayName': 'Megjelenített név'
};

const SettingsModal: React.FC<{ household: Household, user: User, onClose: () => void, onRefresh: () => void }> = ({ household, user, onClose, onRefresh }) => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'members' | 'invites' | 'data' | 'audit'>('members');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  
  useEffect(() => {
    setInvitations(getInvitations(household.id));
    setAuditLogs(getAuditLogs(household.id));
  }, [household.id]);

  const handleInvite = () => {
    if (inviteEmail) {
      createInvitation(household.id, inviteEmail);
      setInvitations(getInvitations(household.id));
      setInviteEmail('');
    }
  };

  const handleRevoke = (id: string) => {
    revokeInvitation(id);
    setInvitations(getInvitations(household.id));
  };

  const handleResend = (code: string) => {
    alert(`Meghívó újraküldve! Kód: ${code}`);
  };
  
  const handleApprove = (memberId: string) => {
      approveMember(household.id, memberId, user.id);
      onRefresh(); // Refresh parent state
  };
  
  const handleReject = (memberId: string) => {
      if(window.confirm('Biztosan elutasítod/törlöd a felhasználót?')) {
          removeMember(household.id, memberId, user.id);
          onRefresh(); // Refresh parent state
      }
  };

  const handleExport = () => {
      const txs = getTransactions(household.id);
      if (txs.length === 0) {
          alert("Nincs exportálható adat.");
          return;
      }

      // CSV Header
      let csvContent = "Dátum;Típus;Kategória;Leírás;Összeg;Létrehozta\n";

      txs.forEach(tx => {
          const date = tx.date;
          const type = tx.type === 'INCOME' ? 'Bevétel' : 'Kiadás';
          const category = tx.category;
          const desc = tx.description.replace(/;/g, ','); // Escape semicolons to avoid breaking CSV
          const amount = tx.amount;
          const creator = household.members.find(m => m.id === tx.createdBy)?.displayName || 'Ismeretlen';

          csvContent += `${date};${type};${category};${desc};${amount};${creator}\n`;
      });

      // Create Blob with BOM for Excel UTF-8 support
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tranzakciok_${household.name}_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const getMemberName = (userId: string) => {
      const m = household.members.find(m => m.id === userId);
      return m ? m.displayName : 'Ismeretlen/Rendszer';
  };

  const renderLogDetails = (jsonString: string) => {
      try {
          const data = JSON.parse(jsonString);
          return (
              <div className="space-y-2">
                  {Object.entries(data).map(([key, value]) => {
                      // Skip internal fields if needed, or format specific ones
                      if (key === 'id' || key === 'deletedAt' || key === 'createdBy' || key === 'recurringItemId' || key === 'isRecurringInstance') return null;

                      let displayValue = String(value);
                      if (key === 'amount' || key === 'diff' || key === 'target') {
                          displayValue = new Intl.NumberFormat('hu-HU', { style: 'currency', currency: household.currency }).format(Number(value));
                      }
                      
                      return (
                          <div key={key} className="flex justify-between border-b border-gray-50 pb-1">
                              <span className="text-textSecondary text-sm font-medium">{FIELD_LABELS[key] || key}:</span>
                              <span className="text-textPrimary text-sm font-bold">{displayValue}</span>
                          </div>
                      );
                  })}
              </div>
          );
      } catch (e) {
          return <div className="text-danger text-sm">Hiba az adatok megjelenítésekor.</div>;
      }
  };

  const approvedMembers = household.members.filter(m => m.membershipStatus === 'APPROVED' || !m.membershipStatus); // Default to approved if undefined (legacy)
  const pendingMembers = household.members.filter(m => m.membershipStatus === 'PENDING');
  const isOwner = household.ownerId === user.id;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-surface w-full max-w-lg rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto relative">
        <div className="flex justify-between items-center mb-6">
           <h3 className="text-xl font-bold text-textPrimary">Beállítások</h3>
           <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-textSecondary"><Icons.X /></button>
        </div>

        <div className="flex mb-6 border-b border-gray-100 overflow-x-auto">
           <button 
             className={`flex-1 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap px-4 ${activeTab === 'members' ? 'border-primary text-primary' : 'border-transparent text-textSecondary'}`}
             onClick={() => setActiveTab('members')}
           >
             Tagok
           </button>
           <button 
             className={`flex-1 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap px-4 ${activeTab === 'invites' ? 'border-primary text-primary' : 'border-transparent text-textSecondary'}`}
             onClick={() => setActiveTab('invites')}
           >
             Meghívások
           </button>
           <button 
             className={`flex-1 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap px-4 ${activeTab === 'data' ? 'border-primary text-primary' : 'border-transparent text-textSecondary'}`}
             onClick={() => setActiveTab('data')}
           >
             Adatok
           </button>
           <button 
             className={`flex-1 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap px-4 ${activeTab === 'audit' ? 'border-primary text-primary' : 'border-transparent text-textSecondary'}`}
             onClick={() => setActiveTab('audit')}
           >
             Napló
           </button>
        </div>

        {activeTab === 'members' && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <p className="text-xs text-primary font-bold uppercase mb-1">Közös Belépőkód</p>
              <div className="flex justify-between items-center">
                <span className="text-lg font-mono font-bold text-textPrimary select-all">{household.inviteCode}</span>
                <span className="text-xs text-textSecondary">Bárki csatlakozhat ezzel</span>
              </div>
            </div>
            
            {/* PENDING REQUESTS (Only Owner Sees) */}
            {isOwner && pendingMembers.length > 0 && (
                <div className="mb-6">
                     <h4 className="text-sm font-bold text-orange-500 uppercase mb-3 flex items-center gap-2">
                        <Icons.UserPlus /> Függőben lévő kérelmek
                     </h4>
                     <div className="space-y-2">
                        {pendingMembers.map(member => (
                            <div key={member.id} className="p-3 bg-orange-50 border border-orange-100 rounded-lg flex justify-between items-center">
                                <div>
                                    <div className="font-medium text-textPrimary">{member.displayName}</div>
                                    <div className="text-xs text-textSecondary">{member.email}</div>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="success" className="py-1 px-3 text-xs" onClick={() => handleApprove(member.id)}>
                                        <Icons.Check />
                                    </Button>
                                    <Button size="sm" variant="danger" className="py-1 px-3 text-xs" onClick={() => handleReject(member.id)}>
                                        <Icons.X />
                                    </Button>
                                </div>
                            </div>
                        ))}
                     </div>
                </div>
            )}
            
            <h4 className="text-sm font-bold text-textSecondary uppercase">Jelenlegi Tagok</h4>
            <div className="space-y-2">
              {approvedMembers.map(member => (
                <div key={member.id} className="flex items-center gap-3 p-3 bg-background rounded-lg group">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {member.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-textPrimary">{member.displayName}</div>
                    <div className="text-xs text-textSecondary">{member.email}</div>
                  </div>
                  {household.ownerId === member.id ? (
                      <span className="text-xs bg-gray-200 px-2 py-1 rounded text-textSecondary">Tulajdonos</span>
                  ) : isOwner ? (
                      <button 
                        onClick={() => handleReject(member.id)} 
                        className="text-gray-400 hover:text-danger transition p-2"
                        title="Eltávolítás"
                      >
                          <Icons.Trash />
                      </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {activeTab === 'invites' && (
          <div className="space-y-6">
             <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
               <h4 className="text-sm font-bold text-textPrimary mb-3">Új tag meghívása</h4>
               <div className="flex gap-2">
                 <div className="flex-1">
                   <Input 
                      placeholder="email@cim.hu" 
                      value={inviteEmail} 
                      onChange={e => setInviteEmail(e.target.value)} 
                      className="mb-0" 
                   />
                 </div>
                 <Button onClick={handleInvite} disabled={!inviteEmail} className="h-[50px]">Küldés</Button>
               </div>
             </div>

             <div>
               <h4 className="text-sm font-bold text-textSecondary uppercase mb-3">Függőben lévő meghívók</h4>
               {invitations.length === 0 ? (
                 <p className="text-sm text-textSecondary italic">Nincs függőben lévő meghívás.</p>
               ) : (
                 <div className="space-y-3">
                   {invitations.map(inv => (
                     <div key={inv.id} className="p-3 border border-gray-100 rounded-lg flex justify-between items-center">
                       <div>
                         <div className="text-sm font-bold text-textPrimary">{inv.email}</div>
                         <div className="text-xs text-textSecondary">Kód: <span className="font-mono">{inv.code}</span></div>
                       </div>
                       <div className="flex gap-2">
                          <button onClick={() => handleResend(inv.code)} className="text-primary hover:text-blue-700 text-xs font-medium" title="Újraküldés">
                             <Icons.Refresh />
                          </button>
                          <button onClick={() => handleRevoke(inv.id)} className="text-danger hover:text-red-700 text-xs font-medium" title="Visszavonás">
                             <Icons.Trash />
                          </button>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>
          </div>
        )}

        {activeTab === 'data' && (
            <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <h4 className="text-sm font-bold text-textPrimary mb-2">Adatok exportálása</h4>
                    <p className="text-xs text-textSecondary mb-4">
                        Töltsd le az összes eddigi tranzakciót Excel által olvasható CSV formátumban.
                    </p>
                    <Button onClick={handleExport} variant="outline" fullWidth className="flex items-center justify-center gap-2">
                        <Icons.Download /> Exportálás CSV-be
                    </Button>
                </div>
            </div>
        )}

        {activeTab === 'audit' && (
           <div className="space-y-4">
               {auditLogs.length === 0 ? (
                   <p className="text-sm text-textSecondary italic text-center py-4">Nincs megjeleníthető előzmény.</p>
               ) : (
                   <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                       {auditLogs.map(log => (
                           <div 
                              key={log.id} 
                              onClick={() => setSelectedLog(log)}
                              className="flex gap-3 text-sm p-3 bg-background rounded-lg border border-gray-50 cursor-pointer hover:bg-gray-50 transition active:scale-[0.98] group"
                           >
                               <div className="flex-1">
                                   <div className="font-bold text-textPrimary mb-0.5 flex justify-between">
                                       {ACTION_LABELS[log.actionType] || log.actionType}
                                       <span className="text-primary opacity-0 group-hover:opacity-100 transition"><Icons.Eye /></span>
                                   </div>
                                   <div className="text-xs text-textSecondary">
                                       <span className="font-medium text-primary">{getMemberName(log.performedByUserId)}</span> • {new Date(log.timestamp).toLocaleString('hu-HU')}
                                   </div>
                               </div>
                           </div>
                       ))}
                   </div>
               )}
           </div>
        )}
        
        {/* LOG DETAILS OVERLAY */}
        {selectedLog && (
            <div className="absolute inset-0 bg-surface z-10 flex flex-col animate-slide-up rounded-2xl">
                 <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                     <div>
                        <h4 className="text-lg font-bold text-textPrimary">{ACTION_LABELS[selectedLog.actionType] || selectedLog.actionType}</h4>
                        <div className="text-xs text-textSecondary">{new Date(selectedLog.timestamp).toLocaleString('hu-HU')}</div>
                     </div>
                     <button onClick={() => setSelectedLog(null)} className="p-2 bg-white rounded-full text-textSecondary hover:text-textPrimary shadow-sm"><Icons.ChevronLeft /></button>
                 </div>
                 <div className="p-6 flex-1 overflow-y-auto">
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                        <h5 className="text-xs font-bold text-primary uppercase mb-3 border-b border-blue-100 pb-2">Részletek</h5>
                        {renderLogDetails(selectedLog.originalData)}
                    </div>
                    
                    <div className="mt-6">
                        <div className="text-xs text-textSecondary text-center">
                            Műveletet végezte: <br/>
                            <span className="font-bold text-textPrimary text-sm">{getMemberName(selectedLog.performedByUserId)}</span>
                        </div>
                    </div>
                 </div>
            </div>
        )}
      </div>
    </div>
  );
};

// --- MAIN DASHBOARD ---
const Dashboard: React.FC<{ user: User, household: Household, onLogout: () => void, onRefresh: () => void }> = ({ user, household, onLogout, onRefresh }) => {
  // Date State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterMode, setFilterMode] = useState<'MONTHLY' | 'CUSTOM'>('MONTHLY');
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL'); // NEW TYPE FILTER
  const [recurringFilter, setRecurringFilter] = useState<'ALL' | 'PENDING'>('ALL'); // NEW RECURRING FILTER

  const [customDateRange, setCustomDateRange] = useState({
    start: formatToYmd(new Date()),
    end: formatToYmd(new Date())
  });

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  const [savings, setSavings] = useState<SavingGoal[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'recurring' | 'savings'>('overview');
  
  // Modals & Menu State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSavingAddModal, setShowSavingAddModal] = useState(false);
  const [showSavingUpdateModal, setShowSavingUpdateModal] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // New State for Transaction Details
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null); // NEW

  // Profile edit state
  const [displayName, setDisplayName] = useState(user.displayName);

  // Transaction State
  const [newTxType, setNewTxType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [newTxAmount, setNewTxAmount] = useState('');
  const [newTxDesc, setNewTxDesc] = useState('');
  const [newTxCat, setNewTxCat] = useState(CATEGORIES[0]);

  // Recurring Creation/Edit State
  const [editingRecId, setEditingRecId] = useState<string | null>(null);
  const [newRecName, setNewRecName] = useState('');
  const [newRecAmount, setNewRecAmount] = useState('');
  const [newRecFreq, setNewRecFreq] = useState<'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('MONTHLY');
  const [newRecCat, setNewRecCat] = useState(CATEGORIES[0]);
  const [newRecAutoPay, setNewRecAutoPay] = useState(false);
  const [newRecPayDay, setNewRecPayDay] = useState(1);

  // Saving Creation State
  const [savingName, setSavingName] = useState('');
  const [savingTarget, setSavingTarget] = useState('');
  const [savingInitial, setSavingInitial] = useState('');

  // Saving Update State
  const [selectedSaving, setSelectedSaving] = useState<SavingGoal | null>(null);
  const [savingUpdateAmount, setSavingUpdateAmount] = useState('');
  const [savingUpdateType, setSavingUpdateType] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');

  // Payment State (For recurring)
  const [selectedRecItem, setSelectedRecItem] = useState<RecurringItem | null>(null);

  // Load Data
  const refreshData = () => {
    setTransactions(getTransactions(household.id));
    setRecurringItems(getRecurringItems(household.id));
    setSavings(getSavings(household.id));
  };

  useEffect(() => {
    // Check for auto payments whenever we load the dashboard/household
    processAutoPayments(household.id, user.id);
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household.id]);

  // Update profile name when user prop changes (e.g. after refresh)
  useEffect(() => {
    setDisplayName(user.displayName);
  }, [user]);

  // Filter Transactions logic
  const filteredTransactions = useMemo(() => {
    let start: Date, end: Date;

    if (filterMode === 'MONTHLY') {
       start = getStartOfMonth(currentDate);
       end = getEndOfMonth(currentDate);
    } else {
       start = parseISODate(customDateRange.start);
       // Set end date to end of day
       end = parseISODate(customDateRange.end);
       end.setHours(23, 59, 59, 999);
    }
    
    let result = transactions.filter(t => isWithinInterval(parseISODate(t.date), { start, end }));

    // Apply Type Filter
    if (filterType !== 'ALL') {
        result = result.filter(t => t.type === filterType);
    }

    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, currentDate, filterMode, customDateRange, filterType]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach(t => {
      const val = Number(t.amount);
      if (t.type === TransactionType.INCOME) income += val;
      else expense += val;
    });
    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  const handleUpdateProfile = () => {
      try {
          updateUser(user.id, { displayName });
          onRefresh(); // Trigger data refresh
          alert("Profil sikeresen frissítve!");
      } catch (e: any) {
          alert("Hiba: " + e.message);
      }
  };

  const handleLeaveHousehold = () => {
    try {
        removeMember(household.id, user.id, user.id);
        setIsProfileOpen(false); 
        onRefresh(); 
    } catch (e: any) {
        alert("Hiba: " + e.message);
    }
  };

  const handleAddTransaction = () => {
    if (!newTxAmount || !newTxDesc) return;
    
    addTransaction({
      type: newTxType,
      amount: parseFloat(newTxAmount),
      description: newTxDesc,
      category: newTxCat,
      date: formatToYmd(new Date()),
      createdBy: user.id,
      isRecurringInstance: false
    });
    
    setShowAddModal(false);
    setNewTxAmount('');
    setNewTxDesc('');
    refreshData();
  };

  const handleOpenRecurringModal = (item?: RecurringItem) => {
    if (item) {
      setEditingRecId(item.id);
      setNewRecName(item.name);
      setNewRecAmount(item.amount.toString());
      setNewRecFreq(item.frequency);
      setNewRecCat(item.category);
      setNewRecAutoPay(item.autoPay || false);
      setNewRecPayDay(item.payDay || 1);
    } else {
      setEditingRecId(null);
      setNewRecName('');
      setNewRecAmount('');
      setNewRecFreq('MONTHLY');
      setNewRecCat(CATEGORIES[0]);
      setNewRecAutoPay(false);
      setNewRecPayDay(1);
    }
    setShowRecurringModal(true);
  };

  const handleSaveRecurring = () => {
    if (!newRecName || !newRecAmount) return;
    
    if (editingRecId) {
       updateRecurringItem({
          id: editingRecId,
          householdId: household.id,
          type: TransactionType.EXPENSE,
          name: newRecName,
          amount: parseFloat(newRecAmount),
          category: newRecCat,
          frequency: newRecFreq,
          active: true,
          autoPay: newRecAutoPay,
          payDay: newRecAutoPay ? newRecPayDay : undefined
       }, user.id);
    } else {
       addRecurringItem({
          householdId: household.id,
          type: TransactionType.EXPENSE,
          name: newRecName,
          amount: parseFloat(newRecAmount),
          category: newRecCat,
          frequency: newRecFreq,
          active: true,
          autoPay: newRecAutoPay,
          payDay: newRecAutoPay ? newRecPayDay : undefined
       }, user.id);
    }

    setShowRecurringModal(false);
    setNewRecName('');
    setNewRecAmount('');
    setNewRecAutoPay(false);
    setNewRecPayDay(1);
    setEditingRecId(null);
    refreshData();
  };

  const handleCreateSaving = () => {
    if (!savingName) return;
    addSavingGoal({
      householdId: household.id,
      name: savingName,
      currentAmount: savingInitial ? parseFloat(savingInitial) : 0,
      targetAmount: savingTarget ? parseFloat(savingTarget) : undefined,
      color: '#5D9CEC' // Default color
    }, user.id);
    setShowSavingAddModal(false);
    setSavingName('');
    setSavingTarget('');
    setSavingInitial('');
    refreshData();
  };

  const openSavingUpdateModal = (item: SavingGoal, type: 'DEPOSIT' | 'WITHDRAW') => {
    setSelectedSaving(item);
    setSavingUpdateType(type);
    setSavingUpdateAmount('');
    setShowSavingUpdateModal(true);
  };

  const handleUpdateSavingBalance = () => {
    if (!selectedSaving || !savingUpdateAmount) return;
    const amount = parseFloat(savingUpdateAmount);
    const diff = savingUpdateType === 'DEPOSIT' ? amount : -amount;
    
    updateSavingBalance(
      selectedSaving.id, 
      diff, 
      savingUpdateType === 'DEPOSIT' ? 'Befizetés' : 'Kivét',
      user.id
    );
    setShowSavingUpdateModal(false);
    refreshData();
  };

  const handleDeleteSaving = (id: string) => {
    if (window.confirm('Biztosan törlöd ezt a megtakarítási célt?')) {
      deleteSavingGoal(id, user.id);
      refreshData();
    }
  };

  const handleDeleteTransaction = (id: string) => {
    // Only set state, do not confirm here
    setTransactionToDelete(id);
  };

  const performDeleteTransaction = () => {
    if (transactionToDelete) {
       deleteTransaction(transactionToDelete, user.id, household.id);
       refreshData();
       setTransactionToDelete(null);
       // If we are in detail view of this transaction, close it
       if (selectedTransaction && selectedTransaction.id === transactionToDelete) {
           setSelectedTransaction(null);
       }
    }
  };

  const handleDeleteRecurring = (id: string) => {
    if (window.confirm("Biztosan törlöd ezt a fix tételt?")) {
      deleteRecurringItem(id, user.id);
      refreshData();
    }
  };

  // Prepares the Payment Modal
  const openPaymentModal = (item: RecurringItem) => {
    setSelectedRecItem(item);
    setNewTxAmount(item.amount.toString()); // Pre-fill with default amount
    setNewTxDesc(item.name);
    setNewTxCat(item.category);
    setShowPaymentModal(true);
  };

  const handlePayRecurring = () => {
    if (!selectedRecItem || !newTxAmount) return;
    addTransaction({
      type: TransactionType.EXPENSE,
      amount: parseFloat(newTxAmount),
      description: newTxDesc, // Allow user to modify desc if needed
      category: newTxCat,
      date: formatToYmd(new Date()), // Payment date is always today
      createdBy: user.id,
      isRecurringInstance: true,
      recurringItemId: selectedRecItem.id // LINK to the rule
    });
    setShowPaymentModal(false);
    refreshData();
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(addMonths(currentDate, -1));

  const formatMoney = (amount: number) => 
    new Intl.NumberFormat('hu-HU', { style: 'currency', currency: household.currency }).format(amount);

  const isOwner = user.id === household.ownerId;

  // Logic to determine status of recurring items for CURRENT VIEW MONTH
  // Note: Recurring items view logic is kept tied to Month View essentially, or we could just check if paid in the filtered range.
  // For simplicity, let's keep it checking against the filtered transactions which now respect custom range too.
  const recurringStatusList = useMemo(() => {
    return recurringItems.map(item => {
      const foundTx = filteredTransactions.find(t => t.recurringItemId === item.id);
      return {
        item,
        status: foundTx ? 'paid' : 'pending',
        paidAmount: foundTx ? foundTx.amount : undefined
      };
    });
  }, [recurringItems, filteredTransactions]);

  const filteredRecurringItems = useMemo(() => {
    if (recurringFilter === 'PENDING') {
      return recurringStatusList.filter(item => item.status === 'pending');
    }
    return recurringStatusList;
  }, [recurringStatusList, recurringFilter]);

  // Helper to get member name from ID
  const getMemberName = (userId: string) => {
    const m = household.members.find(m => m.id === userId);
    return m ? m.displayName : 'Ismeretlen';
  };

  // Main Add Button Logic
  const handleFabClick = () => {
    if (activeTab === 'overview') setShowAddModal(true);
    else if (activeTab === 'recurring') handleOpenRecurringModal();
    else if (activeTab === 'savings') setShowSavingAddModal(true);
  };

  // Filter Bar Handlers
  const setFilterCurrentMonth = () => {
    setFilterMode('MONTHLY');
    setCurrentDate(new Date());
  };

  const setFilterPrevMonth = () => {
    setFilterMode('MONTHLY');
    setCurrentDate(addMonths(new Date(), -1));
  };

  return (
    <div className="min-h-screen pb-24 relative max-w-md mx-auto bg-background shadow-2xl overflow-hidden flex flex-col">
      
      {/* HEADER */}
      <div className="bg-primary pt-12 pb-24 px-6 rounded-b-[2.5rem] relative shrink-0">
         <div className="flex justify-between items-center mb-6">
            <div className="text-white/80 text-sm font-medium">
               {household.name} <span className="opacity-50">|</span> {user.displayName}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowSettings(true)} className="text-white/80 hover:text-white transition" title="Beállítások">
                   <Icons.Settings />
              </button>
              <button onClick={onLogout} className="text-white/80 hover:text-white transition" title="Kijelentkezés">
                 <Icons.LogOut />
              </button>
            </div>
         </div>

         {activeTab === 'savings' ? (
           <div className="text-center text-white pb-6">
              <div className="text-sm opacity-80 mb-1">Megtakarítások Összesen</div>
              <div className="text-4xl font-bold tracking-tight">
                {formatMoney(savings.reduce((sum, s) => sum + s.currentAmount, 0))}
              </div>
           </div>
         ) : (
          <>
            {filterMode === 'MONTHLY' ? (
              <div className="flex items-center justify-between text-white mb-6">
                  <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-full transition"><Icons.ChevronLeft /></button>
                  <h2 className="text-lg font-semibold capitalize">{formatToMonthYear(currentDate)}</h2>
                  <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-full transition"><Icons.ChevronRight /></button>
              </div>
            ) : (
              <div className="flex items-center justify-center text-white mb-6">
                 <h2 className="text-lg font-semibold flex items-center gap-2"><Icons.Calendar /> Egyedi Időszak</h2>
              </div>
            )}

            <div className="text-center text-white">
                <div className="text-sm opacity-80 mb-1">
                    {filterMode === 'MONTHLY' ? 'Havi Egyenleg' : 'Időszaki Egyenleg'}
                </div>
                <div className="text-4xl font-bold tracking-tight">{formatMoney(totals.balance)}</div>
            </div>
          </>
         )}
      </div>

      {/* TABS CONTENT AREA */}
      <div className="flex-1 overflow-y-auto -mt-16 px-4 pb-20">
        
        {activeTab === 'overview' && (
          <>
            {/* FILTER BAR - DATE */}
            <div className="flex flex-col gap-3 mb-4">
              <div className="bg-surface p-1.5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                 <button 
                   onClick={setFilterCurrentMonth}
                   className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${filterMode === 'MONTHLY' && isWithinInterval(new Date(), {start: getStartOfMonth(currentDate), end: getEndOfMonth(currentDate)}) ? 'bg-primary text-white shadow-sm' : 'text-textSecondary hover:bg-gray-50'}`}
                 >
                   Aktuális
                 </button>
                 <button 
                   onClick={setFilterPrevMonth}
                   className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${filterMode === 'MONTHLY' && isWithinInterval(addMonths(new Date(), -1), {start: getStartOfMonth(currentDate), end: getEndOfMonth(currentDate)}) ? 'bg-primary text-white shadow-sm' : 'text-textSecondary hover:bg-gray-50'}`}
                 >
                   Előző hó
                 </button>
                 <button 
                   onClick={() => setFilterMode('CUSTOM')}
                   className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${filterMode === 'CUSTOM' ? 'bg-primary text-white shadow-sm' : 'text-textSecondary hover:bg-gray-50'}`}
                 >
                   Egyedi
                 </button>
              </div>

              {filterMode === 'CUSTOM' && (
                <div className="bg-surface p-3 rounded-xl shadow-sm border border-gray-100 flex gap-2 animate-fade-in">
                  <div className="flex-1">
                    <label className="text-[10px] text-textSecondary font-bold uppercase block mb-1">Tól</label>
                    <input 
                      type="date" 
                      value={customDateRange.start} 
                      onChange={(e) => setCustomDateRange({...customDateRange, start: e.target.value})}
                      className="w-full bg-background rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-primary/50 outline-none border border-gray-200"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-textSecondary font-bold uppercase block mb-1">Ig</label>
                    <input 
                      type="date" 
                      value={customDateRange.end} 
                      onChange={(e) => setCustomDateRange({...customDateRange, end: e.target.value})}
                      className="w-full bg-background rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-primary/50 outline-none border border-gray-200"
                    />
                  </div>
                </div>
              )}

              {/* FILTER BAR - TYPE */}
              <div className="bg-surface p-1 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <button 
                      onClick={() => setFilterType('ALL')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${filterType === 'ALL' ? 'bg-gray-700 text-white shadow-sm' : 'text-textSecondary hover:bg-gray-50'}`}
                  >
                      Mind
                  </button>
                  <button 
                      onClick={() => setFilterType(TransactionType.INCOME)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${filterType === TransactionType.INCOME ? 'bg-success text-white shadow-sm' : 'text-textSecondary hover:bg-gray-50'}`}
                  >
                      Bevétel
                  </button>
                  <button 
                      onClick={() => setFilterType(TransactionType.EXPENSE)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${filterType === TransactionType.EXPENSE ? 'bg-danger text-white shadow-sm' : 'text-textSecondary hover:bg-gray-50'}`}
                  >
                      Kiadás
                  </button>
              </div>
            </div>

            {/* FLOATING CARD STATS */}
            <Card className="flex flex-col items-center shadow-lg mb-6">
              <BudgetChart transactions={filteredTransactions} />
              <div className="flex w-full mt-4 pt-4 border-t border-gray-100">
                  <div className="flex-1 text-center border-r border-gray-100">
                    <div className="text-xs text-textSecondary uppercase tracking-wider">Bevétel</div>
                    <div className="text-success font-bold">{formatMoney(totals.income)}</div>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="text-xs text-textSecondary uppercase tracking-wider">Kiadás</div>
                    <div className="text-danger font-bold">{formatMoney(totals.expense)}</div>
                  </div>
              </div>
            </Card>

            {/* TRANSACTION LIST */}
            <h3 className="text-textSecondary font-bold text-sm uppercase tracking-wider mb-3 ml-2">Tranzakciók</h3>
            <div className="space-y-3">
              {filteredTransactions.length === 0 ? (
                <div className="text-center text-textSecondary py-8 opacity-60">Nincs tranzakció a kiválasztott szűrők alapján.</div>
              ) : (
                filteredTransactions.map(tx => (
                  <div 
                    key={tx.id} 
                    onClick={() => setSelectedTransaction(tx)}
                    className={`bg-surface p-4 rounded-xl shadow-sm border border-gray-50 flex items-center justify-between group relative overflow-hidden transition active:scale-[0.98] cursor-pointer ${tx.isRecurringInstance ? 'bg-[#F9FAFC]' : ''}`}
                  >
                      <div className="flex items-center gap-3 z-10">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${tx.type === TransactionType.INCOME ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                            {tx.type === TransactionType.INCOME ? '+' : '-'}
                        </div>
                        <div>
                            <div className="font-medium text-textPrimary flex items-center gap-2">
                              {tx.description}
                              {tx.isRecurringInstance && <Icons.Recurring />}
                            </div>
                            <div className="text-xs text-textSecondary">
                              {tx.category} • {formatToMonthDay(parseISODate(tx.date))} • <span className="font-medium">{getMemberName(tx.createdBy)}</span>
                            </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 z-10">
                        <span className={`font-bold ${tx.type === TransactionType.INCOME ? 'text-success' : 'text-textPrimary'}`}>
                            {formatMoney(tx.amount)}
                        </span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(tx.id); }}
                          className="p-2 text-gray-300 hover:text-danger hover:bg-danger/10 rounded-full transition-colors"
                          title="Törlés"
                        >
                          <Icons.Trash />
                        </button>
                      </div>
                  </div>
                ))
              )}
            </div>
            <div className="h-10"></div> {/* Spacer */}
          </>
        )}

        {activeTab === 'recurring' && (
          <div className="pt-2">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-textSecondary font-bold text-sm uppercase tracking-wider ml-2">Fix Költségek</h3>
               </div>
               
               {/* RECURRING FILTER BAR */}
               <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                   <button 
                     onClick={() => setRecurringFilter('ALL')}
                     className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${recurringFilter === 'ALL' ? 'bg-white shadow-sm text-textPrimary' : 'text-textSecondary'}`}
                   >
                     Összes
                   </button>
                   <button 
                     onClick={() => setRecurringFilter('PENDING')}
                     className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${recurringFilter === 'PENDING' ? 'bg-white shadow-sm text-primary' : 'text-textSecondary'}`}
                   >
                     Hátralévő
                   </button>
               </div>

               {filteredRecurringItems.length === 0 ? (
                  <div className="text-center text-textSecondary py-8 opacity-60 bg-white rounded-xl">
                    {recurringFilter === 'PENDING' ? 'Nincs hátralévő fizetnivaló ebben az időszakban.' : 'Még nincsenek fix költségek beállítva.'}
                  </div>
               ) : (
                 filteredRecurringItems.map((obj) => (
                   <RecurringItemCard 
                     key={obj.item.id}
                     item={obj.item}
                     status={obj.status as any}
                     paidAmount={obj.paidAmount}
                     currency={household.currency}
                     onPay={() => openPaymentModal(obj.item)}
                     onEdit={() => handleOpenRecurringModal(obj.item)}
                     onDelete={() => handleDeleteRecurring(obj.item.id)}
                   />
                 ))
               )}
          </div>
        )}

        {activeTab === 'savings' && (
          <div className="pt-2">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-textSecondary font-bold text-sm uppercase tracking-wider ml-2">Zsebek / Célok</h3>
             </div>

             {savings.length === 0 ? (
               <div className="text-center text-textSecondary py-8 opacity-60 bg-white rounded-xl">
                 Még nincsenek megtakarítási célok.
               </div>
             ) : (
               savings.map(item => (
                 <SavingCard 
                   key={item.id}
                   item={item}
                   currency={household.currency}
                   onDeposit={() => openSavingUpdateModal(item, 'DEPOSIT')}
                   onWithdraw={() => openSavingUpdateModal(item, 'WITHDRAW')}
                   onDelete={() => handleDeleteSaving(item.id)}
                 />
               ))
             )}
          </div>
        )}
      </div>

      {/* SIDE DRAWER FOR PROFILE */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" 
                onClick={() => setIsProfileOpen(false)}
            />
            
            {/* Drawer Content */}
            <div className="relative ml-auto w-full max-w-xs bg-surface h-full shadow-2xl p-6 flex flex-col animate-slide-in-right">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-bold text-textPrimary flex items-center gap-2">
                        <Icons.User /> Fiókom
                    </h3>
                    <button onClick={() => setIsProfileOpen(false)} className="p-2 hover:bg-gray-100 rounded-full text-textSecondary transition">
                        <Icons.X />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="mb-8">
                        <h4 className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                            Adatok
                        </h4>
                        <div className="space-y-4">
                            <Input 
                                label="Megjelenített név" 
                                value={displayName} 
                                onChange={e => setDisplayName(e.target.value)} 
                                placeholder="Pl. Kovács János"
                            />
                            <Input 
                                label="Email cím" 
                                value={user.email} 
                                disabled 
                                className="opacity-60 cursor-not-allowed bg-gray-100"
                            />
                            <Button onClick={handleUpdateProfile} fullWidth>Mentés</Button>
                        </div>
                    </div>

                    <div className="mb-8">
                         <h4 className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                            Háztartás
                        </h4>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                             <div className="font-bold text-textPrimary mb-1">{household.name}</div>
                             <div className="text-xs text-textSecondary mb-4">
                                {isOwner ? 'Tulajdonos vagy' : 'Tag vagy'}
                             </div>
                             
                             <Button onClick={handleLeaveHousehold} variant="danger" fullWidth className="text-sm py-2">
                                <span className="flex items-center justify-center gap-2">
                                    <Icons.LogoutBox /> Kilépés a háztartásból
                                </span>
                             </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* BOTTOM NAVIGATION */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-gray-200 p-2 flex justify-around items-center z-40 max-w-md mx-auto">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`flex flex-col items-center p-2 rounded-lg w-1/4 transition ${activeTab === 'overview' ? 'text-primary' : 'text-textSecondary'}`}
        >
          <Icons.Home />
          <span className="text-[10px] font-medium mt-1">Áttekintés</span>
        </button>
        <button 
          onClick={() => setActiveTab('recurring')}
          className={`flex flex-col items-center p-2 rounded-lg w-1/4 transition ${activeTab === 'recurring' ? 'text-primary' : 'text-textSecondary'}`}
        >
          <Icons.List />
          <span className="text-[10px] font-medium mt-1">Fix</span>
        </button>
        <button 
          onClick={() => setActiveTab('savings')}
          className={`flex flex-col items-center p-2 rounded-lg w-1/4 transition ${activeTab === 'savings' ? 'text-primary' : 'text-textSecondary'}`}
        >
          <Icons.PiggyBank />
          <span className="text-[10px] font-medium mt-1">Megtakarítás</span>
        </button>
        <button 
          onClick={() => setIsProfileOpen(true)}
          className={`flex flex-col items-center p-2 rounded-lg w-1/4 transition ${isProfileOpen ? 'text-primary' : 'text-textSecondary'}`}
        >
          <Icons.User />
          <span className="text-[10px] font-medium mt-1">Profil</span>
        </button>
      </div>

      {/* FAB ADD BUTTON */}
      {!isProfileOpen && (
          <button 
            onClick={handleFabClick}
            className="fixed bottom-20 right-6 bg-primary text-white p-4 rounded-full shadow-lg shadow-blue-300 hover:scale-105 active:scale-95 transition-all z-50"
          >
            <Icons.Plus />
          </button>
      )}

      {/* MODALS */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-slide-up">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold text-textPrimary">Új tétel</h3>
               <button onClick={() => setShowAddModal(false)} className="text-textSecondary hover:text-textPrimary">Bezárás</button>
            </div>
            
            <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
               <button 
                 className={`flex-1 py-2 rounded-md text-sm font-medium transition ${newTxType === TransactionType.EXPENSE ? 'bg-white shadow-sm text-danger' : 'text-textSecondary'}`}
                 onClick={() => setNewTxType(TransactionType.EXPENSE)}
               >
                 Kiadás
               </button>
               <button 
                 className={`flex-1 py-2 rounded-md text-sm font-medium transition ${newTxType === TransactionType.INCOME ? 'bg-white shadow-sm text-success' : 'text-textSecondary'}`}
                 onClick={() => setNewTxType(TransactionType.INCOME)}
               >
                 Bevétel
               </button>
            </div>

            <Input type="number" label="Összeg" value={newTxAmount} onChange={e => setNewTxAmount(e.target.value)} placeholder="0" autoFocus />
            <Input label="Leírás" value={newTxDesc} onChange={e => setNewTxDesc(e.target.value)} placeholder="Pl. Bevásárlás" />
            <Select label="Kategória" options={CATEGORIES} value={newTxCat} onChange={e => setNewTxCat(e.target.value)} />

            <Button onClick={handleAddTransaction} fullWidth variant={newTxType === TransactionType.INCOME ? 'success' : 'primary'}>Hozzáadás</Button>
          </div>
        </div>
      )}

      {showRecurringModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-slide-up">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold text-textPrimary">{editingRecId ? 'Fix Költség Módosítása' : 'Új Fix Költség'}</h3>
               <button onClick={() => setShowRecurringModal(false)} className="text-textSecondary hover:text-textPrimary">Bezárás</button>
            </div>
            <Input label="Megnevezés" value={newRecName} onChange={e => setNewRecName(e.target.value)} placeholder="Pl. Internet" autoFocus />
            <Input type="number" label="Tervezett Összeg" value={newRecAmount} onChange={e => setNewRecAmount(e.target.value)} placeholder="0" />
            <Select label="Gyakoriság" options={['MONTHLY', 'QUARTERLY', 'YEARLY']} value={newRecFreq} onChange={e => setNewRecFreq(e.target.value as any)} />
            <Select label="Kategória" options={CATEGORIES} value={newRecCat} onChange={e => setNewRecCat(e.target.value)} />
            
            <div className="mb-4 flex items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
               <input 
                  type="checkbox" 
                  id="autoPay" 
                  checked={newRecAutoPay} 
                  onChange={e => setNewRecAutoPay(e.target.checked)}
                  className="w-5 h-5 text-primary rounded focus:ring-primary border-gray-300"
               />
               <label htmlFor="autoPay" className="ml-3 flex flex-col cursor-pointer">
                  <span className="text-sm font-bold text-textPrimary flex items-center gap-1">
                     <Icons.Zap /> Automatikus rögzítés
                  </span>
                  <span className="text-xs text-textSecondary">Ha bekapcsolod, a rendszer automatikusan rögzíti, amikor esedékes.</span>
               </label>
            </div>

            {newRecAutoPay && (
              <div className="mb-6 animate-slide-up bg-gray-50 p-4 rounded-xl border border-gray-100">
                <label className="block text-textSecondary text-sm font-bold mb-3 text-center">Melyik napon legyen az utalás?</label>
                <div className="grid grid-cols-7 gap-2 justify-items-center">
                  {Array.from({length: 31}, (_, i) => i + 1).map(day => (
                    <button 
                      key={day} 
                      type="button"
                      onClick={() => setNewRecPayDay(day)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        newRecPayDay === day 
                          ? 'bg-primary text-white shadow-lg shadow-blue-200 scale-110 ring-2 ring-blue-100' 
                          : 'bg-white text-textSecondary border border-gray-200 hover:border-primary hover:text-primary'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                <div className="mt-4 text-center text-xs text-textSecondary bg-white py-2 rounded-lg border border-gray-100 shadow-sm">
                   Fordulónap: <span className="font-bold text-primary">{newRecPayDay}.</span>
                </div>
              </div>
            )}

            <Button onClick={handleSaveRecurring} fullWidth variant="primary">{editingRecId ? 'Mentés' : 'Létrehozás'}</Button>
          </div>
        </div>
      )}

      {showSavingAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-slide-up">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold text-textPrimary">Új Megtakarítás</h3>
               <button onClick={() => setShowSavingAddModal(false)} className="text-textSecondary hover:text-textPrimary">Bezárás</button>
            </div>
            <Input label="Megnevezés" value={savingName} onChange={e => setSavingName(e.target.value)} placeholder="Pl. Nyaralás" autoFocus />
            <Input type="number" label="Kezdőösszeg" value={savingInitial} onChange={e => setSavingInitial(e.target.value)} placeholder="0" />
            <Input type="number" label="Célösszeg (opcionális)" value={savingTarget} onChange={e => setSavingTarget(e.target.value)} placeholder="0" />
            <Button onClick={handleCreateSaving} fullWidth variant="primary">Létrehozás</Button>
          </div>
        </div>
      )}

      {showSavingUpdateModal && selectedSaving && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-slide-up">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold text-textPrimary">
                 {savingUpdateType === 'DEPOSIT' ? 'Befizetés' : 'Kivét'}
               </h3>
               <button onClick={() => setShowSavingUpdateModal(false)} className="text-textSecondary hover:text-textPrimary">Bezárás</button>
            </div>
            <p className="text-sm text-textSecondary mb-4">
              {savingUpdateType === 'DEPOSIT' ? 'Hozzáadás ehhez:' : 'Kivétel innen:'} <span className="font-bold text-textPrimary">{selectedSaving.name}</span>
            </p>
            <Input type="number" label="Összeg" value={savingUpdateAmount} onChange={e => setSavingUpdateAmount(e.target.value)} placeholder="0" autoFocus />
            <Button 
              onClick={handleUpdateSavingBalance} 
              fullWidth 
              variant={savingUpdateType === 'DEPOSIT' ? 'success' : 'danger'}
            >
              {savingUpdateType === 'DEPOSIT' ? 'Jóváírás' : 'Kivét'}
            </Button>
          </div>
        </div>
      )}

      {showPaymentModal && selectedRecItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-fade-in">
           <div className="bg-surface w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-slide-up">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-xl font-bold text-textPrimary">Befizetés Rögzítése</h3>
               <button onClick={() => setShowPaymentModal(false)} className="text-textSecondary hover:text-textPrimary">Bezárás</button>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg mb-4 text-sm text-primary">
              <span className="font-bold">{selectedRecItem.name}</span> befizetése erre a hónapra.
            </div>
            
            <Input type="number" label="Tényleges Összeg" value={newTxAmount} onChange={e => setNewTxAmount(e.target.value)} placeholder="0" autoFocus />
            <Input label="Megjegyzés" value={newTxDesc} onChange={e => setNewTxDesc(e.target.value)} />
            
            <Button onClick={handlePayRecurring} fullWidth variant="success">Rögzítés & Fizetve</Button>
           </div>
        </div>
      )}

      {/* TRANSACTION DETAILS MODAL */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-slide-up relative">
            <button onClick={() => setSelectedTransaction(null)} className="absolute top-4 right-4 text-textSecondary hover:text-textPrimary p-1">
              <Icons.X />
            </button>
            
            <div className="text-center mb-6">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-3 ${selectedTransaction.type === TransactionType.INCOME ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                  {selectedTransaction.type === TransactionType.INCOME ? <Icons.Plus className="w-8 h-8"/> : <Icons.Minus className="w-8 h-8" />}
                </div>
                <h3 className="text-xl font-bold text-textPrimary">{selectedTransaction.description}</h3>
                <p className={`text-2xl font-bold mt-1 ${selectedTransaction.type === TransactionType.INCOME ? 'text-success' : 'text-danger'}`}>
                  {selectedTransaction.type === TransactionType.INCOME ? '+' : '-'}{formatMoney(selectedTransaction.amount)}
                </p>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-textSecondary text-sm">Kategória</span>
                  <span className="font-medium text-textPrimary">{selectedTransaction.category}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-textSecondary text-sm">Dátum</span>
                  <span className="font-medium text-textPrimary">{formatToMonthDay(parseISODate(selectedTransaction.date))}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-textSecondary text-sm">Létrehozta</span>
                  <span className="font-medium text-textPrimary">{getMemberName(selectedTransaction.createdBy)}</span>
                </div>
                {selectedTransaction.isRecurringInstance && (
                  <div className="flex justify-between border-b border-gray-50 pb-2">
                      <span className="text-textSecondary text-sm">Típus</span>
                      <span className="font-medium text-primary flex items-center gap-1"><Icons.Recurring /> Fix Költség</span>
                  </div>
                )}
            </div>

            <div className="mt-8">
              <Button 
                  variant="danger" 
                  fullWidth 
                  onClick={() => {
                      handleDeleteTransaction(selectedTransaction.id);
                  }}
              >
                  Törlés
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {transactionToDelete && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-slide-up">
            <h3 className="text-xl font-bold text-textPrimary mb-2">Törlés megerősítése</h3>
            <p className="text-textSecondary mb-6">Biztosan törölni szeretnéd ezt a tranzakciót?</p>
            <div className="flex gap-3">
              <Button variant="outline" fullWidth onClick={() => setTransactionToDelete(null)}>Mégsem</Button>
              <Button variant="danger" fullWidth onClick={performDeleteTransaction}>Törlés</Button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
         <SettingsModal 
            household={household} 
            user={user}
            onClose={() => setShowSettings(false)} 
            onRefresh={onRefresh}
         />
      )}

      {!isOwner && activeTab === 'overview' && (
        <div className="mt-8 px-4 text-center pb-24">
           <div className="inline-block px-4 py-2 bg-blue-50 text-primary rounded-lg text-xs font-medium border border-blue-100">
              Meghívó kód: <span className="font-bold select-all">{household.inviteCode}</span>
           </div>
        </div>
      )}
    </div>
  );
};

// --- APP ROOT (Unchanged) ---
// ... (Keeping App component logic exactly as previous file)

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);

  // Init Auth
  useEffect(() => {
    const u = getCurrentUser();
    if (u) {
      setUser(u);
      if (u.householdId) {
        setHousehold(getHousehold(u.householdId));
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = () => {
    const u = getCurrentUser();
    setUser(u);
    if (u?.householdId) setHousehold(getHousehold(u.householdId));
  };

  const handleHouseholdComplete = () => {
    const u = getCurrentUser(); // Update user object from storage
    setUser(u);
    if (u?.householdId) setHousehold(getHousehold(u.householdId));
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    setHousehold(null);
  };
  
  const handleRefresh = () => {
    const updatedUser = getCurrentUser(); // Fetch fresh user data
    if (updatedUser) {
        setUser(updatedUser);
        if (updatedUser.householdId) {
            setHousehold(getHousehold(updatedUser.householdId));
        } else {
             // Explicitly clear household if user has left
             setHousehold(null);
        }
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background text-primary">Betöltés...</div>;

  if (!user) return <AuthPage onLogin={handleLogin} />;
  
  if (!user.householdId || !household) return <HouseholdSetup user={user} onComplete={handleHouseholdComplete} />;

  // NEW: Check for pending status
  if (user.membershipStatus === 'PENDING') {
      return <PendingApprovalPage onLogout={handleLogout} />;
  }

  return <Dashboard user={user} household={household} onLogout={handleLogout} onRefresh={handleRefresh} />;
};

export default App;