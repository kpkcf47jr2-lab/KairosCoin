// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Contacts Service
//  Persistent address book with labels & chains
// ═══════════════════════════════════════════════════════

import { STORAGE_KEYS } from '../constants/chains';

/**
 * Load all contacts from localStorage
 */
export function getContacts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONTACTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save contacts to localStorage
 */
function saveContacts(contacts) {
  localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(contacts));
}

/**
 * Add a new contact
 */
export function addContact({ name, address, notes = '', chainId = null }) {
  const contacts = getContacts();
  
  // Check for duplicate address
  const exists = contacts.some(c => c.address.toLowerCase() === address.toLowerCase());
  if (exists) throw new Error('Esta dirección ya existe en tus contactos');
  
  const contact = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: name.trim(),
    address: address.trim(),
    notes: notes.trim(),
    chainId,
    createdAt: Date.now(),
    lastUsed: null,
  };
  
  contacts.unshift(contact);
  saveContacts(contacts);
  return contact;
}

/**
 * Update an existing contact
 */
export function updateContact(id, updates) {
  const contacts = getContacts();
  const index = contacts.findIndex(c => c.id === id);
  if (index === -1) throw new Error('Contacto no encontrado');
  
  if (updates.address) {
    const duplicate = contacts.some(
      c => c.id !== id && c.address.toLowerCase() === updates.address.toLowerCase()
    );
    if (duplicate) throw new Error('Esta dirección ya existe');
  }
  
  contacts[index] = { ...contacts[index], ...updates };
  saveContacts(contacts);
  return contacts[index];
}

/**
 * Delete a contact
 */
export function deleteContact(id) {
  const contacts = getContacts().filter(c => c.id !== id);
  saveContacts(contacts);
}

/**
 * Mark contact as last used
 */
export function touchContact(id) {
  const contacts = getContacts();
  const index = contacts.findIndex(c => c.id === id);
  if (index !== -1) {
    contacts[index].lastUsed = Date.now();
    saveContacts(contacts);
  }
}

/**
 * Search contacts by name or address
 */
export function searchContacts(query) {
  const contacts = getContacts();
  if (!query) return contacts;
  const q = query.toLowerCase();
  return contacts.filter(
    c => c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q)
  );
}

/**
 * Find contact by address
 */
export function findContactByAddress(address) {
  return getContacts().find(c => c.address.toLowerCase() === address.toLowerCase()) || null;
}

/**
 * Get contacts sorted by most recently used
 */
export function getRecentContacts(limit = 5) {
  return getContacts()
    .filter(c => c.lastUsed)
    .sort((a, b) => b.lastUsed - a.lastUsed)
    .slice(0, limit);
}
