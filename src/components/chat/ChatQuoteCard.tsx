import React from 'react';
import { FileText, ShieldCheck, Printer, Calendar, ArrowRight, DollarSign } from 'lucide-react';
import { ChatQuoteData } from '../../types';
import { useCurrency } from '../../context/CurrencyContext';

interface ChatQuoteCardProps {
  quote: ChatQuoteData;
  isMe?: boolean;
}

export const ChatQuoteCard: React.FC<ChatQuoteCardProps> = ({ quote, isMe }) => {
  const { formatPrice } = useCurrency();

  const handlePrintQuote = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Commercial Pro-Forma Quotation - #${quote.quoteRef}</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #111; max-width: 800px; margin: 0 auto; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #F27D26; padding-bottom: 20px; margin-bottom: 30px; }
          .brand { font-size: 24px; font-weight: 900; color: #000; letter-spacing: -0.5px; }
          .badge { color: #F27D26; font-weight: bold; font-size: 12px; text-transform: uppercase; }
          .quote-title { font-size: 20px; font-weight: bold; margin-bottom: 10px; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #f5f5f5; text-align: left; padding: 10px; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #ddd; }
          td { padding: 12px 10px; border-bottom: 1px solid #eee; font-size: 13px; }
          .total-box { text-align: right; margin-top: 20px; font-size: 18px; font-weight: bold; }
          .total-box span { color: #F27D26; font-size: 24px; }
          .terms { background: #fafafa; border: 1px solid #eee; border-radius: 8px; padding: 15px; font-size: 12px; margin-top: 30px; color: #555; }
          .footer { margin-top: 40px; font-size: 11px; text-align: center; color: #888; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">EAGLE EXCEL VENTURES</div>
            <div class="badge">Commercial Wholesale & Supply Chain</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: bold; font-size: 16px;">PRO-FORMA QUOTE</div>
            <div style="font-family: monospace; color: #666;">REF: ${quote.quoteRef}</div>
            <div style="font-size: 12px; color: #888;">Date: ${new Date().toLocaleDateString()}</div>
          </div>
        </div>

        <div class="meta-grid">
          <div><strong>Payment Terms:</strong> ${quote.paymentTerms}</div>
          <div><strong>Freight / IncoTerms:</strong> ${quote.freightTerms}</div>
          <div><strong>Validity:</strong> ${quote.validDays} Days from issuance</div>
          <div><strong>Authorized By:</strong> Eagle Excel Commercial Operations</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item Description</th>
              <th>SKU</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Wholesale Unit</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${quote.items.map(item => `
              <tr>
                <td><strong>${item.name}</strong></td>
                <td style="font-family: monospace;">${item.sku}</td>
                <td style="text-align: center;">${item.quantity.toLocaleString()}</td>
                <td style="text-align: right;">$${item.unitPrice.toFixed(2)}</td>
                <td style="text-align: right; font-weight: bold;">$${item.subtotal.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total-box">
          Grand Total: <span>$${quote.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        ${quote.notes ? `<div class="terms"><strong>Special Notes & Freight Instructions:</strong><br/>${quote.notes}</div>` : ''}

        <div class="footer">
          Eagle Excel Ventures • Official Quotation • Valid for acceptance across Nigeria & Cameroon branches.
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className={`mt-2 rounded-2xl p-4 border shadow-sm transition-all ${
      isMe
        ? 'bg-amber-500/10 border-amber-500/30 text-slate-900 dark:text-zinc-100'
        : 'bg-white dark:bg-[#1c1c1c] border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-current/10">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#F27D26]">
          <ShieldCheck className="w-4 h-4" />
          <span>Official Pro-Forma Quotation</span>
        </div>
        <span className="text-[10px] font-mono font-bold bg-[#F27D26]/15 text-[#F27D26] px-2 py-0.5 rounded-full">
          #{quote.quoteRef}
        </span>
      </div>

      {/* Items preview */}
      <div className="py-2.5 space-y-1.5 text-xs">
        {quote.items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center text-xs">
            <span className="truncate pr-2 font-medium opacity-90">
              {item.quantity}x {item.name}
            </span>
            <span className="font-mono font-bold shrink-0">
              {formatPrice(item.subtotal)}
            </span>
          </div>
        ))}
      </div>

      {/* Summary Box */}
      <div className="pt-2 border-t border-current/10 flex items-center justify-between text-xs font-bold">
        <span className="opacity-80">Quoted Total:</span>
        <span className="text-sm font-extrabold text-[#F27D26]">
          {formatPrice(quote.grandTotal)}
        </span>
      </div>

      {/* Terms & Metadata */}
      <div className="mt-2 pt-2 border-t border-current/10 text-[10px] space-y-1 opacity-75">
        <div className="flex justify-between">
          <span>Terms:</span>
          <span className="font-semibold">{quote.paymentTerms}</span>
        </div>
        <div className="flex justify-between">
          <span>Freight:</span>
          <span className="font-semibold">{quote.freightTerms}</span>
        </div>
        <div className="flex justify-between">
          <span>Validity:</span>
          <span className="font-semibold">{quote.validDays} Days</span>
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-3">
        <button
          type="button"
          onClick={handlePrintQuote}
          className="w-full py-1.5 px-3 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs btn-hover"
        >
          <Printer className="w-3.5 h-3.5" />
          Print / Download Formal PDF Quote
        </button>
      </div>
    </div>
  );
};
