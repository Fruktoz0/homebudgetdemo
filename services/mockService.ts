import { User, Household, Transaction, TransactionType, AuditLog, Currency, Invitation, RecurringItem, SavingGoal, SavingLog } from '../types';

// Keys for LocalStorage
const STORAGE_KEYS = {
  USERS: 'budget_users',
  HOUSEHOLDS: 'budget_households',
  TRANSACTIONS: 'budget_transactions',
  AUDIT_LOGS: 'budget_audit_logs',
  INVITATIONS: 'budget_invitations',
  RECURRING_ITEMS: 'budget_recurring_items',
  SAVINGS: 'budget_savings',
  SAVING_LOGS: 'budget_saving_logs',
  CURRENT_USER_ID: 'budget_current_user_id'
};

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);
const generateInviteCode = () => Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code

// --- INTERNAL LOGGER ---
const logAction = (actionType: string, data: any, userId: string, householdId: string) => {
  const logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS) || '[]');
  const newLog: AuditLog = {
    id: generateId(),
    actionType,
    originalData: JSON.stringify(data),
    performedByUserId: userId,
    timestamp: new Date().toISOString(),
    householdId
  };
  logs.push(newLog);
  localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs));
};

export const getAuditLogs = (householdId: string): AuditLog[] => {
    const logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS) || '[]');
    // Filter by household
    const filteredLogs = logs.filter((l: AuditLog) => l.householdId === householdId);
    return filteredLogs.sort((a: AuditLog, b: AuditLog) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

// --- MOCK DATABASE INIT ---
const initializeData = () => {
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    // Create demo user
    const demoUser: User = { 
      id: 'u1', 
      email: 'joci@demo.hu', 
      password: '123', 
      displayName: 'Joci', 
      householdId: 'h1',
      membershipStatus: 'APPROVED'
    };
    const demoHousehold: Household = { 
      id: 'h1', 
      name: 'Otthon', 
      inviteCode: 'HOME-1234', 
      ownerId: 'u1',
      currency: Currency.HUF, 
      members: [demoUser] 
    };
    
    // Create some initial transactions
    const txs: Transaction[] = [
      { id: 't1', type: TransactionType.EXPENSE, amount: 25000, description: 'Nagybevásárlás', category: 'Élelmiszer', date: new Date().toISOString().split('T')[0], createdBy: 'u1', isRecurringInstance: false },
      { id: 't2', type: TransactionType.INCOME, amount: 450000, description: 'Fizetés', category: 'Fizetés', date: new Date().toISOString().split('T')[0], createdBy: 'u1', isRecurringInstance: true },
      { id: 't3', type: TransactionType.EXPENSE, amount: 12000, description: 'Netflix & Spotify', category: 'Szórakozás', date: new Date().toISOString().split('T')[0], createdBy: 'u1', isRecurringInstance: true },
    ];

    // Create a demo recurring item
    const recItems: RecurringItem[] = [
      { id: 'r1', householdId: 'h1', type: TransactionType.EXPENSE, name: 'Internet + TV', amount: 8500, category: 'Szórakozás', frequency: 'MONTHLY', active: true, autoPay: true, payDay: 10 },
      { id: 'r2', householdId: 'h1', type: TransactionType.EXPENSE, name: 'Lakbér', amount: 150000, category: 'Lakhatás', frequency: 'MONTHLY', active: true, autoPay: false }
    ];

    // Create demo savings
    const savings: SavingGoal[] = [
      { id: 's1', householdId: 'h1', name: 'Vésztartalék', currentAmount: 150000, targetAmount: 500000, color: '#A0D468' },
      { id: 's2', householdId: 'h1', name: 'Nyaralás', currentAmount: 50000, targetAmount: 300000, color: '#4FC1E9' }
    ];

    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([demoUser]));
    localStorage.setItem(STORAGE_KEYS.HOUSEHOLDS, JSON.stringify([demoHousehold]));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
    localStorage.setItem(STORAGE_KEYS.RECURRING_ITEMS, JSON.stringify(recItems));
    localStorage.setItem(STORAGE_KEYS.SAVINGS, JSON.stringify(savings));
    localStorage.setItem(STORAGE_KEYS.SAVING_LOGS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.INVITATIONS, JSON.stringify([]));
  }
};

