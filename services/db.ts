import { Household, Expense, Notification, Rule, Budget, BucketGoal, Trip, Subscription, Member } from '../types';
import { INITIAL_HOUSEHOLD_DATA } from '../constants';
import * as auth from './authService';

// Declare the sql.js global function on the window object
declare global {
  interface Window {
    initSqlJs: (config: { locateFile: (file: string) => string }) => Promise<any>;
  }
}

const DB_NAME = 'financelyai-sql.db';
let db: any = null; // This will hold the SQL.js database object

// --- IndexedDB helpers to persist the SQLite DB file ---
const openIDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SQLJS_DB', 1);
        request.onupgradeneeded = () => {
            request.result.createObjectStore('files');
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const saveDbToIndexedDB = async () => {
    if (!db) return;
    const idb = await openIDB();
    const transaction = idb.transaction('files', 'readwrite');
    const store = transaction.objectStore('files');
    store.put(db.export(), DB_NAME);
    return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

const loadDbFromIndexedDB = async (): Promise<Uint8Array | null> => {
    const idb = await openIDB();
    const transaction = idb.transaction('files', 'readonly');
    const store = transaction.objectStore('files');
    const request = store.get(DB_NAME);
    return new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null);
    });
};

// --- DB Initialization and Schema ---
const createSchema = () => {
    const schema = `
        CREATE TABLE household_settings (id TEXT PRIMARY KEY, name TEXT, emailAlertsEnabled INTEGER, monthlyIncome INTEGER);
        CREATE TABLE members (id TEXT PRIMARY KEY, name TEXT, avatarUrl TEXT);
        CREATE TABLE categories (id TEXT PRIMARY KEY, name TEXT, icon TEXT);
        CREATE TABLE rules (id TEXT PRIMARY KEY, keyword TEXT, categoryId TEXT, FOREIGN KEY(categoryId) REFERENCES categories(id));
        CREATE TABLE expenses (id TEXT PRIMARY KEY, description TEXT, amount INTEGER, date TEXT, memberId TEXT, categoryId TEXT, tripId TEXT, FOREIGN KEY(memberId) REFERENCES members(id), FOREIGN KEY(categoryId) REFERENCES categories(id), FOREIGN KEY(tripId) REFERENCES trips(id));
        CREATE TABLE expense_splits (id INTEGER PRIMARY KEY AUTOINCREMENT, expenseId TEXT, memberId TEXT, amount INTEGER, FOREIGN KEY(expenseId) REFERENCES expenses(id) ON DELETE CASCADE, FOREIGN KEY(memberId) REFERENCES members(id));
        CREATE TABLE budgets (id TEXT PRIMARY KEY, categoryId TEXT UNIQUE, amount INTEGER, FOREIGN KEY(categoryId) REFERENCES categories(id));
        CREATE TABLE bucket_goals (id TEXT PRIMARY KEY, name TEXT, targetAmount INTEGER, currentAmount INTEGER);
        CREATE TABLE trips (id TEXT PRIMARY KEY, name TEXT, startDate TEXT, endDate TEXT, budget INTEGER);
        CREATE TABLE subscriptions (id TEXT PRIMARY KEY, description TEXT, amount INTEGER, frequency TEXT, nextDueDate TEXT, categoryId TEXT, FOREIGN KEY(categoryId) REFERENCES categories(id));
        CREATE TABLE notifications (id TEXT PRIMARY KEY, message TEXT, date TEXT, type TEXT, isRead INTEGER);
    `;
    db.exec(schema);
};

const getPersonalizedInitialData = (userName: string): Household => {
    const data = JSON.parse(JSON.stringify(INITIAL_HOUSEHOLD_DATA)); // Deep copy to avoid mutation
    data.name = `${userName}'s Household`;
    if (data.members[0]) {
        data.members[0].name = userName;
        data.members[0].avatarUrl = `https://i.pravatar.cc/150?u=${userName.toLowerCase().replace(/\s/g, '')}`;
    }
     if (data.members[1]) {
        data.members[1].name = "Partner";
        data.members[1].avatarUrl = `https://i.pravatar.cc/150?u=partner`;
    }
    return data;
};

