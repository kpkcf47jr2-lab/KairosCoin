// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Price Alerts Service
//  Set price targets, get notified — MetaMask can't do this
// ═══════════════════════════════════════════════════════

const ALERTS_KEY = 'kairos_price_alerts';
const TRIGGERED_KEY = 'kairos_triggered_alerts';

/**
 * Alert structure:
 * { id, tokenSymbol, tokenAddress, chainId, condition: 'above'|'below',
 *   targetPrice, currentPrice, createdAt, active }
 */

export function getAlerts() {
  try {
    return JSON.parse(localStorage.getItem(ALERTS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function getTriggeredAlerts() {
  try {
    return JSON.parse(localStorage.getItem(TRIGGERED_KEY) || '[]');
  } catch {
    return [];
  }
}

export function addAlert({ tokenSymbol, tokenAddress, chainId, condition, targetPrice, currentPrice }) {
  const alerts = getAlerts();
  const alert = {
    id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    tokenSymbol,
    tokenAddress,
    chainId,
    condition,
    targetPrice: parseFloat(targetPrice),
    currentPrice: parseFloat(currentPrice),
    createdAt: Date.now(),
    active: true,
  };
  alerts.push(alert);
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
  return alert;
}

export function removeAlert(id) {
  const alerts = getAlerts().filter(a => a.id !== id);
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
}

export function toggleAlert(id) {
  const alerts = getAlerts();
  const alert = alerts.find(a => a.id === id);
  if (alert) alert.active = !alert.active;
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
}

/**
 * Check all active alerts against current prices
 * @param {Object} prices - { 'symbol': priceUSD } map
 * @returns {Array} triggered alerts
 */
export function checkAlerts(prices) {
  const alerts = getAlerts();
  const triggered = [];
  const triggeredHistory = getTriggeredAlerts();

  for (const alert of alerts) {
    if (!alert.active) continue;
    const currentPrice = prices[alert.tokenSymbol.toLowerCase()] ||
                         prices[alert.tokenAddress?.toLowerCase()];
    
    if (!currentPrice) continue;

    let isTriggered = false;
    if (alert.condition === 'above' && currentPrice >= alert.targetPrice) {
      isTriggered = true;
    } else if (alert.condition === 'below' && currentPrice <= alert.targetPrice) {
      isTriggered = true;
    }

    if (isTriggered) {
      alert.active = false;
      alert.triggeredAt = Date.now();
      alert.triggeredPrice = currentPrice;
      triggered.push(alert);
      triggeredHistory.unshift(alert);
    }
  }

  if (triggered.length > 0) {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
    localStorage.setItem(TRIGGERED_KEY, JSON.stringify(triggeredHistory.slice(0, 50)));

    // Browser notification if available
    if ('Notification' in window && Notification.permission === 'granted') {
      for (const t of triggered) {
        new Notification(`🔔 Alerta: ${t.tokenSymbol}`, {
          body: `${t.tokenSymbol} ${t.condition === 'above' ? 'superó' : 'bajó de'} $${t.targetPrice} → $${t.triggeredPrice.toFixed(4)}`,
          icon: '/icons/logo-128.png',
        });
      }
    }
  }

  return triggered;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    const result = await Notification.requestPermission();
    return result === 'granted';
  }
  return Notification.permission === 'granted';
}

/**
 * Get active alert count
 */
export function getActiveAlertCount() {
  return getAlerts().filter(a => a.active).length;
}
