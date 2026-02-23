// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — App Root
// ═══════════════════════════════════════════════════════

import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from './store/useStore';
import { hasWallet } from './services/wallet';
import { startInactivityTimer, stopInactivityTimer } from './services/autolock';
import Welcome from './components/Welcome/Welcome';
import CreateWallet from './components/Create/CreateWallet';
import ImportWallet from './components/Import/ImportWallet';
import UnlockScreen from './components/Common/UnlockScreen';
import Dashboard from './components/Dashboard/Dashboard';
import SendScreen from './components/Send/SendScreen';
import ReceiveScreen from './components/Receive/ReceiveScreen';
import HistoryScreen from './components/History/HistoryScreen';
import SettingsScreen from './components/Settings/SettingsScreen';
import TokenListScreen from './components/TokenList/TokenListScreen';
import SwapScreen from './components/Swap/SwapScreen';
import ContactsScreen from './components/Contacts/ContactsScreen';
import TokenDetailScreen from './components/TokenDetail/TokenDetailScreen';
import WalletConnectScreen from './components/WalletConnect/WalletConnectScreen';
import NFTScreen from './components/NFT/NFTScreen';
import DAppBrowserScreen from './components/DAppBrowser/DAppBrowserScreen';
import BuyCryptoScreen from './components/Buy/BuyCryptoScreen';
import BridgeScreen from './components/Bridge/BridgeScreen';
import ErrorBoundary from './components/Common/ErrorBoundary';
import Toast from './components/Common/Toast';

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
  const { currentScreen, navigate, isUnlocked, lock } = useStore();

  useEffect(() => {
    // Determine initial screen
    if (hasWallet()) {
      navigate('unlock');
    } else {
      navigate('welcome');
    }
  }, []);

  // Auto-lock on inactivity
  useEffect(() => {
    if (isUnlocked) {
      startInactivityTimer(() => lock());
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
          {renderScreen()}
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
