
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
  
  // --- Mobile Navigation State ---
  const [activeTab, setActiveTab] = useState<'view' | 'queue'>('view');
  
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

      const temp = newArr[index];
      newArr[index] = newArr[targetIndex];
      newArr[targetIndex] = temp;

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
        const detected = await detectRegions(fullBase64.split(',')[1]);
        setRegions(detected);
        setAppState(AppState.INTERACTING);
        // On mobile, auto-switch to queue after detection to show findings
        if (window.innerWidth < 1024) setActiveTab('queue');
      } catch (err: any) {
        setError("Analysis failed. Ensure image has clear text.");
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
    if (window.innerWidth < 1024) setActiveTab('view'); // Back to view to show processing

    try {
      const result = await extractTextFromRegions(image!.split(',')[1], regions);
      updateCredits(-1);
      setFinalText(result);
      setAppState(AppState.FINISHED);
    } catch (err: any) {
      setError("Extraction error. Credits preserved.");
      setAppState(AppState.INTERACTING);
    }
  };

  const reset = () => {
    setImage(null);
    setRegions([]);
    setFinalText('');
    setAppState(AppState.IDLE);
    setError(null);
    setActiveTab('view');
  };

  if (showLogin) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100 text-center animate-in zoom-in-95 duration-500">
           <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-200">
             <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
           </div>
           <h1 className="text-3xl font-black text-slate-900 mb-2">Smart Lens Pro</h1>
           <p className="text-slate-500 mb-8 font-medium italic">Premium Developer-Managed OCR</p>
           
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
           <p className="mt-8 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Powered by Private Infrastructure</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {showPricing && <PricingModal onClose={() => setShowPricing(false)} onPurchase={updateCredits} />}
      
      {/* NAVBAR */}
      <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-sm">SL</div>
          <span className="font-black text-slate-900 tracking-tighter text-base">SMART LENS</span>
        </div>
        
        <div className="flex items-center gap-3">
          <div onClick={() => setShowPricing(true)} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full cursor-pointer">
            <span className="text-[10px] font-black text-blue-700">{user?.credits} CR</span>
            <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path d="M12 4v16m8-8H4"/></svg>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-red-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden bg-slate-50">
        
        {/* VIEWPORT TAB */}
        <div className={`flex-1 relative bg-slate-900 flex flex-col ${activeTab === 'view' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            {appState === AppState.IDLE ? (
              <div className="text-center p-6" onClick={() => fileInputRef.current?.click()}>
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-4 mx-auto hover:scale-110 transition-transform cursor-pointer">
                   <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                </div>
                <p className="text-white text-xs font-black tracking-widest uppercase opacity-60">Upload Document</p>
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
                    <p className="font-black text-[10px] uppercase tracking-[0.3em]">{appState === AppState.DETECTING_REGIONS ? 'Analyzing Grid' : 'Backend Processing'}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* FINAL RESULT OVERLAY */}
          {finalText && (
            <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-[2.5rem] shadow-2xl p-6 animate-in slide-in-from-bottom-full duration-500 max-h-[70%] overflow-y-auto z-40">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">EXTRACTION</h3>
                <button onClick={() => { navigator.clipboard.writeText(finalText); alert('Copied!'); }} className="text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-full uppercase">Copy</button>
              </div>
              <div className="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap text-sm pb-10">{finalText}</div>
            </div>
          )}
        </div>

        {/* QUEUE TAB (SIDEBAR) */}
        <div className={`w-full lg:w-[400px] lg:shrink-0 bg-white border-l border-slate-100 flex flex-col overflow-hidden ${activeTab === 'queue' ? 'flex-1 flex' : 'hidden lg:flex'}`}>
          <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
             <div>
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Queue Management</h2>
                <p className="text-sm font-black text-slate-900">Logic Flow & Sequencing</p>
             </div>
             {appState !== AppState.IDLE && (
               <button onClick={reset} className="text-[10px] font-black text-red-500 uppercase tracking-widest">Clear</button>
             )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {regions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-20 p-12">
                <svg className="w-10 h-10 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/></svg>
                <p className="text-[10px] font-black uppercase tracking-widest">Upload to start sequence</p>
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
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${region.isActive ? 'text-red-400 hover:bg-red-50' : 'text-blue-600 hover:bg-blue-50'}`}
                  >
                    {region.isActive ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M12 4v16m8-8H4"/></svg>}
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="p-6 border-t bg-slate-50/80 pb-24 lg:pb-6">
             <button 
              disabled={appState !== AppState.INTERACTING || regions.filter(r => r.isActive).length === 0}
              onClick={handleExtractWithCredits}
              className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-black disabled:bg-slate-200 transform active:scale-[0.97] transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-[10px]"
             >
               {appState === AppState.EXTRACTING ? "SYNTHESIZING..." : "EXECUTE PRO SCAN (1 CR)"}
             </button>
          </div>
        </div>
      </main>

      {/* MOBILE BOTTOM TAB BAR */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex justify-around items-center h-20 px-6 z-50">
        <button 
          onClick={() => setActiveTab('view')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'view' ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={activeTab === 'view' ? 2.5 : 2}><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          <span className="text-[9px] font-black uppercase tracking-tighter">Canvas</span>
        </button>
        <button 
          onClick={() => setActiveTab('queue')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'queue' ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <div className="relative">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={activeTab === 'queue' ? 2.5 : 2}><path d="M4 6h16M4 12h16M4 18h16"/></svg>
            {regions.length > 0 && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white"></div>}
          </div>
          <span className="text-[9px] font-black uppercase tracking-tighter">Queue</span>
        </button>
      </div>

      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] bg-red-600 text-white px-6 py-3 rounded-xl font-bold shadow-2xl animate-in slide-in-from-top-10">
          <span className="text-xs font-black uppercase tracking-widest">{error}</span>
        </div>
      )}
    </div>
  );
};

export default App;
