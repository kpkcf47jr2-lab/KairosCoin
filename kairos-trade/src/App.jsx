// Kairos Trade — Main Application (Premium v2.3 — Code Split + PWA)
import { useEffect, useState, lazy, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import useStore from './store/useStore';

// Layout (always loaded — shell)
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import ErrorBoundary from './components/Layout/ErrorBoundary';

// Auth & Onboarding (always loaded — gate)
import AuthScreen from './components/Auth/AuthScreen';
import OnboardingWizard from './components/Onboarding/OnboardingWizard';

// Lazy-loaded pages (code-split — each chunk loads on demand)
const Dashboard = lazy(() => import('./components/Dashboard/Dashboard'));
const TradingChart = lazy(() => import('./components/Chart/TradingChart'));
const DepthChart = lazy(() => import('./components/Chart/DepthChart'));
const TradingPanel = lazy(() => import('./components/Trading/TradingPanel'));
const BotManager = lazy(() => import('./components/Bots/BotManager'));
const BrokerManager = lazy(() => import('./components/Broker/BrokerManager'));
const AIChat = lazy(() => import('./components/AI/AIChat'));
const StrategyBuilder = lazy(() => import('./components/Strategy/StrategyBuilder'));
const TradeHistory = lazy(() => import('./components/Trading/TradeHistory'));
const SimulatorScreen = lazy(() => import('./components/Trading/SimulatorScreen'));
const SettingsPanel = lazy(() => import('./components/Settings/SettingsPanel'));
const AlertPanel = lazy(() => import('./components/Alerts/AlertPanel'));
const OrdersPanel = lazy(() => import('./components/Trading/OrdersPanel'));
const PortfolioAnalytics = lazy(() => import('./components/Portfolio/PortfolioAnalytics'));
const MultiChart = lazy(() => import('./components/Chart/MultiChart'));
const TradeJournal = lazy(() => import('./components/Journal/TradeJournal'));
const RiskDashboard = lazy(() => import('./components/Risk/RiskDashboard'));
const KairosBroker = lazy(() => import('./components/Kairos/KairosBroker'));
const BuyKairos = lazy(() => import('./components/Kairos/BuyKairos'));
const KairosVault = lazy(() => import('./components/Kairos/KairosVault'));
const KairosTreasury = lazy(() => import('./components/Kairos/KairosTreasury'));
const WalletPage = lazy(() => import('./components/Wallet/WalletPage'));
const MarketHeatmap = lazy(() => import('./components/Dashboard/MarketHeatmap'));
import { isAdmin } from './constants';
import { telegramService } from './services/telegram';

/* ─── Loading fallback ─── */
function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--dark)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-[var(--text-dim)] font-medium">Loading...</span>
      </div>
    </div>
  );
}

