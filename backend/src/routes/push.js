// ═══════════════════════════════════════════════════════
//  KAIROS BACKEND — Push Notification Routes
//  Web Push API subscription management + send
// ═══════════════════════════════════════════════════════

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// In-memory store (for production, move to Turso/SQLite)
const subscriptions = new Map(); // endpoint -> { subscription, address, preferences, createdAt }

// Generate VAPID keys at startup (deterministic from env or random)
let VAPID_KEYS;
try {
  const webpush = require('web-push');
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    VAPID_KEYS = {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
    };
  } else {
    VAPID_KEYS = webpush.generateVAPIDKeys();
    console.log('[Push] Generated VAPID keys (set env vars for persistence):');
    console.log(`  VAPID_PUBLIC_KEY=${VAPID_KEYS.publicKey}`);
    console.log(`  VAPID_PRIVATE_KEY=${VAPID_KEYS.privateKey}`);
  }

  webpush.setVapidDetails(
    'mailto:info@kairos-777.com',
    VAPID_KEYS.publicKey,
    VAPID_KEYS.privateKey
  );
} catch (err) {
  console.warn('[Push] web-push not installed, push notifications disabled. Run: npm i web-push');
  VAPID_KEYS = { publicKey: '', privateKey: '' };
}

// ── GET /vapid-key — Return public VAPID key ──
router.get('/vapid-key', (req, res) => {
  res.json({
    success: true,
    publicKey: VAPID_KEYS.publicKey,
  });
});

// ── POST /subscribe — Register push subscription ──
router.post('/subscribe', (req, res) => {
  try {
    const { subscription, address, preferences } = req.body;

    if (!subscription?.endpoint) {
      return res.status(400).json({ success: false, error: 'Invalid subscription' });
    }

    subscriptions.set(subscription.endpoint, {
      subscription,
      address: address?.toLowerCase() || '',
      preferences: preferences || {},
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    });

    console.log(`[Push] New subscription: ${subscription.endpoint.slice(0, 50)}... (${address?.slice(0, 10) || 'anon'})`);

    res.json({
      success: true,
      message: 'Subscription registered',
      totalSubscriptions: subscriptions.size,
    });
  } catch (err) {
    console.error('[Push] Subscribe error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to subscribe' });
  }
});

// ── POST /unsubscribe — Remove push subscription ──
router.post('/unsubscribe', (req, res) => {
  try {
    const { endpoint } = req.body;

    if (endpoint) {
      subscriptions.delete(endpoint);
      console.log(`[Push] Unsubscribed: ${endpoint.slice(0, 50)}...`);
    }

    res.json({ success: true, message: 'Unsubscribed' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to unsubscribe' });
  }
});

// ── PUT /preferences — Update notification preferences ──
router.put('/preferences', (req, res) => {
  try {
    const { endpoint, preferences } = req.body;

    const sub = subscriptions.get(endpoint);
    if (sub) {
      sub.preferences = preferences;
      sub.lastActive = new Date().toISOString();
      subscriptions.set(endpoint, sub);
    }

    res.json({ success: true, message: 'Preferences updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update preferences' });
  }
});

// ── POST /send — Send push notification (admin) ──
router.post('/send', async (req, res) => {
  try {
    // Simple API key check
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.MASTER_API_KEY) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { title, body, type, data, targetAddress } = req.body;

    if (!title || !body) {
      return res.status(400).json({ success: false, error: 'title and body required' });
    }

    let webpush;
    try {
      webpush = require('web-push');
    } catch {
      return res.status(503).json({ success: false, error: 'Push service not available' });
    }

    const payload = JSON.stringify({
      title,
      body,
      type: type || 'system',
      icon: '/icons/logo-192.png',
      badge: '/icons/favicon-32.png',
      tag: `kairos-${type || 'msg'}-${Date.now()}`,
      data: data || {},
      timestamp: Date.now(),
    });

    let sent = 0;
    let failed = 0;
    const failedEndpoints = [];

    for (const [endpoint, sub] of subscriptions.entries()) {
      // Filter by target address if specified
      if (targetAddress && sub.address !== targetAddress.toLowerCase()) continue;

      // Check category preference
      if (type && sub.preferences?.categories?.[type] === false) continue;

      try {
        await webpush.sendNotification(sub.subscription, payload);
        sent++;
        sub.lastActive = new Date().toISOString();
      } catch (err) {
        failed++;
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Subscription expired — remove it
          failedEndpoints.push(endpoint);
        }
      }
    }

    // Clean up expired subscriptions
    failedEndpoints.forEach((ep) => subscriptions.delete(ep));

    console.log(`[Push] Sent to ${sent}, failed ${failed}, cleaned ${failedEndpoints.length}`);

    res.json({
      success: true,
      sent,
      failed,
      cleaned: failedEndpoints.length,
      totalActive: subscriptions.size,
    });
  } catch (err) {
    console.error('[Push] Send error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /send-to-address — Send notification to specific wallet address (admin only) ──
router.post('/send-to-address', async (req, res) => {
  try {
    // Require admin API key for sending push to any address
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.API_MASTER_KEY) {
      return res.status(401).json({ success: false, error: 'Unauthorized - admin API key required' });
    }

    const { address, title, body, type, data } = req.body;

    if (!address || !title) {
      return res.status(400).json({ success: false, error: 'address and title required' });
    }

    let webpush;
    try {
      webpush = require('web-push');
    } catch {
      return res.status(503).json({ success: false, error: 'Push service not available' });
    }

    const payload = JSON.stringify({
      title,
      body: body || '',
      type: type || 'system',
      icon: '/icons/logo-192.png',
      badge: '/icons/favicon-32.png',
      tag: `kairos-${Date.now()}`,
      data: { ...data, targetAddress: address },
      timestamp: Date.now(),
    });

    let sent = 0;
    for (const [endpoint, sub] of subscriptions.entries()) {
      if (sub.address === address.toLowerCase()) {
        try {
          await webpush.sendNotification(sub.subscription, payload);
          sent++;
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            subscriptions.delete(endpoint);
          }
        }
      }
    }

    res.json({ success: true, sent });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /stats — Subscription stats (admin) ──
router.get('/stats', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.MASTER_API_KEY) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const allSubs = Array.from(subscriptions.values());
  const addresses = new Set(allSubs.map(s => s.address).filter(Boolean));

  res.json({
    success: true,
    data: {
      totalSubscriptions: subscriptions.size,
      uniqueAddresses: addresses.size,
      categoryBreakdown: {
        transactions: allSubs.filter(s => s.preferences?.categories?.transactions !== false).length,
        priceAlerts: allSubs.filter(s => s.preferences?.categories?.priceAlerts !== false).length,
        security: allSubs.filter(s => s.preferences?.categories?.security !== false).length,
        staking: allSubs.filter(s => s.preferences?.categories?.staking !== false).length,
        marketing: allSubs.filter(s => s.preferences?.categories?.marketing === true).length,
      },
    },
  });
});

module.exports = { router };
