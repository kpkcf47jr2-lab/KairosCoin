// Temporary script to check Stripe account status
require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });

const sk = process.env.STRIPE_SECRET_KEY;
if (!sk) { console.log('No STRIPE_SECRET_KEY found'); process.exit(1); }

const stripe = require('stripe')(sk);

(async () => {
  try {
    const account = await stripe.accounts.retrieve();
    console.log('=== STRIPE ACCOUNT STATUS ===');
    console.log('Account ID:       ', account.id);
    console.log('Business Name:    ', account.business_profile?.name || '(not set)');
    console.log('Country:          ', account.country);
    console.log('Charges Enabled:  ', account.charges_enabled);
    console.log('Payouts Enabled:  ', account.payouts_enabled);
    console.log('Details Submitted:', account.details_submitted);
    console.log('Default Currency: ', account.default_currency);
    console.log('');
    const req = account.requirements || {};
    console.log('--- Requirements ---');
    console.log('Currently Due:    ', JSON.stringify(req.currently_due || []));
    console.log('Eventually Due:   ', JSON.stringify(req.eventually_due || []));
    console.log('Past Due:         ', JSON.stringify(req.past_due || []));
    console.log('Disabled Reason:  ', req.disabled_reason || 'none');
    if (req.errors?.length) {
      console.log('Errors:');
      req.errors.forEach(e => console.log('  -', e.code, ':', e.reason, '→', e.requirement));
    }
    console.log('');
    console.log('--- Capabilities ---');
    const caps = account.capabilities || {};
    Object.entries(caps).forEach(([k, v]) => console.log(' ', k + ':', v));
  } catch (err) {
    console.error('Stripe API error:', err.message);
  }
})();
