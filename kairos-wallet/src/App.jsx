// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — App Root
// ═══════════════════════════════════════════════════════

import React, { useEffect, Suspense, lazy } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from './store/useStore';
import { hasWallet } from './services/wallet';
import { startInactivityTimer, stopInactivityTimer } from './services/autolock';
import ErrorBoundary from './components/Common/ErrorBoundary';
import Toast from './components/Common/Toast';
import { initPushListeners } from './services/pushNotifications';

// ── Core screens (loaded eagerly — critical path) ──
import Welcome from './components/Welcome/Welcome';
import CreateWallet from './components/Create/CreateWallet';
import ImportWallet from './components/Import/ImportWallet';
import UnlockScreen from './components/Common/UnlockScreen';
import Dashboard from './components/Dashboard/Dashboard';
import SendScreen from './components/Send/SendScreen';
import ReceiveScreen from './components/Receive/ReceiveScreen';

// ── Secondary screens (lazy loaded — code split) ──
const HistoryScreen = lazy(() => import('./components/History/HistoryScreen'));
const SettingsScreen = lazy(() => import('./components/Settings/SettingsScreen'));
const TokenListScreen = lazy(() => import('./components/TokenList/TokenListScreen'));
const SwapScreen = lazy(() => import('./components/Swap/SwapScreen'));
const ContactsScreen = lazy(() => import('./components/Contacts/ContactsScreen'));
const TokenDetailScreen = lazy(() => import('./components/TokenDetail/TokenDetailScreen'));
const WalletConnectScreen = lazy(() => import('./components/WalletConnect/WalletConnectScreen'));
const NFTScreen = lazy(() => import('./components/NFT/NFTScreen'));
const DAppBrowserScreen = lazy(() => import('./components/DAppBrowser/DAppBrowserScreen'));
const BuyCryptoScreen = lazy(() => import('./components/Buy/BuyCryptoScreen'));
const BridgeScreen = lazy(() => import('./components/Bridge/BridgeScreen'));
const NetworksScreen = lazy(() => import('./components/Settings/NetworksScreen'));
const ApprovalsScreen = lazy(() => import('./components/Security/ApprovalsScreen'));
const PendingTxScreen = lazy(() => import('./components/History/PendingTxScreen'));
const StakingScreen = lazy(() => import('./components/Staking/StakingScreen'));
const VaultScreen = lazy(() => import('./components/Vault/VaultScreen'));
const GasTrackerScreen = lazy(() => import('./components/Gas/GasTrackerScreen'));
const TxDetailScreen = lazy(() => import('./components/History/TxDetailScreen'));
const TokenSecurityScreen = lazy(() => import('./components/Security/TokenSecurityScreen'));
const AlertsScreen = lazy(() => import('./components/Alerts/AlertsScreen'));
const MultiSendScreen = lazy(() => import('./components/Send/MultiSendScreen'));
const PortfolioAllocation = lazy(() => import('./components/Dashboard/PortfolioAllocation'));
const NotificationCenter = lazy(() => import('./components/Common/NotificationCenter'));
const RPCHealthScreen = lazy(() => import('./components/Settings/RPCHealthScreen'));

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

const pageTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.25,
};

