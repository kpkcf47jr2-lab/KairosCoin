import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kairos777.wallet',
  appName: 'Kairos Wallet',
  webDir: 'dist',

  // Production server (loads from built files for App Store)
  // Uncomment below for live-reload during development:
  // server: { url: 'http://192.168.x.x:5173', cleartext: true },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 500,
      backgroundColor: '#0A0B0F',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0A0B0F',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'body' as any,
      resizeOnFullScreen: true,
    },
  },

  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    backgroundColor: '#0A0B0F',
    preferredContentMode: 'mobile',
    scheme: 'Kairos Wallet',
  },

  android: {
    backgroundColor: '#0A0B0F',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
