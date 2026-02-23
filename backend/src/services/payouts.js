// ═══════════════════════════════════════════════════════════════════════════════
//  KairosCoin Backend — Payout Service (Stripe Connect)
//  Handles user onboarding + USD payouts when redeeming KAIROS
//
//  Flow:
//    1. User onboards once → creates Stripe Connect Express account
//    2. User redeems KAIROS → burn tokens → Transfer USD → Payout to bank
//
//  Supports:
//    • Instant Payout → debit card in ~30 seconds (1% + $0.50)
//    • Standard Payout → bank account in 1-2 days (free)
// ═══════════════════════════════════════════════════════════════════════════════

const config = require("../config");
const logger = require("../utils/logger");

let stripe = null;

function getStripe() {
  if (!stripe) {
    if (!config.stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }
    stripe = require("stripe")(config.stripeSecretKey);
  }
  return stripe;
}

// ═════════════════════════════════════════════════════════════════════════════
//  ONBOARDING — Create Stripe Connect Express Account
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Create a Stripe Connect Express account for a user.
 * Returns the account ID and an onboarding URL.
 *
 * @param {string} walletAddress - User's blockchain wallet address
 * @param {string} email - User's email (optional but recommended)
 * @param {string} returnUrl - URL to redirect after onboarding completes
 * @param {string} refreshUrl - URL to redirect if link expires
 * @returns {{ accountId: string, onboardingUrl: string }}
 */
async function createConnectedAccount(walletAddress, email, returnUrl, refreshUrl) {
  const s = getStripe();

  // Create Express account
  const account = await s.accounts.create({
    type: "express",
    email: email || undefined,
    metadata: {
      wallet_address: walletAddress,
      platform: "kairos",
    },
    capabilities: {
      transfers: { requested: true },
    },
    business_type: "individual",
    settings: {
      payouts: {
        schedule: { interval: "manual" }, // We control when payouts happen
      },
    },
  });

  logger.info("Stripe Connect account created", {
    accountId: account.id,
    walletAddress,
  });

  // Create onboarding link
  const accountLink = await s.accountLinks.create({
    account: account.id,
    refresh_url: refreshUrl || `${returnUrl}?refresh=true`,
    return_url: returnUrl || "https://kairos-wallet.netlify.app",
    type: "account_onboarding",
  });

  return {
    accountId: account.id,
    onboardingUrl: accountLink.url,
  };
}

/**
 * Generate a new onboarding link for an existing account
 * (in case the previous link expired)
 */
async function createOnboardingLink(accountId, returnUrl, refreshUrl) {
  const s = getStripe();

  const accountLink = await s.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl || `${returnUrl}?refresh=true`,
    return_url: returnUrl || "https://kairos-wallet.netlify.app",
    type: "account_onboarding",
  });

  return accountLink.url;
}

/**
 * Check if a connected account has completed onboarding
 * and is ready to receive payouts.
 */
async function getAccountStatus(accountId) {
  const s = getStripe();
  const account = await s.accounts.retrieve(accountId);

  return {
    accountId: account.id,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
    requirements: account.requirements?.currently_due || [],
    email: account.email,
    country: account.country,
    defaultCurrency: account.default_currency,
    // Can receive instant payouts?
    instantPayoutsSupported: account.capabilities?.instant_payouts === "active",
  };
}

// ═════════════════════════════════════════════════════════════════════════════
//  PAYOUT — Send USD to user's bank/debit card
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Transfer funds from Kairos platform balance to connected account,
 * then initiate a payout to the user's bank/debit card.
 *
 * @param {string} accountId - Stripe Connected Account ID
 * @param {number} amountUSD - Amount in USD (e.g. 100.00)
 * @param {string} redemptionId - Internal redemption ID for tracking
 * @param {string} method - 'instant' or 'standard'
 * @returns {{ transferId: string, payoutId: string, arrival: string }}
 */
async function sendPayout(accountId, amountUSD, redemptionId, method = "standard") {
  const s = getStripe();
  const amountCents = Math.round(amountUSD * 100);

  if (amountCents < 100) {
    throw new Error("Minimum payout is $1.00 USD");
  }

  // 1. Transfer from platform to connected account
  const transfer = await s.transfers.create({
    amount: amountCents,
    currency: "usd",
    destination: accountId,
    description: `KAIROS Redemption #${redemptionId}`,
    metadata: {
      redemption_id: redemptionId,
      kairos_amount: amountUSD.toString(),
      type: "kairos_redemption",
    },
  });

  logger.info("Transfer created", {
    transferId: transfer.id,
    accountId,
    amountUSD,
    redemptionId,
  });

  // 2. Initiate payout from connected account to bank/card
  let payout;
  try {
    payout = await s.payouts.create(
      {
        amount: amountCents,
        currency: "usd",
        method: method === "instant" ? "instant" : "standard",
        description: `KAIROS → USD Redemption`,
        metadata: {
          redemption_id: redemptionId,
        },
      },
      {
        stripeAccount: accountId, // Act on behalf of connected account
      }
    );

    logger.info("Payout initiated", {
      payoutId: payout.id,
      method: payout.method,
      arrival: payout.arrival_date,
      accountId,
      amountUSD,
    });
  } catch (payoutErr) {
    // If instant payout fails, fall back to standard
    if (method === "instant" && payoutErr.code === "balance_insufficient") {
      logger.warn("Instant payout failed, falling back to standard", {
        error: payoutErr.message,
      });
      payout = await s.payouts.create(
        {
          amount: amountCents,
          currency: "usd",
          method: "standard",
          description: `KAIROS → USD Redemption (standard fallback)`,
          metadata: { redemption_id: redemptionId },
        },
        { stripeAccount: accountId }
      );
    } else {
      throw payoutErr;
    }
  }

  return {
    transferId: transfer.id,
    payoutId: payout.id,
    method: payout.method,
    amount: amountUSD,
    arrival: payout.arrival_date
      ? new Date(payout.arrival_date * 1000).toISOString()
      : null,
    status: payout.status,
  };
}

/**
 * Check payout status
 */
async function getPayoutStatus(payoutId, accountId) {
  const s = getStripe();
  const payout = await s.payouts.retrieve(payoutId, {
    stripeAccount: accountId,
  });

  return {
    id: payout.id,
    status: payout.status, // pending, in_transit, paid, failed, canceled
    method: payout.method,
    amount: payout.amount / 100,
    arrival: payout.arrival_date
      ? new Date(payout.arrival_date * 1000).toISOString()
      : null,
    failureMessage: payout.failure_message,
  };
}

/**
 * Get platform balance (how much USD is available for payouts)
 */
async function getPlatformBalance() {
  const s = getStripe();
  const balance = await s.balance.retrieve();

  const available = balance.available.find((b) => b.currency === "usd");
  const pending = balance.pending.find((b) => b.currency === "usd");

  return {
    availableUSD: available ? available.amount / 100 : 0,
    pendingUSD: pending ? pending.amount / 100 : 0,
    instantAvailableUSD: balance.instant_available
      ? (balance.instant_available.find((b) => b.currency === "usd")?.amount || 0) / 100
      : 0,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
//                           EXPORTS
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
  createConnectedAccount,
  createOnboardingLink,
  getAccountStatus,
  sendPayout,
  getPayoutStatus,
  getPlatformBalance,
};
