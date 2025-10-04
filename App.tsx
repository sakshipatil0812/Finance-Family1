import React, { useState, useCallback, useEffect } from 'react';
import { Household, Expense, Notification } from './types';
import Dashboard from './components/Dashboard';
import ExpenseTracker from './components/ExpenseTracker';
import BucketGoals from './components/BucketGoals';
import TripPlanner from './components/TripPlanner';
import AiReport from './components/AiReport';
import Settings from './components/Settings';
import AddExpenseModal from './components/AddExpenseModal';
import { BellIcon, ChartIcon, Cog6ToothIcon, DashboardIcon, MoneyIcon, PiggyBankIcon, PlaneIcon, PlusIcon, ArrowUpTrayIcon, ArrowPathIcon, LightBulbIcon, ChatBubbleBottomCenterTextIcon, MenuIcon, XIcon, LogoutIcon } from './components/icons/Icons';
import NotificationPanel from './components/NotificationPanel';
import { detectAnomalousExpense } from './services/geminiService';
import FileImport from './components/FileImport';
import Subscriptions from './components/Subscriptions';
import SavingsCoach from './components/SavingsCoach';
import AiChat from './components/AiChat';
import Button from './components/common/Button';
import * as db from './services/db';
import * as auth from './services/authService';
import SignUp from './components/auth/SignUp';
import Login from './components/auth/Login';

export type View = 'dashboard' | 'expenses' | 'goals' | 'trips' | 'reports' | 'settings' | 'import' | 'subscriptions' | 'savings';

const formatCurrencyForNotif = (amountInCents: number): string => {
    const amount = amountInCents / 100;
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
};