// Sub-component: Trading view with chart/depth toggle + orders panel
import { useState as useStateTrade } from 'react';
function TradingView() {
  const [chartTab, setChartTab] = useStateTrade('chart');
  const [showPanel, setShowPanel] = useStateTrade(true);
  const { selectedPair } = useStore();
  return (
    <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
      <div className="flex-1 overflow-hidden flex flex-col min-w-0">
        {/* Chart area */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex gap-1 px-3 pt-2 shrink-0 justify-between" style={{ background: 'var(--surface)' }}>
            <div className="flex gap-1">
              {[['chart', 'Chart'], ['depth', 'Depth']].map(([id, label]) => (
                <button key={id} onClick={() => setChartTab(id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition-colors ${chartTab === id ? 'text-[var(--gold)]' : 'text-[var(--text-dim)] hover:text-[var(--text-secondary)]'}`}
                  style={chartTab === id ? { background: 'var(--dark)', borderTop: '2px solid var(--gold)' } : {}}>
                  {label}
                </button>
              ))}
            </div>
            {/* Mobile toggle for trading panel */}
            <button
              onClick={() => setShowPanel(v => !v)}
              className="md:hidden px-3 py-1.5 text-xs font-bold text-[var(--gold)] rounded-lg bg-[var(--gold)]/[0.08]"
            >
              {showPanel ? 'Ocultar Panel' : 'Operar'}
            </button>
          </div>
          <Suspense fallback={<PageLoader />}>
            {chartTab === 'chart' ? (
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col"><TradingChart /></div>
            ) : (
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col"><DepthChart pair={selectedPair || 'BTCUSDT'} height={500} /></div>
            )}
          </Suspense>
        </div>
        {/* Orders panel below chart */}
        <Suspense fallback={null}><OrdersPanel /></Suspense>
      </div>
      {/* Trading Panel — side on desktop, below on mobile (toggleable) */}
      {showPanel && (
        <div className="md:w-auto shrink-0 max-h-[50vh] md:max-h-none overflow-y-auto border-t md:border-t-0 md:border-l border-[var(--border)]">
          <Suspense fallback={<PageLoader />}><TradingPanel /></Suspense>
        </div>
      )}
    </div>
  );
}

function App() {
  const { isAuthenticated, currentPage, aiPanelOpen, seedDefaultStrategies, settings, user, setPage, sidebarOpen } = useStore();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Seed factory strategies on first load
  useEffect(() => { seedDefaultStrategies(); }, []);

  // Initialize Telegram from saved settings
  useEffect(() => {
    if (settings?.telegramBotToken && settings?.telegramChatId) {
      telegramService.configure(settings.telegramBotToken, settings.telegramChatId);
    }
  }, [settings?.telegramBotToken, settings?.telegramChatId]);

  // Show onboarding wizard for new users (only once per user)
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      const done = localStorage.getItem(`kairos_onboarding_done_${user.id}`);
      if (!done) setShowOnboarding(true);
    }
  }, [isAuthenticated, user?.id]);

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'chart': return <TradingView />;
      case 'bots': return <BotManager />;
      case 'simulator': return <SimulatorScreen />;
      case 'brokers': return <BrokerManager />;
      case 'ai': return <AIChat />;
      case 'strategies': return <StrategyBuilder />;
      case 'history': return <TradeHistory />;
      case 'alerts': return <AlertPanel />;
      case 'portfolio': return <PortfolioAnalytics />;
      case 'multichart': return <MultiChart />;
      case 'heatmap': return <MarketHeatmap />;
      case 'journal': return <TradeJournal />;
      case 'risk': return <RiskDashboard />;
      case 'kairos-broker': return <KairosBroker />;
      case 'kairos-vault': return <KairosVault />;
      case 'kairos-treasury': {
        if (!isAdmin(user)) { setPage('dashboard'); return <Dashboard />; }
        return <KairosTreasury />;
      }
      case 'buy-kairos': return <BuyKairos />;
      case 'wallet': return <WalletPage />;
      case 'settings': return <SettingsPanel />;
      default: return <Dashboard />;
    }
  };

  // Close mobile menu on page change
  useEffect(() => { setMobileMenuOpen(false); }, [currentPage]);

  return (
    <div className="flex h-screen bg-[var(--dark)] overflow-hidden">
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#181A20', color: '#EAECEF', border: '1px solid #1E222D', fontSize: '13px' },
        }}
      />

      {/* Onboarding Wizard (shows once for new users) */}
      <AnimatePresence>
        {showOnboarding && <OnboardingWizard onComplete={() => setShowOnboarding(false)} />}
      </AnimatePresence>

      {/* Sidebar — desktop: inline, mobile: overlay */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 z-50 md:hidden"
            >
              <Sidebar forceMobileOpen />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header onMenuToggle={() => setMobileMenuOpen(v => !v)} mobileMenuOpen={mobileMenuOpen} />

        <div className="flex flex-1 overflow-hidden">
          {/* Page content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col overflow-hidden min-w-0"
            >
              <ErrorBoundary key={currentPage + '-eb'}>
                <Suspense fallback={<PageLoader />}>
                  {renderPage()}
                </Suspense>
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>

          {/* AI Panel (slide-in) — desktop only, mobile: full overlay */}
          <AnimatePresence>
            {aiPanelOpen && currentPage !== 'ai' && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 380, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-l border-[var(--border)] overflow-hidden shrink-0 hidden md:block"
              >
                <ErrorBoundary level="widget">
                  <Suspense fallback={<PageLoader />}><AIChat /></Suspense>
                </ErrorBoundary>
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI Panel — mobile: full-width overlay */}
          <AnimatePresence>
            {aiPanelOpen && currentPage !== 'ai' && (
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed inset-0 z-40 md:hidden bg-[var(--dark)]"
              >
                <ErrorBoundary level="widget">
                  <Suspense fallback={<PageLoader />}><AIChat /></Suspense>
                </ErrorBoundary>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default App;
