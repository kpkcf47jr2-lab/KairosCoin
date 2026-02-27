// Kairos Trade — Native Capacitor Initialization
// Handles StatusBar, SplashScreen, Keyboard, Back Button, and Haptics
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const isNative = Capacitor.isNativePlatform();

export async function initNative() {
  if (!isNative) return;

  try {
    // Dark status bar matching app theme
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#08090C' });
  } catch {}

  try {
    // Handle Android back button — go back in history or minimize
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.minimizeApp();
      }
    });
  } catch {}

  try {
    // Keyboard listeners for better UX
    Keyboard.addListener('keyboardWillShow', () => {
      document.body.classList.add('keyboard-open');
    });
    Keyboard.addListener('keyboardWillHide', () => {
      document.body.classList.remove('keyboard-open');
    });
  } catch {}

  // Hide splash after app is interactive
  try {
    await SplashScreen.hide({ fadeOutDuration: 500 });
  } catch {}
}

// Haptic feedback helpers
export async function hapticLight() {
  if (!isNative) return;
  try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
}

export async function hapticMedium() {
  if (!isNative) return;
  try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch {}
}

export async function hapticHeavy() {
  if (!isNative) return;
  try { await Haptics.impact({ style: ImpactStyle.Heavy }); } catch {}
}

export { isNative };
