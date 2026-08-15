import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Send, 
  CheckCircle2, 
  Ship, 
  Truck, 
  Plane, 
  Building2, 
  ShieldCheck, 
  HelpCircle, 
  Clock, 
  ArrowRight, 
  ArrowLeft, 
  Copy, 
  Check, 
  ExternalLink,
  Sparkles,
  Layers,
  Factory,
  Globe2
} from 'lucide-react';
import { WhatsAppIcon } from '../components/icons/WhatsAppIcon';
import { PageView } from '../types';
import { useCurrency, CURRENCIES, CurrencyCode } from '../context/CurrencyContext';
import { useToast } from '../components/Toast';
import { useNotifications } from '../context/NotificationContext';

interface RFQPageProps {
  onNavigate: (view: PageView) => void;
  initialCategory?: string;
  initialProductName?: string;
}

export const RFQPage: React.FC<RFQPageProps> = ({
  onNavigate,
  initialCategory,
  initialProductName
}) => {
  const { currency, setCurrency, formatPrice, currentCurrencyConfig } = useCurrency();
  const { showToast } = useToast();
  const { notifyAdminNewRFQ } = useNotifications();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem('ee_rfq_step');
        if (stored && ['1', '2', '3', '4'].includes(stored)) {
          return parseInt(stored, 10) as any;
        }
      }
    } catch {}
    return 1;
  });

  // Form Fields
  const [category, setCategory] = useState(() => {
    if (initialCategory) return initialCategory;
    try {
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem('ee_rfq_category');
        if (stored) return stored;
      }
    } catch {}
    return 'Electronics & Solar Power Systems';
  });
  const [productName, setProductName] = useState(() => {
    if (initialProductName) return initialProductName;
    try {
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem('ee_rfq_product');
        if (stored) return stored;
      }
    } catch {}
    return '';
  });

  // Sync draft states to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('ee_rfq_step', step.toString());
      sessionStorage.setItem('ee_rfq_category', category);
      sessionStorage.setItem('ee_rfq_product', productName);
    } catch {}
  }, [step, category, productName]);
  const [specs, setSpecs] = useState('');
  const [targetQuality, setTargetQuality] = useState<'tier1_premium' | 'commercial_standard' | 'budget_high_volume'>('tier1_premium');
  const [isOEMWhiteLabel, setIsOEMWhiteLabel] = useState(false);

  // Volume & Container
  const [quantity, setQuantity] = useState('500');
  const [unitType, setUnitType] = useState('Units / Master Cartons');
  const [volumeType, setVolumeType] = useState<'fcl_40hq' | 'fcl_20' | 'lcl_pallets' | 'air_cargo'>('fcl_40hq');

  // Destination & Logistics
  const [destinationCountry, setDestinationCountry] = useState<'nigeria' | 'cameroon'>('nigeria');
  const [destinationCity, setDestinationCity] = useState('Lagos (Apapa Port / Trade Fair Depot)');
  const [shippingMethod, setShippingMethod] = useState<'sea_fcl' | 'sea_lcl' | 'air_express' | 'warehouse_pickup'>('sea_fcl');

  // Commercial & Contact
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [taxId, setTaxId] = useState('');
  const [paymentTerm, setPaymentTerm] = useState<'wire_transfer' | 'invoice_net30' | 'letter_of_credit' | 'cod'>('wire_transfer');
  const [targetBudget, setTargetBudget] = useState('');
  const [notes, setNotes] = useState('');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleNext = () => {
    if (step === 1 && !(productName || '').trim()) {
      showToast('Please enter the product name or specifications.', 'error');
      return;
    }
    if (step < 4) {
      setStep((prev) => (prev + 1) as any);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as any);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!(fullName || '').trim() || !(phone || '').trim()) {
      showToast('Please provide your name and phone/WhatsApp number.', 'error');
      return;
    }

    setIsSubmitting(true);
    const refNumber = `EE-RFQ-${Math.floor(100000 + Math.random() * 900000)}`;

    // Dispatch real-time notification to admin desk
    notifyAdminNewRFQ(
      refNumber, 
      companyName || fullName, 
      productName ? `${productName} (${category})` : category, 
      destinationCountry === 'nigeria' ? `Nigeria (${destinationCity})` : `Cameroon (${destinationCity})`
    );

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmittedRef(refNumber);
      showToast(`RFQ ${refNumber} submitted successfully! Sourcing team alerted.`, 'success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 600);
  };

  const getWhatsAppMessage = () => {
    const text = `*EAGLE EXCEL VENTURES SOURCING RFQ*\n*Ref:* ${submittedRef || 'NEW-RFQ'}\n\n*Product:* ${productName} (${category})\n*Specs:* ${specs || 'Standard Factory Spec'}\n*OEM White-label:* ${isOEMWhiteLabel ? 'Yes' : 'No'}\n*Volume:* ${quantity} ${unitType} (${volumeType})\n*Destination:* ${destinationCountry === 'nigeria' ? 'Nigeria' : 'Cameroon'} - ${destinationCity}\n*Shipping:* ${shippingMethod}\n*Buyer:* ${fullName} - ${companyName || 'Enterprise Importer'}\n*Phone:* ${phone}\n*Email:* ${email || 'N/A'}\n*Currency:* ${currency}\n*Payment Term:* ${paymentTerm}`;
    return encodeURIComponent(text);
  };

  const handleWhatsAppRedirect = () => {
    const targetPhone = destinationCountry === 'nigeria' ? '2347063360982' : '237677626356';
    window.open(`https://wa.me/${targetPhone}?text=${getWhatsAppMessage()}`, '_blank');
  };

  const copySummary = () => {
    const text = `EAGLE EXCEL VENTURES RFQ\nRef: ${submittedRef}\nProduct: ${productName} (${category})\nVolume: ${quantity} ${unitType}\nDestination: ${destinationCity}\nContact: ${fullName} (${phone})`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-10 max-w-6xl mx-auto">
      
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
        <button 
          onClick={() => onNavigate('home')}
          className="hover:text-[#F27D26] transition-colors cursor-pointer"
        >
          Home
        </button>
        <span>/</span>
        <span className="font-bold text-slate-900 dark:text-white">Custom Procurement & Bulk RFQ</span>
      </div>

      {/* Header Banner */}
      <div className="reveal-on-scroll relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-black text-white p-6 sm:p-8 border border-slate-200/80 dark:border-white/10 shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F27D26]/20 border border-[#F27D26]/40 text-[#F27D26] text-xs font-black">
            <Sparkles className="w-3.5 h-3.5" />
            Direct Factory Landed Quote Engine
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold font-serif">
            Request a Bulk Import & Sourcing Quotation
          </h1>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
            Get transparent, landed wholesale prices with direct China factory negotiation, on-site quality inspection, sea container freight, and customs clearance to Nigeria & Cameroon included.
          </p>
        </div>
      </div>

      {submittedRef ? (
        /* SUCCESS SCREEN */
        <div className="reveal-on-scroll bg-white dark:bg-[#141414] rounded-3xl p-8 sm:p-12 border border-slate-200 dark:border-white/5 shadow-2xl text-center space-y-6 animate-fadeIn">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              RFQ Submitted Successfully
            </span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Reference #{submittedRef}
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              Our China sourcing desk in Guangzhou and regional operations team in {destinationCountry === 'nigeria' ? 'Lagos' : 'Douala'} have received your request. We will issue your official landed proforma quotation within 12 - 24 hours.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-lg mx-auto">
            <button
              onClick={handleWhatsAppRedirect}
              className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-[#25D366] hover:bg-[#1EBE5D] text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all btn-hover cursor-pointer"
            >
              <WhatsAppIcon className="w-4 h-4 text-slate-950" />
              <span>Connect via WhatsApp Now</span>
            </button>

            <button
              onClick={copySummary}
              className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy RFQ Summary'}</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-center gap-4 text-xs">
            <button
              onClick={() => {
                setSubmittedRef(null);
                setStep(1);
                setProductName('');
              }}
              className="text-[#F27D26] font-bold hover:underline cursor-pointer"
            >
              Submit Another RFQ
            </button>
            <span>•</span>
            <button
              onClick={() => onNavigate('catalog')}
              className="text-slate-600 dark:text-zinc-400 font-bold hover:underline cursor-pointer"
            >
              Browse Ready Stock Catalog
            </button>
          </div>
        </div>
      ) : (
        /* STEP-BY-STEP WIZARD */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Wizard Form (8 Cols) */}
          <div className="lg:col-span-8 bg-white dark:bg-[#141414] rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-white/5 shadow-xl space-y-6">
            
            {/* Step Progress Indicators */}
            <div className="grid grid-cols-4 gap-2 border-b border-slate-100 dark:border-white/5 pb-5">
              {[
                { s: 1, title: '1. Product Specs' },
                { s: 2, title: '2. Volume & Container' },
                { s: 3, title: '3. Destination' },
                { s: 4, title: '4. Contact & Terms' }
              ].map(item => (
                <button
                  key={item.s}
                  type="button"
                  onClick={() => setStep(item.s as any)}
                  className={`text-left p-2 rounded-xl transition-all cursor-pointer ${
                    step === item.s 
                      ? 'bg-[#F27D26]/15 border-b-2 border-[#F27D26]' 
                      : step > item.s 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : 'text-slate-400 dark:text-zinc-600'
                  }`}
                >
                  <div className="text-[10px] font-bold">{item.title}</div>
                  <div className="w-full bg-slate-200 dark:bg-white/10 h-1 rounded-full mt-1.5 overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        step >= item.s ? 'bg-[#F27D26] w-full' : 'w-0'
                      }`} 
                    />
                  </div>
                </button>
              ))}
            </div>

            {/* STEP 1: Product Specs */}
            {step === 1 && (
              <div className="space-y-5 animate-fadeIn">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Step 1: Product Specifications & Target Quality
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Specify what you would like our China team to procure.
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-800 dark:text-zinc-200">
                      Product Category *
                    </label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 font-semibold outline-none focus:ring-2 focus:ring-[#F27D26]"
                    >
                      <option value="Electronics & Solar Power Systems">Electronics & Solar Power Systems</option>
                      <option value="Building Materials & Hardware">Building Materials & Hardware</option>
                      <option value="Textiles, Swiss Voile & Wax Fabrics">Textiles, Swiss Voile & Wax Fabrics</option>
                      <option value="Machinery & Industrial Equipment">Machinery & Industrial Equipment</option>
                      <option value="General Merchandise & Packaging">General Merchandise & Packaging</option>
                      <option value="Custom Other Sourcing">Custom Other Sourcing</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-800 dark:text-zinc-200">
                      Product Name / Model / Search Link *
                    </label>
                    <input
                      type="text"
                      value={productName}
                      onChange={e => setProductName(e.target.value)}
                      placeholder="e.g., 5.5KVA Pure Sine Solar Inverter 48V, or 1688 / Alibaba / Spec Link"
                      className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 font-medium outline-none focus:ring-2 focus:ring-[#F27D26]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-800 dark:text-zinc-200">
                      Detailed Specifications / Technical Requirements
                    </label>
                    <textarea
                      rows={3}
                      value={specs}
                      onChange={e => setSpecs(e.target.value)}
                      placeholder="Include dimensions, voltage, raw material composition, color codes, packaging type, or certificates needed..."
                      className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 font-medium outline-none focus:ring-2 focus:ring-[#F27D26]"
                    />
                  </div>

                  {/* Quality Tier Selection */}
                  <div className="space-y-2">
                    <label className="font-bold text-slate-800 dark:text-zinc-200">
                      Target Quality Standard
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {[
                        { id: 'tier1_premium', label: 'Tier-1 Premium Export', desc: '100% Grade A components, strict QC' },
                        { id: 'commercial_standard', label: 'Commercial Standard', desc: 'Balanced cost-to-performance ratio' },
                        { id: 'budget_high_volume', label: 'Budget High Volume', desc: 'Lowest unit price for fast retail' }
                      ].map(tier => (
                        <button
                          key={tier.id}
                          type="button"
                          onClick={() => setTargetQuality(tier.id as any)}
                          className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                            targetQuality === tier.id
                              ? 'bg-[#F27D26]/15 border-[#F27D26] text-slate-950 dark:text-white ring-1 ring-[#F27D26]'
                              : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300'
                          }`}
                        >
                          <div className="font-bold text-xs">{tier.label}</div>
                          <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">{tier.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* OEM White-labeling checkbox */}
                  <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isOEMWhiteLabel}
                      onChange={e => setIsOEMWhiteLabel(e.target.checked)}
                      className="w-4 h-4 text-[#F27D26] rounded border-slate-300 focus:ring-[#F27D26]"
                    />
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">Require OEM Custom Brand Printing / Packaging</div>
                      <div className="text-[10px] text-slate-500 dark:text-zinc-400">Custom logo laser engraving, master carton branding, and customized manual.</div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* STEP 2: Volume & Container */}
            {step === 2 && (
              <div className="space-y-5 animate-fadeIn">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Step 2: Order Volume & Container Format
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Select your estimated volume and shipment arrangement.
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-800 dark:text-zinc-200">
                        Estimated Target Quantity *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 font-bold outline-none focus:ring-2 focus:ring-[#F27D26]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-800 dark:text-zinc-200">
                        Unit Metric *
                      </label>
                      <select
                        value={unitType}
                        onChange={e => setUnitType(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 font-semibold outline-none focus:ring-2 focus:ring-[#F27D26]"
                      >
                        <option value="Units / Master Cartons">Units / Master Cartons</option>
                        <option value="Full Pallets (Standard 1.2m x 1.0m)">Full Pallets</option>
                        <option value="Bales (Textiles 50-Yards)">Bales (Textiles)</option>
                        <option value="Crated Sets / Heavy Machines">Crated Sets / Heavy Machines</option>
                        <option value="20ft Ocean Container (FCL)">20ft Ocean Container (FCL)</option>
                        <option value="40ft High Cube Container (FCL)">40ft High Cube Container (FCL)</option>
                      </select>
                    </div>
                  </div>

                  {/* Volume format selection */}
                  <div className="space-y-2">
                    <label className="font-bold text-slate-800 dark:text-zinc-200">
                      Freight & Container Method
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        { id: 'fcl_40hq', label: '40ft High Cube Container (FCL)', desc: '~68 CBM capacity (Maximum volume discount)' },
                        { id: 'fcl_20', label: '20ft Standard Ocean Container (FCL)', desc: '~28 CBM capacity' },
                        { id: 'lcl_pallets', label: 'LCL Consolidated Pallet Lots', desc: '5 - 20 CBM groupage shipment' },
                        { id: 'air_cargo', label: 'Commercial Air Cargo Express', desc: 'Fastest 5-8 business day dispatch' }
                      ].map(vol => (
                        <button
                          key={vol.id}
                          type="button"
                          onClick={() => setVolumeType(vol.id as any)}
                          className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                            volumeType === vol.id
                              ? 'bg-[#F27D26]/15 border-[#F27D26] text-slate-950 dark:text-white ring-1 ring-[#F27D26]'
                              : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300'
                          }`}
                        >
                          <div className="font-bold text-xs">{vol.label}</div>
                          <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">{vol.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Destination & Port */}
            {step === 3 && (
              <div className="space-y-5 animate-fadeIn">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Step 3: Destination Logistics & Delivery Point
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Where would you like the cargo delivered?
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-800 dark:text-zinc-200">
                      Destination Country *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setDestinationCountry('nigeria');
                          setDestinationCity('Lagos (Apapa Port / Trade Fair Depot)');
                        }}
                        className={`p-3 rounded-2xl flex items-center gap-3 border font-bold text-xs cursor-pointer ${
                          destinationCountry === 'nigeria'
                            ? 'bg-[#F27D26]/15 border-[#F27D26] text-slate-950 dark:text-white'
                            : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300'
                        }`}
                      >
                        <span className="text-2xl">🇳🇬</span>
                        <div className="text-left">
                          <div>Nigeria</div>
                          <div className="text-[10px] text-slate-500 font-normal">All 36 States & FCT</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDestinationCountry('cameroon');
                          setDestinationCity('Douala (Akwa / Port Depot)');
                        }}
                        className={`p-3 rounded-2xl flex items-center gap-3 border font-bold text-xs cursor-pointer ${
                          destinationCountry === 'cameroon'
                            ? 'bg-[#F27D26]/15 border-[#F27D26] text-slate-950 dark:text-white'
                            : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300'
                        }`}
                      >
                        <span className="text-2xl">🇨🇲</span>
                        <div className="text-left">
                          <div>Cameroon</div>
                          <div className="text-[10px] text-slate-500 font-normal">All 10 Regions</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-800 dark:text-zinc-200">
                      Target Port / Regional Depot *
                    </label>
                    <select
                      value={destinationCity}
                      onChange={e => setDestinationCity(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 font-semibold outline-none focus:ring-2 focus:ring-[#F27D26]"
                    >
                      {destinationCountry === 'nigeria' ? (
                        <>
                          <option value="Lagos (Apapa Port / Trade Fair Depot)">Lagos (Apapa Port / Trade Fair Depot)</option>
                          <option value="Lagos (Alaba International / Ikeja)">Lagos (Alaba International / Ikeja)</option>
                          <option value="Abuja (Idu Industrial / Central Depot)">Abuja (Idu Industrial / Central Depot)</option>
                          <option value="Kano (Bompai Industrial Area / Inland Dry Port)">Kano (Bompai Industrial Area / Inland Dry Port)</option>
                          <option value="Port Harcourt (Onne Port / Trans-Amadi)">Port Harcourt (Onne Port / Trans-Amadi)</option>
                          <option value="Onitsha (Main Market / Bridgehead Hub)">Onitsha (Main Market / Bridgehead Hub)</option>
                          <option value="Direct Doorstep Store Delivery (Nationwide)">Direct Doorstep Store Delivery (Nationwide)</option>
                        </>
                      ) : (
                        <>
                          <option value="Douala (Akwa / Port Depot)">Douala (Akwa / Port Depot)</option>
                          <option value="Douala (Marché Central / Bonabéri)">Douala (Marché Central / Bonabéri)</option>
                          <option value="Yaoundé (Mvan / Mokolo Distribution)">Yaoundé (Mvan / Mokolo Distribution)</option>
                          <option value="Bafoussam (Western Region Hub)">Bafoussam (Western Region Hub)</option>
                          <option value="Garoua (Northern Regional Hub)">Garoua (Northern Regional Hub)</option>
                          <option value="Direct Store Delivery (Cameroon Nationwide)">Direct Store Delivery (Cameroon Nationwide)</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: Contact & Commercial Terms */}
            {step === 4 && (
              <form onSubmit={handleSubmit} className="space-y-5 animate-fadeIn">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Step 4: Contact Person & Commercial Billing
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Provide your business details for official proforma invoicing.
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-800 dark:text-zinc-200">
                        Full Name / Authorized Purchaser *
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="e.g., Emeka Okafor / Sandrine M."
                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 font-medium outline-none focus:ring-2 focus:ring-[#F27D26]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-800 dark:text-zinc-200">
                        Company / Business Name
                      </label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={e => setCompanyName(e.target.value)}
                        placeholder="e.g., Emex Solar Energy Ltd"
                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 font-medium outline-none focus:ring-2 focus:ring-[#F27D26]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-800 dark:text-zinc-200">
                        Phone / WhatsApp Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="e.g., +234 803 123 4567 or +237 677 123 456"
                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 font-bold outline-none focus:ring-2 focus:ring-[#F27D26]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-800 dark:text-zinc-200">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="e.g., procurement@company.com"
                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 font-medium outline-none focus:ring-2 focus:ring-[#F27D26]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-800 dark:text-zinc-200">
                        Preferred Invoicing Currency
                      </label>
                      <select
                        value={currency}
                        onChange={e => setCurrency(e.target.value as CurrencyCode)}
                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 font-bold outline-none focus:ring-2 focus:ring-[#F27D26]"
                      >
                        {(Object.keys(CURRENCIES) as CurrencyCode[]).map(code => (
                          <option key={code} value={code}>
                            {CURRENCIES[code].flag} {code} - {CURRENCIES[code].label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-800 dark:text-zinc-200">
                        Preferred Payment Term
                      </label>
                      <select
                        value={paymentTerm}
                        onChange={e => setPaymentTerm(e.target.value as any)}
                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 font-semibold outline-none focus:ring-2 focus:ring-[#F27D26]"
                      >
                        <option value="wire_transfer">Direct Bank Wire (T/T - Deposit & Balance)</option>
                        <option value="invoice_net30">Net 30 Commercial Invoice (Verified Accounts)</option>
                        <option value="letter_of_credit">Bank Letter of Credit (LC for $50k+ FCL)</option>
                        <option value="cod">Cash on Depot Pickup (Selected items)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-800 dark:text-zinc-200">
                      Additional Notes or Special Handling Requirements
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Any specific delivery timeline, crane offloading, or pallet shrink requirements..."
                      className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-zinc-100 font-medium outline-none focus:ring-2 focus:ring-[#F27D26]"
                    />
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#F27D26] to-[#e06d1a] hover:from-[#ff8833] hover:to-[#ea7622] text-black font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-xl transition-all btn-hover cursor-pointer whitespace-nowrap"
                  >
                    <Send className="w-4 h-4 stroke-[2.5] shrink-0" />
                    <span className="whitespace-nowrap">{isSubmitting ? 'Submitting Sourcing RFQ...' : 'Submit Sourcing RFQ'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Step Navigation Controls */}
            {step < 4 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="py-2.5 px-5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Previous
                  </button>
                ) : <div />}

                <button
                  type="button"
                  onClick={handleNext}
                  className="py-2.5 px-6 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-black text-xs font-black flex items-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <span>Continue to Step {step + 1}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

          </div>

          {/* Real-time RFQ Summary Sidebar (4 Cols) */}
          <div className="lg:col-span-4 space-y-5">
            
            <div className="p-6 rounded-3xl bg-white dark:bg-[#141414] border border-slate-200 dark:border-white/5 shadow-lg space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Live RFQ Summary
                </span>
                <span className="text-[10px] font-bold text-[#F27D26] px-2 py-0.5 rounded-full bg-[#F27D26]/10">
                  Step {step} of 4
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="text-[11px] text-slate-400 dark:text-zinc-500">Category</div>
                  <div className="font-bold text-slate-900 dark:text-white truncate">{category}</div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-400 dark:text-zinc-500">Product</div>
                  <div className="font-bold text-slate-900 dark:text-white truncate">{productName || 'Not specified yet'}</div>
                </div>

                <div className="flex justify-between">
                  <div>
                    <div className="text-[11px] text-slate-400 dark:text-zinc-500">Target Volume</div>
                    <div className="font-bold text-slate-900 dark:text-white">{quantity} {unitType}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 dark:text-zinc-500 text-right">Container</div>
                    <div className="font-bold text-slate-900 dark:text-white text-right">{volumeType}</div>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-400 dark:text-zinc-500">Destination</div>
                  <div className="font-bold text-slate-900 dark:text-white truncate">{destinationCity}</div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-400 dark:text-zinc-500">Selected Currency</div>
                  <div className="font-black text-[#F27D26]">{currentCurrencyConfig.flag} {currentCurrencyConfig.label} ({currency})</div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 space-y-1 text-[11px]">
                <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> 100% Guaranteed Landed Cost
                </div>
                <p className="text-slate-500 dark:text-zinc-400 text-[10px]">
                  All quotes include factory production, ocean bill of lading, container loading, and port clearing charges.
                </p>
              </div>
            </div>

            {/* Fast WhatsApp Help Box */}
            <div className="p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-950 dark:text-emerald-100 space-y-3 text-xs">
              <div className="flex items-center gap-2 font-bold">
                <WhatsAppIcon className="w-4 h-4 text-emerald-500" />
                <span>Prefer Instant Direct WhatsApp?</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-zinc-300">
                You can also message our trade representatives directly for rapid container quotes.
              </p>
              <button
                type="button"
                onClick={handleWhatsAppRedirect}
                className="w-full py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <WhatsAppIcon className="w-3.5 h-3.5 text-slate-950" />
                <span>Chat with Sourcing Rep</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
