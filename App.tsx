import React, { useState, useEffect, useCallback } from 'react';
import { AppState, TripEntry, GeneratedReport, Language, ContextSettings, ReportDraft, PublishedReport, GenerationMode } from './types';
import { generateTripReport } from './services/geminiService';
import { saveReportToStorage, loadReportsFromStorage, deleteReportFromStorage, saveSettingsToStorage, loadSettingsFromStorage } from './services/storageService';
import InputSection from './components/InputSection';
import ReportDisplay from './components/ReportDisplay';
import LoginScreen from './components/LoginScreen';
import PublicHome from './components/PublicHome';
import { Loader2, LayoutDashboard, Home, LogOut } from 'lucide-react';

const DEFAULT_SETTINGS: ContextSettings = {
  persona: 'Expert PR Communications Director for a top-tier Blockchain project called "OP_CAT Layer"',
  eventContexts: ['Dr. Bruce is CEO.', 'Side events in Dubai/Abu Dhabi.'],
  keyThemes: 'OP_CAT Layer expansion, Bitcoin ecosystem, Strategic partnerships in MENA, High-level networking.',
  tone: 'Professional, Visionary, Exciting, energetic but grounded in technical authority.',
  referenceUrls: [],
  referenceContent: '',
  referenceStyle: '',
  brandLogo: '',
  brandName: 'OP_CAT Layer',
  brandLocation: 'Dubai • Abu Dhabi',
  authorName: 'Dr. Bruce Liu',
  authorRole: 'CEO, OP_CAT Layer',
  websiteUrl: 'https://opcatlabs.io/',
  twitterUrl: 'https://x.com/opcatlayer',
  telegramUrl: 'https://t.me/opcat_layer/1'
};

// Debounce helper
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
};

