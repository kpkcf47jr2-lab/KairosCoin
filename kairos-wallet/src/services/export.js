// ═══════════════════════════════════════════════════════
//  KAIROS WALLET — Export Service
//  Export TX history as CSV, contacts as JSON/vCard
// ═══════════════════════════════════════════════════════

import { CHAINS } from '../constants/chains';

/**
 * Export transactions to CSV and trigger download
 */
export function exportTransactionsCSV(transactions, chainId, address) {
  const chain = CHAINS[chainId];
  const headers = [
    'Hash', 'Date', 'Type', 'From', 'To', 'Value', 'Token',
    'Gas Used', 'Gas Price (Gwei)', 'Fee', 'Status', 'Block', 'Chain',
  ];

  const rows = transactions.map(tx => {
    const date = new Date(tx.timestamp || tx.timeStamp * 1000);
    const isIncoming = tx.to?.toLowerCase() === address.toLowerCase();
    const gasUsed = tx.gasUsed || tx.gas || '';
    const gasPriceGwei = tx.gasPrice ? (parseInt(tx.gasPrice) / 1e9).toFixed(2) : '';
    const fee = tx.gasUsed && tx.gasPrice
      ? ((parseInt(tx.gasUsed) * parseInt(tx.gasPrice)) / 1e18).toFixed(8)
      : '';

    return [
      tx.hash,
      date.toISOString(),
      isIncoming ? 'Recibido' : 'Enviado',
      tx.from,
      tx.to,
      tx.value || '0',
      tx.tokenSymbol || chain?.nativeCurrency?.symbol || '',
      gasUsed,
      gasPriceGwei,
      fee,
      tx.status === '0' || tx.isError === '1' ? 'Fallida' : 'Exitosa',
      tx.blockNumber || '',
      chain?.name || chainId,
    ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `kairos-txs-${chain?.shortName || chainId}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);

  return rows.length;
}

/**
 * Export contacts as JSON
 */
export function exportContactsJSON(contacts) {
  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    app: 'Kairos Wallet',
    contacts: contacts.map(c => ({
      name: c.name,
      address: c.address,
      notes: c.notes || '',
      chainId: c.chainId || null,
    })),
  };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `kairos-contacts-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);

  return contacts.length;
}

/**
 * Import contacts from JSON file
 * Returns array of contact objects
 */
export function parseContactsJSON(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    
    // Support our format
    if (data.contacts && Array.isArray(data.contacts)) {
      return data.contacts.filter(c => c.name && c.address);
    }
    
    // Support plain array format
    if (Array.isArray(data)) {
      return data.filter(c => c.name && c.address);
    }

    throw new Error('Formato no reconocido');
  } catch (err) {
    throw new Error('Error al parsear el archivo: ' + err.message);
  }
}

/**
 * Export portfolio snapshot
 */
export function exportPortfolioCSV(allocations, portfolioValue, chainName) {
  const headers = ['Token', 'Balance', 'Precio USD', 'Valor USD', '% Portfolio'];
  
  const rows = allocations.map(a => [
    a.symbol,
    a.balance.toFixed(8),
    a.price ? a.price.toFixed(6) : (a.value / a.balance).toFixed(6),
    a.value.toFixed(2),
    (a.pct * 100).toFixed(2) + '%',
  ].map(v => `"${v}"`).join(','));

  rows.push(`"TOTAL","","","${portfolioValue.toFixed(2)}","100%"`);

  const csv = [headers.join(','), ...rows].join('\n');
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `kairos-portfolio-${chainName}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
