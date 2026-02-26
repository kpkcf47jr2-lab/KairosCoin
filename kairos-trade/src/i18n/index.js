// Kairos Trade — i18n index
import es from './es';
import en from './en';

export const translations = { es, en };

/**
 * Get a nested translation value by dot-notation key.
 * e.g. t('sidebar.kairos') → 'Kairos'
 * SAFETY: Always returns a string or number — never an object.
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
  const result = val ?? key;
  // Guard: never return objects/arrays — they crash React rendering
  if (typeof result === 'string' || typeof result === 'number') {
    return result;
  }
  console.warn('[i18n] Key resolved to non-primitive:', key, typeof result);
  return key;
}
