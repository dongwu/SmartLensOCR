
import React, { useState, useEffect, useRef } from 'react';
import { AppState, TextRegion, User } from './types';
import { detectRegions, extractTextFromRegions } from './services/geminiService';
import RegionOverlay from './components/RegionOverlay';
import PricingModal from './components/PricingModal';

const App: React.FC = () => {
  // --- Auth & Monetization State ---
  const [user, setUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState(true);
  const [showPricing, setShowPricing] = useState(false);
  const [email, setEmail] = useState('');
  
  // --- App Logic State ---
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [image, setImage] = useState<string | null>(null);
  const [regions, setRegions] = useState<TextRegion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [finalText, setFinalText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('ocr_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setShowLogin(false);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    const mockUser: User = { id: 'usr_' + Date.now(), email, credits: 5, isPro: false };
    setUser(mockUser);
    localStorage.setItem('ocr_user', JSON.stringify(mockUser));
    setShowLogin(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('ocr_user');
    setUser(null);
    setShowLogin(true);
    reset();
  };

  const updateCredits = (amount: number) => {
    if (!user) return;
    const updated = { ...user, credits: Math.max(0, user.credits + amount) };
    setUser(updated);
    localStorage.setItem('ocr_user', JSON.stringify(updated));
    setShowPricing(false);
  };

  const moveRegion = (id: string, direction: 'up' | 'down') => {
    setRegions(prev => {
      const index = prev.findIndex(r => r.id === id);
      if (index === -1) return prev;
      
      const newArr = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      
      if (targetIndex < 0 || targetIndex >= newArr.length) return prev;

      // Swap the elements in the array
      const temp = newArr[index];
      newArr[index] = newArr[targetIndex];
      newArr[targetIndex] = temp;

      // Update the 'order' property to match the new array position
      return newArr.map((r, i) => ({ ...r, order: i + 1 }));
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    setAppState(AppState.UPLOADING);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const fullBase64 = reader.result as string;
      setImage(fullBase64);
      try {
        setAppState(AppState.DETECTING_REGIONS);
        // This call represents hitting your Python backend
        const detected = await detectRegions(fullBase64.split(',')[1]);
        setRegions(detected);
        setAppState(AppState.INTERACTING);
      } catch (err: any) {
        setError("Analysis failed. Ensure the image has clear text.");
        setAppState(AppState.IDLE);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExtractWithCredits = async () => {
    if (!user) return;
    if (user.credits <= 0) {
      setShowPricing(true);
      return;
    }
    
    setAppState(AppState.EXTRACTING);
    try {
      // High-res extraction (Phase 2)
      const result = await extractTextFromRegions(image!.split(',')[1], regions);
      updateCredits(-1);
      setFinalText(result);
      setAppState(AppState.FINISHED);
    } catch (err: any) {
      setError("Extraction error. No credits were deducted.");
      setAppState(AppState.INTERACTING);
    }
  };

  const reset = () => {
    setImage(null);
    setRegions([]);
    setFinalText('');
    setAppState(AppState.IDLE);
    setError(null);
  };

  // --- Auth View ---
  if (showLogin) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100 text-center animate-in zoom-in-95 duration-500">
           <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-200">
             <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
           </div>
           <h1 className="text-3xl font-black text-slate-900 mb-2">Smart Lens Pro</h1>
           <p className="text-slate-500 mb-8 font-medium italic">Premium OCR for Mobile Professionals</p>
           
           <form onSubmit={handleLogin} className="space-y-4">
              <input 
                type="email" 
                placeholder="Business Email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 transition-all text-center font-bold"
              />
              <button className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all transform active:scale-95 uppercase tracking-widest text-xs">
                Enter Workspace
              </button>
           </form>
           <p className="mt-8 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Powered by Developer Infrastructure</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {showPricing && <PricingModal onClose={() => setShowPricing(false)} onPurchase={updateCredits} />}
      
      {/* NATIVE-LIKE NAVBAR */}
      <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-sm">SL</div>
          <span className="font-black text-slate-900 tracking-tighter text-base">SMART LENS</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div 
            onClick={() => setShowPricing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full cursor-pointer hover:bg-blue-100 transition-all"
          >
            <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">{user?.credits} CREDITS</span>
            <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path d="M12 4v16m8-8H4"/></svg>
          </div>
          
          <button onClick={handleLogout} className="text-slate-400 hover:text-red-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          </button>
        </div>
      </nav>

      {/* MOBILE-OPTIMIZED MAIN CONTENT */}
      <main className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
        
        {/* VIEWPORT SECTION */}
        <div className="flex-1 relative bg-slate-900 flex flex-col">
          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            {appState === AppState.IDLE ? (
              <div className="text-center group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-4 mx-auto hover:scale-110 transition-transform">
                   <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                </div>
                <p className="text-white text-xs font-black tracking-widest uppercase opacity-60">Upload Source Document</p>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
                <img src={image!} alt="Canvas" className="max-w-full max-h-full object-contain" />
                {(appState === AppState.INTERACTING || appState === AppState.EXTRACTING) && (
                  <RegionOverlay regions={regions} onToggleRegion={() => {}} onSetSelected={setSelectedId} selectedId={selectedId} />
                )}
                {(appState === AppState.DETECTING_REGIONS || appState === AppState.EXTRACTING) && (
                  <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xl flex flex-col items-center justify-center text-white p-6 text-center">
                    <div className="w-10 h-10 border-[4px] border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                    <p className="font-black text-[10px] uppercase tracking-[0.3em]">{appState === AppState.DETECTING_REGIONS ? 'Analyzing Grid' : 'Developer-Side OCR'}</p>
                    <p className="text-[10px] text-slate-500 mt-2 font-medium">Securing session through private backend...</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RESULTS TRAY (Mobile Bottom Sheet Style) */}
          {finalText && (
            <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-[2.5rem] shadow-2xl p-8 animate-in slide-in-from-bottom-full duration-500 max-h-[60%] overflow-y-auto">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-900 tracking-tight">SYNTHESIZED TEXT</h3>
                <button onClick={() => { navigator.clipboard.writeText(finalText); alert('Copied!'); }} className="text-[10px] font-black text-blue-600 bg-blue-50 px-5 py-2.5 rounded-full uppercase tracking-widest">Copy Result</button>
              </div>
              <div className="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap text-base pb-12">{finalText}</div>
            </div>
          )}
        </div>

        {/* CONTROLS SECTION */}
        <div className="w-full lg:w-[400px] shrink-0 bg-white border-l border-slate-100 flex flex-col overflow-hidden">
          <div className="p-6 border-b bg-slate-50/50">
             <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Queue Management</h2>
             <p className="text-sm font-black text-slate-900">Define Reordering & Sequence</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {regions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-20 p-12">
                <svg className="w-10 h-10 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/></svg>
                <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Layout logic will appear here after upload</p>
              </div>
            ) : (
              regions.map((region, idx) => (
                <div 
                  key={region.id}
                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                    !region.isActive ? 'opacity-30' : 
                    selectedId === region.id ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'bg-white border-slate-100'
                  }`}
                  onClick={() => setSelectedId(region.id)}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${region.isActive ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400'}`}>{region.order}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-900 uppercase truncate">{region.description}</p>
                  </div>
                  
                  {/* REORDERING BUTTONS */}
                  <div className="flex flex-col gap-0.5">
                    <button 
                      disabled={idx === 0 || !region.isActive}
                      onClick={(e) => { e.stopPropagation(); moveRegion(region.id, 'up'); }}
                      className="p-1 hover:text-blue-600 disabled:opacity-0"
                    ><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24"><path d="M5 15l7-7 7 7"/></svg></button>
                    <button 
                      disabled={idx === regions.length - 1 || !region.isActive}
                      onClick={(e) => { e.stopPropagation(); moveRegion(region.id, 'down'); }}
                      className="p-1 hover:text-blue-600 disabled:opacity-0"
                    ><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"/></svg></button>
                  </div>

                  <button 
                    onClick={(e) => { e.stopPropagation(); setRegions(prev => prev.map(r => r.id === region.id ? {...r, isActive: !r.isActive} : r)); }}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${region.isActive ? 'text-red-400 hover:bg-red-50' : 'text-blue-600 hover:bg-blue-50'}`}
                  >
                    {region.isActive ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M12 4v16m8-8H4"/></svg>}
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="p-6 border-t bg-slate-50/80">
             <div className="flex justify-between items-center mb-4 px-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Processing Fee</span>
                <span className="text-[10px] font-black text-slate-900 uppercase">1 Pro Credit</span>
             </div>
             <button 
              disabled={appState !== AppState.INTERACTING || regions.filter(r => r.isActive).length === 0}
              onClick={handleExtractWithCredits}
              className="w-full py-5 bg-slate-900 text-white font-black rounded-[1.25rem] shadow-2xl hover:bg-black disabled:bg-slate-200 transform active:scale-[0.97] transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-[10px]"
             >
               {appState === AppState.EXTRACTING ? "CONNECTING TO BACKEND..." : (
                 <>
                  <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path d="M13 7H7v6h6V7z"/><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-1 0a7 7 0 11-14 0 7 7 0 0114 0z" clipRule="evenodd"/></svg>
                  PRO SCAN START
                 </>
               )}
             </button>
          </div>
        </div>
      </main>

      {error && (
        <div className="fixed top-[calc(env(safe-area-inset-top)+20px)] left-1/2 -translate-x-1/2 z-[200] bg-red-600 text-white px-6 py-4 rounded-2xl font-bold shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-10">
          <span className="text-sm font-black uppercase tracking-widest">{error}</span>
          <button onClick={() => setError(null)} className="ml-4 opacity-50">✕</button>
        </div>
      )}
    </div>
  );
};

export default App;
