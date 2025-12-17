import React, { useState, useRef, useEffect } from 'react';
import { TripEntry, Language, ContextSettings, ReportDraft, GenerationMode, PublishedReport } from '../types';
import { generateEntryCaption, generateEntryImage, analyzeUrl, generateEntryPRCopy, generateSectionDraft, generateRefinedThemes, generateRefinedContexts } from '../services/geminiService';
import { Plus, Image as ImageIcon, X, Send, Trash2, GripVertical, Wand2, Loader2, Save, Upload, Languages, Settings, Check, ImagePlus, Link as LinkIcon, Sparkles, User, Bot, PenTool, Globe, FileText, ChevronDown, ChevronUp, Star, Replace, BadgeCheck, Users, AtSign, MinusCircle, ExternalLink, BrainCircuit, ArrowDownToLine, RefreshCw, Zap, FolderOpen, Download, HardDrive, LayoutTemplate } from 'lucide-react';

interface InputSectionProps {
  entries: TripEntry[];
  contextSettings: ContextSettings;
  reportDraft: ReportDraft;
  publishedReports: PublishedReport[];
  onUpdateContextSettings: (settings: ContextSettings) => void;
  onUpdateReportDraft: (draft: ReportDraft) => void;
  onAddEntry: (entry: TripEntry) => void;
  onRemoveEntry: (id: string) => void;
  onUpdateEntry: (id: string, updatedEntry: TripEntry) => void;
  onReorderEntries: (entries: TripEntry[]) => void;
  onGenerate: (language: Language, mode: GenerationMode) => void;
  onExportSettings: () => void;
  onImportSettings: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportEntries: () => void;
  onImportEntries: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLoadReport: (report: PublishedReport) => void;
  onDeleteReport: (id: string) => void;
}

// Helper: Resize image
const resizeImage = (base64Str: string, maxWidth = 800): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
      } else {
          resolve(base64Str);
      }
    };
    img.onerror = () => resolve(base64Str);
  });
};

