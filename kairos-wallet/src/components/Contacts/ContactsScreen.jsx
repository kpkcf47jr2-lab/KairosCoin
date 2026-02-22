// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Contacts Screen
//  Address book with add, edit, delete, search, import
// ═══════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Search, Edit2, Trash2, Copy, Check,
  X, User, Send, BookOpen, Star,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { isValidAddress, formatAddress } from '../../services/wallet';
import {
  getContacts, addContact, updateContact, deleteContact, searchContacts,
} from '../../services/contacts';

export default function ContactsScreen() {
  const { goBack, navigate, showToast } = useStore();

  const [contacts, setContacts] = useState(getContacts());
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Modal state
  const [modal, setModal] = useState(null); // null | 'add' | 'edit' | 'delete'
  const [editContact, setEditContact] = useState(null);
  const [form, setForm] = useState({ name: '', address: '', notes: '' });
  const [formError, setFormError] = useState('');

  // Filtered contacts
  const filteredContacts = useMemo(() => {
    if (!searchQuery) return contacts;
    return searchContacts(searchQuery);
  }, [contacts, searchQuery]);

  // ── Refresh contacts list ──
  const refresh = () => setContacts(getContacts());

  // ── Copy address ──
  const copyAddress = (contact) => {
    navigator.clipboard.writeText(contact.address);
    setCopiedId(contact.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Open add modal ──
  const openAdd = () => {
    setForm({ name: '', address: '', notes: '' });
    setFormError('');
    setModal('add');
  };

  // ── Open edit modal ──
  const openEdit = (contact) => {
    setEditContact(contact);
    setForm({ name: contact.name, address: contact.address, notes: contact.notes || '' });
    setFormError('');
    setModal('edit');
  };

  // ── Open delete confirmation ──
  const openDelete = (contact) => {
    setEditContact(contact);
    setModal('delete');
  };

  // ── Save contact (add or edit) ──
  const saveContact = () => {
    setFormError('');

    if (!form.name.trim()) {
      setFormError('Ingresa un nombre');
      return;
    }
    if (!isValidAddress(form.address)) {
      setFormError('Dirección inválida');
      return;
    }

    try {
      if (modal === 'add') {
        addContact(form);
        showToast('Contacto agregado', 'success');
      } else {
        updateContact(editContact.id, form);
        showToast('Contacto actualizado', 'success');
      }
      refresh();
      setModal(null);
    } catch (err) {
      setFormError(err.message);
    }
  };

  // ── Confirm delete ──
  const confirmDelete = () => {
    deleteContact(editContact.id);
    showToast('Contacto eliminado', 'success');
    refresh();
    setModal(null);
  };

  // ── Send to contact ──
  const sendToContact = (contact) => {
    // Navigate to send screen with pre-filled address
    navigate('send');
    // We'll use a small timeout to ensure the send screen is mounted
    setTimeout(() => {
      const event = new CustomEvent('kairos:prefill-address', { detail: contact.address });
      window.dispatchEvent(event);
    }, 300);
  };

  return (
    <div className="screen-container">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4">
        <button onClick={goBack} className="p-2 -ml-2 rounded-xl hover:bg-white/5">
          <ArrowLeft size={20} className="text-dark-300" />
        </button>
        <h1 className="font-bold text-white">Contactos</h1>
        <button onClick={openAdd} className="p-2 -mr-2 rounded-xl hover:bg-white/5">
          <Plus size={20} className="text-kairos-400" />
        </button>
      </div>

      {/* ── Search ── */}
      <div className="px-5 mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o dirección..."
            className="w-full bg-white/[0.04] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-dark-500 outline-none border border-white/5 focus:border-kairos-500/50"
          />
        </div>
      </div>

      {/* ── Contact List ── */}
      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {filteredContacts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <BookOpen size={24} className="text-dark-400" />
            </div>
            <p className="text-dark-400 text-sm mb-1">
              {searchQuery ? 'No se encontraron contactos' : 'Sin contactos aún'}
            </p>
            <p className="text-dark-500 text-xs mb-4">
              {searchQuery ? 'Intenta con otra búsqueda' : 'Agrega direcciones frecuentes'}
            </p>
            {!searchQuery && (
              <button
                onClick={openAdd}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-kairos-500/10 text-kairos-400 text-sm"
              >
                <Plus size={14} />
                Agregar contacto
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredContacts.map((contact, i) => (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-white/[0.03] rounded-xl p-3 border border-white/5 hover:border-white/10 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-kairos-500/20 to-purple-500/20 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-kairos-400">
                      {contact.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white truncate">{contact.name}</span>
                    </div>
                    <span className="text-xs text-dark-400 font-mono">
                      {formatAddress(contact.address, 8)}
                    </span>
                    {contact.notes && (
                      <p className="text-[10px] text-dark-500 mt-1 truncate">{contact.notes}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => copyAddress(contact)}
                      className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                      title="Copiar dirección"
                    >
                      {copiedId === contact.id ? (
                        <Check size={14} className="text-green-400" />
                      ) : (
                        <Copy size={14} className="text-dark-400" />
                      )}
                    </button>
                    <button
                      onClick={() => sendToContact(contact)}
                      className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                      title="Enviar"
                    >
                      <Send size={14} className="text-blue-400" />
                    </button>
                    <button
                      onClick={() => openEdit(contact)}
                      className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={14} className="text-dark-400" />
                    </button>
                    <button
                      onClick={() => openDelete(contact)}
                      className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={14} className="text-red-400/60" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ══════════ MODALS ══════════ */}

      {/* ── Add / Edit Modal ── */}
      <AnimatePresence>
        {(modal === 'add' || modal === 'edit') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-dark-950/95 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between px-5 py-4">
              <h2 className="font-bold text-white">
                {modal === 'add' ? 'Nuevo contacto' : 'Editar contacto'}
              </h2>
              <button onClick={() => setModal(null)} className="p-2 rounded-xl hover:bg-white/5">
                <X size={20} className="text-dark-300" />
              </button>
            </div>

            <div className="px-5 space-y-4">
              {/* Name */}
              <div>
                <label className="text-xs text-dark-400 mb-1.5 block">Nombre</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="ej: Binance, Amigo, Exchange"
                  className="w-full bg-white/[0.04] rounded-xl px-4 py-3 text-sm text-white placeholder-dark-500 outline-none border border-white/5 focus:border-kairos-500/50"
                  autoFocus
                />
              </div>

              {/* Address */}
              <div>
                <label className="text-xs text-dark-400 mb-1.5 block">Dirección</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="0x..."
                  className="w-full bg-white/[0.04] rounded-xl px-4 py-3 text-sm text-white placeholder-dark-500 outline-none border border-white/5 focus:border-kairos-500/50 font-mono text-xs"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-dark-400 mb-1.5 block">Notas (opcional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Notas adicionales..."
                  rows={2}
                  className="w-full bg-white/[0.04] rounded-xl px-4 py-3 text-sm text-white placeholder-dark-500 outline-none border border-white/5 focus:border-kairos-500/50 resize-none"
                />
              </div>

              {/* Error */}
              {formError && (
                <p className="text-red-400 text-xs">{formError}</p>
              )}

              {/* Submit */}
              <button
                onClick={saveContact}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-kairos-500 to-kairos-400 text-dark-950 font-bold text-sm"
              >
                {modal === 'add' ? 'Agregar' : 'Guardar'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation Modal ── */}
      <AnimatePresence>
        {modal === 'delete' && editContact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-dark-950/80 backdrop-blur-xl flex items-center justify-center px-5"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-dark-800 rounded-2xl p-6 border border-white/10"
            >
              <div className="text-center mb-5">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                  <Trash2 size={24} className="text-red-400" />
                </div>
                <h3 className="font-bold text-white text-lg">¿Eliminar contacto?</h3>
                <p className="text-xs text-dark-400 mt-1">
                  Se eliminará "{editContact.name}" permanentemente.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setModal(null)}
                  className="flex-1 py-3 rounded-xl bg-white/[0.06] text-dark-300 font-medium text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm"
                >
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
