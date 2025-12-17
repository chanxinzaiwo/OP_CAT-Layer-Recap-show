import React, { useRef, useState, useEffect } from 'react';
import { GeneratedReport, TripEntry, Language, ContextSettings } from '../types';
import { Quote, Share2, ArrowLeft, Download, Check, Edit2, Save, Trash2, MessageSquare, Twitter, Send, Globe, Code, UploadCloud, Copy, ExternalLink } from 'lucide-react';
import { toJpeg } from 'html-to-image';

interface ReportDisplayProps {
  report: GeneratedReport;
  entries?: TripEntry[]; // Optional in public mode
  language: Language; 
  contextSettings: ContextSettings;
  onBack: () => void;
  onUpdateReport?: (report: GeneratedReport) => void; 
  onUpdateSettings?: (settings: ContextSettings) => void;
  
  // [NEW] Props for Site Logic
  isPublic?: boolean; 
  onPublish?: () => void;
}

const ReportDisplay: React.FC<ReportDisplayProps> = ({ 
  report: initialReport, 
  entries = [], 
  language, 
  contextSettings, 
  onBack, 
  onUpdateReport, 
  onUpdateSettings,
  isPublic = false,
  onPublish
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  
  // Local state for editing
  const [report, setReport] = useState<GeneratedReport>(initialReport);
  const [isEditing, setIsEditing] = useState(false);
  
  // Tab state: Initialize based on input language, but allow free toggling
  // If language is 'both', default to 'en', otherwise use the specific language
  const [activeTab, setActiveTab] = useState<'en' | 'zh'>(language === 'zh' ? 'zh' : 'en');

  // Destructure with defaults
  const { 
    brandLogo, 
    brandName = "OP_CAT Press", 
    brandLocation = "Dubai • Abu Dhabi", 
    authorName, 
    authorRole, 
    websiteUrl, 
    twitterUrl, 
    telegramUrl 
  } = contextSettings;

  // Sync prop changes
  useEffect(() => {
    setReport(initialReport);
  }, [initialReport]);
  
  // Propagate changes up to App
  useEffect(() => {
    if (isEditing === false && onUpdateReport && !isPublic) {
      onUpdateReport(report);
    }
  }, [report, isEditing, onUpdateReport, isPublic]);

  // FIX: Display logic now depends SOLELY on the active tab, ignoring the 'language' prop restriction.
  const showEn = activeTab === 'en';
  const showZh = activeTab === 'zh';
  
  const getEntryForHighlight = (entryId?: string): TripEntry | undefined => {
    if (!entryId) return undefined;
    return entries.find(e => e.id === entryId) || entries.find(e => e.note && e.note.includes(entryId));
  };

  const handleDownloadImage = async () => {
    if (!reportRef.current) return;
    const wasEditing = isEditing;
    if (wasEditing) setIsEditing(false);
    setIsDownloading(true);

    setTimeout(async () => {
      try {
        if (!reportRef.current) return;
        const fontUrl = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Orbitron:wght@500;700;900&display=swap';
        let fontCss = '';
        try {
           const res = await fetch(fontUrl);
           fontCss = await res.text();
        } catch(e) { console.warn("Failed to fetch fonts", e); }

        const dataUrl = await toJpeg(reportRef.current, {
           quality: 0.95,
           backgroundColor: '#ffffff',
           pixelRatio: 3, 
           fontEmbedCSS: fontCss,
           style: { margin: '0', transform: 'none' }
        });
        
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = `OP_CAT_Recap_${activeTab}_${Date.now()}.jpg`;
        link.click();
        
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 2000);
      } catch (error) {
        console.error("Failed to download image", error);
        alert("Export failed. Please try again.");
      } finally {
        setIsDownloading(false);
        if (wasEditing) setIsEditing(true);
      }
    }, 500);
  };

  const handleExportHtml = () => {
     if (!reportRef.current) return;
     const wasEditing = isEditing;
     if (wasEditing) setIsEditing(false); // Briefly exit edit mode to capture clean state

     setTimeout(() => {
        try {
            const contentHtml = reportRef.current?.innerHTML;
            const title = report.title?.en || report.title?.zh || "Report";
            
            const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Orbitron:wght@500;700;900&display=swap" rel="stylesheet">
    <style>
      body { 
        margin: 0; 
        padding: 0; 
        font-family: 'Inter', sans-serif; 
        background-color: #0b0e11; 
        color: #1a1a1a; 
        display: flex; 
        justify-content: center; 
        min-height: 100vh; 
      }
      .brand-font { font-family: 'Orbitron', sans-serif; }
      
      .report-wrapper { 
        width: 100%; 
        max-width: 480px; 
        background: white; 
        margin: 0 auto;
        min-height: 100vh;
      }

      /* Desktop adjustments */
      @media (min-width: 500px) {
         body { 
            padding: 40px 20px; 
            align-items: flex-start; 
         }
         .report-wrapper { 
            min-height: auto; 
            box-shadow: 0 20px 60px rgba(0,0,0,0.5); 
            border-radius: 0; 
         }
      }
    </style>
</head>
<body>
    <div class="report-wrapper">
        ${contentHtml}
    </div>
</body>
</html>`;
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `OP_CAT_Site_${Date.now()}.html`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch(e) {
            console.error("Export HTML failed", e);
            alert("Export HTML failed.");
        } finally {
            if (wasEditing) setIsEditing(true);
        }
     }, 100);
  };

  const handlePublish = () => {
    if (onPublish) {
        onPublish();
        setPublishSuccess(true);
        setTimeout(() => setPublishSuccess(false), 3000);
    }
  };

  const handleShare = async () => {
    const title = activeTab === 'en' ? report.title?.en : report.title?.zh;
    const summary = activeTab === 'en' ? report.executiveSummary?.en : report.executiveSummary?.zh;
    const url = window.location.href;
    const textToShare = `${title}\n\n${summary}\n\nRead more: ${url}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'OP_CAT Report',
          text: textToShare,
          url: url,
        });
      } catch (error) {
        console.log('Error sharing', error);
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(textToShare);
        alert("Summary copied to clipboard!");
      } catch (err) {
        alert("Failed to copy to clipboard");
      }
    }
  };

  // --- Update Handlers ---
  const handleTitleChange = (lang: 'en' | 'zh', val: string) => 
    setReport(prev => ({ ...prev, title: { ...prev.title, [lang]: val } }));
  const handleSubtitleChange = (lang: 'en' | 'zh', val: string) => 
    setReport(prev => ({ ...prev, subtitle: { ...prev.subtitle, [lang]: val } }));
  const handleSummaryChange = (lang: 'en' | 'zh', val: string) => 
    setReport(prev => ({ ...prev, executiveSummary: { ...prev.executiveSummary, [lang]: val } }));
  const handleConclusionChange = (lang: 'en' | 'zh', val: string) => 
    setReport(prev => ({ ...prev, conclusion: { ...prev.conclusion, [lang]: val } }));
  const handleHighlightChange = (index: number, field: 'title' | 'description' | 'location', lang: 'en' | 'zh', val: string) => {
    setReport(prev => {
      const newHighlights = [...prev.highlights];
      const currentHighlight = newHighlights[index] || {};
      const currentField = currentHighlight[field] || {};
      newHighlights[index] = { ...currentHighlight, [field]: { ...currentField, [lang]: val } } as any;
      return { ...prev, highlights: newHighlights };
    });
  };
  const handleTakeawayChange = (index: number, lang: 'en' | 'zh', val: string) => {
    setReport(prev => {
      const newTakeaways = [...(prev.keyTakeaways || [])];
      const currentTakeaway = newTakeaways[index] || {};
      newTakeaways[index] = { ...currentTakeaway, [lang]: val };
      return { ...prev, keyTakeaways: newTakeaways };
    });
  };
  const deleteHighlight = (index: number) => {
    if(window.confirm('Delete this highlight?')) {
      setReport(prev => ({ ...prev, highlights: prev.highlights.filter((_, i) => i !== index) }));
    }
  };
  const deleteTakeaway = (index: number) => {
     setReport(prev => ({ ...prev, keyTakeaways: (prev.keyTakeaways || []).filter((_, i) => i !== index) }));
  };

  const inputClass = "w-full bg-transparent border border-gray-300 rounded px-3 py-2 text-base focus:border-[#f0b90b] focus:ring-1 focus:ring-[#f0b90b] outline-none transition-all";
  const textareaClass = "w-full bg-transparent border border-gray-300 rounded px-3 py-2 text-base focus:border-[#f0b90b] focus:ring-1 focus:ring-[#f0b90b] outline-none transition-all resize-y min-h-[80px]";
  const darkInputClass = "w-full bg-black/20 border border-white/20 rounded px-3 py-2 text-white text-base focus:border-[#f0b90b] focus:ring-1 focus:ring-[#f0b90b] outline-none transition-all";

  const title = report.title || {};
  const subtitle = report.subtitle || {};
  const executiveSummary = report.executiveSummary || {};
  const highlights = report.highlights || [];
  const keyTakeaways = report.keyTakeaways || [];
  const conclusion = report.conclusion || {};

  return (
    <div className="w-full flex flex-col items-center mb-20 animate-fade-in">
      
      {/* Control Bar - Sticky - SINGLE ROW */}
      <div className="w-full max-w-[480px] sticky top-20 z-40 px-0">
          <div className="flex flex-wrap justify-between items-center bg-[#0b0e11]/95 backdrop-blur p-3 rounded-xl border border-gray-800 shadow-xl w-full gap-2">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium pr-2 border-r border-gray-700">
              <ArrowLeft size={16} /> Back
            </button>
            
            <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
               {/* Language Switcher */}
               <div className="flex bg-gray-800 rounded-lg p-0.5 border border-gray-700">
                  <button 
                    onClick={() => setActiveTab('en')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'en' ? 'bg-[#f0b90b] text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}
                  >
                    EN
                  </button>
                  <button 
                    onClick={() => setActiveTab('zh')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'zh' ? 'bg-[#f0b90b] text-black shadow-sm' : 'text-gray-400 hover:text-white'}`}
                  >
                    ZH
                  </button>
               </div>

               {/* Share Button (Public) */}
               <button onClick={handleShare} className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors border border-gray-700">
                  <Share2 size={16} />
               </button>

              {/* ADMIN MODE BUTTONS */}
              {!isPublic && (
                <>
                  <button onClick={() => setIsEditing(!isEditing)} className={`p-2 rounded-lg transition-all border ${isEditing ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700'}`}>
                    {isEditing ? <Save size={16} /> : <Edit2 size={16} />}
                  </button>
                  
                  {/* Publish Button */}
                  <button onClick={handlePublish} disabled={isEditing || publishSuccess} className={`p-2 rounded-lg transition-all border ${publishSuccess ? 'bg-green-600 border-green-500 text-white' : 'bg-purple-600 border-purple-500 text-white hover:bg-purple-700'}`}>
                    {publishSuccess ? <Check size={16}/> : <UploadCloud size={16} />}
                  </button>

                  {/* Export HTML Button */}
                  <button onClick={handleExportHtml} disabled={isDownloading || isEditing} className="p-2 rounded-lg transition-all bg-gray-800 border border-gray-700 text-gray-200 hover:bg-gray-700">
                    <Code size={16} />
                  </button>
                </>
              )}
              
              {/* Save Image Button (Public & Admin) */}
              <button onClick={handleDownloadImage} disabled={isDownloading || isEditing} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${downloadSuccess ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'bg-[#f0b90b] text-black hover:bg-[#d9a506] disabled:opacity-50'}`}>
                {downloadSuccess ? <Check size={14} /> : <Download size={14} />} {downloadSuccess ? 'Saved' : 'Save Img'}
              </button>
            </div>
          </div>
      </div>

      {/* Report Container */}
      <div ref={reportRef} data-report-container="true" className="w-full max-w-[480px] bg-white text-gray-900 shadow-2xl overflow-hidden mt-4" style={{ minHeight: '800px' }}>
        
        {/* Banner Section */}
        <div className="relative min-h-[16rem] h-auto bg-slate-900 flex items-center justify-center overflow-hidden py-8">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0b0e11] via-[#1a1f26] to-[#0b0e11]"></div>
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#f0b90b] via-transparent to-transparent blur-3xl"></div>
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
          
          <div className="relative z-10 text-center px-6 w-full flex flex-col items-center">
            <div className="flex items-center justify-center mb-6">
               <div className="inline-flex items-center gap-2 border border-[#f0b90b] rounded-full px-4 py-1 bg-black/40 shadow-[0_0_10px_rgba(240,185,11,0.2)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#f0b90b]"></div>
                  <span className="text-[#f0b90b] text-[10px] font-bold tracking-[0.2em] uppercase leading-relaxed pt-px">Official Recap</span>
                  {showZh && <span className="text-[#f0b90b] text-[10px] font-bold tracking-widest border-l border-[#f0b90b]/40 pl-2 leading-relaxed pt-px">官方回顾</span>}
               </div>
            </div>
            {isEditing && !isPublic ? (
               <div className="w-full space-y-3">
                 {showEn && <textarea value={title.en || ''} onChange={(e) => handleTitleChange('en', e.target.value)} className={`${darkInputClass} text-center font-bold text-2xl font-sans min-h-[4rem]`} placeholder="English Title" />}
                 {showZh && <textarea value={title.zh || ''} onChange={(e) => handleTitleChange('zh', e.target.value)} className={`${darkInputClass} text-center font-bold text-xl min-h-[3rem]`} placeholder="Chinese Title" />}
                 <div className="flex flex-col gap-2 mt-2">
                    {showEn && <input value={subtitle.en || ''} onChange={(e) => handleSubtitleChange('en', e.target.value)} className={`${darkInputClass} text-center text-sm`} placeholder="English Subtitle" />}
                    {showZh && <input value={subtitle.zh || ''} onChange={(e) => handleSubtitleChange('zh', e.target.value)} className={`${darkInputClass} text-center text-sm`} placeholder="Chinese Subtitle" />}
                 </div>
               </div>
            ) : (
              <>
                {showEn && title.en && <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2 font-sans tracking-tight text-shadow-sm leading-tight px-2 break-words max-w-full">{title.en}</h1>}
                {showZh && title.zh && <h2 className={`text-xl font-bold text-gray-200 mb-4 font-sans ${!title.en ? 'text-2xl text-white' : ''} px-2 leading-snug break-words`}>{title.zh}</h2>}
                <div className="flex flex-col justify-center gap-1 text-gray-400 font-light text-sm px-4">
                  {showEn && subtitle.en && <span>{subtitle.en}</span>}
                  {showZh && subtitle.zh && <span>{subtitle.zh}</span>}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="px-6 py-8 bg-white">
          {/* Author Block */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-5 mb-8">
            <div className="flex items-center gap-3">
              {brandLogo ? (
                <div className="w-11 h-11 rounded-full border-2 border-[#f0b90b] shadow-sm overflow-hidden shrink-0 bg-black flex items-center justify-center">
                   <img src={brandLogo} alt="OP" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-11 h-11 bg-black rounded-full flex items-center justify-center text-[#f0b90b] font-bold text-lg border-2 border-[#f0b90b] shadow-sm shrink-0 leading-none">OP</div>
              )}
              <div className="leading-tight flex flex-col justify-center">
                {isEditing && !isPublic ? (
                  <>
                    <input value={brandName} onChange={(e) => onUpdateSettings && onUpdateSettings({...contextSettings, brandName: e.target.value})} className="font-bold text-base text-gray-900 border-b border-gray-300 w-full mb-1" placeholder="Brand Name" />
                    <input value={brandLocation} onChange={(e) => onUpdateSettings && onUpdateSettings({...contextSettings, brandLocation: e.target.value})} className="text-gray-500 text-xs uppercase tracking-wide border-b border-gray-300 w-full" placeholder="Brand Location" />
                  </>
                ) : (
                  <>
                    <p className="font-bold text-base text-gray-900">{brandName}</p>
                    <p className="text-gray-500 text-xs uppercase tracking-wide">{brandLocation}</p>
                  </>
                )}
              </div>
            </div>
            {/* Share button moved to top, placeholder if needed for spacing */}
            <div></div>
          </div>

          {/* Executive Summary */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold mb-4 font-sans flex items-baseline gap-2 text-gray-900 tracking-tight">Executive Summary {showZh && <span className="text-lg font-normal text-gray-500 font-sans">执行摘要</span>}</h2>
            <div className="bg-[#fefce8] border-l-[4px] border-[#f0b90b] p-5 space-y-4 rounded-r-lg shadow-sm">
               {isEditing && !isPublic ? (
                 <>
                    {showEn && <textarea value={executiveSummary.en || ''} onChange={(e) => handleSummaryChange('en', e.target.value)} className={`${textareaClass} text-gray-800 font-medium`} placeholder="English Summary" />}
                    {showZh && <textarea value={executiveSummary.zh || ''} onChange={(e) => handleSummaryChange('zh', e.target.value)} className={`${textareaClass} text-gray-800`} placeholder="Chinese Summary" />}
                 </>
               ) : (
                 <>
                   {showEn && executiveSummary.en && <p className="text-base leading-relaxed text-gray-800 font-medium text-justify">{executiveSummary.en}</p>}
                   {showZh && executiveSummary.zh && <p className="text-base leading-relaxed text-gray-800 text-justify">{executiveSummary.zh}</p>}
                 </>
               )}
            </div>
          </div>

          {/* Highlights */}
          <div className="relative mb-10">
            <h2 className="text-2xl font-bold mb-6 font-sans flex items-baseline gap-2 text-gray-900 tracking-tight">Highlights {showZh && <span className="text-lg font-normal text-gray-500 font-sans">行程亮点</span>}</h2>
            <div className="space-y-8">
              {highlights.map((highlight, idx) => {
                // [NEW] Persistance logic: use embedded images first, fall back to entry lookup
                let displayImages: string[] = [];
                let displayHeroIndices: number[] = [];

                if (highlight.embeddedImages && highlight.embeddedImages.length > 0) {
                    displayImages = highlight.embeddedImages;
                    // If embedded, assume first is hero if no indices saved (simplification)
                    displayHeroIndices = [0];
                } else {
                    // Fallback to old behavior
                    const entry = getEntryForHighlight(highlight.relatedEntryId);
                    if (entry) {
                        displayImages = entry.images;
                        displayHeroIndices = entry.heroImageIndices || [];
                    }
                }
                
                const heroImages = displayImages.filter((_, i) => displayHeroIndices.includes(i));
                const gridImages = displayImages.filter((_, i) => !displayHeroIndices.includes(i));
                
                const hLocation = highlight.location || {};
                const hTitle = highlight.title || {};
                const hDesc = highlight.description || {};

                return (
                  <div key={idx} className="relative group">
                    <div className="flex items-center gap-3 mb-3 relative">
                         {isEditing && !isPublic && <button onClick={() => deleteHighlight(idx)} className="absolute -right-2 top-0 bg-red-500 text-white p-1 rounded-full shadow hover:bg-red-600 z-20"><Trash2 size={12} /></button>}
                         <div className="w-3 h-3 bg-[#f0b90b] rounded-full shadow-[0_0_8px_#f0b90b] flex-shrink-0"></div>
                         <div className="flex-1 flex items-center border-b border-[#f0b90b]/20 pb-1">
                             <div className="text-[#f0b90b] text-xs font-bold uppercase tracking-wider leading-none">
                                {isEditing && !isPublic ? (
                                  <div className="flex-1 flex gap-2">
                                     {showEn && <input value={hLocation.en || ''} onChange={(e) => handleHighlightChange(idx, 'location', 'en', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1" placeholder="Loc EN" />}
                                     {showZh && <input value={hLocation.zh || ''} onChange={(e) => handleHighlightChange(idx, 'location', 'zh', e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded px-2 py-1" placeholder="Loc ZH" />}
                                  </div>
                                ) : (
                                  <>
                                    {showEn && hLocation.en && <span>{hLocation.en}</span>}
                                    {showZh && hLocation.zh && <span>{hLocation.zh}</span>}
                                  </>
                                )}
                             </div>
                         </div>
                    </div>
                    <div className="relative pl-6 ml-1.5 border-l border-dashed border-gray-200 pb-2">
                      {isEditing && !isPublic ? (
                        <div className="space-y-3 mb-3">
                           {showEn && <input value={hTitle.en || ''} onChange={(e) => handleHighlightChange(idx, 'title', 'en', e.target.value)} className={`${inputClass} font-bold text-xl`} placeholder="Title EN" />}
                           {showZh && <input value={hTitle.zh || ''} onChange={(e) => handleHighlightChange(idx, 'title', 'zh', e.target.value)} className={`${inputClass} font-bold text-gray-900`} placeholder="Title ZH" />}
                        </div>
                      ) : (
                        <>
                           {showEn && hTitle.en && <h3 className="text-xl font-bold font-sans mb-1 text-gray-900 leading-tight">{hTitle.en}</h3>}
                           {showZh && hTitle.zh && <h4 className="text-lg font-bold font-sans mb-3 text-gray-900 leading-tight">{hTitle.zh}</h4>}
                        </>
                      )}
                      <div className="space-y-3">
                        {isEditing && !isPublic ? (
                          <>
                             {showEn && <textarea value={hDesc.en || ''} onChange={(e) => handleHighlightChange(idx, 'description', 'en', e.target.value)} className={textareaClass} placeholder="Desc EN" />}
                             {showZh && <textarea value={hDesc.zh || ''} onChange={(e) => handleHighlightChange(idx, 'description', 'zh', e.target.value)} className={textareaClass} placeholder="Desc ZH" />}
                          </>
                        ) : (
                          <>
                             {showEn && hDesc.en && <p className="text-gray-800 text-base leading-relaxed">{hDesc.en}</p>}
                             {showZh && hDesc.zh && <p className="text-gray-800 text-base leading-relaxed">{hDesc.zh}</p>}
                          </>
                        )}
                      </div>
                      <div className="mt-4 space-y-2">
                         {heroImages.map((img, i) => (<div key={`hero-${i}`} className="rounded-lg overflow-hidden border border-gray-100 bg-gray-50 shadow-sm"><img src={img} alt="Hero" className="w-full h-auto block" loading="eager" /></div>))}
                         {gridImages.length > 0 && (
                            <div className="flex flex-wrap gap-2 justify-between">
                              {gridImages.map((img, i) => (<div key={`grid-${i}`} className="rounded-lg overflow-hidden border border-gray-100 bg-gray-50 shadow-sm" style={{ width: 'calc(50% - 6px)' }}><img src={img} alt="Grid" className="w-full h-auto block object-cover" loading="eager" /></div>))}
                            </div>
                         )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Takeaways */}
          <div className="mb-10 bg-[#0b0e11] text-white p-6 rounded-xl relative overflow-hidden shadow-inner">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#f0b90b] opacity-10 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3"></div>
            <h2 className="text-2xl font-bold mb-6 font-sans text-[#f0b90b] flex flex-col sm:flex-row sm:items-baseline gap-2 tracking-tight">Takeaways {showZh && <span className="text-lg font-normal text-gray-500 font-sans">战略要点</span>}</h2>
            <div className="grid grid-cols-1 gap-6 relative z-10">
              {keyTakeaways.map((takeaway, idx) => (
                <div key={idx} className="flex gap-4 group relative border-b border-gray-800 pb-4 last:border-0 last:pb-0">
                  {isEditing && !isPublic && <button onClick={() => deleteTakeaway(idx)} className="absolute -top-1 -right-1 bg-red-500/80 hover:bg-red-500 text-white p-1 rounded-full z-20"><Trash2 size={12} /></button>}
                  <div className="text-[#f0b90b] opacity-60 pt-1 shrink-0"><Quote size={20} className="transform rotate-180" /></div>
                  <div className="space-y-3 w-full">
                    {isEditing && !isPublic ? (
                       <>
                         {showEn && <textarea value={takeaway.en || ''} onChange={(e) => handleTakeawayChange(idx, 'en', e.target.value)} className="w-full bg-white/10 border border-white/20 rounded p-2 text-white text-base" rows={3} />}
                         {showZh && <textarea value={takeaway.zh || ''} onChange={(e) => handleTakeawayChange(idx, 'zh', e.target.value)} className="w-full bg-white/10 border border-white/20 rounded p-2 text-gray-300 text-base" rows={3} />}
                       </>
                    ) : (
                      <>
                        {showEn && takeaway.en && <p className="text-gray-200 font-medium text-base leading-relaxed">{takeaway.en}</p>}
                        {showZh && takeaway.zh && <p className="text-gray-300 text-base leading-relaxed">{takeaway.zh}</p>}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Conclusion */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
            <h3 className="text-xl font-bold mb-4 flex items-baseline gap-2 text-gray-900 font-sans tracking-tight">Closing Thoughts {showZh && <span className="text-base font-normal text-gray-500">结语</span>}</h3>
            <div className="space-y-4 text-gray-700 leading-relaxed text-base">
              {isEditing && !isPublic ? (
                 <>
                    {showEn && <textarea value={conclusion.en || ''} onChange={(e) => handleConclusionChange('en', e.target.value)} className={textareaClass} />}
                    {showZh && <textarea value={conclusion.zh || ''} onChange={(e) => handleConclusionChange('zh', e.target.value)} className={textareaClass} />}
                 </>
              ) : (
                <>
                  {showEn && conclusion.en && <p>{conclusion.en}</p>}
                  {showZh && conclusion.zh && <p className="text-gray-800">{conclusion.zh}</p>}
                </>
              )}
            </div>
            <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
               <div className="text-right">
                  {isEditing && !isPublic ? (
                    <div className="space-y-2 flex flex-col items-end">
                       <input className="text-right bg-white border border-gray-300 rounded px-2 py-1 font-bold text-gray-900" value={authorName || ''} onChange={(e) => onUpdateSettings && onUpdateSettings({...contextSettings, authorName: e.target.value})} placeholder="Author Name" />
                       <input className="text-right bg-white border border-gray-300 rounded px-2 py-1 text-xs font-medium uppercase" value={authorRole || ''} onChange={(e) => onUpdateSettings && onUpdateSettings({...contextSettings, authorRole: e.target.value})} placeholder="Author Role" />
                    </div>
                  ) : (
                    <>
                      <div className="font-sans font-bold text-gray-900 text-lg">{authorName || 'Dr. Bruce'}</div>
                      <div className="text-xs text-[#f0b90b] font-medium uppercase tracking-wider">{authorRole || 'CEO, OP_CAT Layer'}</div>
                    </>
                  )}
               </div>
            </div>
          </div>
          
          {/* QR Code Footer (REDESIGNED) */}
          {(websiteUrl || twitterUrl || telegramUrl || (isEditing && !isPublic)) && (
             <div className="mt-12 pt-10 border-t-2 border-dashed border-gray-200">
               {/* Follow & Contact Section - Adjusted gaps to prevent scrollbar */}
               <div className="flex flex-row justify-center items-start gap-2 sm:gap-4 flex-nowrap mb-10 w-full px-1">
                  {/* Website Column */}
                  {(websiteUrl || (isEditing && !isPublic)) && (
                    <div className="flex flex-col items-center shrink-0">
                      <div className="mb-2 text-center">
                         <h4 className="font-bold text-sm text-gray-900 uppercase tracking-widest">Follow</h4>
                         {isEditing && !isPublic && <input placeholder="Website URL" value={websiteUrl || ''} onChange={(e) => onUpdateSettings && onUpdateSettings({...contextSettings, websiteUrl: e.target.value})} className="text-xs border border-gray-300 rounded p-1 w-full mt-1 text-center" />}
                      </div>
                      {websiteUrl && (
                        <div className="relative p-2 bg-white border border-gray-100 rounded-xl shadow-lg group">
                           {/* QR Code */}
                           <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(websiteUrl)}&color=000000&bgcolor=ffffff&qzone=1&margin=0`} 
                              alt="Website" 
                              className="w-24 h-24 block"
                              crossOrigin="anonymous"
                           />
                           {/* Logo Overlay */}
                           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full p-0.5 shadow-md flex items-center justify-center">
                              {brandLogo ? <img src={brandLogo} className="w-full h-full rounded-full object-cover" /> : <Globe size={14} className="text-black"/>}
                           </div>
                        </div>
                      )}
                      <span className="mt-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Website</span>
                    </div>
                  )}

                  {/* Twitter Column */}
                  {(twitterUrl || (isEditing && !isPublic)) && (
                    <div className="flex flex-col items-center shrink-0">
                      <div className="mb-2 text-center">
                         <h4 className="font-bold text-sm text-gray-900 uppercase tracking-widest">Updates</h4>
                         {isEditing && !isPublic && <input placeholder="Twitter URL" value={twitterUrl || ''} onChange={(e) => onUpdateSettings && onUpdateSettings({...contextSettings, twitterUrl: e.target.value})} className="text-xs border border-gray-300 rounded p-1 w-full mt-1 text-center" />}
                      </div>
                      {twitterUrl && (
                        <div className="relative p-2 bg-white border border-gray-100 rounded-xl shadow-lg group">
                           <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(twitterUrl)}&color=000000&bgcolor=ffffff&qzone=1&margin=0`} 
                              alt="Twitter" 
                              className="w-24 h-24 block"
                              crossOrigin="anonymous"
                           />
                           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-black rounded-full p-1 shadow-md flex items-center justify-center text-white">
                              <Twitter size={14} fill="currentColor" />
                           </div>
                        </div>
                      )}
                      <span className="mt-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Twitter</span>
                    </div>
                  )}

                  {/* Community Column */}
                  {(telegramUrl || (isEditing && !isPublic)) && (
                    <div className="flex flex-col items-center shrink-0">
                      <div className="mb-2 text-center">
                         <h4 className="font-bold text-sm text-gray-900 uppercase tracking-widest">Join</h4>
                         {isEditing && !isPublic && <input placeholder="Telegram URL" value={telegramUrl || ''} onChange={(e) => onUpdateSettings && onUpdateSettings({...contextSettings, telegramUrl: e.target.value})} className="text-xs border border-gray-300 rounded p-1 w-full mt-1 text-center" />}
                      </div>
                      {telegramUrl && (
                        <div className="relative p-2 bg-white border border-gray-100 rounded-xl shadow-lg group">
                           <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(telegramUrl)}&color=000000&bgcolor=ffffff&qzone=1&margin=0`} 
                              alt="Telegram" 
                              className="w-24 h-24 block"
                              crossOrigin="anonymous"
                           />
                           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-[#229ED9] rounded-full p-1 shadow-md flex items-center justify-center text-white">
                              <Send size={14} fill="currentColor" className="ml-0.5" />
                           </div>
                        </div>
                      )}
                      <span className="mt-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Telegram</span>
                    </div>
                  )}
               </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportDisplay;