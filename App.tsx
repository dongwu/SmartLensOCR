
import React, { useState, useCallback, useRef } from 'react';
import { AppState, TextRegion } from './types';
import { detectRegions, extractTextFromRegions } from './services/geminiService';
import RegionOverlay from './components/RegionOverlay';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [image, setImage] = useState<string | null>(null);
  const [regions, setRegions] = useState<TextRegion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [finalText, setFinalText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setAppState(AppState.UPLOADING);

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = (reader.result as string).split(',')[1];
      setImage(reader.result as string);
      
      try {
        setAppState(AppState.DETECTING_REGIONS);
        const detected = await detectRegions(base64String);
        setRegions(detected);
        setAppState(AppState.INTERACTING);
      } catch (err) {
        setError("Failed to process image. Please try again.");
        setAppState(AppState.IDLE);
      }
    };
    reader.readAsDataURL(file);
  };

  const updateRegionOrder = (id: string, newOrder: number) => {
    setRegions(prev => {
      const updated = prev.map(r => r.id === id ? { ...r, order: newOrder } : r);
      // Automatically sort others if there's conflict or keep it simple
      return updated.sort((a, b) => a.order - b.order);
    });
  };

  const toggleRegionActive = (id: string) => {
    setRegions(prev => prev.map(r => 
      r.id === id ? { ...r, isActive: !r.isActive } : r
    ));
  };

  const moveRegion = (id: string, direction: 'up' | 'down') => {
    setRegions(prev => {
      const index = prev.findIndex(r => r.id === id);
      if (direction === 'up' && index > 0) {
        const newArr = [...prev];
        const tempOrder = newArr[index].order;
        newArr[index].order = newArr[index - 1].order;
        newArr[index - 1].order = tempOrder;
        return newArr.sort((a, b) => a.order - b.order);
      }
      if (direction === 'down' && index < prev.length - 1) {
        const newArr = [...prev];
        const tempOrder = newArr[index].order;
        newArr[index].order = newArr[index + 1].order;
        newArr[index + 1].order = tempOrder;
        return newArr.sort((a, b) => a.order - b.order);
      }
      return prev;
    });
  };

  const handleExtract = async () => {
    if (!image) return;
    setAppState(AppState.EXTRACTING);
    setError(null);
    try {
      const base64 = image.split(',')[1];
      const result = await extractTextFromRegions(base64, regions);
      setFinalText(result);
      setAppState(AppState.FINISHED);
    } catch (err) {
      setError("Text extraction failed.");
      setAppState(AppState.INTERACTING);
    }
  };

  const reset = () => {
    setImage(null);
    setRegions([]);
    setFinalText('');
    setAppState(AppState.IDLE);
    setSelectedId(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-slate-50 text-slate-900 p-4 md:p-8">
      {/* Header */}
      <header className="w-full max-w-6xl flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-blue-600">Smart Lens OCR</h1>
          <p className="text-slate-500">Selective text extraction powered by Gemini Vision</p>
        </div>
        {appState !== AppState.IDLE && (
          <button 
            onClick={reset}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            Start Over
          </button>
        )}
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Image Canvas */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="relative bg-white border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden min-h-[400px] flex items-center justify-center shadow-lg transition-all duration-300">
            {appState === AppState.IDLE ? (
              <div 
                className="text-center p-12 cursor-pointer w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold">Upload an image</h3>
                <p className="text-slate-500 mt-1">Drag and drop or click to browse</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  accept="image/*"
                />
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center overflow-auto bg-slate-900 group">
                <img src={image!} alt="Uploaded" className="max-w-full h-auto object-contain block" />
                
                {(appState === AppState.INTERACTING || appState === AppState.EXTRACTING) && (
                  <RegionOverlay 
                    regions={regions} 
                    onToggleRegion={toggleRegionActive} 
                    onSetSelected={setSelectedId}
                    selectedId={selectedId}
                  />
                )}

                {appState === AppState.UPLOADING || appState === AppState.DETECTING_REGIONS ? (
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-lg font-medium animate-pulse">
                      {appState === AppState.UPLOADING ? "Uploading Image..." : "Scanning for Text Regions..."}
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
          
          {error && (
             <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
             </div>
          )}

          {appState === AppState.FINISHED && (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Extracted Result</h3>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(finalText);
                    alert("Copied to clipboard!");
                  }}
                  className="p-2 text-slate-500 hover:text-blue-600 transition-colors"
                  title="Copy to clipboard"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                </button>
              </div>
              <div className="prose max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed">
                {finalText}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Region Controls */}
        <div className="lg:col-span-4 sticky top-8">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100vh-8rem)]">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="font-bold text-lg">Text Regions</h2>
              <p className="text-xs text-slate-500">Rearrange regions to change reading order</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {regions.length === 0 ? (
                <div className="text-center py-12 text-slate-400 italic">
                  No regions detected yet.
                </div>
              ) : (
                regions.map((region, index) => (
                  <div 
                    key={region.id}
                    onClick={() => setSelectedId(region.id)}
                    className={`group relative flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      !region.isActive ? 'bg-slate-50 border-slate-100 opacity-60' : 
                      selectedId === region.id ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      !region.isActive ? 'bg-slate-200 text-slate-500' : 'bg-blue-600 text-white'
                    }`}>
                      {region.order}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${!region.isActive ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                        {region.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      {region.isActive && (
                        <>
                          <button 
                            onClick={(e) => { e.stopPropagation(); moveRegion(region.id, 'up'); }}
                            disabled={index === 0}
                            className="p-1.5 text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-slate-400"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); moveRegion(region.id, 'down'); }}
                            disabled={index === regions.length - 1}
                            className="p-1.5 text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-slate-400"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </button>
                        </>
                      )}
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleRegionActive(region.id); }}
                        className={`p-1.5 rounded-md transition-colors ${
                          region.isActive ? 'text-slate-400 hover:bg-red-50 hover:text-red-500' : 'text-blue-500 hover:bg-blue-50'
                        }`}
                        title={region.isActive ? "Discard region" : "Include region"}
                      >
                        {region.isActive ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200">
              <button 
                disabled={appState !== AppState.INTERACTING || regions.filter(r => r.isActive).length === 0}
                onClick={handleExtract}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
              >
                {appState === AppState.EXTRACTING ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Extracting...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Extract {regions.filter(r => r.isActive).length} Regions
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full max-w-6xl mt-12 py-8 border-t border-slate-200 text-center text-slate-400 text-sm">
        Built with Gemini Flash & React 18
      </footer>
    </div>
  );
};

export default App;
