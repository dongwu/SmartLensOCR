
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
    // Commercial logic: New users get 3 free credits
    const mockUser: User = { id: 'usr_' + Date.now(), email, credits: 3, isPro: false };
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
    const updated = { ...user, credits: user.credits + amount };
    setUser(updated);
    localStorage.setItem('ocr_user', JSON.stringify(updated));
    setShowPricing(false);
  };

  const moveRegion = (id: string, direction: 'up' | 'down') => {
    setRegions(prev => {
      const index = prev.findIndex(r => r.id === id);
      const newArr = [...prev];
      if (direction === 'up' && index > 0) {
        // Swap orders
        const tempOrder = newArr[index].order;
        newArr[index].order = newArr[index - 1].order;
        newArr[index - 1].order = tempOrder;
      } else if (direction === 'down' && index < prev.length - 1) {
        const tempOrder = newArr[index].order;
        newArr[index].order = newArr[index + 1].order;
        newArr[index + 1].order = tempOrder;
      }
      return newArr.sort((a, b) => a.order - b.order);
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
        // Phase 1 (Detecting) is developer-sponsored (Free)
        const detected = await detectRegions(fullBase64.split(',')[1]);
        setRegions(detected);
        setAppState(AppState.INTERACTING);
      } catch (err: any) {
        setError("AI Layout detection failed. Please try a clearer image.");
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
      const result = await extractTextFromRegions(image!.split(',')[1], regions);
      updateCredits(-1);
      setFinalText(result);
      setAppState(AppState.FINISHED);
    } catch (err: any) {
      setError("High-precision extraction failed. No credits were deducted.");
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

  if (showLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100 text-center animate-in zoom-in-95 duration-500">
           <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-200">
             <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
           </div>
           <h1 className="text-3xl font-black text-slate-900 mb-2">Smart Lens Pro</h1>
           <p className="text-slate-500 mb-8 font-medium">Developer-Managed Enterprise OCR</p>
           
           <form onSubmit={handleLogin} className="space-y-4 text-left">
              <label className="text-xs font-bold text-slate-400 uppercase ml-2 tracking-widest">Client Portal Login</label>
              <input 
                type="email" 
                placeholder="email@company.com" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 transition-all font-semibold"
              />
              <button className="w-full py-5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all transform active:scale-95">
                ACCESS PLATFORM
              </button>
           </form>
           <p className="mt-8 text-[10px] text-slate-400 leading-tight uppercase tracking-tighter">Secured with high-encryption. 100% Privacy Guaranteed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {showPricing && <PricingModal onClose={() => setShowPricing(false)} onPurchase={updateCredits} />}
      
      {/* GLOBAL HEADER */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 p-4 md:px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            </div>
            <span className="font-black text-slate-900 tracking-tighter text-lg hidden sm:block">SMART LENS <span className="text-blue-600">PRO</span></span>
          </div>
          
          <div className="flex items-center gap-4">
            <div 
              onClick={() => setShowPricing(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 border border-blue-100 rounded-full cursor-pointer hover:bg-blue-100 transition-all active:scale-95"
            >
              <span className="text-xs font-black text-blue-700 uppercase tracking-widest">{user?.credits} CREDITS</span>
              <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path d="M12 4v16m8-8H4"/></svg>
              </div>
            </div>
            
            <button onClick={handleLogout} className="p-3 text-slate-400 hover:text-red-500 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 md:p-8">
        {/* Workspace Area */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="relative aspect-[4/3] lg:aspect-auto lg:h-[650px] bg-slate-900 rounded-[2.5rem] shadow-2xl border-4 border-white overflow-hidden flex items-center justify-center">
            {appState === AppState.IDLE ? (
              <div className="text-center group cursor-pointer w-full h-full flex flex-col items-center justify-center" onClick={() => fileInputRef.current?.click()}>
                <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-white/10 transition-all transform group-hover:scale-110">
                   <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                </div>
                <h3 className="text-white text-xl font-bold uppercase tracking-widest">Upload Master Image</h3>
                <p className="text-slate-400 text-sm mt-2">Tap to browse documents</p>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
                <img src={image!} alt="Canvas" className="max-w-full max-h-full object-contain" />
                {(appState === AppState.INTERACTING || appState === AppState.EXTRACTING) && (
                  <RegionOverlay regions={regions} onToggleRegion={(id) => setRegions(prev => prev.map(r => r.id === id ? {...r, isActive: !r.isActive} : r))} onSetSelected={setSelectedId} selectedId={selectedId} />
                )}
                {(appState === AppState.DETECTING_REGIONS || appState === AppState.EXTRACTING) && (
                  <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-lg flex flex-col items-center justify-center text-white">
                    <div className="w-12 h-12 border-[5px] border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                    <p className="font-black text-sm uppercase tracking-[0.2em]">{appState === AppState.DETECTING_REGIONS ? 'Analyzing Grid' : 'Performing High-Res OCR'}</p>
                    <p className="text-xs text-slate-400 mt-2 opacity-50">Powered by Gemini Deep Reasoning</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {finalText && (
            <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100 animate-in slide-in-from-bottom-10 duration-700">
              <div className="flex justify-between items-center mb-8 pb-6 border-b">
                <div>
                   <h3 className="text-2xl font-black text-slate-900 tracking-tight">Extracted Intelligence</h3>
                   <p className="text-sm text-slate-400 font-medium">Reconstructed from {regions.filter(r => r.isActive).length} logical regions</p>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(finalText); alert('Intelligence copied to clipboard!'); }} className="text-xs font-black text-blue-600 bg-blue-50 px-6 py-3 rounded-full hover:bg-blue-100 tracking-widest uppercase">COPY TO CLIPBOARD</button>
              </div>
              <div className="prose max-w-none text-slate-800 font-medium leading-[1.8] whitespace-pre-wrap text-lg">{finalText}</div>
            </div>
          )}
        </div>

        {/* Control Sidebar */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col h-[650px] overflow-hidden">
              <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                 <div>
                    <h2 className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-1">Processing Queue</h2>
                    <p className="text-xs font-bold text-slate-900">Define Extraction Sequence</p>
                 </div>
                 {appState !== AppState.IDLE && (
                   <button onClick={reset} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Clear</button>
                 )}
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {regions.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center opacity-30 px-6">
                    <svg className="w-12 h-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
                    <p className="text-xs font-black uppercase tracking-widest">Waiting for Document</p>
                  </div>
                ) : (
                  regions.map((region, idx) => (
                    <div 
                      key={region.id}
                      className={`group flex items-center gap-4 p-5 rounded-2xl border transition-all duration-300 ${
                        !region.isActive ? 'opacity-30 grayscale' : 
                        selectedId === region.id ? 'border-blue-500 bg-blue-50/50 scale-[1.02]' : 'bg-white border-slate-100 hover:border-blue-200'
                      }`}
                      onClick={() => setSelectedId(region.id)}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base shadow-sm transition-colors ${region.isActive ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-400'}`}>{region.order}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-slate-900 uppercase tracking-tight truncate">{region.description}</p>
                      </div>
                      
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                          disabled={idx === 0 || !region.isActive}
                          onClick={(e) => { e.stopPropagation(); moveRegion(region.id, 'up'); }}
                          className="p-1 hover:text-blue-600 disabled:opacity-0"
                         ><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M5 15l7-7 7 7"/></svg></button>
                         <button 
                          disabled={idx === regions.length - 1 || !region.isActive}
                          onClick={(e) => { e.stopPropagation(); moveRegion(region.id, 'down'); }}
                          className="p-1 hover:text-blue-600 disabled:opacity-0"
                         ><svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"/></svg></button>
                      </div>

                      <button 
                        onClick={(e) => { e.stopPropagation(); setRegions(prev => prev.map(r => r.id === region.id ? {...r, isActive: !r.isActive} : r)); }}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${region.isActive ? 'text-red-400 hover:bg-red-50' : 'text-blue-600 hover:bg-blue-50'}`}
                      >
                        {region.isActive ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg> : <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M12 4v16m8-8H4"/></svg>}
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="p-8 bg-slate-50/80 border-t backdrop-blur-sm">
                 <div className="flex justify-between items-center mb-4 px-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Cost</span>
                    <span className="text-xs font-black text-slate-900 uppercase">1 Pro Credit</span>
                 </div>
                 <button 
                  disabled={appState !== AppState.INTERACTING || regions.filter(r => r.isActive).length === 0}
                  onClick={handleExtractWithCredits}
                  className="w-full py-6 bg-slate-900 text-white font-black rounded-2xl shadow-2xl hover:bg-black disabled:bg-slate-200 transform active:scale-[0.97] transition-all flex items-center justify-center gap-4 uppercase tracking-[0.2em] text-[10px]"
                 >
                   {appState === AppState.EXTRACTING ? "SYNTHESIZING..." : (
                     <>
                      <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path d="M13 7H7v6h6V7z"/><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-1 0a7 7 0 11-14 0 7 7 0 0114 0z" clipRule="evenodd"/></svg>
                      EXECUTE MASTER SCAN
                     </>
                   )}
                 </button>
              </div>
           </div>
        </div>
      </main>
      
      {error && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] bg-red-600 text-white px-8 py-4 rounded-2xl font-bold shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-10">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          {error}
          <button onClick={() => setError(null)} className="ml-4 opacity-50 hover:opacity-100">✕</button>
        </div>
      )}
    </div>
  );
};

export default App;
