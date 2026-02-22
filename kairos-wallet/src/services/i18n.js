// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Internationalization (i18n)
//  English / Spanish with auto-detect
// ═══════════════════════════════════════════════════════

import { STORAGE_KEYS } from '../constants/chains';
import { useState, useEffect, useCallback } from 'react';

const LANG_KEY = 'kairos_language';

// ── Translations ──

const translations = {
  es: {
    // Common
    'app.name': 'Kairos Wallet',
    'common.loading': 'Cargando...',
    'common.cancel': 'Cancelar',
    'common.confirm': 'Confirmar',
    'common.save': 'Guardar',
    'common.delete': 'Eliminar',
    'common.copy': 'Copiar',
    'common.copied': 'Copiado',
    'common.search': 'Buscar...',
    'common.back': 'Volver',
    'common.next': 'Siguiente',
    'common.done': 'Listo',
    'common.error': 'Error',
    'common.success': 'Éxito',
    'common.close': 'Cerrar',
    'common.retry': 'Reintentar',

    // Welcome
    'welcome.title': 'Bienvenido a Kairos Wallet',
    'welcome.subtitle': 'La wallet descentralizada de nueva generación. Tus claves, tus criptos, tu libertad.',
    'welcome.create': 'Crear Wallet',
    'welcome.import': 'Importar Wallet',
    'welcome.feat_security': 'Seguridad militar AES-256-GCM',
    'welcome.feat_multichain': 'Multi-chain: BSC, ETH, Polygon y más',
    'welcome.feat_fast': 'Transacciones ultra-rápidas',

    // Dashboard
    'dashboard.portfolio': 'Portafolio',
    'dashboard.send': 'Enviar',
    'dashboard.receive': 'Recibir',
    'dashboard.swap': 'Swap',
    'dashboard.contacts': 'Contactos',
    'dashboard.history': 'Historial',
    'dashboard.tokens': 'Tokens',
    'dashboard.manage': 'Gestionar',
    'dashboard.no_tokens': 'No hay tokens todavía',
    'dashboard.no_tokens_desc': 'Recibe tokens o agrega tokens personalizados',

    // Send
    'send.title': 'Enviar',
    'send.recipient': 'Dirección del destinatario',
    'send.amount': 'Cantidad',
    'send.token': 'Token',
    'send.gas': 'Gas estimado',
    'send.confirm_send': 'Confirmar y Enviar',
    'send.sending': 'Enviando...',
    'send.sent': '¡Transacción Enviada!',
    'send.max': 'MAX',
    'send.invalid_address': 'Dirección inválida',
    'send.insufficient': 'Saldo insuficiente',
    'send.confirm_title': 'Confirmar Envío',
    'send.irreversible': 'Verifica la dirección del destinatario. Las transacciones en blockchain son irreversibles.',

    // Receive
    'receive.title': 'Recibir',
    'receive.scan_qr': 'Escanea este código QR',
    'receive.copy_address': 'Copiar dirección',
    'receive.address_copied': 'Dirección copiada',

    // Swap
    'swap.title': 'Swap',
    'swap.sell': 'Vendes',
    'swap.buy': 'Recibes',
    'swap.balance': 'Saldo',
    'swap.quoting': 'Cotizando...',
    'swap.select_tokens': 'Selecciona los tokens',
    'swap.enter_amount': 'Ingresa un monto',
    'swap.insufficient': 'Saldo insuficiente',
    'swap.no_liquidity': 'No hay liquidez para este par',
    'swap.rate': 'Tasa',
    'swap.impact': 'Impacto',
    'swap.min_received': 'Mínimo recibido',
    'swap.slippage': 'Slippage',
    'swap.route': 'Ruta',
    'swap.confirm': 'Confirmar Swap',
    'swap.swapping': 'Ejecutando swap...',
    'swap.success': '¡Swap exitoso!',
    'swap.error': 'Error en el swap',
    'swap.high_impact': 'Alto impacto de precio. Podrías perder valor significativo.',

    // Contacts
    'contacts.title': 'Contactos',
    'contacts.new': 'Nuevo contacto',
    'contacts.edit': 'Editar contacto',
    'contacts.search': 'Buscar por nombre o dirección...',
    'contacts.empty': 'Sin contactos aún',
    'contacts.empty_desc': 'Agrega direcciones frecuentes',
    'contacts.add': 'Agregar contacto',
    'contacts.name': 'Nombre',
    'contacts.address': 'Dirección',
    'contacts.notes': 'Notas (opcional)',
    'contacts.delete_confirm': '¿Eliminar contacto?',
    'contacts.added': 'Contacto agregado',
    'contacts.updated': 'Contacto actualizado',
    'contacts.deleted': 'Contacto eliminado',

    // Settings
    'settings.title': 'Configuración',
    'settings.accounts': 'Mis Wallets',
    'settings.explorer': 'Ver en Block Explorer',
    'settings.security': 'Seguridad',
    'settings.encryption': 'AES-256-GCM + PBKDF2 600K',
    'settings.export_key': 'Exportar Clave Privada',
    'settings.requires_password': 'Requiere contraseña',
    'settings.autolock': 'Auto-Lock',
    'settings.biometric': 'Biometría',
    'settings.biometric_on': 'Activada',
    'settings.biometric_off': 'Desactivada',
    'settings.general': 'General',
    'settings.danger': 'Peligro',
    'settings.walletconnect': 'WalletConnect',
    'settings.connect_dapps': 'Conectar dApps',
    'settings.network': 'Red Predeterminada',
    'settings.language': 'Idioma',
    'settings.about': 'Acerca de Kairos Wallet',
    'settings.lock': 'Bloquear Wallet',
    'settings.lock_desc': 'Cierra la sesión actual',
    'settings.delete': 'Eliminar Wallet',
    'settings.delete_desc': 'Requiere frase semilla para restaurar',
    'settings.delete_confirm': '⚠️ PELIGRO: Esto eliminará tu wallet permanentemente.',

    // Token Detail
    'token.balance': 'Tu saldo',
    'token.stats': 'Estadísticas',
    'token.min': 'Mínimo',
    'token.max': 'Máximo',

    // History
    'history.title': 'Historial',
    'history.empty': 'Sin transacciones',
    'history.empty_desc': 'Tus transacciones aparecerán aquí',

    // Unlock
    'unlock.title': 'Desbloquear Kairos',
    'unlock.password': 'Contraseña',
    'unlock.wrong_password': 'Contraseña incorrecta',
    'unlock.unlock': 'Desbloquear',
    'unlock.enter_password': 'Ingresa tu contraseña para desbloquear',
    'unlock.decrypting': 'Descifrando...',

    // Create
    'create.title': 'Crear Wallet',
    'create.set_password': 'Establece una contraseña segura',
    'create.seed_phrase': 'Frase semilla',
    'create.save_seed': 'Guarda tu frase semilla en un lugar seguro',
    'create.confirm_seed': 'Confirma tu frase semilla',

    // WalletConnect
    'wc.title': 'WalletConnect',
    'wc.connect_dapp': 'Conectar dApp',
    'wc.paste_uri': 'Pega el URI de WalletConnect',
    'wc.connect': 'Conectar',
    'wc.active_sessions': 'Sesiones activas',
    'wc.no_connections': 'Sin conexiones',
    'wc.session_proposal': 'Solicitud de conexión',
    'wc.approve': 'Aprobar',
    'wc.reject': 'Rechazar',
    'wc.connected': 'dApp conectada',
    'wc.disconnected': 'dApp desconectada',

    // NFT
    'nft.title': 'NFTs',
    'nft.searching': 'Buscando tus NFTs...',
    'nft.wait': 'Esto puede tomar unos segundos',
    'nft.empty': 'No se encontraron NFTs',
    'nft.empty_desc': 'Tus NFTs ERC-721 aparecerán aquí',
    'nft.contract': 'Contrato',
    'nft.network': 'Red',
    'nft.attributes': 'Atributos',

    // dApps
    'dapps.title': 'Explorar dApps',
    'dapps.search': 'Buscar dApps...',
    'dapps.favorites': 'Favoritos',
    'dapps.all': 'Todos',
    'dapps.showing': 'Mostrando dApps compatibles con',
    'dapps.no_favorites': 'Sin favoritos aún',
    'dapps.no_favorites_desc': 'Marca dApps con ★ para acceder rápido',
    'dapps.not_found': 'No se encontraron dApps',
    'dapps.not_found_desc': 'Prueba con otra categoría',
    'dapps.install': 'Instalar Kairos Wallet',
    'dapps.install_desc': 'Acceso directo desde tu pantalla de inicio',

    // Quick Actions
    'action.send': 'Enviar',
    'action.receive': 'Recibir',
    'action.swap': 'Swap',
    'action.dapps': 'dApps',
    'action.nfts': 'NFTs',
    'action.contacts': 'Contactos',
    'action.buy': 'Comprar',
    'action.history': 'Historial',
    'action.settings': 'Ajustes',
  },

  en: {
    // Common
    'app.name': 'Kairos Wallet',
    'common.loading': 'Loading...',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.copy': 'Copy',
    'common.copied': 'Copied',
    'common.search': 'Search...',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.done': 'Done',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.close': 'Close',
    'common.retry': 'Retry',

    // Welcome
    'welcome.title': 'Welcome to Kairos Wallet',
    'welcome.subtitle': 'The next-generation decentralized wallet. Your keys, your crypto, your freedom.',
    'welcome.create': 'Create Wallet',
    'welcome.import': 'Import Wallet',
    'welcome.feat_security': 'Military-grade AES-256-GCM security',
    'welcome.feat_multichain': 'Multi-chain: BSC, ETH, Polygon & more',
    'welcome.feat_fast': 'Ultra-fast transactions',

    // Dashboard
    'dashboard.portfolio': 'Portfolio',
    'dashboard.send': 'Send',
    'dashboard.receive': 'Receive',
    'dashboard.swap': 'Swap',
    'dashboard.contacts': 'Contacts',
    'dashboard.history': 'History',
    'dashboard.tokens': 'Tokens',
    'dashboard.manage': 'Manage',
    'dashboard.no_tokens': 'No tokens yet',
    'dashboard.no_tokens_desc': 'Receive tokens or add custom tokens',

    // Send
    'send.title': 'Send',
    'send.recipient': 'Recipient address',
    'send.amount': 'Amount',
    'send.token': 'Token',
    'send.gas': 'Estimated gas',
    'send.confirm_send': 'Confirm & Send',
    'send.sending': 'Sending...',
    'send.sent': 'Transaction Sent!',
    'send.max': 'MAX',
    'send.invalid_address': 'Invalid address',
    'send.insufficient': 'Insufficient balance',
    'send.confirm_title': 'Confirm Send',
    'send.irreversible': 'Verify the recipient address. Blockchain transactions are irreversible.',

    // Receive
    'receive.title': 'Receive',
    'receive.scan_qr': 'Scan this QR code',
    'receive.copy_address': 'Copy address',
    'receive.address_copied': 'Address copied',

    // Swap
    'swap.title': 'Swap',
    'swap.sell': 'You sell',
    'swap.buy': 'You receive',
    'swap.balance': 'Balance',
    'swap.quoting': 'Getting quote...',
    'swap.select_tokens': 'Select tokens',
    'swap.enter_amount': 'Enter an amount',
    'swap.insufficient': 'Insufficient balance',
    'swap.no_liquidity': 'No liquidity for this pair',
    'swap.rate': 'Rate',
    'swap.impact': 'Price Impact',
    'swap.min_received': 'Minimum received',
    'swap.slippage': 'Slippage',
    'swap.route': 'Route',
    'swap.confirm': 'Confirm Swap',
    'swap.swapping': 'Executing swap...',
    'swap.success': 'Swap successful!',
    'swap.error': 'Swap error',
    'swap.high_impact': 'High price impact. You may lose significant value.',

    // Contacts
    'contacts.title': 'Contacts',
    'contacts.new': 'New contact',
    'contacts.edit': 'Edit contact',
    'contacts.search': 'Search by name or address...',
    'contacts.empty': 'No contacts yet',
    'contacts.empty_desc': 'Add frequent addresses',
    'contacts.add': 'Add contact',
    'contacts.name': 'Name',
    'contacts.address': 'Address',
    'contacts.notes': 'Notes (optional)',
    'contacts.delete_confirm': 'Delete contact?',
    'contacts.added': 'Contact added',
    'contacts.updated': 'Contact updated',
    'contacts.deleted': 'Contact deleted',

    // Settings
    'settings.title': 'Settings',
    'settings.accounts': 'My Wallets',
    'settings.explorer': 'View on Block Explorer',
    'settings.security': 'Security',
    'settings.encryption': 'AES-256-GCM + PBKDF2 600K',
    'settings.export_key': 'Export Private Key',
    'settings.requires_password': 'Requires password',
    'settings.autolock': 'Auto-Lock',
    'settings.biometric': 'Biometrics',
    'settings.biometric_on': 'Enabled',
    'settings.biometric_off': 'Disabled',
    'settings.general': 'General',
    'settings.danger': 'Danger',
    'settings.walletconnect': 'WalletConnect',
    'settings.connect_dapps': 'Connect dApps',
    'settings.network': 'Default Network',
    'settings.language': 'Language',
    'settings.about': 'About Kairos Wallet',
    'settings.lock': 'Lock Wallet',
    'settings.lock_desc': 'Close current session',
    'settings.delete': 'Delete Wallet',
    'settings.delete_desc': 'Requires seed phrase to restore',
    'settings.delete_confirm': '⚠️ DANGER: This will permanently delete your wallet.',

    // Token Detail
    'token.balance': 'Your balance',
    'token.stats': 'Statistics',
    'token.min': 'Minimum',
    'token.max': 'Maximum',

    // History
    'history.title': 'History',
    'history.empty': 'No transactions',
    'history.empty_desc': 'Your transactions will appear here',

    // Unlock
    'unlock.title': 'Unlock Kairos',
    'unlock.password': 'Password',
    'unlock.wrong_password': 'Wrong password',
    'unlock.unlock': 'Unlock',
    'unlock.enter_password': 'Enter your password to unlock',
    'unlock.decrypting': 'Decrypting...',

    // Create
    'create.title': 'Create Wallet',
    'create.set_password': 'Set a strong password',
    'create.seed_phrase': 'Seed phrase',
    'create.save_seed': 'Save your seed phrase in a safe place',
    'create.confirm_seed': 'Confirm your seed phrase',

    // WalletConnect
    'wc.title': 'WalletConnect',
    'wc.connect_dapp': 'Connect dApp',
    'wc.paste_uri': 'Paste WalletConnect URI',
    'wc.connect': 'Connect',
    'wc.active_sessions': 'Active sessions',
    'wc.no_connections': 'No connections',
    'wc.session_proposal': 'Connection request',
    'wc.approve': 'Approve',
    'wc.reject': 'Reject',
    'wc.connected': 'dApp connected',
    'wc.disconnected': 'dApp disconnected',

    // NFT
    'nft.title': 'NFTs',
    'nft.searching': 'Searching for your NFTs...',
    'nft.wait': 'This may take a few seconds',
    'nft.empty': 'No NFTs found',
    'nft.empty_desc': 'Your ERC-721 NFTs will appear here',
    'nft.contract': 'Contract',
    'nft.network': 'Network',
    'nft.attributes': 'Attributes',

    // dApps
    'dapps.title': 'Explore dApps',
    'dapps.search': 'Search dApps...',
    'dapps.favorites': 'Favorites',
    'dapps.all': 'All',
    'dapps.showing': 'Showing dApps compatible with',
    'dapps.no_favorites': 'No favorites yet',
    'dapps.no_favorites_desc': 'Mark dApps with ★ for quick access',
    'dapps.not_found': 'No dApps found',
    'dapps.not_found_desc': 'Try another category',
    'dapps.install': 'Install Kairos Wallet',
    'dapps.install_desc': 'Quick access from your home screen',

    // Quick Actions
    'action.send': 'Send',
    'action.receive': 'Receive',
    'action.swap': 'Swap',
    'action.dapps': 'dApps',
    'action.nfts': 'NFTs',
    'action.contacts': 'Contacts',
    'action.buy': 'Buy',
    'action.history': 'History',
    'action.settings': 'Settings',
  },
};