const seedData = (userName: string) => {
    try {
        const initialData = getPersonalizedInitialData(userName);
        db.exec("BEGIN TRANSACTION;");
        const { members, categories, rules, expenses, budgets, bucketGoals, trips, subscriptions, notifications, ...householdBase } = initialData;

        db.prepare("INSERT INTO household_settings VALUES (?, ?, ?, ?)")
          .run([householdBase.id, householdBase.name, householdBase.emailAlertsEnabled ? 1 : 0, householdBase.monthlyIncome]);
        
        const memberStmt = db.prepare("INSERT INTO members VALUES (?, ?, ?)");
        members.forEach(m => memberStmt.run([m.id, m.name, m.avatarUrl]));
        memberStmt.free();

        const categoryStmt = db.prepare("INSERT INTO categories VALUES (?, ?, ?)");
        categories.forEach(c => categoryStmt.run([c.id, c.name, c.icon]));
        categoryStmt.free();

        const ruleStmt = db.prepare("INSERT INTO rules VALUES (?, ?, ?)");
        rules.forEach(r => ruleStmt.run([r.id, r.keyword, r.categoryId]));
        ruleStmt.free();
        
        const expStmt = db.prepare("INSERT INTO expenses VALUES (?, ?, ?, ?, ?, ?, ?)");
        const splitStmt = db.prepare("INSERT INTO expense_splits (expenseId, memberId, amount) VALUES (?, ?, ?)");
        expenses.forEach(e => {
            expStmt.run([e.id, e.description, e.amount, e.date, e.memberId, e.categoryId, null]);
            e.splits.forEach(s => splitStmt.run([e.id, s.memberId, s.amount]));
        });
        expStmt.free();
        splitStmt.free();

        const budgetStmt = db.prepare("INSERT INTO budgets VALUES (?, ?, ?)");
        budgets.forEach(b => budgetStmt.run([b.id, b.categoryId, b.amount]));
        budgetStmt.free();
        
        const goalStmt = db.prepare("INSERT INTO bucket_goals VALUES (?, ?, ?, ?)");
        bucketGoals.forEach(g => goalStmt.run([g.id, g.name, g.targetAmount, g.currentAmount]));
        goalStmt.free();

        const tripStmt = db.prepare("INSERT INTO trips VALUES (?, ?, ?, ?, ?)");
        const tripExpStmt = db.prepare("INSERT INTO expenses VALUES (?, ?, ?, ?, ?, ?, ?)");
        const tripSplitStmt = db.prepare("INSERT INTO expense_splits (expenseId, memberId, amount) VALUES (?, ?, ?)");
        trips.forEach(t => {
            tripStmt.run([t.id, t.name, t.startDate, t.endDate, t.budget]);
            t.expenses.forEach(e => {
                tripExpStmt.run([e.id, e.description, e.amount, e.date, e.memberId, e.categoryId, t.id]);
                e.splits.forEach(s => tripSplitStmt.run([e.id, s.memberId, s.amount]));
            });
        });
        tripStmt.free();
        tripExpStmt.free();
        tripSplitStmt.free();

        const subStmt = db.prepare("INSERT INTO subscriptions VALUES (?, ?, ?, ?, ?, ?)");
        subscriptions.forEach(s => subStmt.run([s.id, s.description, s.amount, s.frequency, s.nextDueDate, s.categoryId]));
        subStmt.free();
        
        const notifStmt = db.prepare("INSERT INTO notifications VALUES (?, ?, ?, ?, ?)");
        notifications.forEach(n => notifStmt.run([n.id, n.message, n.date, n.type, n.isRead ? 1 : 0]));
        notifStmt.free();

        db.exec("COMMIT;");
    } catch (e) {
        console.error("Seeding failed:", e);
        db.exec("ROLLBACK;");
    }
};

