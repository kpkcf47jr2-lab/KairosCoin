// ═══════════════════════════════════════════════════════
//  Kairos Trade — Dev Logger
//  Only logs in development mode, silent in production
// ═══════════════════════════════════════════════════════

const isDev = import.meta.env.DEV;

const devLog = (...args) => {
  if (isDev) console.log(...args);
};

const devWarn = (...args) => {
  if (isDev) console.warn(...args);
};

const devError = (...args) => {
  if (isDev) console.error(...args);
};

export { devLog, devWarn, devError };
export default { log: devLog, warn: devWarn, error: devError };