const LoadingScreen: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex flex-col justify-center items-center h-screen text-white gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500"></div>
        <p className="text-lg text-gray-300">{message}</p>
    </div>
);

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  
  const [household, setHousehold] = useState<Household | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isAddExpenseModalOpen, setAddExpenseModalOpen] = useState(false);
  const [isNotificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  useEffect(() => {
    const checkUserStatus = async () => {
        const accountExists = await auth.doesAccountExist();
        setHasAccount(accountExists);
        if (accountExists) {
            const loggedIn = await auth.checkAuth();
            if (loggedIn) {
                setIsAuthenticated(true);
            }
        }
        setIsLoadingAuth(false);
    };
    checkUserStatus();
  }, []);

  const reloadData = useCallback(async () => {
    const data = await db.loadHouseholdData();
    setHousehold(data);
  }, []);

  useEffect(() => {
    const init = async () => {
        if (isAuthenticated) {
            await db.initDB();
            await reloadData();
        }
    };
    init();
  }, [isAuthenticated, reloadData]);
  
  const handleSignUp = async (name: string, pass: string) => {
    const success = await auth.signUp(name, pass);
    if(success) {
      await db.initDB(); // Creates and seeds the DB for the new user
      setIsAuthenticated(true);
      setHasAccount(true);
    }
    return success;
  };
  
  const handleLogin = async (pass: string) => {
    const success = await auth.login(pass);
    if(success) {
      setIsAuthenticated(true);
    }
    return success;
  };
  
  const handleLogout = () => {
    auth.logout();
    setIsAuthenticated(false);
    setHousehold(null);
  };

  if (isLoadingAuth) {
    return <LoadingScreen message="Securing your session..." />;
  }
  
  if (!isAuthenticated) {
      return hasAccount 
          ? <Login onLogin={handleLogin} /> 
          : <SignUp onSignUp={handleSignUp} />;
  }

  if (!household) {
    return <LoadingScreen message="Loading Financial Data..." />;
  }

  const unreadNotificationsCount = household.notifications.filter(n => !n.isRead).length;

  const handleAddExpense = async (newExpense: Omit<Expense, 'id'>) => {
    const expenseWithId: Expense = {
        ...newExpense,
        id: `exp-${crypto.randomUUID()}`
    };

    const notificationsToAdd: Notification[] = [];

    // 1. Budget Alert Check
    const budget = household.budgets.find(b => b.categoryId === newExpense.categoryId);
    if (budget && budget.amount > 0) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const expensesForCategoryThisMonth = household.expenses.filter(
            e => e.categoryId === newExpense.categoryId && new Date(e.date) >= startOfMonth
        );
        const spentBefore = expensesForCategoryThisMonth.reduce((sum, e) => sum + e.amount, 0);
        const spentAfter = spentBefore + newExpense.amount;
        const ninetyPercentBudget = budget.amount * 0.9;
        const categoryName = household.categories.find(c => c.id === newExpense.categoryId)?.name || 'a category';

        if (spentBefore < budget.amount && spentAfter >= budget.amount) {
            notificationsToAdd.push({ id: `notif-budget-exceeded-${crypto.randomUUID()}`, message: `You've exceeded your ${formatCurrencyForNotif(budget.amount)} budget for ${categoryName}!`, date: new Date().toISOString(), type: 'error', isRead: false });
        } else if (spentBefore < ninetyPercentBudget && spentAfter >= ninetyPercentBudget && spentAfter < budget.amount) {
            notificationsToAdd.push({ id: `notif-budget-warning-${crypto.randomUUID()}`, message: `You're approaching your ${formatCurrencyForNotif(budget.amount)} budget for ${categoryName}.`, date: new Date().toISOString(), type: 'warning', isRead: false });
        }
    }

    // 2. Anomaly Detection Check
    try {
        const anomalyResult = await detectAnomalousExpense(household, expenseWithId);
        if (anomalyResult.isAnomalous) {
            notificationsToAdd.push({ id: `notif-anomaly-${crypto.randomUUID()}`, message: `Unusual Spending Alert: ${anomalyResult.reasoning}`, date: new Date().toISOString(), type: 'warning', isRead: false });
        }
    } catch (error) {
        console.error("Failed to check for anomalous spending:", error);
    }

    await db.addExpense(expenseWithId, notificationsToAdd);
    await reloadData();
  };
  
  const updateHouseholdData = async (data: Partial<Omit<Household, 'id'>>) => {
      await db.updateHousehold(data);
      await reloadData();
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard household={household} />;
      case 'expenses':
        return <ExpenseTracker household={household} onUpdate={updateHouseholdData} />;
      case 'goals':
        return <BucketGoals household={household} onUpdate={updateHouseholdData} />;
      case 'trips':
          return <TripPlanner household={household} onUpdate={updateHouseholdData} />;
      case 'import':
        return <FileImport household={household} onAddExpense={handleAddExpense} />;
      case 'subscriptions':
        return <Subscriptions household={household} onUpdate={updateHouseholdData} />;
      case 'reports':
        return <AiReport household={household} />;
      case 'savings':
        return <SavingsCoach household={household} />;
      case 'settings':
        return <Settings household={household} onUpdate={updateHouseholdData} />;
      default:
        return <Dashboard household={household} />;
    }
  };

  const NavItem = ({ view, label, icon: Icon }: { view: View, label: string, icon: React.FC<any> }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        setMobileSidebarOpen(false);
      }}
      className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg w-full text-left transition-all duration-300 transform hover:scale-105 ${
        currentView === view ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30' : 'text-gray-300 hover:bg-slate-700/50 hover:text-white'
      }`}
    >
      <Icon className="w-6 h-6" />
      <span className="font-semibold">{label}</span>
    </button>
  );

  return (
    <div className="font-sans min-h-screen">
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 z-20 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900/50 backdrop-blur-lg p-4 space-y-4 border-r border-slate-700/50 transition-transform duration-300 ease-in-out md:translate-x-0 no-print ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-white px-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">FinancelyAI</h1>
            <button className="md:hidden p-1" onClick={() => setMobileSidebarOpen(false)}>
                <XIcon className="w-6 h-6 text-gray-400" />
            </button>
        </div>
        <nav className="space-y-2 pt-4">
          <NavItem view="dashboard" label="Dashboard" icon={DashboardIcon} />
          <NavItem view="expenses" label="Expenses" icon={MoneyIcon} />
          <NavItem view="subscriptions" label="Subscriptions" icon={ArrowPathIcon} />
          <NavItem view="goals" label="Goals" icon={PiggyBankIcon} />
          <NavItem view="trips" label="Trips" icon={PlaneIcon} />
          <NavItem view="import" label="Import" icon={ArrowUpTrayIcon} />
          <NavItem view="reports" label="AI Reports" icon={ChartIcon} />
          <NavItem view="savings" label="Savings Ideas" icon={LightBulbIcon} />
          <NavItem view="settings" label="Settings" icon={Cog6ToothIcon} />
        </nav>
        <div className="pt-4 absolute bottom-6 w-56">
           <Button
              onClick={() => {
                setAddExpenseModalOpen(true);
                setMobileSidebarOpen(false);
              }}
              className="w-full"
          >
            <PlusIcon className="w-6 h-6" />
            <span>Add Expense</span>
          </Button>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 p-4 md:p-8 pb-8">
          <header className="flex justify-between items-center mb-6 no-print">
              <div className="flex items-center gap-2">
                <button
                    className="p-2 -ml-2 rounded-full text-gray-300 hover:bg-slate-700 transition-colors md:hidden"
                    onClick={() => setMobileSidebarOpen(true)}
                    aria-label="Open menu"
                >
                    <MenuIcon className="w-6 h-6" />
                </button>
                <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 capitalize">{currentView}</h2>
              </div>
              <div className="flex items-center gap-2">
                  <button onClick={() => setIsChatOpen(true)} className="relative p-2 rounded-full hover:bg-slate-700/50 transition-colors" title="AI Chat Assistant">
                      <ChatBubbleBottomCenterTextIcon className="w-6 h-6 text-gray-400" />
                  </button>
                  <button onClick={() => setNotificationPanelOpen(true)} className="relative p-2 rounded-full hover:bg-slate-700/50 transition-colors" title="Notifications">
                      <BellIcon className="w-6 h-6 text-gray-400" />
                      {unreadNotificationsCount > 0 && (
                          <span className="absolute top-1 right-1 flex h-4 w-4">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-4 w-4 bg-pink-500 text-white text-xs items-center justify-center">{unreadNotificationsCount}</span>
                          </span>
                      )}
                  </button>
                   <button onClick={handleLogout} className="relative p-2 rounded-full hover:bg-slate-700/50 transition-colors" title="Logout">
                        <LogoutIcon className="w-6 h-6 text-gray-400" />
                    </button>
              </div>
          </header>
          <div className="print-content">
            {renderView()}
          </div>
      </main>
      
      {isAddExpenseModalOpen && (
        <AddExpenseModal
          isOpen={isAddExpenseModalOpen}
          onClose={() => setAddExpenseModalOpen(false)}
          household={household}
          onAddExpense={handleAddExpense}
        />
      )}

      {isNotificationPanelOpen && (
          <NotificationPanel 
              notifications={household.notifications} 
              onClose={() => setNotificationPanelOpen(false)}
          />
      )}

      {isChatOpen && (
          <AiChat 
              isOpen={isChatOpen}
              onClose={() => setIsChatOpen(false)}
              household={household}
          />
      )}

    </div>
  );
};

export default App;
