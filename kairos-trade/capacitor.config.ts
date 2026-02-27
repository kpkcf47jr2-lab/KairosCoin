import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kairos777.trade',
  appName: 'Kairos 777',
  webDir: 'dist',
  
  // Production server (loads from built files for App Store)
  // Uncomment below for live-reload during development:
  // server: { url: 'http://192.168.x.x:5173', cleartext: true },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 500,
      backgroundColor: '#08090C',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#08090C',
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
    backgroundColor: '#08090C',
    preferredContentMode: 'mobile',
    scheme: 'Kairos 777',
  },

  android: {
    backgroundColor: '#08090C',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