initializeData();

// --- SERVICE METHODS ---

export const getCurrentUser = (): User | null => {
  const userId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
  if (!userId) return null;
  const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  return users.find((u: User) => u.id === userId) || null;
};

export const login = (email: string, password: string): User => {
  const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  let user = users.find((u: User) => u.email === email);
  
  if (!user) {
    throw new Error("Nem található felhasználó ezzel az email címmel.");
  }

  // Verify password
  if (user.password && user.password !== password) {
      throw new Error("Hibás jelszó!");
  }

  // Legacy support cleanup (optional safety)
  if (!user.password) {
      user.password = password;
      const index = users.findIndex((u: User) => u.id === user.id);
      users[index] = user;
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }
  
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id);
  return user;
};

export const register = (email: string, password: string, displayName: string): User => {
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    
    if (users.find((u: User) => u.email === email)) {
        throw new Error("Már létezik felhasználó ezzel az email címmel.");
    }

    const newUser: User = {
        id: generateId(),
        email,
        password,
        displayName: displayName || email.split('@')[0],
        householdId: null,
        membershipStatus: undefined
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, newUser.id); // Auto login
    return newUser;
};

export const updateUser = (userId: string, updates: Partial<User>) => {
  const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  const index = users.findIndex((u: User) => u.id === userId);
  
  if (index > -1) {
    const originalUser = users[index];
    const updatedUser = { ...originalUser, ...updates };
    users[index] = updatedUser;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    // Update household member data if applicable to keep denormalized data in sync
    if (updatedUser.householdId) {
        const households = JSON.parse(localStorage.getItem(STORAGE_KEYS.HOUSEHOLDS) || '[]');
        const hIndex = households.findIndex((h: Household) => h.id === updatedUser.householdId);
        if (hIndex > -1) {
            const mIndex = households[hIndex].members.findIndex((m: User) => m.id === userId);
            if (mIndex > -1) {
                // Preserve membership status while updating profile info
                const status = households[hIndex].members[mIndex].membershipStatus;
                households[hIndex].members[mIndex] = { ...updatedUser, membershipStatus: status };
                localStorage.setItem(STORAGE_KEYS.HOUSEHOLDS, JSON.stringify(households));
            }
            logAction('UPDATE_USER_PROFILE', updates, userId, updatedUser.householdId);
        }
    }
    
    return updatedUser;
  }
  throw new Error("Felhasználó nem található");
};

export const logout = () => {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
};

export const getHousehold = (householdId: string): Household | null => {
  const households = JSON.parse(localStorage.getItem(STORAGE_KEYS.HOUSEHOLDS) || '[]');
  return households.find((h: Household) => h.id === householdId) || null;
};

export const createHousehold = (name: string, userId: string): Household => {
  const households = JSON.parse(localStorage.getItem(STORAGE_KEYS.HOUSEHOLDS) || '[]');
  const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  
  const newHousehold: Household = {
    id: generateId(),
    name,
    inviteCode: `HOME-${Math.floor(1000 + Math.random() * 9000)}`,
    ownerId: userId,
    currency: Currency.HUF,
    members: []
  };

  // Update user
  const userIndex = users.findIndex((u: User) => u.id === userId);
  if (userIndex > -1) {
    users[userIndex].householdId = newHousehold.id;
    users[userIndex].membershipStatus = 'APPROVED'; // Owner is always approved
    newHousehold.members.push(users[userIndex]);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }
  
  households.push(newHousehold);
  localStorage.setItem(STORAGE_KEYS.HOUSEHOLDS, JSON.stringify(households));

  logAction('CREATE_HOUSEHOLD', { name }, userId, newHousehold.id);

  return newHousehold;
};