export default function App() {
  const { currentScreen, navigate, isUnlocked, lock, showToast } = useStore();

  useEffect(() => {
    // Determine initial screen
    if (hasWallet()) {
      navigate('unlock');
    } else {
      navigate('welcome');
    }

    // Handle cross-app token from Kairos Trade (?cat=...)
    const params = new URLSearchParams(window.location.search);
    const crossAppToken = params.get('cat');
    const wcUri = params.get('wc');

    // Clean URL without reload (remove both params)
    if (crossAppToken || wcUri) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    // WalletConnect auto-pair: Trade opened Wallet with ?wc=URI
    if (wcUri) {
      import('./services/walletconnect').then(async ({ pair }) => {
        try {
          await pair(decodeURIComponent(wcUri));
          setTimeout(() => {
            showToast('🔗 Kairos Trade conectado via WalletConnect', 'success');
            // Navigate to WC screen to approve
            if (hasWallet()) navigate('walletconnect');
          }, 1000);
        } catch (err) {
          console.warn('WC auto-pair failed:', err);
        }
      }).catch(() => {});
    }

    if (crossAppToken) {
      // Exchange token for Trade account info
      fetch('https://kairos-api-u6k5.onrender.com/api/auth/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crossAppToken }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.success && data.data?.user) {
            localStorage.setItem('kairos_linked_trade', JSON.stringify({
              email: data.data.user.email,
              name: data.data.user.name,
              walletAddress: data.data.user.wallet_address || '',
              linkedAt: new Date().toISOString(),
            }));
            // Don't store tokens — Wallet has its own auth
            setTimeout(() => showToast('✅ Cuenta de Kairos Trade vinculada', 'success'), 1500);
          }
        })
        .catch(() => {}); // Silently fail — non-critical
    }
  }, []);

  // Auto-lock on inactivity
  useEffect(() => {
    if (isUnlocked) {
      startInactivityTimer(() => lock());
      // Init push notification click handlers
      initPushListeners(navigate);
    } else {
      stopInactivityTimer();
    }
    return () => stopInactivityTimer();
  }, [isUnlocked]);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'welcome':
        return <Welcome key="welcome" />;
      case 'create':
        return <CreateWallet key="create" />;
      case 'import':
        return <ImportWallet key="import" />;
      case 'unlock':
        return <UnlockScreen key="unlock" />;
      case 'dashboard':
        return <Dashboard key="dashboard" />;
      case 'send':
        return <SendScreen key="send" />;
      case 'receive':
        return <ReceiveScreen key="receive" />;
      case 'history':
        return <HistoryScreen key="history" />;
      case 'settings':
        return <SettingsScreen key="settings" />;
      case 'tokens':
        return <TokenListScreen key="tokens" />;
      case 'swap':
        return <SwapScreen key="swap" />;
      case 'contacts':
        return <ContactsScreen key="contacts" />;
      case 'tokenDetail':
        return <TokenDetailScreen key="tokenDetail" />;
      case 'walletconnect':
        return <WalletConnectScreen key="walletconnect" />;
      case 'nft':
        return <NFTScreen key="nft" />;
      case 'dapps':
        return <DAppBrowserScreen key="dapps" />;
      case 'buy':
        return <BuyCryptoScreen key="buy" />;
      case 'bridge':
        return <BridgeScreen key="bridge" />;
      case 'networks':
        return <NetworksScreen key="networks" />;
      case 'approvals':
        return <ApprovalsScreen key="approvals" />;
      case 'pending':
        return <PendingTxScreen key="pending" />;
      case 'staking':
        return <StakingScreen key="staking" />;
      case 'vault':
        return <VaultScreen key="vault" />;
      case 'gas':
        return <GasTrackerScreen key="gas" />;
      case 'txdetail':
        return <TxDetailScreen key="txdetail" />;
      case 'tokenaudit':
        return <TokenSecurityScreen key="tokenaudit" />;
      case 'alerts':
        return <AlertsScreen key="alerts" />;
      case 'multisend':
        return <MultiSendScreen key="multisend" />;
      case 'portfolio':
        return <PortfolioAllocation key="portfolio" />;
      case 'notifications':
        return <NotificationCenter key="notifications" />;
      case 'rpchealth':
        return <RPCHealthScreen key="rpchealth" />;
      default:
        return <LoadingScreen key="loading" />;
    }
  };

  return (
    <ErrorBoundary onReset={() => navigate('dashboard')}>
    <div className="h-full w-full max-w-md mx-auto relative overflow-hidden bg-dark-950">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-kairos-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-kairos-600/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-kairos-400/3 blur-3xl" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageTransition}
          className="h-full w-full relative z-10"
        >
          <Suspense fallback={<LoadingScreen />}>
            {renderScreen()}
          </Suspense>
        </motion.div>
      </AnimatePresence>

      <Toast />
    </div>
    </ErrorBoundary>
  );
}

function LoadingScreen() {
  return (
    <div className="screen-container items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      >
        <img src="/icons/logo-128.png" alt="Kairos" className="w-16 h-16" />
      </motion.div>
      <p className="mt-4 text-dark-300 text-sm">Cargando Kairos Wallet...</p>
    </div>
  );
}
