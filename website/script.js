/* ═══════════════════════════════════════════════════════════════════════════
   Kairos Coin — Website JavaScript
   "In God We Trust"
   ═══════════════════════════════════════════════════════════════════════════ */

// ── Copy contract address ──────────────────────────────────────────────────
function copyAddress() {
  const addr = document.getElementById('contractAddr').textContent;
  navigator.clipboard.writeText(addr).then(() => {
    const btn = document.querySelector('.copy-btn');
    const original = btn.textContent;
    btn.textContent = 'Copied!';
    btn.style.background = 'rgba(34, 197, 94, 0.2)';
    btn.style.borderColor = '#22C55E';
    btn.style.color = '#22C55E';
    setTimeout(() => {
      btn.textContent = original;
      btn.style.background = '';
      btn.style.borderColor = '';
      btn.style.color = '';
    }, 2000);
  });
}

// ── Add token to MetaMask/Trust Wallet ─────────────────────────────────────
async function addToWallet() {
  if (typeof window.ethereum !== 'undefined') {
    try {
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: '0x14D41707269c7D8b8DFa5095b38824a46dA05da3',
            symbol: 'KAIROS',
            decimals: 18,
            image: 'https://kairos-777.com/kairos-logo.png',
          },
        },
      });
    } catch (error) {
      console.error('Error adding token:', error);
    }
  } else {
    // No wallet extension — open Kairos Wallet
    window.open('https://kairos-wallet.netlify.app', '_blank');
  }
}

// ── Navbar scroll effect ───────────────────────────────────────────────────
const navbar = document.getElementById('navbar');
let lastScroll = 0;

window.addEventListener('scroll', () => {
  const currentScroll = window.pageYOffset;
  
  if (currentScroll > 50) {
    navbar.style.background = 'rgba(13, 13, 13, 0.95)';
    navbar.style.borderBottomColor = 'rgba(212, 175, 55, 0.15)';
  } else {
    navbar.style.background = 'rgba(13, 13, 13, 0.85)';
    navbar.style.borderBottomColor = 'rgba(212, 175, 55, 0.1)';
  }
  
  lastScroll = currentScroll;
});

// ── Mobile menu toggle ─────────────────────────────────────────────────────
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');

if (navToggle) {
  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.style.display === 'flex';
    navLinks.style.display = isOpen ? 'none' : 'flex';
    navLinks.style.position = 'absolute';
    navLinks.style.top = '72px';
    navLinks.style.left = '0';
    navLinks.style.right = '0';
    navLinks.style.background = 'rgba(13, 13, 13, 0.98)';
    navLinks.style.flexDirection = 'column';
    navLinks.style.alignItems = 'center';
    navLinks.style.padding = '24px 0';
    navLinks.style.gap = '20px';
    navLinks.style.borderBottom = '1px solid rgba(212, 175, 55, 0.15)';
  });
}

// ── Close mobile menu on link click ────────────────────────────────────────
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      navLinks.style.display = 'none';
    }
  });
});

// ── Scroll animations (Intersection Observer) ─────────────────────────────
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, observerOptions);

// Add fade-in class to animated elements
document.addEventListener('DOMContentLoaded', () => {
  const animatedElements = document.querySelectorAll(
    '.about-card, .feature-row, .token-card, .timeline-item, .contract-card, .section-header'
  );
  
  animatedElements.forEach((el, index) => {
    el.classList.add('fade-in');
    el.style.transitionDelay = `${index % 6 * 0.1}s`;
    observer.observe(el);
  });
});

// ── Smooth scroll for all anchor links ─────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});