export const joinHousehold = (code: string, userId: string): boolean => {
  const households = JSON.parse(localStorage.getItem(STORAGE_KEYS.HOUSEHOLDS) || '[]');
  const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  const invitations = JSON.parse(localStorage.getItem(STORAGE_KEYS.INVITATIONS) || '[]');
  
  let householdIdToJoin: string | null = null;
  let invitationToAccept: Invitation | null = null;

  // 1. Check Global Code
  const globalMatch = households.find((h: Household) => h.inviteCode === code);
  if (globalMatch) {
    householdIdToJoin = globalMatch.id;
  }

  // 2. Check Individual Invitations
  if (!householdIdToJoin) {
    const inviteMatch = invitations.find((inv: Invitation) => inv.code === code && inv.status === 'PENDING');
    if (inviteMatch) {
      householdIdToJoin = inviteMatch.householdId;
      invitationToAccept = inviteMatch;
    }
  }

  if (householdIdToJoin) {
    const userIndex = users.findIndex((u: User) => u.id === userId);
    const householdIndex = households.findIndex((h: Household) => h.id === householdIdToJoin);

    if (userIndex > -1 && householdIndex > -1) {
      // Update User
      users[userIndex].householdId = householdIdToJoin;
      users[userIndex].membershipStatus = 'PENDING'; // Join requests are pending by default
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

      // Update Household Members (Add as pending)
      if(!households[householdIndex].members) households[householdIndex].members = [];
      households[householdIndex].members.push(users[userIndex]);
      localStorage.setItem(STORAGE_KEYS.HOUSEHOLDS, JSON.stringify(households));

      // Accept Invitation if applicable
      if (invitationToAccept) {
        invitationToAccept.status = 'ACCEPTED';
        const invIndex = invitations.findIndex((i: Invitation) => i.id === invitationToAccept!.id);
        invitations[invIndex] = invitationToAccept;
        localStorage.setItem(STORAGE_KEYS.INVITATIONS, JSON.stringify(invitations));
      }

      logAction('JOIN_HOUSEHOLD', { code, householdId: householdIdToJoin }, userId, householdIdToJoin);
      return true;
    }
  }
  return false;
};

// --- MEMBERSHIP MANAGEMENT ---

export const approveMember = (householdId: string, memberId: string, performedByUserId: string) => {
    const households = JSON.parse(localStorage.getItem(STORAGE_KEYS.HOUSEHOLDS) || '[]');
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    
    const hIndex = households.findIndex((h: Household) => h.id === householdId);
    const uIndex = users.findIndex((u: User) => u.id === memberId);

    if (hIndex > -1 && uIndex > -1) {
        // Update User
        users[uIndex].membershipStatus = 'APPROVED';
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

        // Update Household Member
        const mIndex = households[hIndex].members.findIndex((m: User) => m.id === memberId);
        if (mIndex > -1) {
            households[hIndex].members[mIndex].membershipStatus = 'APPROVED';
            localStorage.setItem(STORAGE_KEYS.HOUSEHOLDS, JSON.stringify(households));
        }
        
        logAction('APPROVE_MEMBER', { memberId, memberName: users[uIndex].displayName }, performedByUserId, householdId);
    }
};

export const removeMember = (householdId: string, memberId: string, performedByUserId: string) => {
    const households = JSON.parse(localStorage.getItem(STORAGE_KEYS.HOUSEHOLDS) || '[]');
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    
    const hIndex = households.findIndex((h: Household) => h.id === householdId);
    const uIndex = users.findIndex((u: User) => u.id === memberId);

    if (hIndex > -1 && uIndex > -1) {
        const removedName = users[uIndex].displayName;
        const household = households[hIndex];

        // --- OWNERSHIP TRANSFER LOGIC ---
        if (household.ownerId === memberId) {
             // Find a new owner from remaining APPROVED members
             // We filter out the member being removed
             const candidates = household.members.filter((m: User) => m.id !== memberId && (m.membershipStatus === 'APPROVED' || !m.membershipStatus));
             
             if (candidates.length > 0) {
                 household.ownerId = candidates[0].id;
             }
             // If no candidates, household becomes ownerless (or effectively deleted logic-wise eventually)
        }
        // --------------------------------

        // Reset User
        users[uIndex].householdId = null;
        users[uIndex].membershipStatus = undefined;
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

        // Remove from Household Members
        household.members = household.members.filter((m: User) => m.id !== memberId);
        
        // Save Household
        households[hIndex] = household;
        localStorage.setItem(STORAGE_KEYS.HOUSEHOLDS, JSON.stringify(households));

        logAction('REMOVE_MEMBER', { memberId, memberName: removedName }, performedByUserId, householdId);
    }
};


// --- INVITATION MANAGEMENT ---

