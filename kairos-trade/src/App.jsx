// Kairos Trade — Main Application (Premium v2)
import { Toaster } from 'react-hot-toast';
import { AnimatePresence, motion } from 'framer-motion';
import useStore from './store/useStore';

// Layout
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';

// Auth
import AuthScreen from './components/Auth/AuthScreen';

// Pages
import Dashboard from './components/Dashboard/Dashboard';
import TradingChart from './components/Chart/TradingChart';
import DepthChart from './components/Chart/DepthChart';
import TradingPanel from './components/Trading/TradingPanel';
import BotManager from './components/Bots/BotManager';
import BrokerManager from './components/Broker/BrokerManager';
import AIChat from './components/AI/AIChat';
import StrategyBuilder from './components/Strategy/StrategyBuilder';
import TradeHistory from './components/Trading/TradeHistory';
import SimulatorScreen from './components/Trading/SimulatorScreen';
import SettingsPanel from './components/Settings/SettingsPanel';
import AlertPanel from './components/Alerts/AlertPanel';

// Sub-component: Trading view with chart/depth toggle
import { useState as useStateTrade } from 'react';
function TradingView() {
  const [chartTab, setChartTab] = useStateTrade('chart');
  const { selectedPair } = useStore();
  return (
    <div className="flex flex-1 overflow-hidden h-full">
      <div className="flex-1 h-full overflow-hidden flex flex-col">
        <div className="flex gap-1 px-3 pt-2" style={{ background: 'var(--surface)' }}>
          {[['chart', 'Chart'], ['depth', 'Depth']].map(([id, label]) => (
            <button key={id} onClick={() => setChartTab(id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-t-lg transition-colors ${chartTab === id ? 'text-[var(--gold)]' : 'text-[var(--text-dim)] hover:text-[var(--text-secondary)]'}`}
              style={chartTab === id ? { background: 'var(--dark)', borderTop: '2px solid var(--gold)' } : {}}>
              {label}
            </button>
          ))}
        </div>
        {chartTab === 'chart' ? (
          <div className="flex-1 min-h-0 overflow-hidden"><TradingChart /></div>
        ) : (
          <div className="flex-1 min-h-0 overflow-hidden"><DepthChart pair={selectedPair || 'BTCUSDT'} height={500} /></div>
        )}
      </div>
      <TradingPanel />
    </div>
  );
}

function App() {
  const { isAuthenticated, currentPage, aiPanelOpen } = useStore();

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
      case 'wallet': return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--gold)]/15 flex items-center justify-center text-[var(--gold)] text-2xl font-bold mx-auto mb-4">K</div>
            <h2 className="text-lg font-bold mb-2">Kairos Wallet</h2>
            <p className="text-sm text-[var(--text-dim)] mb-4 max-w-xs">
              Conecta tu Kairos Wallet para integrar tus balances de KAIROS Coin con la plataforma de trading.
            </p>
            <a
              href="https://kairos-wallet.netlify.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--gold)] text-white font-semibold rounded-xl hover:bg-[var(--gold-light)] transition-colors"
            >
              Abrir Kairos Wallet
            </a>
          </div>
        </div>
      );
      case 'settings': return <SettingsPanel />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-[var(--dark)] overflow-hidden">
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#181A20', color: '#EAECEF', border: '1px solid #1E222D', fontSize: '13px' },
        }}
      />

      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <div className="flex flex-1 overflow-hidden">
          {/* Page content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>

          {/* AI Panel (slide-in) */}
          <AnimatePresence>
            {aiPanelOpen && currentPage !== 'ai' && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 380, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-l border-[var(--border)] overflow-hidden shrink-0"
              >
                <AIChat />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default App;