// ── i18n Singleton ──

let currentLang = null;

/**
 * Get current language
 */
export function getLanguage() {
  if (currentLang) return currentLang;
  
  const saved = localStorage.getItem(LANG_KEY);
  if (saved && translations[saved]) {
    currentLang = saved;
    return saved;
  }

  // Auto-detect from browser
  const browserLang = navigator.language?.split('-')[0] || 'es';
  currentLang = translations[browserLang] ? browserLang : 'es';
  return currentLang;
}

/**
 * Set language
 */
export function setLanguage(lang) {
  if (!translations[lang]) return;
  currentLang = lang;
  localStorage.setItem(LANG_KEY, lang);
  // Dispatch event for reactive updates
  window.dispatchEvent(new CustomEvent('kairos:language-changed', { detail: lang }));
}

/**
 * Translate a key
 */
export function t(key, fallback) {
  const lang = getLanguage();
  return translations[lang]?.[key] || translations.es?.[key] || fallback || key;
}

/**
 * Get available languages
 */
export function getAvailableLanguages() {
  return [
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
  ];
}

/**
 * React hook for language changes — triggers re-render on language switch
 */
export function useTranslation() {
  const [lang, setLangState] = useState(getLanguage);

  useEffect(() => {
    const handler = (e) => setLangState(e.detail || getLanguage());
    window.addEventListener('kairos:language-changed', handler);
    return () => window.removeEventListener('kairos:language-changed', handler);
  }, []);

  const tr = useCallback((key, fallback) => t(key, fallback), [lang]);

  return { t: tr, lang, setLang: setLanguage };
}
