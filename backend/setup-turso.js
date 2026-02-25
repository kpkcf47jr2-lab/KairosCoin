// Temporary setup script — creates tables and admin account on Turso
require('dotenv').config();
const config = require('./src/config');
const db = require('./src/services/database');
const auth = require('./src/services/authService');
const ref = require('./src/services/referralService');

// Initialize all services with Turso
db.initialize();
auth.initialize();
ref.initialize();

console.log('All services initialized on Turso cloud!');

async function createAdmin() {
  try {
    const result = await auth.register({
      email: 'info@kairos-777.com',
      password: 'InGodwetrustIsaias5213$',
      name: 'Mario Isaac',
      ip: '127.0.0.1',
      userAgent: 'Setup Script'
    });
    console.log('Admin account created:', result.user.email, result.user.role);
  } catch (e) {
    console.log('Registration result:', e.message);
    if (e.message.includes('already registered')) {
      const result = await auth.forceResetPassword('info@kairos-777.com', 'InGodwetrustIsaias5213$');
      console.log('Password reset:', result);
    }
  }
}

createAdmin().then(() => {
  console.log('Setup complete!');
  process.exit(0);
}).catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
