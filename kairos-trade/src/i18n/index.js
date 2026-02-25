// Kairos Trade — i18n index
import es from './es';
import en from './en';

export const translations = { es, en };

/**
 * Get a nested translation value by dot-notation key.
 * e.g. t('sidebar.kairos') → 'Kairos'
 */
export function getTranslation(lang, key) {
  const dict = translations[lang] || translations.es;
  const parts = key.split('.');
  let val = dict;
  for (const p of parts) {
    val = val?.[p];
    if (val === undefined) break;
  }
  // Fallback to Spanish if key not found in current lang
  if (val === undefined) {
    val = translations.es;
    for (const p of parts) {
      val = val?.[p];
      if (val === undefined) break;
    }
  }
  return val ?? key;
}