export const initDB = async (): Promise<void> => {
    if (db) return;
    try {
        const SQL = await window.initSqlJs({ locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}` });
        const dbData = await loadDbFromIndexedDB();
        if (dbData) {
            db = new SQL.Database(dbData);
        } else {
            // No DB exists, this must be a new signup.
            const user = auth.getAuthenticatedUser();
            if (user && user.name) {
                db = new SQL.Database();
                createSchema();
                seedData(user.name);
                await saveDbToIndexedDB();
            } else {
                // This shouldn't be reached in the new auth flow.
                // initDB should only be called after user is authenticated.
                console.error("Cannot create DB. No authenticated user for seeding.");
            }
        }
    } catch (err) {
        console.error("DB initialization failed:", err);
    }
};

// --- Data Access Functions ---

const sqlResultToObject = (stmt: any) => {
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    return results;
};

export const loadHouseholdData = async (): Promise<Household | null> => {
    if (!db) await initDB();
    if (!db) return null;

    try {
        const householdStmt = db.prepare("SELECT * FROM household_settings WHERE id = 'hh-1'");
        const [householdBase] = sqlResultToObject(householdStmt);
        householdStmt.free();
        
        if (!householdBase) {
            console.error("Could not find household settings in DB.");
            return null;
        }

        const membersStmt = db.prepare("SELECT * FROM members");
        const members = sqlResultToObject(membersStmt);
        membersStmt.free();
        
        const categoriesStmt = db.prepare("SELECT * FROM categories");
        const categories = sqlResultToObject(categoriesStmt);
        categoriesStmt.free();

        const rulesStmt = db.prepare("SELECT * FROM rules");
        const rules = sqlResultToObject(rulesStmt);
        rulesStmt.free();

        const expensesStmt = db.prepare("SELECT * FROM expenses WHERE tripId IS NULL ORDER BY date DESC");
        const expensesData = sqlResultToObject(expensesStmt);
        expensesStmt.free();
        
        const splitStmt = db.prepare("SELECT * FROM expense_splits WHERE expenseId = :id");
        const expenses = expensesData.map((e: any) => {
            splitStmt.bind({ ':id': e.id });
            const splits = sqlResultToObject(splitStmt);
            splitStmt.reset();
            return { ...e, splits };
        });
        splitStmt.free();

        const budgetsStmt = db.prepare("SELECT * FROM budgets");
        const budgets = sqlResultToObject(budgetsStmt);
        budgetsStmt.free();

        const goalsStmt = db.prepare("SELECT * FROM bucket_goals");
        const bucketGoals = sqlResultToObject(goalsStmt);
        goalsStmt.free();
        
        const tripsStmt = db.prepare("SELECT * FROM trips");
        const tripsData = sqlResultToObject(tripsStmt);
        tripsStmt.free();

        const tripExpStmt = db.prepare("SELECT * FROM expenses WHERE tripId = :id ORDER BY date DESC");
        const tripSplitStmt = db.prepare("SELECT * FROM expense_splits WHERE expenseId = :id");
        const trips = tripsData.map((t: any) => {
            tripExpStmt.bind({ ':id': t.id });
            const tripExpensesData = sqlResultToObject(tripExpStmt);
            tripExpStmt.reset();
            const tripExpenses = tripExpensesData.map((e: any) => {
                tripSplitStmt.bind({ ':id': e.id });
                const splits = sqlResultToObject(tripSplitStmt);
                tripSplitStmt.reset();
                return { ...e, splits };
            });
            return { ...t, expenses: tripExpenses };
        });
        tripExpStmt.free();
        tripSplitStmt.free();

        const subsStmt = db.prepare("SELECT * FROM subscriptions ORDER BY nextDueDate ASC");
        const subscriptions = sqlResultToObject(subsStmt);
        subsStmt.free();
        
        const notifsStmt = db.prepare("SELECT * FROM notifications ORDER BY date DESC");
        const notifications = sqlResultToObject(notifsStmt).map(n => ({...n, isRead: n.isRead === 1}));
        notifsStmt.free();
        
        return {
            ...householdBase,
            emailAlertsEnabled: householdBase.emailAlertsEnabled === 1,
            members,
            categories,
            rules,
            expenses,
            budgets,
            bucketGoals,
            trips,
            subscriptions,
            notifications,
        };
    } catch (err) {
        console.error("Failed to load household data:", err);
        return null;
    }
};

// --- Data Mutation Functions ---
export const addExpense = async (newExpense: Omit<Expense, 'id'> & { id: string }, notifications: Notification[]) => {
    if (!db) return;
    db.exec("BEGIN TRANSACTION;");
    try {
        db.prepare("INSERT INTO expenses (id, description, amount, date, memberId, categoryId, tripId) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .run([newExpense.id, newExpense.description, newExpense.amount, newExpense.date, newExpense.memberId, newExpense.categoryId, null]);

        const splitStmt = db.prepare("INSERT INTO expense_splits (expenseId, memberId, amount) VALUES (?, ?, ?)");
        newExpense.splits.forEach(s => splitStmt.run([newExpense.id, s.memberId, s.amount]));
        splitStmt.free();

        const notifStmt = db.prepare("INSERT INTO notifications VALUES (?, ?, ?, ?, ?)");
        notifications.forEach(n => notifStmt.run([n.id, n.message, n.date, n.type, n.isRead ? 1 : 0]));
        notifStmt.free();

        db.exec("COMMIT;");
        await saveDbToIndexedDB();
    } catch (err) {
        db.exec("ROLLBACK;");
        console.error("Failed to add expense:", err);
    }
};

export const deleteExpense = async (id: string) => {
    if (!db) return;
    db.prepare("DELETE FROM expenses WHERE id = ?").run([id]);
    await saveDbToIndexedDB();
};

export const updateHousehold = async (data: Partial<Omit<Household, 'id'>>) => {
     if (!db) return;
    db.exec("BEGIN TRANSACTION;");
    try {
        if(data.members) {
            db.exec("DELETE FROM members");
            const stmt = db.prepare("INSERT INTO members VALUES (?, ?, ?)");
            data.members.forEach((m: Member) => stmt.run([m.id, m.name, m.avatarUrl]));
            stmt.free();
        }
        if(data.rules) {
            db.exec("DELETE FROM rules");
            const stmt = db.prepare("INSERT INTO rules VALUES (?, ?, ?)");
            data.rules.forEach((r: Rule) => stmt.run([r.id, r.keyword, r.categoryId]));
            stmt.free();
        }
        if(data.budgets) {
            db.exec("DELETE FROM budgets");
            const stmt = db.prepare("INSERT INTO budgets VALUES (?, ?, ?)");
            data.budgets.forEach((b: Budget) => stmt.run([b.id, b.categoryId, b.amount]));
            stmt.free();
        }
        if(data.bucketGoals) {
            db.exec("DELETE FROM bucket_goals");
            const stmt = db.prepare("INSERT INTO bucket_goals VALUES (?, ?, ?, ?)");
            data.bucketGoals.forEach((g: BucketGoal) => stmt.run([g.id, g.name, g.targetAmount, g.currentAmount]));
            stmt.free();
        }
        if (data.trips) {
            db.exec("DELETE FROM trips");
            db.exec("DELETE FROM expenses WHERE tripId IS NOT NULL");
            const tripStmt = db.prepare("INSERT INTO trips VALUES (?, ?, ?, ?, ?)");
            const expStmt = db.prepare("INSERT INTO expenses (id, description, amount, date, memberId, categoryId, tripId) VALUES (?, ?, ?, ?, ?, ?, ?)");
            const splitStmt = db.prepare("INSERT INTO expense_splits (expenseId, memberId, amount) VALUES (?, ?, ?)");
            data.trips.forEach((t: Trip) => {
                tripStmt.run([t.id, t.name, t.startDate, t.endDate, t.budget]);
                t.expenses.forEach(e => {
                    expStmt.run([e.id, e.description, e.amount, e.date, e.memberId, e.categoryId, t.id]);
                    e.splits.forEach(s => splitStmt.run([e.id, s.memberId, s.amount]));
                });
            });
            tripStmt.free();
            expStmt.free();
            splitStmt.free();
        }
        if(data.subscriptions) {
            db.exec("DELETE FROM subscriptions");
            const stmt = db.prepare("INSERT INTO subscriptions VALUES (?, ?, ?, ?, ?, ?)");
            data.subscriptions.forEach((s: Subscription) => stmt.run([s.id, s.description, s.amount, s.frequency, s.nextDueDate, s.categoryId]));
            stmt.free();
        }
        if(data.monthlyIncome !== undefined || data.emailAlertsEnabled !== undefined) {
             const settingsStmt = db.prepare("UPDATE household_settings SET monthlyIncome = :income, emailAlertsEnabled = :alerts WHERE id = 'hh-1'");
             const current = await loadHouseholdData();
             settingsStmt.run({
                ':income': data.monthlyIncome ?? current!.monthlyIncome,
                ':alerts': data.emailAlertsEnabled !== undefined ? (data.emailAlertsEnabled ? 1 : 0) : (current!.emailAlertsEnabled ? 1 : 0)
             });
             settingsStmt.free();
        }
        
        db.exec("COMMIT;");
        await saveDbToIndexedDB();
    } catch(err) {
        db.exec("ROLLBACK;");
        console.error("Failed to update household:", err);
    }
};
