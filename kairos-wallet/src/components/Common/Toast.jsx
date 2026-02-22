// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Toast Notifications
// ═══════════════════════════════════════════════════════

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, AlertTriangle, Info, X } from 'lucide-react';
import { useStore } from '../../store/useStore';

const icons = {
  success: <Check size={16} className="text-green-400" />,
  error: <AlertTriangle size={16} className="text-red-400" />,
  info: <Info size={16} className="text-blue-400" />,
};

const colors = {
  success: 'border-green-500/30 bg-green-500/10',
  error: 'border-red-500/30 bg-red-500/10',
  info: 'border-blue-500/30 bg-blue-500/10',
};

export default function Toast() {
  const toastMessage = useStore(s => s.toastMessage);

  return (
    <AnimatePresence>
      {toastMessage && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed top-12 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[90%]"
        >
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border backdrop-blur-xl ${colors[toastMessage.type] || colors.info}`}>
            {icons[toastMessage.type] || icons.info}
            <span className="text-sm text-white flex-1">{toastMessage.message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
