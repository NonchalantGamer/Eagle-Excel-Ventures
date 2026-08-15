import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Send, 
  CheckCircle2, 
  FileSpreadsheet, 
  Building2, 
  Truck, 
  Ship, 
  Plane, 
  ShieldCheck, 
  HelpCircle,
  Clock,
  PhoneCall
} from 'lucide-react';
import { WhatsAppIcon } from '../icons/WhatsAppIcon';
import { useCurrency } from '../../context/CurrencyContext';
import { useModalFocusLock } from '../../hooks/useModalFocusLock';

interface RequestQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: string;
  initialProductName?: string;
  initialQuantity?: number;
}

export const RequestQuoteModal: React.FC<RequestQuoteModalProps> = ({
  isOpen,
  onClose,
  initialCategory,
  initialProductName,
  initialQuantity
}) => {
  const { currency, formatPrice } = useCurrency();
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState(initialCategory || 'Electronics & Power Systems');
  const [productDetails, setProductDetails] = useState(initialProductName || '');
  const [volumeEstimate, setVolumeEstimate] = useState('1x 40ft High Cube Container (FCL)');
  const [targetQuantity, setTargetQuantity] = useState(initialQuantity ? String(initialQuantity) : '500');
  const [destinationCountry, setDestinationCountry] = useState<'nigeria' | 'cameroon'>('nigeria');
  const [destinationCity, setDestinationCity] = useState('Lagos (Apapa / Alaba Depot)');
  const [deliveryMethod, setDeliveryMethod] = useState<'sea_fcl' | 'sea_lcl' | 'air_express' | 'warehouse_pickup'>('sea_fcl');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  useModalFocusLock(isOpen, onClose);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const refNumber = `EE-RFQ-${Math.floor(100000 + Math.random() * 900000)}`;

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmittedRef(refNumber);
    }, 600);
  };

  const handleWhatsAppRedirect = () => {
    const targetPhone = destinationCountry === 'nigeria' ? '2347063360982' : '237677626356';
    const message = encodeURIComponent(
      `Hello Eagle Excel Ventures,\nI submitted RFQ Ref: ${submittedRef || 'New Sourcing'}\n• Company: ${companyName || fullName}\n• Product: ${productDetails || category}\n• Volume: ${volumeEstimate} (~${targetQuantity} units)\n• Destination: ${destinationCountry === 'nigeria' ? 'Nigeria' : 'Cameroon'} - ${destinationCity}\n• Shipping: ${deliveryMethod}\nPlease provide landed wholesale quote.`
    );
    window.open(`https://wa.me/${targetPhone}?text=${message}`, '_blank');
  };

  return typeof document !== 'undefined' ? createPortal(
    <div 
      data-portal-modal="true"
      className="fixed inset-0 z-[99999] isolate flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-xl overflow-hidden animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#141414] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F27D26]/10 text-[#F27D26] flex items-center justify-center font-bold shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Request Bulk Import & Wholesale Quote
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Direct China factory landed pricing with customs clearance to Nigeria & Cameroon
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain space-y-5 flex-1">
          {submittedRef ? (
            <div className="text-center py-6 space-y-4 animate-fadeIn">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                  RFQ Received Successfully
                </span>
                <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  Quotation Reference: #{submittedRef}
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-md mx-auto">
                  Our commercial sourcing desk in China & West Africa has received your request. A designated trade officer will prepare your landed cost breakdown within 2-4 business hours.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-left max-w-md mx-auto text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-zinc-400">Client / Company:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{companyName || fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-zinc-400">Target Category:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-zinc-400">Volume / Destination:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{volumeEstimate} • {destinationCity}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleWhatsAppRedirect}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                >
                  <WhatsAppIcon className="w-4 h-4 text-white" />
                  <span>Connect Instantly on WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-800 dark:text-white font-bold text-xs transition-colors"
                >
                  Close Window
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              {/* Trust Callout Banner */}
              <div className="p-3.5 rounded-2xl bg-[#F27D26]/10 border border-[#F27D26]/30 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#F27D26] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    Eagle Excel Guaranteed Landed Price Policy
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-zinc-300">
                    Quotes include direct factory price, export clearance, sea/air shipping freight, port tariffs (SONCAP/ANOR), and terminal release fees.
                  </div>
                </div>
              </div>

              {/* Company & Contact Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g., Emmanuel Okafor"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26] outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">Company / Enterprise Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="e.g., Apex Global Distributors Ltd"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">Phone / WhatsApp Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="e.g., +234 803 123 4567 or +237 670 123 456"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26] outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">Business Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="e.g., procurement@apexdistributors.com"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26] outline-none"
                  />
                </div>
              </div>

              {/* Sourcing Category & Target Specs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">Product Category *</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26] outline-none"
                  >
                    <option value="Electronics & Power Systems">⚡ Electronics & Solar Power Systems</option>
                    <option value="Building Materials & Hardware">🏗️ Building Materials & Hardware</option>
                    <option value="Textiles & Fabrics">🧵 Textiles, Swiss Voile & Ankara Wax</option>
                    <option value="Machinery & Industrial Equipment">⚙️ Machinery & Industrial Equipment</option>
                    <option value="General Merchandise & Packaging">📦 Packaging & General Merchandise</option>
                    <option value="Custom Factory Sourcing">🔍 Custom Factory Sourcing / OEM</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">Product Specification / Name</label>
                  <input
                    type="text"
                    value={productDetails}
                    onChange={e => setProductDetails(e.target.value)}
                    placeholder="e.g., 5.5KVA Pure Sine Inverters or Voile Bales"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26] outline-none"
                  />
                </div>
              </div>

              {/* Volume & Destination */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">Estimated Volume *</label>
                  <select
                    value={volumeEstimate}
                    onChange={e => setVolumeEstimate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26] outline-none"
                  >
                    <option value="1x 40ft High Cube Container (FCL)">1x 40ft HQ Container (FCL)</option>
                    <option value="Multiple 40ft Containers (2-10 FCL)">Fleet 2-10x 40ft HQ Containers</option>
                    <option value="1x 20ft Standard Container (FCL)">1x 20ft Container (FCL)</option>
                    <option value="Consolidated Pallets (5 - 20 Pallets)">Consolidated Pallets (5 - 20 LCL)</option>
                    <option value="Trial Bulk Order (1 - 4 Pallets)">Trial Commercial Pallets (1-4)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">Destination Country</label>
                  <select
                    value={destinationCountry}
                    onChange={e => {
                      const c = e.target.value as 'nigeria' | 'cameroon';
                      setDestinationCountry(c);
                      setDestinationCity(c === 'nigeria' ? 'Lagos (Apapa / Alaba Depot)' : 'Douala (Akwa Depot & Port)');
                    }}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26] outline-none"
                  >
                    <option value="nigeria">🇳🇬 Nigeria</option>
                    <option value="cameroon">🇨🇲 Cameroon</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-zinc-300">Destination Hub</label>
                  <input
                    type="text"
                    value={destinationCity}
                    onChange={e => setDestinationCity(e.target.value)}
                    placeholder="e.g., Lagos / Kano / Douala"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26] outline-none"
                  />
                </div>
              </div>

              {/* Delivery Method Choice */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-zinc-300 block">Preferred Shipping & Fulfillment Method</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('sea_fcl')}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      deliveryMethod === 'sea_fcl'
                        ? 'bg-[#F27D26]/10 border-[#F27D26] text-[#e06d1a] dark:text-[#F27D26] font-bold'
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-400'
                    }`}
                  >
                    <Ship className="w-4 h-4 mx-auto mb-1" />
                    <span>Sea Freight FCL</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('sea_lcl')}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      deliveryMethod === 'sea_lcl'
                        ? 'bg-[#F27D26]/10 border-[#F27D26] text-[#e06d1a] dark:text-[#F27D26] font-bold'
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-400'
                    }`}
                  >
                    <Truck className="w-4 h-4 mx-auto mb-1" />
                    <span>Sea Freight LCL</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('air_express')}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      deliveryMethod === 'air_express'
                        ? 'bg-[#F27D26]/10 border-[#F27D26] text-[#e06d1a] dark:text-[#F27D26] font-bold'
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-400'
                    }`}
                  >
                    <Plane className="w-4 h-4 mx-auto mb-1" />
                    <span>Air Express (5-8d)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('warehouse_pickup')}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      deliveryMethod === 'warehouse_pickup'
                        ? 'bg-[#F27D26]/10 border-[#F27D26] text-[#e06d1a] dark:text-[#F27D26] font-bold'
                        : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-400'
                    }`}
                  >
                    <Building2 className="w-4 h-4 mx-auto mb-1" />
                    <span>Depot Pickup</span>
                  </button>
                </div>
              </div>

              {/* Special Instructions & Notes */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-zinc-300">Custom Packaging / OEM / Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Enter any custom branding requests, sample requirements, or timeline constraints..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-[#F27D26] focus:ring-1 focus:ring-[#F27D26] outline-none resize-none"
                />
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#F27D26] to-[#e06d1a] hover:from-[#ff8833] hover:to-[#ea7622] text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  {isSubmitting ? (
                    <span className="whitespace-nowrap">Calculating Landed Quote...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4 stroke-[2.5] shrink-0" />
                      <span className="whitespace-nowrap">Submit Sourcing RFQ</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 dark:text-zinc-400 pt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#F27D26]" /> 2-4 Hr Response Time
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> 100% Guaranteed Landed Price
                </span>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>,
    document.body
  ) : null;
};
