// Kairos Trade — useTranslation hook
import { useCallback } from 'react';
import useStore from '../store/useStore';
import { getTranslation } from '../i18n';

/**
 * Returns { t, lang, setLang }
 *  - t('sidebar.kairos') → translated string
 *  - lang → 'es' | 'en'
 *  - setLang('en') → switches language
 */
export default function useTranslation() {
  const lang = useStore((s) => s.settings?.language || 'es');
  const updateSettings = useStore((s) => s.updateSettings);

  const t = useCallback(
    (key) => {
      const val = getTranslation(lang, key);
      // Double safety — ensure JSX always receives a renderable value
      return (typeof val === 'string' || typeof val === 'number') ? val : String(key);
    },
    [lang]
  );

  const setLang = useCallback(
    (newLang) => updateSettings({ language: newLang }),
    [updateSettings]
  );

  return { t, lang, setLang };
}