const App: React.FC = () => {
  // Navigation State
  const [state, setState] = useState<AppState>(AppState.HOME);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Data State
  const [entries, setEntries] = useState<TripEntry[]>([]);
  const [report, setReport] = useState<GeneratedReport | null>(null);
  
  // Published Reports
  const [publishedReports, setPublishedReports] = useState<PublishedReport[]>([]);
  const [selectedPublicReport, setSelectedPublicReport] = useState<PublishedReport | null>(null);

  // Draft
  const [reportDraft, setReportDraft] = useState<ReportDraft>({
    title: { en: '', zh: '' },
    subtitle: { en: '', zh: '' },
    executiveSummary: { en: '', zh: '' },
    keyTakeaways: [],
    conclusion: { en: '', zh: '' }
  });

  const [error, setError] = useState<string | null>(null);
  const [contextSettings, setContextSettings] = useState<ContextSettings>(DEFAULT_SETTINGS);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('zh');

  // Debounced Settings for Autosave
  const debouncedSettings = useDebounce(contextSettings, 1000);

  // Load Data on Mount
  useEffect(() => {
    const init = async () => {
        const reports = await loadReportsFromStorage();
        setPublishedReports(reports);
        
        const settings = await loadSettingsFromStorage();
        if (settings) {
            setContextSettings(prev => ({ ...prev, ...settings }));
        }
    };
    init();
  }, []);

  // Autosave Settings
  useEffect(() => {
      if (isAuthenticated) {
          saveSettingsToStorage(debouncedSettings).catch(console.error);
      }
  }, [debouncedSettings, isAuthenticated]);

  const handleLogin = () => {
    setIsAuthenticated(true);
    setState(AppState.ADMIN_DASHBOARD);
  };
  
  const handleLogout = () => {
      setIsAuthenticated(false);
      setState(AppState.HOME);
  };

  const handleAddEntry = (entry: TripEntry) => {
    setEntries(prev => [...prev, entry]);
  };

  const handleRemoveEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleUpdateEntry = (id: string, updatedEntry: TripEntry) => {
    setEntries(prev => prev.map(e => e.id === id ? updatedEntry : e));
  };

  const handleReorderEntries = (newEntries: TripEntry[]) => {
    setEntries(newEntries);
  };

  const handlePublishReport = async () => {
      if (!report) return;
      let coverImage = "";
      for (const entry of entries) {
          if (entry.images && entry.images.length > 0) {
              coverImage = entry.images[0];
              break;
          }
      }
      const highlightsWithImages = report.highlights.map(h => {
          const entry = entries.find(e => e.id === h.relatedEntryId);
          if (entry && entry.images && entry.images.length > 0) {
              return { ...h, embeddedImages: entry.images };
          }
          return h;
      });

      const newPublishedReport: PublishedReport = {
          ...report,
          highlights: highlightsWithImages,
          id: Date.now().toString(),
          publishDate: Date.now(),
          coverImage: coverImage,
          authorName: contextSettings.authorName,
          authorRole: contextSettings.authorRole
      };

      const updatedList = [newPublishedReport, ...publishedReports];
      setPublishedReports(updatedList);
      
      try {
          await saveReportToStorage(newPublishedReport);
      } catch (e) {
          console.error("Storage error", e);
          alert("Error saving report.");
      }
  };
  
  const handleLoadReport = (savedReport: PublishedReport) => {
      if(window.confirm('Loading this report will overwrite your current draft. Continue?')) {
          setReport(savedReport);
          setReportDraft({
              title: savedReport.title,
              subtitle: savedReport.subtitle,
              executiveSummary: savedReport.executiveSummary,
              keyTakeaways: savedReport.keyTakeaways,
              conclusion: savedReport.conclusion
          });
          const restoredEntries: TripEntry[] = savedReport.highlights.map(h => {
             return {
                 id: h.relatedEntryId || Date.now().toString(),
                 images: h.embeddedImages || [],
                 note: '', 
                 aiCaption: '',
                 aiCopy: h.description.en || h.description.zh || '',
                 aiTitle: h.title.en || h.title.zh || '',
                 timestamp: Date.now()
             };
          });
          if (restoredEntries.length > 0) {
            setEntries(restoredEntries);
          }
      }
  };

  const handleDeleteReport = async (id: string) => {
      try {
          await deleteReportFromStorage(id);
          setPublishedReports(prev => prev.filter(r => r.id !== id));
      } catch (e) {
          alert("Failed to delete report.");
      }
  };

  const handleExportAIContext = () => {
    const { persona, tone, brandLogo, brandName, brandLocation, authorName, authorRole, websiteUrl, twitterUrl, telegramUrl } = contextSettings;
    const data = { aiContext: { persona, tone, brandLogo, brandName, brandLocation, authorName, authorRole, websiteUrl, twitterUrl, telegramUrl } };
    const dataStr = JSON.stringify(data, null, 2);
    downloadJson(dataStr, `opcat_ai_context.json`);
  };

  const handleImportAIContext = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.aiContext) {
          setContextSettings(prev => ({ ...prev, ...json.aiContext }));
          alert("AI Context imported.");
        } else if (json.settings) {
             setContextSettings(prev => ({ ...prev, ...json.settings }));
             alert("Settings imported.");
        }
      } catch (err) { alert("Failed to parse settings file."); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportReportData = () => {
    const { eventContexts, keyThemes, referenceUrls, referenceContent, referenceStyle } = contextSettings;
    const data = { reportData: { entries, settings: { eventContexts, keyThemes, referenceUrls, referenceContent, referenceStyle }, draft: reportDraft } };
    const dataStr = JSON.stringify(data, null, 2);
    downloadJson(dataStr, `opcat_report_data.json`);
  };

  const handleImportReportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.reportData) {
            if (json.reportData.entries) setEntries(json.reportData.entries);
            if (json.reportData.settings) setContextSettings(prev => ({ ...prev, ...json.reportData.settings }));
            if (json.reportData.draft) setReportDraft(json.reportData.draft);
            alert("Report Data imported.");
        }
      } catch (err) { alert("Failed to parse file."); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const downloadJson = (dataStr: string, filename: string) => {
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerate = async (language: Language, mode: GenerationMode) => {
    setState(AppState.GENERATING);
    setError(null);
    // Even if UI is single language, we want bilingual output if possible for the 'other' field
    // But we set selectedLanguage to the UI choice so the Preview defaults to it.
    setSelectedLanguage(language);
    try {
      const generatedReport = await generateTripReport(entries, language, contextSettings, reportDraft, mode);
      setReport(generatedReport);
      setReportDraft({
        title: generatedReport.title,
        subtitle: generatedReport.subtitle,
        executiveSummary: generatedReport.executiveSummary,
        keyTakeaways: generatedReport.keyTakeaways,
        conclusion: generatedReport.conclusion
      });
      setState(AppState.ADMIN_PREVIEW);
    } catch (err) {
      console.error(err);
      setError("Failed to generate report.");
      setState(AppState.ADMIN_DASHBOARD);
    }
  };

  const handleReportUpdateFromView = (updatedReport: GeneratedReport) => {
    setReport(updatedReport);
    setReportDraft({
      title: updatedReport.title,
      subtitle: updatedReport.subtitle,
      executiveSummary: updatedReport.executiveSummary,
      keyTakeaways: updatedReport.keyTakeaways,
      conclusion: updatedReport.conclusion
    });
  };

  const handleViewPublicReport = (report: PublishedReport) => {
      setSelectedPublicReport(report);
      setReport(report);
      setState(AppState.PUBLIC_ARTICLE);
  };

  return (
    <div className="min-h-screen pb-10 flex flex-col">
      <nav className="border-b border-gray-800 bg-[#0b0e11]/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setState(AppState.HOME)}>
              {contextSettings.brandLogo ? (
                <div className="h-8 w-8 rounded overflow-hidden border border-[#f0b90b] flex-shrink-0 bg-black">
                   <img src={contextSettings.brandLogo} alt="Logo" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="bg-[#f0b90b] h-8 w-8 rounded flex items-center justify-center font-bold text-black text-xs flex-shrink-0">OP</div>
              )}
              <span className="text-xl font-bold text-white tracking-wide brand-font truncate">OP_CAT <span className="text-[#f0b90b]">LAYER</span></span>
            </div>
            
            <div className="flex items-center gap-4">
               {state !== AppState.HOME && !isAuthenticated && (
                   <button onClick={() => setState(AppState.HOME)} className="text-gray-400 hover:text-white flex items-center gap-2 text-sm">
                       <Home size={16}/> Home
                   </button>
               )}
               {isAuthenticated && (
                   <div className="flex items-center gap-4">
                       {(state === AppState.ADMIN_PREVIEW || state === AppState.HOME || state === AppState.PUBLIC_ARTICLE) && (
                           <button onClick={() => setState(AppState.ADMIN_DASHBOARD)} className="text-[#f0b90b] hover:text-[#fcd535] flex items-center gap-2 text-sm font-bold border border-[#f0b90b]/20 px-3 py-1.5 rounded-full bg-[#f0b90b]/5">
                               <LayoutDashboard size={16}/> Mission Control
                           </button>
                       )}
                       <button onClick={handleLogout} className="text-gray-500 hover:text-white flex items-center gap-2 text-sm">
                           <LogOut size={16}/>
                       </button>
                   </div>
               )}
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-7xl mx-auto pt-4">
        {state === AppState.HOME && (
            <PublicHome 
                publishedReports={publishedReports} 
                onViewReport={handleViewPublicReport}
                onLoginClick={() => setState(AppState.LOGIN)}
                brandLogo={contextSettings.brandLogo}
            />
        )}

        {state === AppState.LOGIN && (
            <LoginScreen 
                onLogin={handleLogin} 
                onBack={() => setState(AppState.HOME)}
            />
        )}

        {state === AppState.ADMIN_DASHBOARD && (
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10 animate-fade-in-down">
                <h1 className="text-4xl md:text-5xl font-black text-white mb-2 leading-tight">
                MISSION <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f0b90b] to-[#fcd535]">CONTROL</span>
                </h1>
                <p className="text-lg text-gray-400 font-light">PR Command Center</p>
                <div className="h-1 w-20 bg-[#f0b90b] mx-auto my-4 rounded-full"></div>
            </div>

            {error && (
                <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 rounded-lg text-center mb-6">{error}</div>
            )}
            
            <InputSection 
                entries={entries} 
                contextSettings={contextSettings}
                reportDraft={reportDraft}
                publishedReports={publishedReports}
                onUpdateContextSettings={setContextSettings}
                onUpdateReportDraft={setReportDraft}
                onAddEntry={handleAddEntry} 
                onRemoveEntry={handleRemoveEntry}
                onUpdateEntry={handleUpdateEntry}
                onReorderEntries={handleReorderEntries}
                onGenerate={handleGenerate}
                onExportSettings={handleExportAIContext}
                onImportSettings={handleImportAIContext}
                onExportEntries={handleExportReportData}
                onImportEntries={handleImportReportData}
                onLoadReport={handleLoadReport}
                onDeleteReport={handleDeleteReport}
            />
          </div>
        )}

        {state === AppState.GENERATING && (
          <div className="flex flex-col items-center justify-center h-96 space-y-6">
            <div className="relative">
               <div className="absolute inset-0 bg-[#f0b90b] blur-xl opacity-20 animate-pulse"></div>
               <Loader2 className="h-16 w-16 text-[#f0b90b] animate-spin relative z-10" />
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-2 brand-font">Processing Intel</h3>
              <p className="text-gray-400 mb-1">Generating dual-language report...</p>
            </div>
          </div>
        )}

        {(state === AppState.ADMIN_PREVIEW || state === AppState.PUBLIC_ARTICLE) && report && (
          <ReportDisplay 
            report={report} 
            entries={entries}
            language={state === AppState.PUBLIC_ARTICLE ? 'both' : selectedLanguage}
            contextSettings={contextSettings}
            onBack={() => setState(state === AppState.PUBLIC_ARTICLE ? AppState.HOME : AppState.ADMIN_DASHBOARD)}
            onUpdateReport={handleReportUpdateFromView}
            onUpdateSettings={setContextSettings}
            isPublic={state === AppState.PUBLIC_ARTICLE} 
            onPublish={handlePublishReport}
          />
        )}
      </main>
    </div>
  );
};

export default App;