const InputSection: React.FC<InputSectionProps> = ({ 
  entries, 
  contextSettings,
  reportDraft,
  publishedReports = [],
  onUpdateContextSettings,
  onUpdateReportDraft,
  onAddEntry, 
  onRemoveEntry, 
  onUpdateEntry,
  onReorderEntries,
  onGenerate,
  onExportSettings,
  onImportSettings,
  onExportEntries,
  onImportEntries,
  onLoadReport,
  onDeleteReport
}) => {
  const [note, setNote] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  
  // RESTRICTION: Only 'zh' or 'en' allowed for UI
  const [language, setLanguage] = useState<Language>('zh'); 
  const [generationMode, setGenerationMode] = useState<GenerationMode>('creative');
  
  // Collapsible States
  const [showSettings, setShowSettings] = useState(false);
  
  // Generation States
  const [generatingCaptionId, setGeneratingCaptionId] = useState<string | null>(null);
  const [generatingImageId, setGeneratingImageId] = useState<string | null>(null);
  const [generatingCopyId, setGeneratingCopyId] = useState<string | null>(null);
  const [generatingTitleId, setGeneratingTitleId] = useState<string | null>(null);
  
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [isAnalyzingLink, setIsAnalyzingLink] = useState(false);
  const [isGeneratingThemes, setIsGeneratingThemes] = useState(false);
  const [isRefiningContext, setIsRefiningContext] = useState(false);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);
  const [showSavedReports, setShowSavedReports] = useState(false);

  // Temporary Inputs
  const [tempUrl, setTempUrl] = useState('');
  const [tempContext, setTempContext] = useState('');

  // Replace Modal State
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  
  const [isGeneratingDraft, setIsGeneratingDraft] = useState<string | null>(null);
  const [showDraftSection, setShowDraftSection] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importSettingsRef = useRef<HTMLInputElement>(null);
  const importEntriesRef = useRef<HTMLInputElement>(null);
  const entryUploadRef = useRef<HTMLInputElement>(null);

  const handleLanguageChange = (newLang: Language) => {
    if (newLang === 'both') return; // Restriction
    setLanguage(newLang);
  };

  const t = (key: string) => {
    const isZh = language === 'zh';
    const dict: Record<string, string> = {
      savedReportsTitle: isZh ? '已发布报告 (Published)' : 'Published Reports',
      loadBtn: isZh ? '加载' : 'Load',
      deleteBtn: isZh ? '删除' : 'Delete',
      exportBtn: isZh ? '导出' : 'Export',
      noReports: isZh ? '暂无已发布报告' : 'No published reports yet.',
      confirmDelete: isZh ? '确定要删除此报告吗？' : 'Are you sure you want to delete this report?',
      settingsTitle: isZh ? 'AI 设定 (Settings)' : 'AI Settings',
      reportSettingsTitle: isZh ? '报告配置 (Report Config)' : 'Report Configuration',
      import: isZh ? '导入' : 'Import',
      saveAI: isZh ? '保存设定' : 'Save Settings',
      draftTitle: isZh ? '草稿内容 (Draft)' : 'Report Draft',
      draftGenAction: isZh ? '生成草稿' : 'Generate Draft',
      brandLogo: isZh ? '品牌 Logo' : 'Brand Logo',
      brandLogoDesc: isZh ? '上传或使用默认' : 'Upload or use default',
      brandName: isZh ? '品牌名称' : 'Brand Name',
      brandLoc: isZh ? '地点' : 'Location',
      authorInfo: isZh ? '作者信息' : 'Author Info',
      authorName: isZh ? '姓名' : 'Name',
      authorRole: isZh ? '职位' : 'Role',
      persona: isZh ? 'AI 人设 (Persona)' : 'Persona',
      tone: isZh ? '语调 (Tone)' : 'Tone',
      refAnalysis: isZh ? '参考链接分析' : 'Reference Analysis',
      pasteUrl: isZh ? '粘贴 URL...' : 'Paste URL...',
      analyzeBtn: isZh ? '分析' : 'Analyze',
      analyzingBtn: isZh ? '分析中...' : 'Analyzing...',
      extractedContent: isZh ? '提取内容' : 'Extracted Content',
      extractedStyle: isZh ? '提取风格' : 'Extracted Style',
      eventContext: isZh ? '活动背景 (Context)' : 'Event Context',
      eventPlaceholder: isZh ? '输入背景信息...' : 'Enter context...',
      refineContexts: isZh ? '优化背景' : 'Refine Contexts',
      themes: isZh ? '核心主题 (Themes)' : 'Key Themes',
      refineThemes: isZh ? '优化主题' : 'Refine Themes',
      themesPlaceholder: isZh ? '输入或生成主题...' : 'Enter or generate themes...',
      newEntry: isZh ? '添加新记录 (New Entry)' : 'New Entry',
      addNotePlaceholder: isZh ? '输入笔记、想法或指令...' : 'Enter notes, thoughts or instructions...',
      addPhotos: isZh ? '添加照片' : 'Add Photos',
      addBtn: isZh ? '添加到列表' : 'Add to List',
      replaceBtn: isZh ? '批量替换' : 'Replace',
      saveReport: isZh ? '保存数据' : 'Save Data',
      aiTitle: isZh ? 'AI 标题' : 'AI Title',
      userIntent: isZh ? '用户意图 (Note)' : 'User Note',
      visualAnalysis: isZh ? '视觉分析 (Visual)' : 'Visual Analysis',
      prCopy: isZh ? 'PR 文案 (Copy)' : 'PR Copy',
      draftAction: isZh ? '撰写' : 'Draft',
      draftingState: isZh ? '撰写中...' : 'Drafting...',
      analyzeAction: isZh ? '分析' : 'Analyze',
      genImage: isZh ? '生成图片' : 'Gen Image',
      genModeCreative: isZh ? '创意模式' : 'Creative Mode',
      genModeZhToEn: isZh ? '中译英' : 'ZH -> EN',
      genModeEnToZh: isZh ? '英译中' : 'EN -> ZH',
      generateFull: isZh ? '生成完整双语报告' : 'Generate Full Bilingual Report',
      generateSub: isZh ? '基于当前语言设置并翻译' : 'Based on current settings + translation',
      replaceTitle: isZh ? '全局替换' : 'Global Replace',
      find: isZh ? '查找' : 'Find',
      replaceWith: isZh ? '替换为' : 'Replace with',
      replaceCancel: isZh ? '取消' : 'Cancel',
      replaceAction: isZh ? '执行替换' : 'Replace All',
      importThemes: isZh ? '导入主题' : 'Import Themes',
      appendPhoto: isZh ? '追加照片' : 'Append Photo',
      setHero: isZh ? '设为封面' : 'Set as Hero',
    };
    return dict[key] || key;
  };

  const handleDownloadReportJson = (report: PublishedReport) => {
      const dataStr = JSON.stringify(report, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `opcat_report_${report.id}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // Simplified handlers for boilerplate (keeping logic concise)
  const handleAddContext = () => { if(!tempContext.trim()) return; onUpdateContextSettings({ ...contextSettings, eventContexts: [...contextSettings.eventContexts, tempContext.trim()] }); setTempContext(''); };
  const handleUpdateContext = (idx: number, val: string) => { const newContexts = [...contextSettings.eventContexts]; newContexts[idx] = val; onUpdateContextSettings({ ...contextSettings, eventContexts: newContexts }); };
  const handleRemoveContext = (idx: number) => { onUpdateContextSettings({ ...contextSettings, eventContexts: contextSettings.eventContexts.filter((_, i) => i !== idx) }); };
  const handleAnalyzeAndAddLink = async () => { if (!tempUrl.trim()) return; setIsAnalyzingLink(true); try { const result = await analyzeUrl(tempUrl, language); const newContent = (contextSettings.referenceContent ? contextSettings.referenceContent + "\n\n" : "") + `[Source: ${tempUrl}]\n` + result.content; const newStyle = (contextSettings.referenceStyle ? contextSettings.referenceStyle + "\n\n" : "") + `[Source: ${tempUrl}]\n` + result.style; const currentContexts = new Set(contextSettings.eventContexts); result.suggestedContexts.forEach(c => currentContexts.add(c)); const newThemes = (contextSettings.keyThemes ? contextSettings.keyThemes + " " : "") + result.suggestedThemes; onUpdateContextSettings({ ...contextSettings, referenceUrls: [...contextSettings.referenceUrls, tempUrl.trim()], referenceContent: newContent, referenceStyle: newStyle, eventContexts: Array.from(currentContexts), keyThemes: newThemes }); setTempUrl(''); } catch (e) { console.error(e); alert("Failed to analyze link."); } finally { setIsAnalyzingLink(false); } };
  const handleRemoveLink = (idx: number) => { onUpdateContextSettings({ ...contextSettings, referenceUrls: contextSettings.referenceUrls.filter((_, i) => i !== idx) }); };
  const handleRefineContexts = async () => { setIsRefiningContext(true); try { const newContexts = await generateRefinedContexts(contextSettings, language); if (newContexts && newContexts.length > 0) { onUpdateContextSettings({ ...contextSettings, eventContexts: newContexts }); } } catch (e) { console.error(e); alert("Failed to refine contexts."); } finally { setIsRefiningContext(false); } };
  const handleRegenerateThemes = async () => { setIsGeneratingThemes(true); try { const refined = await generateRefinedThemes(contextSettings, language); if(refined) { onUpdateContextSettings({ ...contextSettings, keyThemes: refined }); } } catch (e) { console.error(e); alert("Failed to regenerate themes"); } finally { setIsGeneratingThemes(false); } };
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = async () => { if (reader.result) { const resized = await resizeImage(reader.result as string, 200); onUpdateContextSettings({ ...contextSettings, brandLogo: resized }); } }; reader.readAsDataURL(file); } };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const files = e.target.files; if (files && files.length > 0) { const promises: Promise<string>[] = []; Array.from(files).forEach((file) => { const promise = new Promise<string>((resolve) => { const reader = new FileReader(); reader.onloadend = async () => { if (reader.result) { const resized = await resizeImage(reader.result as string); resolve(resized); } else { resolve(""); } }; reader.readAsDataURL(file as File); }); promises.push(promise); }); Promise.all(promises).then((resizedImages) => { const validImages = resizedImages.filter(img => img.length > 0); setSelectedImages(prev => [...prev, ...validImages]); if (fileInputRef.current) fileInputRef.current.value = ''; }); } };
  const handleEntryUploadClick = (id: string) => { setUploadTargetId(id); entryUploadRef.current?.click(); };
  const handleEntryFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => { if (!uploadTargetId || !e.target.files?.length) return; const files = Array.from(e.target.files); const promises = files.map(file => new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = async (ev) => { if (ev.target?.result) { const resized = await resizeImage(ev.target.result as string); resolve(resized); } else { resolve(""); } }; reader.readAsDataURL(file as File); })); Promise.all(promises).then(newImages => { const validImages = newImages.filter(i => i.length > 0); const entryIndex = entries.findIndex(e => e.id === uploadTargetId); if (entryIndex >= 0) { const entry = entries[entryIndex]; const updatedImages = [...(entry.images || []), ...validImages]; let updatedHeroIndices = entry.heroImageIndices || []; if (updatedImages.length === 1) { updatedHeroIndices = [0]; } onUpdateEntry(entry.id, { ...entry, images: updatedImages, heroImageIndices: updatedHeroIndices }); } setUploadTargetId(null); if (entryUploadRef.current) entryUploadRef.current.value = ''; }); };
  const removeSelectedImage = (index: number) => { setSelectedImages(prev => prev.filter((_, i) => i !== index)); };
  const handleAdd = () => { if (!note && selectedImages.length === 0) return; const heroIndices = selectedImages.length === 1 ? [0] : []; onAddEntry({ id: Date.now().toString(), images: selectedImages, heroImageIndices: heroIndices, note: note, timestamp: Date.now() }); setNote(''); setSelectedImages([]); };
  const handleGenerateTitle = async (entry: TripEntry) => { setGeneratingTitleId(entry.id); try { const title = await generateSectionDraft('entryTitle', entry, language, contextSettings); onUpdateEntry(entry.id, { ...entry, aiTitle: title }); } catch(e) { console.error(e); } finally { setGeneratingTitleId(null); } }
  const handleAutoCaption = async (entry: TripEntry) => { setGeneratingCaptionId(entry.id); try { const caption = await generateEntryCaption(entry.images, language, contextSettings); onUpdateEntry(entry.id, { ...entry, aiCaption: caption }); } catch (e) { console.error(e); } finally { setGeneratingCaptionId(null); } };
  const handleGenerateCopy = async (entry: TripEntry) => { if (!entry.note && !entry.aiCaption) { alert("Need Note or Visual Analysis."); return; } setGeneratingCopyId(entry.id); try { const copy = await generateEntryPRCopy(entry.note || '', entry.aiCaption || '', language, contextSettings, entry.aiTitle); onUpdateEntry(entry.id, { ...entry, aiCopy: copy }); } catch (e) { console.error(e); } finally { setGeneratingCopyId(null); } };
  const handleGenerateImage = async (entry: TripEntry) => { const promptText = entry.aiCopy || entry.note || entry.aiCaption; if (!promptText) return; setGeneratingImageId(entry.id); try { const imageBase64 = await generateEntryImage(promptText, contextSettings); if (imageBase64) onUpdateEntry(entry.id, { ...entry, images: [...(entry.images || []), imageBase64] }); } catch (e) { alert("Failed to generate image."); } finally { setGeneratingImageId(null); } };
  const toggleHeroImage = (entry: TripEntry, imageIndex: number) => { const currentHeroes = entry.heroImageIndices || []; let newHeroes; if (currentHeroes.includes(imageIndex)) { newHeroes = currentHeroes.filter(i => i !== imageIndex); } else { newHeroes = [...currentHeroes, imageIndex]; } onUpdateEntry(entry.id, { ...entry, heroImageIndices: newHeroes }); };
  const handleRemoveEntryImage = (entryId: string, indexToRemove: number) => { const entry = entries.find(e => e.id === entryId); if (!entry) return; const newImages = entry.images.filter((_, i) => i !== indexToRemove); let newHeroIndices = (entry.heroImageIndices || []).reduce((acc, curr) => { if (curr === indexToRemove) return acc; if (curr > indexToRemove) return [...acc, curr - 1]; return [...acc, curr]; }, [] as number[]); if (newImages.length === 1) { newHeroIndices = [0]; } onUpdateEntry(entryId, { ...entry, images: newImages, heroImageIndices: newHeroIndices }); };
  const handleImportThemesToDraft = () => { if (!contextSettings.keyThemes) return; const append = (current: string | undefined) => { if (!current) return contextSettings.keyThemes; if (current.includes(contextSettings.keyThemes)) return current; return current + "\n\n" + contextSettings.keyThemes; }; onUpdateReportDraft({ ...reportDraft, executiveSummary: { en: append(reportDraft.executiveSummary?.en), zh: append(reportDraft.executiveSummary?.zh) } }); };
  const handleGenerateSection = async (section: 'title' | 'executiveSummary' | 'conclusion') => { if (entries.length === 0 && contextSettings.eventContexts.length === 0) { alert("Please add entries or context first."); return; } setIsGeneratingDraft(section); try { const text = await generateSectionDraft(section, entries, language, contextSettings); const newDraft = { ...reportDraft }; if (section === 'title') { const lines = text.split('\n'); let titleText = text; let subtitleText = ""; lines.forEach(line => { if (line.toUpperCase().startsWith("TITLE:")) titleText = line.replace(/TITLE:/i, '').trim(); if (line.toUpperCase().startsWith("SUBTITLE:")) subtitleText = line.replace(/SUBTITLE:/i, '').trim(); }); if (titleText === text && text.length > 50 && text.includes('\n')) { const parts = text.split('\n'); titleText = parts[0]; subtitleText = parts.slice(1).join(' '); } if (!newDraft.title) newDraft.title = {}; if (!newDraft.subtitle) newDraft.subtitle = {}; newDraft.title[language] = titleText; newDraft.subtitle[language] = subtitleText; } else { if (!newDraft[section]) newDraft[section] = {}; newDraft[section]![language] = text; } onUpdateReportDraft(newDraft); } catch(e) { console.error(e); } finally { setIsGeneratingDraft(null); } };
  
  // Replace Handler
  const handleGlobalReplace = () => { if (!findText) return; const regex = new RegExp(findText, 'g'); const replaceFn = (text: string | undefined) => text ? text.replace(regex, replaceText) : text; onUpdateContextSettings({ ...contextSettings, eventContexts: contextSettings.eventContexts.map(c => replaceFn(c) || ''), keyThemes: replaceFn(contextSettings.keyThemes) || '', tone: replaceFn(contextSettings.tone) || '', persona: replaceFn(contextSettings.persona) || '', referenceContent: replaceFn(contextSettings.referenceContent), referenceStyle: replaceFn(contextSettings.referenceStyle), authorName: replaceFn(contextSettings.authorName), authorRole: replaceFn(contextSettings.authorRole), brandName: replaceFn(contextSettings.brandName), brandLocation: replaceFn(contextSettings.brandLocation) }); entries.forEach(entry => { onUpdateEntry(entry.id, { ...entry, aiTitle: replaceFn(entry.aiTitle), note: replaceFn(entry.note) || '', aiCaption: replaceFn(entry.aiCaption), aiCopy: replaceFn(entry.aiCopy) }); }); const updateBilingual = (obj: any) => { if (!obj) return obj; return { en: replaceFn(obj.en), zh: replaceFn(obj.zh) }; }; onUpdateReportDraft({ title: updateBilingual(reportDraft.title), subtitle: updateBilingual(reportDraft.subtitle), executiveSummary: updateBilingual(reportDraft.executiveSummary), conclusion: updateBilingual(reportDraft.conclusion), keyTakeaways: (reportDraft.keyTakeaways || []).map(updateBilingual) }); setShowReplaceModal(false); setFindText(''); setReplaceText(''); alert("Replace Complete!"); };
  
  const handleDragStart = (index: number) => { setDraggedItemIndex(index); };
  const handleDragOver = (e: React.DragEvent, index: number) => { e.preventDefault(); if (draggedItemIndex === null || draggedItemIndex === index) return; const newEntries = [...entries]; const draggedItem = newEntries[draggedItemIndex]; newEntries.splice(draggedItemIndex, 1); newEntries.splice(index, 0, draggedItem); setDraggedItemIndex(index); onReorderEntries(newEntries); };
  const handleDragEnd = () => { setDraggedItemIndex(null); };

  const inputClass = "w-full bg-[#0b0e11] border border-gray-700 rounded-lg p-2 text-white text-sm focus:border-[#f0b90b] outline-none";
  const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1";

  // --- RENDERING ---

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fade-in relative">
      <input type="file" ref={entryUploadRef} className="hidden" multiple accept="image/*" onChange={handleEntryFilesSelected} />
      <input type="file" ref={importSettingsRef} className="hidden" accept=".json" onChange={onImportSettings} />
      <input type="file" ref={importEntriesRef} className="hidden" accept=".json" onChange={onImportEntries} />

      {/* Replace Modal */}
      {showReplaceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-[#1e2329] border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Replace size={20} className="text-[#f0b90b]" /> {t('replaceTitle')}</h3>
              <div className="space-y-4">
                 <div><label className={labelClass}>{t('find')}</label><input className={inputClass} value={findText} onChange={(e) => setFindText(e.target.value)} placeholder="e.g. Dr Bruce" autoFocus /></div>
                 <div><label className={labelClass}>{t('replaceWith')}</label><input className={inputClass} value={replaceText} onChange={(e) => setReplaceText(e.target.value)} placeholder="e.g. Dr. Bruce" /></div>
                 <div className="flex gap-2 justify-end mt-4">
                    <button onClick={() => setShowReplaceModal(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm">{t('replaceCancel')}</button>
                    <button onClick={handleGlobalReplace} className="bg-[#f0b90b] text-black font-bold px-4 py-2 rounded-lg hover:bg-[#d9a506] text-sm">{t('replaceAction')}</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* 1. Language Control (ZH/EN ONLY) */}
      <div className="bg-[#1e2329] border border-[#f0b90b]/20 rounded-xl p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-[72px] z-30 backdrop-blur-md bg-opacity-95">
        <div className="flex items-center gap-2 text-[#f0b90b]">
           <Languages size={20} />
           <span className="font-bold brand-font tracking-wide">Output Language</span>
        </div>
        <div className="flex bg-black/40 p-1 rounded-lg border border-gray-700 w-full sm:w-auto">
            <button onClick={() => handleLanguageChange('zh')} className={`flex-1 sm:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all ${language === 'zh' ? 'bg-[#f0b90b] text-black shadow-md scale-105' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>中文 (ZH)</button>
            <button onClick={() => handleLanguageChange('en')} className={`flex-1 sm:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all ${language === 'en' ? 'bg-[#f0b90b] text-black shadow-md scale-105' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>English (EN)</button>
        </div>
      </div>

      {/* 2. Settings (Full Width, Collapsible) */}
      <div className="bg-[#1e2329] border border-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div 
           className="flex justify-between items-center p-6 cursor-pointer hover:bg-[#252b33] transition-colors"
           onClick={() => setShowSettings(!showSettings)}
        >
           <h3 className="text-[#f0b90b] text-xl font-bold brand-font flex items-center gap-2">
             <BrainCircuit size={20} /> {t('settingsTitle')}
           </h3>
           {/* IMPORT / EXPORT MOVED HERE */}
           <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
               <button onClick={() => importSettingsRef.current?.click()} className="flex items-center gap-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded transition-colors border border-gray-600"><Upload size={14} /> {t('import')}</button>
               <button onClick={onExportSettings} className="flex items-center gap-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded transition-colors border border-gray-600"><Save size={14} /> {t('saveAI')}</button>
               <div className="text-gray-400 ml-2">
                 {showSettings ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
               </div>
           </div>
        </div>
        
        {showSettings && (
            <div className="p-6 border-t border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-down">
                {/* Brand Identity */}
                <div className="bg-[#0b0e11] p-4 rounded-lg border border-gray-700 space-y-4">
                    <h4 className="text-white font-bold text-sm flex items-center gap-2"><BadgeCheck size={16} className="text-[#f0b90b]" /> {t('brandLogo')}</h4>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full border border-gray-600 bg-black flex items-center justify-center overflow-hidden shrink-0">
                            {contextSettings.brandLogo ? <img src={contextSettings.brandLogo} alt="Logo" className="w-full h-full object-cover" /> : <span className="text-[#f0b90b] font-bold text-xs">OP</span>}
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">{t('brandLogoDesc')}</label>
                            <input type="file" accept="image/*" onChange={handleLogoUpload} className="block w-full text-xs text-gray-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-[#f0b90b] file:text-black hover:file:bg-[#d9a506] cursor-pointer" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <div><label className={labelClass}>{t('brandName')}</label><input value={contextSettings.brandName || ''} onChange={(e) => onUpdateContextSettings({...contextSettings, brandName: e.target.value})} className={inputClass} /></div>
                        <div><label className={labelClass}>{t('brandLoc')}</label><input value={contextSettings.brandLocation || ''} onChange={(e) => onUpdateContextSettings({...contextSettings, brandLocation: e.target.value})} className={inputClass} /></div>
                    </div>
                </div>
                {/* Author */}
                <div className="bg-[#0b0e11] p-4 rounded-lg border border-gray-700 space-y-4">
                    <h4 className="text-white font-bold text-sm flex items-center gap-2"><Users size={16} className="text-[#f0b90b]" /> {t('authorInfo')}</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className={labelClass}>{t('authorName')}</label><input value={contextSettings.authorName || ''} onChange={(e) => onUpdateContextSettings({...contextSettings, authorName: e.target.value})} className={inputClass} /></div>
                        <div><label className={labelClass}>{t('authorRole')}</label><input value={contextSettings.authorRole || ''} onChange={(e) => onUpdateContextSettings({...contextSettings, authorRole: e.target.value})} className={inputClass} /></div>
                    </div>
                    <div className="space-y-3 pt-2 border-t border-gray-700/50">
                        <div><label className={labelClass}>Website URL</label><div className="flex items-center gap-2"><Globe size={14} className="text-gray-500" /><input value={contextSettings.websiteUrl || ''} onChange={(e) => onUpdateContextSettings({...contextSettings, websiteUrl: e.target.value})} className={inputClass} /></div></div>
                        <div><label className={labelClass}>Twitter URL</label><div className="flex items-center gap-2"><AtSign size={14} className="text-gray-500" /><input value={contextSettings.twitterUrl || ''} onChange={(e) => onUpdateContextSettings({...contextSettings, twitterUrl: e.target.value})} className={inputClass} /></div></div>
                        <div><label className={labelClass}>Telegram URL</label><div className="flex items-center gap-2"><Send size={14} className="text-gray-500" /><input value={contextSettings.telegramUrl || ''} onChange={(e) => onUpdateContextSettings({...contextSettings, telegramUrl: e.target.value})} className={inputClass} /></div></div>
                    </div>
                </div>
                {/* Persona & Tone (Full Width in grid) */}
                <div className="md:col-span-2 space-y-4">
                    <div><label className={labelClass}>{t('persona')}</label><textarea value={contextSettings.persona} onChange={(e) => onUpdateContextSettings({...contextSettings, persona: e.target.value})} className={`${inputClass} h-16 resize-none`} /></div>
                    <div><label className={labelClass}>{t('tone')}</label><input type="text" value={contextSettings.tone} onChange={(e) => onUpdateContextSettings({...contextSettings, tone: e.target.value})} className={inputClass} /></div>
                </div>
            </div>
        )}
      </div>

      {/* 3. Report Configuration (Full Width) */}
      <div className="bg-[#1e2329] border border-gray-800 rounded-xl p-6 shadow-lg space-y-6">
        <div className="flex justify-between items-center border-b border-gray-800 pb-4">
            <h3 className="text-[#f0b90b] text-xl font-bold brand-font flex items-center gap-2">
                <Settings size={20} /> {t('reportSettingsTitle')}
            </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Reference Analysis */}
             <div className="bg-[#0b0e11] p-4 rounded-lg border border-gray-700 space-y-4">
                <h4 className="text-white font-bold text-sm flex items-center gap-2"><LinkIcon size={16} className="text-[#f0b90b]" /> {t('refAnalysis')}</h4>
                <div className="flex gap-2">
                  <input type="text" value={tempUrl} onChange={(e) => setTempUrl(e.target.value)} className="flex-1 bg-[#1e2329] border border-gray-700 rounded-lg p-2 text-white text-sm focus:border-[#f0b90b] outline-none placeholder-gray-600" placeholder={t('pasteUrl')} />
                  <button onClick={handleAnalyzeAndAddLink} disabled={!tempUrl.trim() || isAnalyzingLink} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
                    {isAnalyzingLink ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} {isAnalyzingLink ? t('analyzingBtn') : t('analyzeBtn')}
                  </button>
                </div>
                {contextSettings.referenceUrls.length > 0 && (
                   <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                      {contextSettings.referenceUrls.map((url, idx) => (
                         <div key={idx} className="flex items-center justify-between text-xs bg-gray-800 rounded px-2 py-1">
                            <span className="truncate text-gray-300 max-w-[85%]">{url}</span>
                            <button onClick={() => handleRemoveLink(idx)} className="text-gray-500 hover:text-red-400"><X size={12}/></button>
                         </div>
                      ))}
                   </div>
                )}
             </div>

             {/* Themes & Context */}
             <div className="space-y-4">
                 <div className="space-y-2">
                     <div className="flex justify-between items-center mb-1">
                        <label className={labelClass}>{t('eventContext')}</label>
                        <button onClick={handleRefineContexts} disabled={isRefiningContext} className="text-xs flex items-center gap-1 bg-[#f0b90b]/10 hover:bg-[#f0b90b]/20 text-[#f0b90b] px-2 py-0.5 rounded border border-[#f0b90b]/20 disabled:opacity-50">
                           {isRefiningContext ? <Loader2 size={12} className="animate-spin"/> : <RefreshCw size={12} />} {t('refineContexts')}
                        </button>
                     </div>
                     <div className="flex gap-2">
                        <input value={tempContext} onChange={(e) => setTempContext(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddContext()} className={inputClass} placeholder={t('eventPlaceholder')} />
                        <button onClick={handleAddContext} className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg"><Plus size={18}/></button>
                     </div>
                     <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                        {contextSettings.eventContexts.map((ctx, idx) => (
                           <div key={idx} className="flex items-center gap-2 bg-[#0b0e11] border border-gray-700 rounded p-2 text-xs text-gray-300 group focus-within:border-[#f0b90b]">
                              <input value={ctx} onChange={(e) => handleUpdateContext(idx, e.target.value)} className="flex-1 bg-transparent border-none outline-none text-gray-300 placeholder-gray-600 w-full" />
                              <button onClick={() => handleRemoveContext(idx)} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><MinusCircle size={14}/></button>
                           </div>
                        ))}
                     </div>
                 </div>
                 <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className={labelClass}>{t('themes')}</label>
                        <button onClick={handleRegenerateThemes} disabled={isGeneratingThemes} className="text-xs flex items-center gap-1 bg-[#f0b90b]/10 hover:bg-[#f0b90b]/20 text-[#f0b90b] px-2 py-0.5 rounded border border-[#f0b90b]/20 disabled:opacity-50">
                           {isGeneratingThemes ? <Loader2 size={12} className="animate-spin"/> : <RefreshCw size={12} />} {t('refineThemes')}
                        </button>
                    </div>
                    <textarea value={contextSettings.keyThemes} onChange={(e) => onUpdateContextSettings({...contextSettings, keyThemes: e.target.value})} className={`${inputClass} h-24 resize-none`} placeholder={t('themesPlaceholder')} />
                 </div>
             </div>
        </div>
      </div>

      {/* 4. Draft Controller (Single Language Input) */}
      <div className="bg-[#1e2329] border border-[#f0b90b]/40 rounded-xl shadow-lg overflow-hidden">
         <div 
           className="p-6 bg-[#1a1f24] border-b border-gray-700 flex justify-between items-center cursor-pointer hover:bg-[#252b33] transition-colors"
           onClick={() => setShowDraftSection(!showDraftSection)}
         >
           <h3 className="text-[#f0b90b] text-xl font-bold brand-font flex items-center gap-2">
             <FileText size={20} /> {t('draftTitle')}
           </h3>
           <div className="text-gray-400">{showDraftSection ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</div>
         </div>

         {showDraftSection && (
           <div className="p-6 space-y-6">
             {/* Title */}
             <div>
               <div className="flex justify-between items-end mb-2">
                  <label className={labelClass}>Report Title</label>
                  <button onClick={(e) => { e.stopPropagation(); handleGenerateSection('title'); }} disabled={isGeneratingDraft === 'title'} className="text-xs flex items-center gap-1 bg-blue-600/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-600/30 disabled:opacity-50">
                   {isGeneratingDraft === 'title' ? <Loader2 size={12} className="animate-spin"/> : <Wand2 size={12} />} {t('draftGenAction')}
                 </button>
               </div>
               <div className="space-y-3">
                   {/* Conditional Input based on language */}
                   {language === 'zh' && <input placeholder="主标题 (中文)" className={inputClass} value={reportDraft.title?.zh || ''} onChange={(e) => onUpdateReportDraft({...reportDraft, title: {...reportDraft.title, zh: e.target.value}})} />}
                   {language === 'en' && <input placeholder="Main Title (English)" className={inputClass} value={reportDraft.title?.en || ''} onChange={(e) => onUpdateReportDraft({...reportDraft, title: {...reportDraft.title, en: e.target.value}})} />}
                   
                   {language === 'zh' && <input placeholder="副标题 (中文)" className={inputClass} value={reportDraft.subtitle?.zh || ''} onChange={(e) => onUpdateReportDraft({...reportDraft, subtitle: {...reportDraft.subtitle, zh: e.target.value}})} />}
                   {language === 'en' && <input placeholder="Subtitle (English)" className={inputClass} value={reportDraft.subtitle?.en || ''} onChange={(e) => onUpdateReportDraft({...reportDraft, subtitle: {...reportDraft.subtitle, en: e.target.value}})} />}
               </div>
             </div>

             {/* Executive Summary */}
             <div>
               <div className="flex justify-between items-end mb-2">
                 <label className={labelClass}>Executive Summary</label>
                 <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); handleImportThemesToDraft(); }} className="text-xs flex items-center gap-1 bg-[#f0b90b]/10 text-[#f0b90b] px-2 py-1 rounded hover:bg-[#f0b90b]/20 border border-[#f0b90b]/20" title="Import Themes"><ArrowDownToLine size={12} /> {t('importThemes')}</button>
                    <button onClick={(e) => { e.stopPropagation(); handleGenerateSection('executiveSummary'); }} disabled={isGeneratingDraft === 'executiveSummary'} className="text-xs flex items-center gap-1 bg-blue-600/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-600/30 disabled:opacity-50">
                       {isGeneratingDraft === 'executiveSummary' ? <Loader2 size={12} className="animate-spin"/> : <Wand2 size={12} />} {t('draftGenAction')}
                    </button>
                 </div>
               </div>
               {language === 'zh' && <textarea placeholder="执行摘要 (中文)" className={`${inputClass} h-32`} value={reportDraft.executiveSummary?.zh || ''} onChange={(e) => onUpdateReportDraft({...reportDraft, executiveSummary: {...reportDraft.executiveSummary, zh: e.target.value}})} />}
               {language === 'en' && <textarea placeholder="Executive Summary (English)" className={`${inputClass} h-32`} value={reportDraft.executiveSummary?.en || ''} onChange={(e) => onUpdateReportDraft({...reportDraft, executiveSummary: {...reportDraft.executiveSummary, en: e.target.value}})} />}
             </div>

             {/* Conclusion */}
             <div>
               <div className="flex justify-between items-end mb-2">
                 <label className={labelClass}>Conclusion</label>
                 <button onClick={(e) => { e.stopPropagation(); handleGenerateSection('conclusion'); }} disabled={isGeneratingDraft === 'conclusion'} className="text-xs flex items-center gap-1 bg-blue-600/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-600/30 disabled:opacity-50">
                   {isGeneratingDraft === 'conclusion' ? <Loader2 size={12} className="animate-spin"/> : <Wand2 size={12} />} {t('draftGenAction')}
                 </button>
               </div>
               {language === 'zh' && <textarea placeholder="结语 (中文)" className={`${inputClass} h-24`} value={reportDraft.conclusion?.zh || ''} onChange={(e) => onUpdateReportDraft({...reportDraft, conclusion: {...reportDraft.conclusion, zh: e.target.value}})} />}
               {language === 'en' && <textarea placeholder="Conclusion (English)" className={`${inputClass} h-24`} value={reportDraft.conclusion?.en || ''} onChange={(e) => onUpdateReportDraft({...reportDraft, conclusion: {...reportDraft.conclusion, en: e.target.value}})} />}
             </div>
           </div>
         )}
      </div>

      {/* 5. New Entry Input */}
      <div className="bg-[#1e2329] border border-[#f0b90b]/20 rounded-xl p-6 shadow-lg">
        <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
          <div><h2 className="text-[#f0b90b] text-xl font-bold brand-font">{t('newEntry')}</h2></div>
          <div className="flex gap-2">
            <button onClick={() => setShowReplaceModal(true)} className="flex items-center gap-1 text-xs bg-gray-800 hover:bg-gray-700 text-[#f0b90b] px-3 py-1.5 rounded transition-colors border border-gray-600"><Replace size={14} /> {t('replaceBtn')}</button>
            <button onClick={() => importEntriesRef.current?.click()} className="flex items-center gap-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded transition-colors border border-gray-600"><Upload size={14} /> {t('import')}</button>
            <button onClick={onExportEntries} disabled={entries.length === 0} className="flex items-center gap-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded transition-colors border border-gray-600 disabled:opacity-50"><Save size={14} /> {t('saveReport')}</button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-4">
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('addNotePlaceholder')} className="w-full bg-[#0b0e11] border border-gray-700 rounded-lg p-4 text-white focus:border-[#f0b90b] focus:ring-1 focus:ring-[#f0b90b] outline-none transition-all h-32 resize-none placeholder-gray-500" />
                <div className="flex items-center gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" multiple className="hidden" id="image-upload" />
                    <label htmlFor="image-upload" className={`cursor-pointer flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors w-full justify-center ${selectedImages.length > 0 ? 'bg-[#f0b90b]/10 border-[#f0b90b] text-[#f0b90b]' : 'bg-[#2b3139] border-gray-600 text-gray-300 hover:bg-[#363c45]'}`}>
                        <ImageIcon size={18} /><span className="text-sm font-medium">{selectedImages.length > 0 ? `${selectedImages.length} Photos Selected` : t('addPhotos')}</span>
                    </label>
                </div>
            </div>
            <div className="lg:col-span-4 flex flex-col gap-4">
                <div className="flex-1 bg-black/20 rounded-lg border border-gray-700 p-2 min-h-[120px] overflow-y-auto">
                    {selectedImages.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                        {selectedImages.map((img, idx) => (
                            <div key={idx} className="relative w-full aspect-square group">
                            <img src={img} alt="Preview" className="w-full h-full object-cover rounded-md border border-gray-600" />
                            <button onClick={() => removeSelectedImage(idx)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600 z-10"><X size={12} /></button>
                            </div>
                        ))}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs"><ImageIcon size={24} className="mb-2 opacity-50" /><span className="text-center">No photos</span></div>
                    )}
                </div>
                <button onClick={handleAdd} disabled={!note && selectedImages.length === 0} className="bg-[#f0b90b] text-black font-bold px-6 py-3 rounded-lg hover:bg-[#d9a506] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-transform active:scale-95 w-full">
                    <Plus size={18} /><span>{t('addBtn')}</span>
                </button>
            </div>
        </div>
      </div>

      {/* 6. Entry List (Vertical Stack) */}
      <div className="space-y-6">
        {entries.map((entry, index) => (
          <div key={entry.id} draggable onDragStart={() => handleDragStart(index)} onDragOver={(e) => handleDragOver(e, index)} onDragEnd={handleDragEnd} className={`bg-[#1e2329] p-4 rounded-lg border flex flex-col md:flex-row gap-4 items-start group relative transition-all cursor-move ${draggedItemIndex === index ? 'opacity-50 border-[#f0b90b] border-dashed' : 'border-gray-800 hover:border-gray-600'}`}>
            <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600 hidden md:block cursor-move"><GripVertical size={20} /></div>
            
            {/* Images Column */}
            <div className="md:pl-6 w-full md:w-48 shrink-0 flex flex-col gap-2">
              {entry.images && entry.images.length > 0 ? (
                <div className="grid grid-cols-2 gap-1">
                  {entry.images.map((img, i) => {
                    const isHero = entry.heroImageIndices?.includes(i);
                    return (
                      <div key={i} className="relative group/img aspect-square">
                         <img src={img} alt="Entry" className={`w-full h-full object-cover rounded-md border ${isHero ? 'border-[#f0b90b] border-2' : 'border-gray-700'}`} />
                         <button onClick={() => toggleHeroImage(entry, i)} title={t('setHero')} className={`absolute top-1 right-1 p-1 rounded-full shadow-md z-10 transition-colors backdrop-blur-sm ${isHero ? 'bg-[#f0b90b] text-black' : 'bg-black/40 text-white hover:bg-black/60'}`}><Star size={10} fill={isHero ? "currentColor" : "none"} /></button>
                         <button onClick={() => handleRemoveEntryImage(entry.id, i)} className="absolute bottom-1 right-1 p-1 rounded-full shadow-md z-10 transition-colors bg-red-500/80 text-white hover:bg-red-600 backdrop-blur-sm opacity-0 group-hover/img:opacity-100"><X size={10} /></button>
                      </div>
                    );
                  })}
                </div>
              ) : <div className="w-full h-24 bg-gray-800/50 rounded-lg border border-dashed border-gray-700 flex items-center justify-center text-gray-500 text-xs">No Photos</div>}
              <button onClick={() => handleEntryUploadClick(entry.id)} className="w-full py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-600 flex items-center justify-center gap-1 transition-colors hover:text-white"><Plus size={12} /> {t('appendPhoto')}</button>
            </div>

            {/* Content Column - VERTICAL STACK */}
            <div className="flex-1 min-w-0 w-full space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
                 <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold uppercase tracking-wider shrink-0 w-20">{t('aiTitle')}</div>
                 <div className="relative flex-1 w-full">
                     <input value={entry.aiTitle || ''} onChange={(e) => onUpdateEntry(entry.id, { ...entry, aiTitle: e.target.value })} placeholder="Entry Title..." className="w-full bg-[#0b0e11] border border-gray-700 rounded text-sm text-white px-3 py-1.5 focus:border-[#f0b90b] outline-none" />
                     <button onClick={() => handleGenerateTitle(entry)} disabled={generatingTitleId === entry.id || (!entry.note && !entry.aiCaption)} className="absolute right-1 top-1/2 -translate-y-1/2 text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 disabled:opacity-50 flex items-center gap-1">
                       {generatingTitleId === entry.id ? <Loader2 size={10} className="animate-spin"/> : <Wand2 size={10} />}{t('analyzeAction')}
                     </button>
                 </div>
              </div>
              
              {/* Stacked Inputs (Row 8 Requirement) */}
              <div className="flex flex-col gap-4">
                {/* 1. Note */}
                <div className="relative flex flex-col w-full">
                    <div className="flex items-center gap-1.5 mb-1.5 text-xs text-gray-400 font-bold uppercase tracking-wider"><User size={12} /> {t('userIntent')}</div>
                    <textarea value={entry.note} onChange={(e) => onUpdateEntry(entry.id, { ...entry, note: e.target.value })} placeholder={t('userIntentPlaceholder')} className="w-full bg-[#0b0e11] text-gray-200 text-sm resize-y focus:outline-none focus:border-[#f0b90b] rounded-lg p-3 border border-gray-700 transition-colors min-h-[80px]" />
                </div>
                {/* 2. Visual */}
                <div className="relative flex flex-col w-full">
                  <div className="flex items-center justify-between mb-1.5"><div className="flex items-center gap-1.5 text-xs text-blue-400 font-bold uppercase tracking-wider"><Bot size={12} /> {t('visualAnalysis')}</div>{entry.images && entry.images.length > 0 && <button onClick={() => handleAutoCaption(entry)} disabled={generatingCaptionId === entry.id} className="text-[10px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 disabled:opacity-50 flex items-center gap-1">{generatingCaptionId === entry.id ? <Loader2 size={10} className="animate-spin"/> : <Wand2 size={10} />}{t('analyzeAction')}</button>}</div>
                  <textarea value={entry.aiCaption || ''} onChange={(e) => onUpdateEntry(entry.id, { ...entry, aiCaption: e.target.value })} placeholder="..." className="w-full bg-[#11161d] text-blue-100 text-sm resize-y focus:outline-none focus:border-blue-500 rounded-lg p-3 border border-gray-700/50 transition-colors min-h-[80px]" />
                </div>
                {/* 3. Copy */}
                <div className="relative flex flex-col w-full">
                   <div className="flex items-center justify-between mb-1.5"><div className="flex items-center gap-1.5 text-xs text-[#f0b90b] font-bold uppercase tracking-wider"><Sparkles size={12} /> {t('prCopy')}</div><button onClick={() => handleGenerateCopy(entry)} disabled={generatingCopyId === entry.id || (!entry.note && !entry.aiCaption)} className="text-[10px] bg-[#f0b90b]/10 hover:bg-[#f0b90b]/20 text-[#f0b90b] px-2 py-0.5 rounded border border-[#f0b90b]/20 disabled:opacity-50 flex items-center gap-1">{generatingCopyId === entry.id ? <Loader2 size={10} className="animate-spin"/> : <PenTool size={10} />}{generatingCopyId === entry.id ? t('draftingState') : t('draftAction')}</button></div>
                  <textarea value={entry.aiCopy || ''} onChange={(e) => onUpdateEntry(entry.id, { ...entry, aiCopy: e.target.value })} placeholder="..." className="w-full bg-[#1a1500] text-[#fceeb5] text-sm resize-y focus:outline-none focus:border-[#f0b90b] rounded-lg p-3 border border-[#f0b90b]/20 transition-colors min-h-[100px]" />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-2 flex-wrap justify-between border-t border-gray-800 pt-2">
                <span className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                <div className="flex gap-2">{(entry.note || entry.aiCaption || entry.aiCopy) && <button onClick={() => handleGenerateImage(entry)} disabled={generatingImageId === entry.id} className="text-xs flex items-center gap-1.5 text-gray-400 hover:text-white disabled:opacity-50 transition-colors px-2 py-1">{generatingImageId === entry.id ? <Loader2 size={12} className="animate-spin"/> : <ImagePlus size={12} />}{t('genImage')}</button>}</div>
              </div>
            </div>
            <button onClick={() => onRemoveEntry(entry.id)} className="absolute top-2 right-2 text-gray-500 hover:text-red-400 p-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={18} /></button>
          </div>
        ))}
        {entries.length === 0 && <div className="text-center py-12 text-gray-600 border-2 border-dashed border-gray-800 rounded-xl">{language === 'zh' ? '暂无记录，请在上方添加照片或笔记。' : 'No entries yet. Start by adding a photo or a note above.'}</div>}
      </div>

      {/* NEW: Saved Reports Manager (Moved to Bottom or Sidebar? Kept original place or top) - Actually kept in top bar earlier */}
      <div className="bg-[#1e2329] border border-gray-800 rounded-xl p-6 shadow-lg overflow-hidden">
        <div 
           className="flex justify-between items-center cursor-pointer hover:opacity-80 transition-opacity"
           onClick={() => setShowSavedReports(!showSavedReports)}
        >
           <h3 className="text-[#f0b90b] text-xl font-bold brand-font flex items-center gap-2">
             <HardDrive size={20} /> {t('savedReportsTitle')} ({publishedReports.length})
           </h3>
           <div className="text-gray-400">
             {showSavedReports ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
           </div>
        </div>
        
        {showSavedReports && (
          <div className="mt-4 space-y-2 border-t border-gray-700 pt-4 max-h-80 overflow-y-auto">
            {publishedReports.length === 0 ? (
                <div className="text-gray-500 text-sm text-center py-4">{t('noReports')}</div>
            ) : (
                publishedReports.map(report => (
                    <div key={report.id} className="bg-[#0b0e11] p-3 rounded-lg border border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                            <h4 className="text-white font-bold text-sm truncate">{report.title?.en || report.title?.zh || 'Untitled Report'}</h4>
                            <p className="text-gray-500 text-xs">{new Date(report.publishDate).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => onLoadReport(report)} className="flex items-center gap-1 text-xs bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded hover:bg-blue-600/30 border border-blue-600/20"><FolderOpen size={12} /> {t('loadBtn')}</button>
                            <button onClick={() => handleDownloadReportJson(report)} className="flex items-center gap-1 text-xs bg-gray-700 text-gray-300 px-3 py-1.5 rounded hover:bg-gray-600 border border-gray-600"><Download size={12} /> {t('exportBtn')}</button>
                            <button onClick={() => { if(window.confirm(t('confirmDelete'))) onDeleteReport(report.id); }} className="flex items-center gap-1 text-xs bg-red-600/20 text-red-400 px-3 py-1.5 rounded hover:bg-red-600/30 border border-red-600/20"><Trash2 size={12} /> {t('deleteBtn')}</button>
                        </div>
                    </div>
                ))
            )}
          </div>
        )}
      </div>

      {entries.length > 0 && (
        <div className="sticky bottom-6 pb-4 bg-[#0b0e11]/90 backdrop-blur rounded-2xl p-4 border border-gray-800 z-30">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 max-w-2xl mx-auto w-full">
            <button onClick={() => onGenerate(language, generationMode)} className="w-full bg-gradient-to-r from-[#f0b90b] to-[#fcd535] text-black text-lg font-bold px-8 py-3 rounded-xl shadow-[0_0_20px_rgba(240,185,11,0.3)] hover:shadow-[0_0_30px_rgba(240,185,11,0.5)] transform hover:-translate-y-1 transition-all flex items-center justify-center gap-3 whitespace-nowrap">
              <FileText size={24} /><div className="flex flex-col items-start leading-none"><span>{t('generateFull')}</span><span className="text-xs font-normal opacity-80 mt-0.5">{t('generateSub')}</span></div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InputSection;