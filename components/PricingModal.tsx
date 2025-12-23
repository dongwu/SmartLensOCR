
import React, { useState } from 'react';
import { PricingPlan } from '../types';

interface PricingModalProps {
  onClose: () => void;
  onPurchase: (credits: number) => void;
}

const PLANS: PricingPlan[] = [
  { id: 'starter', name: 'Starter', price: '$4.99', credits: 10 },
  { id: 'pro', name: 'Professional', price: '$14.99', credits: 50, popular: true },
  { id: 'unlimited', name: 'Elite', price: '$29.99', credits: 500 },
];

const PricingModal: React.FC<PricingModalProps> = ({ onClose, onPurchase }) => {
  const [step, setStep] = useState<'selection' | 'checkout' | 'processing'>('selection');
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);

  const handleSelect = (plan: PricingPlan) => {
    setSelectedPlan(plan);
    setStep('checkout');
  };

  const handlePay = () => {
    setStep('processing');
    setTimeout(() => {
      onPurchase(selectedPlan?.credits || 0);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        
        {step === 'selection' && (
          <div className="p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Refill Credits</h2>
                <p className="text-slate-500">Choose a plan to continue extraction.</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid gap-4">
              {PLANS.map((plan) => (
                <div 
                  key={plan.id}
                  onClick={() => handleSelect(plan)}
                  className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${
                    plan.popular ? 'border-blue-600 bg-blue-50/30' : 'border-slate-100 bg-white hover:border-blue-200'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-6 px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-full uppercase tracking-widest">Most Popular</span>
                  )}
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-slate-900">{plan.name}</h4>
                      <p className="text-sm text-slate-500">{plan.credits} Scan Credits</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black text-slate-900">{plan.price}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 'checkout' && (
          <div className="p-8">
             <button onClick={() => setStep('selection')} className="mb-4 text-blue-600 font-bold flex items-center gap-1 text-sm">
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 19l-7-7 7-7"/></svg>
               Back to plans
             </button>
             <h2 className="text-2xl font-black text-slate-900 mb-6">Secure Checkout</h2>
             
             <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl flex justify-between items-center">
                  <span className="font-bold text-slate-600">{selectedPlan?.name} Plan</span>
                  <span className="font-black text-slate-900">{selectedPlan?.price}</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Card Information</label>
                  <div className="p-4 border border-slate-200 rounded-xl flex items-center gap-3">
                    <svg className="w-6 h-6 text-slate-300" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>
                    <input className="flex-1 outline-none text-slate-900" placeholder="4242 4242 4242 4242" defaultValue="4242 4242 4242 4242" readOnly />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expiry</label>
                    <input className="w-full p-4 border border-slate-200 rounded-xl outline-none" placeholder="MM/YY" defaultValue="12/26" readOnly />
                   </div>
                   <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">CVC</label>
                    <input className="w-full p-4 border border-slate-200 rounded-xl outline-none" placeholder="123" defaultValue="123" readOnly />
                   </div>
                </div>

                <button 
                  onClick={handlePay}
                  className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-200 mt-4"
                >
                  Pay {selectedPlan?.price}
                </button>
                <p className="text-[10px] text-center text-slate-400">Secured by Stripe-Mock Integration</p>
             </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="p-20 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
            <h3 className="text-xl font-bold text-slate-900">Processing Payment...</h3>
            <p className="text-slate-500">Contacting your financial institution.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PricingModal;
