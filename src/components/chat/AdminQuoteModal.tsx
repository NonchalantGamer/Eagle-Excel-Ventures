import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, ShieldCheck, DollarSign, Send, Calculator } from 'lucide-react';
import { ChatQuoteData, ChatQuoteItem, Product } from '../../types';
import { getCachedProducts } from '../../services/productService';
import { useCurrency } from '../../context/CurrencyContext';
import { useToast } from '../Toast';
import { useModalFocusLock } from '../../hooks/useModalFocusLock';

interface AdminQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName: string;
  onSendQuote: (quote: ChatQuoteData) => void;
}

export const AdminQuoteModal: React.FC<AdminQuoteModalProps> = ({
  isOpen,
  onClose,
  customerName,
  onSendQuote
}) => {
  const { formatPrice } = useCurrency();
  const { showToast } = useToast();
  const catalogProducts = getCachedProducts();

  useModalFocusLock(isOpen, onClose);

  const [items, setItems] = useState<ChatQuoteItem[]>([
    {
      name: catalogProducts[0]?.name || 'Industrial Equipment Unit',
      sku: catalogProducts[0]?.sku || 'EE-IND-001',
      quantity: 100,
      unitPrice: catalogProducts[0]?.price || 49.99,
      subtotal: (catalogProducts[0]?.price || 49.99) * 100
    }
  ]);

  const [validDays, setValidDays] = useState(14);
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Commercial Invoice (Approved Account)');
  const [freightTerms, setFreightTerms] = useState('CIF Lagos / Douala Port (Customs Cleared)');
  const [notes, setNotes] = useState('Tiered discount applied for container batch. Palletization and inspection certs included.');

  if (!isOpen) return null;

  const handleItemChange = (index: number, field: keyof ChatQuoteItem, val: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: val };
    if (field === 'quantity' || field === 'unitPrice') {
      updated[index].subtotal = Number(updated[index].quantity) * Number(updated[index].unitPrice);
    }
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        name: 'Custom Wholesale Line Item',
        sku: `EE-CUSTOM-${Date.now().toString().slice(-4)}`,
        quantity: 50,
        unitPrice: 29.99,
        subtotal: 1499.5
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      showToast('A quotation must contain at least one item.', 'warning');
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const grandTotal = items.reduce((acc, curr) => acc + curr.subtotal, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || grandTotal <= 0) {
      showToast('Please add valid line items and pricing', 'error');
      return;
    }

    const quoteRef = `PQ-${Date.now().toString().slice(-6)}`;
    const quote: ChatQuoteData = {
      quoteRef,
      items,
      grandTotal,
      validDays,
      paymentTerms,
      freightTerms,
      notes
    };

    onSendQuote(quote);
    showToast(`Quotation #${quoteRef} dispatched to ${customerName}`, 'success');
    onClose();
  };

  return createPortal(
    <div 
      data-portal-modal="true"
      className="fixed inset-0 z-[99999] isolate flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl bg-white dark:bg-[#161616] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#F27D26]/10 text-[#F27D26] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Issue Pro-Forma Wholesale Quotation</h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">Recipient: <span className="text-[#F27D26] font-semibold">{customerName}</span></p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          
          {/* Line items section */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="font-bold text-slate-900 dark:text-white">Line Items & Discounted Unit Rates</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-[11px] text-[#F27D26] hover:underline font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Line
              </button>
            </div>

            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={e => handleItemChange(idx, 'name', e.target.value)}
                      placeholder="Item Description"
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white"
                      required
                    />
                    <input
                      type="text"
                      value={item.sku}
                      onChange={e => handleItemChange(idx, 'sku', e.target.value)}
                      placeholder="SKU"
                      className="w-28 px-3 py-1.5 font-mono bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400">Qty:</span>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
                        className="w-full px-2.5 py-1 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white font-mono"
                        required
                      />
                    </div>
                    <div className="flex-1 flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400">Unit $:</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={item.unitPrice}
                        onChange={e => handleItemChange(idx, 'unitPrice', Number(e.target.value))}
                        className="w-full px-2.5 py-1 bg-white dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white font-mono"
                        required
                      />
                    </div>
                    <div className="text-right font-bold text-slate-900 dark:text-white font-mono text-xs pr-1">
                      = {formatPrice(item.subtotal)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grand total highlight */}
          <div className="p-3 bg-[#F27D26]/10 border border-[#F27D26]/20 rounded-2xl flex justify-between items-center">
            <span className="font-bold text-slate-900 dark:text-white">Commercial Quote Total:</span>
            <span className="font-black text-base text-[#F27D26] font-mono">
              {formatPrice(grandTotal)}
            </span>
          </div>

          {/* Terms & Conditions */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Payment Terms</label>
              <select
                value={paymentTerms}
                onChange={e => setPaymentTerms(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white"
              >
                <option value="Net 30 Commercial Invoice (Approved Account)">Net 30 Commercial Invoice</option>
                <option value="Wire Transfer / Bank T/T (Pre-dispatch)">Wire Transfer / T/T</option>
                <option value="50% Deposit / 50% upon Bill of Lading">50% Advance / 50% upon B/L</option>
                <option value="Cash on Delivery (Warehouse Pickup)">Cash on Delivery (COD)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Freight / IncoTerms</label>
              <select
                value={freightTerms}
                onChange={e => setFreightTerms(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white"
              >
                <option value="CIF Lagos / Douala Port (Customs Cleared)">CIF Lagos / Douala Port</option>
                <option value="FOB Guangzhou / Ningbo Factory Hub">FOB China Hub</option>
                <option value="Door-to-Door Container Freight (Palletized)">Door-to-Door Container</option>
                <option value="Air Cargo Expedited (3-5 Business Days)">Air Cargo Expedited</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Validity Period</label>
              <select
                value={validDays}
                onChange={e => setValidDays(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white"
              >
                <option value={7}>7 Days</option>
                <option value={14}>14 Days</option>
                <option value={30}>30 Days</option>
                <option value={60}>60 Days</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-zinc-300 mb-1">Special Notes / Discount Code</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Free pallet wrap, includes customs duty clearance"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 font-bold hover:bg-slate-100 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="py-2.5 px-5 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-extrabold flex items-center gap-2 transition-all shadow-md btn-hover"
            >
              <Send className="w-4 h-4" />
              Dispatch Official Quote
            </button>
          </div>

        </form>

      </div>
    </div>,
    document.body
  );
};