export const getInvitations = (householdId: string): Invitation[] => {
  const allInvites = JSON.parse(localStorage.getItem(STORAGE_KEYS.INVITATIONS) || '[]');
  return allInvites.filter((inv: Invitation) => inv.householdId === householdId && inv.status === 'PENDING');
};

export const createInvitation = (householdId: string, email: string): Invitation => {
  const allInvites = JSON.parse(localStorage.getItem(STORAGE_KEYS.INVITATIONS) || '[]');
  
  const newInvite: Invitation = {
    id: generateId(),
    householdId,
    email,
    code: generateInviteCode(),
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };

  allInvites.push(newInvite);
  localStorage.setItem(STORAGE_KEYS.INVITATIONS, JSON.stringify(allInvites));
  return newInvite;
};

export const revokeInvitation = (invitationId: string) => {
  const allInvites = JSON.parse(localStorage.getItem(STORAGE_KEYS.INVITATIONS) || '[]');
  const index = allInvites.findIndex((inv: Invitation) => inv.id === invitationId);
  if (index > -1) {
    allInvites[index].status = 'REVOKED';
    localStorage.setItem(STORAGE_KEYS.INVITATIONS, JSON.stringify(allInvites));
  }
};


// --- TRANSACTIONS ---

export const getTransactions = (householdId: string): Transaction[] => {
  const allTx = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || '[]');
  const household = getHousehold(householdId);
  if (!household) return [];
  const memberIds = household.members.map(m => m.id);

  return allTx.filter((t: Transaction) => 
    memberIds.includes(t.createdBy) && !t.deletedAt
  );
};

export const addTransaction = (txData: Omit<Transaction, 'id' | 'deletedAt'>) => {
  const allTx = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || '[]');
  const newTx: Transaction = {
    ...txData,
    id: generateId(),
    deletedAt: null
  };
  allTx.push(newTx);
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(allTx));
  
  // Lookup user to get householdId for logging
  const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  const user = users.find((u: User) => u.id === txData.createdBy);
  const householdId = user?.householdId;

  if (householdId) {
    logAction('CREATE_TRANSACTION', { 
        amount: newTx.amount, 
        desc: newTx.description, 
        type: newTx.type 
    }, txData.createdBy, householdId);
  }

  return newTx;
};

export const deleteTransaction = (transactionId: string, userId: string, householdId: string) => {
  const allTx = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || '[]');
  const txIndex = allTx.findIndex((t: Transaction) => t.id === transactionId);
  
  if (txIndex > -1) {
    const tx = allTx[txIndex];
    
    // 1. Audit Log (This is now redundant with logAction but kept for specific data snapshot)
    logAction('DELETE_TRANSACTION', tx, userId, householdId);

    // 2. Soft Delete
    tx.deletedAt = new Date().toISOString();
    allTx[txIndex] = tx;
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(allTx));
  }
};

// --- RECURRING ITEMS ---

export const getRecurringItems = (householdId: string): RecurringItem[] => {
  const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECURRING_ITEMS) || '[]');
  return items.filter((i: RecurringItem) => i.householdId === householdId && i.active);
};

export const addRecurringItem = (itemData: Omit<RecurringItem, 'id'>, userId: string) => {
  const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECURRING_ITEMS) || '[]');
  const newItem: RecurringItem = { ...itemData, id: generateId() };
  items.push(newItem);
  localStorage.setItem(STORAGE_KEYS.RECURRING_ITEMS, JSON.stringify(items));
  
  logAction('CREATE_RECURRING', { name: newItem.name, amount: newItem.amount }, userId, newItem.householdId);

  return newItem;
};

export const updateRecurringItem = (updatedItem: RecurringItem, userId: string) => {
  const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECURRING_ITEMS) || '[]');
  const index = items.findIndex((i: RecurringItem) => i.id === updatedItem.id);
  if (index > -1) {
    items[index] = updatedItem;
    localStorage.setItem(STORAGE_KEYS.RECURRING_ITEMS, JSON.stringify(items));
    
    logAction('UPDATE_RECURRING', { name: updatedItem.name, amount: updatedItem.amount }, userId, updatedItem.householdId);
  }
};

export const deleteRecurringItem = (id: string, userId: string) => {
  const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECURRING_ITEMS) || '[]');
  const index = items.findIndex((i: RecurringItem) => i.id === id);
  if (index > -1) {
    const item = items[index];
    item.active = false; // Soft delete effectively
    localStorage.setItem(STORAGE_KEYS.RECURRING_ITEMS, JSON.stringify(items));
    
    logAction('DELETE_RECURRING', { name: item.name }, userId, item.householdId);
  }
};

// --- AUTO PAYMENT LOGIC ---
export const processAutoPayments = (householdId: string, userId: string) => {
  const recurringItems = getRecurringItems(householdId);
  const autoPayItems = recurringItems.filter(i => i.autoPay);
  
  if (autoPayItems.length === 0) return;

  const today = new Date();
  const currentDayOfMonth = today.getDate();
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

  // Get transactions for the current month
  const allTx = getTransactions(householdId);
  const currentMonthTx = allTx.filter(t => {
      const txDate = new Date(t.date);
      return txDate >= currentMonthStart && txDate <= currentMonthEnd;
  });

  autoPayItems.forEach(item => {
      // Check if this item has been paid this month
      const isPaid = currentMonthTx.some(t => t.recurringItemId === item.id);
      
      if (!isPaid) {
          // Check if we have passed the scheduled pay day
          const scheduledDay = item.payDay || 1; // Default to 1st if not set
          
          if (currentDayOfMonth >= scheduledDay) {
               // Construct the transaction date: Current Year - Current Month - Scheduled Day
               const year = today.getFullYear();
               const month = String(today.getMonth() + 1).padStart(2, '0');
               const day = String(scheduledDay).padStart(2, '0');
               const txDateString = `${year}-${month}-${day}`;

              // Create transaction automatically
              addTransaction({
                  type: item.type,
                  amount: item.amount,
                  description: item.name,
                  category: item.category,
                  date: txDateString, // Use the specific scheduled date
                  createdBy: userId, // Performed by current user (system)
                  isRecurringInstance: true,
                  recurringItemId: item.id
              });
              
              // No explicit log needed here as addTransaction logs it, but we could add a system note
          }
      }
  });
};

// --- SAVINGS ---

export const getSavings = (householdId: string): SavingGoal[] => {
  const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVINGS) || '[]');
  return items.filter((i: SavingGoal) => i.householdId === householdId && !i.deletedAt);
};

export const addSavingGoal = (data: Omit<SavingGoal, 'id' | 'deletedAt'>, userId: string) => {
  const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVINGS) || '[]');
  const newItem: SavingGoal = { ...data, id: generateId(), deletedAt: null };
  items.push(newItem);
  localStorage.setItem(STORAGE_KEYS.SAVINGS, JSON.stringify(items));
  
  logAction('CREATE_SAVING', { name: newItem.name, target: newItem.targetAmount }, userId, newItem.householdId);
  
  return newItem;
};

export const updateSavingBalance = (savingId: string, amountDiff: number, description: string, userId: string) => {
  const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVINGS) || '[]');
  const index = items.findIndex((i: SavingGoal) => i.id === savingId);
  
  if (index > -1) {
    // Update Balance
    items[index].currentAmount += amountDiff;
    localStorage.setItem(STORAGE_KEYS.SAVINGS, JSON.stringify(items));

    // Create Log
    const logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVING_LOGS) || '[]');
    const newLog: SavingLog = {
      id: generateId(),
      savingGoalId: savingId,
      amount: amountDiff,
      date: new Date().toISOString(),
      description
    };
    logs.push(newLog);
    localStorage.setItem(STORAGE_KEYS.SAVING_LOGS, JSON.stringify(logs));

    logAction('UPDATE_SAVING_BALANCE', { name: items[index].name, diff: amountDiff }, userId, items[index].householdId);
  }
};

export const getSavingLogs = (savingId: string): SavingLog[] => {
  const logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVING_LOGS) || '[]');
  return logs.filter((l: SavingLog) => l.savingGoalId === savingId).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const deleteSavingGoal = (id: string, userId: string) => {
  const items = JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVINGS) || '[]');
  const index = items.findIndex((i: SavingGoal) => i.id === id);
  if (index > -1) {
    const item = items[index];
    item.deletedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.SAVINGS, JSON.stringify(items));
    
    logAction('DELETE_SAVING', { name: item.name }, userId, item.householdId);
  }
};