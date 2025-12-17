import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { TripEntry, GeneratedReport, Language, ContextSettings, ReportDraft, GenerationMode } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Error Handling Helper ---
async function withRetry<T>(fn: () => Promise<T>, retries = 5, delay = 3000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    let isRateLimit = false;
    if (error?.status === 429) isRateLimit = true;
    if (error?.response?.status === 429) isRateLimit = true;
    if (error?.error?.code === 429) isRateLimit = true;
    if (error?.code === 429) isRateLimit = true;

    const msg = error?.message?.toLowerCase() || '';
    if (msg.includes('429') || msg.includes('quota') || msg.includes('resource exhausted') || msg.includes('too many requests')) {
      isRateLimit = true;
    }
                        
    if (isRateLimit && retries > 0) {
      console.warn(`[Gemini Service] Rate limit hit. Retrying in ${delay}ms... (${retries} attempts left)`);
      const jitter = Math.random() * 1000; 
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
      return withRetry(fn, retries - 1, delay * 2); 
    }
    throw error;
  }
}

const cleanJsonText = (text: string): string => {
  if (!text) return "{}";
  let clean = text.trim();
  clean = clean.replace(/^```json\s*/g, '').replace(/^```\s*/g, '').replace(/\s*```$/g, '');
  return clean;
};

export const analyzeUrl = async (url: string, language: Language): Promise<{ content: string; style: string; suggestedContexts: string[]; suggestedThemes: string }> => {
  if (!url) return { content: "", style: "", suggestedContexts: [], suggestedThemes: "" };
  try {
    let langInstruction = language === 'en' ? "English" : "Chinese (Simplified)";
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Search for this URL or topic: ${url}. Output analysis in ${langInstruction}. Format: JSON { "content": "...", "style": "...", "suggestedContexts": [], "suggestedThemes": "..." }`,
      config: { tools: [{ googleSearch: {} }] }
    }));
    const jsonText = response.text;
    if (!jsonText) return { content: "", style: "", suggestedContexts: [], suggestedThemes: "" };
    try {
      const parsed = JSON.parse(cleanJsonText(jsonText));
      return { content: parsed.content || "", style: parsed.style || "", suggestedContexts: parsed.suggestedContexts || [], suggestedThemes: parsed.suggestedThemes || "" };
    } catch { return { content: jsonText, style: "", suggestedContexts: [], suggestedThemes: "" }; }
  } catch { return { content: "", style: "", suggestedContexts: [], suggestedThemes: "" }; }
};

export const generateRefinedContexts = async (settings: ContextSettings, language: Language): Promise<string[]> => {
    const prompt = `Refine these contexts: ${settings.eventContexts.join(', ')}. Return JSON Array of strings.`;
    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt }));
        return JSON.parse(cleanJsonText(response.text || "[]"));
    } catch { return []; }
};

export const generateRefinedThemes = async (settings: ContextSettings, language: Language): Promise<string> => {
    const prompt = `Refine themes: ${settings.keyThemes}. Context: ${settings.eventContexts.join(', ')}.`;
    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt }));
        return response.text || "";
    } catch { return ""; }
};

export const generateEntryCaption = async (images: string[], language: Language, settings: ContextSettings): Promise<string> => {
    if (!images.length) return "";
    const parts: any[] = images.map(img => ({ inlineData: { mimeType: "image/jpeg", data: img.split(',')[1] } }));
    parts.push({ text: "Describe these images factually." });
    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({ model: "gemini-2.5-flash", contents: { parts } }));
        return response.text || "";
    } catch { return ""; }
};

export const generateEntryImage = async (description: string, settings: ContextSettings): Promise<string> => {
    if (!description) return "";
    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-2.5-flash-image",
            contents: { parts: [{ text: `Generate event photo: ${description}` }] },
            config: { imageConfig: { aspectRatio: "16:9" } }
        }));
        const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return data ? `data:image/png;base64,${data}` : "";
    } catch { return ""; }
};

export const generateEntryPRCopy = async (note: string, aiCaption: string, language: Language, settings: ContextSettings, aiTitle?: string): Promise<string> => {
    const prompt = `Write PR copy. Note: ${note}. Visual: ${aiCaption}. Title: ${aiTitle}. Context: ${settings.eventContexts.join(', ')}. Themes: ${settings.keyThemes}.`;
    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt }));
        return response.text || "";
    } catch { return ""; }
};

export const generateSectionDraft = async (section: string, entries: any, language: Language, settings: ContextSettings): Promise<string> => {
    const prompt = `Generate ${section}. Context: ${settings.eventContexts.join(', ')}. Themes: ${settings.keyThemes}.`;
    try {
         const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt }));
         return response.text || "";
    } catch { return ""; }
};

export const generateTripReport = async (
  entries: TripEntry[], 
  language: Language, 
  settings: ContextSettings,
  draft?: ReportDraft,
  mode: GenerationMode = 'creative'
): Promise<GeneratedReport> => {
  try {
    const contexts = settings.eventContexts.join('\n- ');
    
    // STRICT MODE HANDLING (If explicitly requested to translate existing content)
    if (mode === 'zh_to_en' || mode === 'en_to_zh') {
        const sourceLang = mode === 'zh_to_en' ? 'zh' : 'en';
        const targetLang = mode === 'zh_to_en' ? 'en' : 'zh';
        
        const inputPayload = {
            title: draft?.title || {},
            subtitle: draft?.subtitle || {},
            executiveSummary: draft?.executiveSummary || {},
            conclusion: draft?.conclusion || {},
            keyTakeaways: draft?.keyTakeaways || [],
            highlights: entries.map(e => ({
                id: e.id,
                title: e.aiTitle ? { [sourceLang]: e.aiTitle } : {},
                description: e.aiCopy ? { [sourceLang]: e.aiCopy } : {},
            }))
        };

        const prompt = `
        **TASK: STRICT JSON TRANSLATION**
        You are a professional translator for a blockchain project.
        
        **INPUT:**
        ${JSON.stringify(inputPayload)}
        
        **INSTRUCTIONS:**
        1. Translate ALL fields from "${sourceLang}" (Source) to "${targetLang}" (Target).
        2. **DO NOT** change the Source content. Keep it exactly as is.
        3. **DO NOT** generate new content. Only translate what is provided.
        4. If a field is missing in Source, you may leave Target empty or try to infer from context if it's a title.
        5. Return the exact same JSON structure, but with both "en" and "zh" keys filled for every text field.
        
        **OUTPUT FORMAT:**
        Strict JSON only matching the GeneratedReport interface.
        `;
        
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { role: 'user', parts: [{ text: prompt }] },
            config: { responseMimeType: "application/json" }
        }));
        
        const parsed = JSON.parse(cleanJsonText(response.text || "{}"));
        
        return {
            title: parsed.title,
            subtitle: parsed.subtitle,
            executiveSummary: parsed.executiveSummary,
            keyTakeaways: parsed.keyTakeaways || [],
            conclusion: parsed.conclusion,
            highlights: entries.map((e, i) => {
                const h = parsed.highlights?.[i] || {};
                return {
                    title: h.title || { en: '', zh: '' },
                    description: h.description || { en: '', zh: '' },
                    location: h.location || { en: settings.brandLocation, zh: settings.brandLocation },
                    relatedEntryId: e.id
                };
            })
        };
    }

    // --- CREATIVE MODE (DEFAULT) ---
    // Rule: "Generate report with outputLang text mainly, and translate to the other one."
    
    let primaryLang = "Chinese (Simplified)";
    let secondaryLang = "English";
    
    if (language === 'en') {
        primaryLang = "English";
        secondaryLang = "Chinese (Simplified)";
    }

    const entriesText = entries.map((entry, index) => {
      return `Entry ${index + 1} (ID: ${entry.id}):
      - User Note: ${entry.note || 'N/A'}
      - Visual Analysis: ${entry.aiCaption || 'N/A'}
      - PR Copy Draft: ${entry.aiCopy || 'N/A'}
      - AI Title: ${entry.aiTitle || 'N/A'}
      `;
    }).join('\n\n');

    const prompt = `
      Context: 
      - ${contexts}.
      **STRATEGIC THEMES:** ${settings.keyThemes}
      
      **TASK: CREATIVE REPORT GENERATION**
      Synthesize the inputs to produce a high-quality PR report.
      
      **SOURCE MATERIAL:**
      ${entriesText}
      
      **Draft Content (Reference):**
      Title: ${JSON.stringify(draft?.title)}
      Summary: ${JSON.stringify(draft?.executiveSummary)}
      
      **Requirements:**
      1. Create a "Highlight" for EVERY entry in order.
      2. **LANGUAGE RULE:** 
         - Write the content PRIMARILY in ${primaryLang}.
         - BUT you MUST provide a translation in ${secondaryLang} for every single text field (title, subtitle, summary, highlights, takeaways, conclusion).
         - The output must be fully bilingual.
      3. The "highlights" array must match the number of entries provided.
      
      **Output Format:**
      Strict JSON ONLY matching GeneratedReport interface.
      Interface:
      {
        title: { en: string, zh: string },
        subtitle: { en: string, zh: string },
        executiveSummary: { en: string, zh: string },
        keyTakeaways: [{ en: string, zh: string }],
        highlights: [
            { 
                title: { en: string, zh: string }, 
                description: { en: string, zh: string }, 
                location: { en: string, zh: string },
                relatedEntryId: string 
            }
        ],
        conclusion: { en: string, zh: string }
      }
    `;

    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { role: 'user', parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
      }
    }));

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    
    let parsed: any;
    try {
        parsed = JSON.parse(cleanJsonText(text));
    } catch (e) {
        console.error("Failed to parse JSON", text);
        throw new Error("AI returned invalid JSON");
    }
    
    const formatBilingual = (val: any) => {
        if (!val) return { en: '', zh: '' };
        if (typeof val === 'string') {
            // Fallback if AI messes up and returns single string
            return language === 'zh' ? { zh: val, en: '' } : { en: val, zh: '' };
        }
        return { en: val.en || '', zh: val.zh || '' };
    };

    return {
        title: formatBilingual(parsed.title),
        subtitle: formatBilingual(parsed.subtitle),
        executiveSummary: formatBilingual(parsed.executiveSummary),
        highlights: Array.isArray(parsed.highlights) ? parsed.highlights.map((h: any) => ({
            title: formatBilingual(h.title),
            description: formatBilingual(h.description),
            location: formatBilingual(h.location),
            relatedEntryId: h.relatedEntryId
        })) : [],
        keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways.map((k: any) => formatBilingual(k)) : [],
        conclusion: formatBilingual(parsed.conclusion)
    };
  } catch (error) {
    console.error("Error generating trip report:", error);
    throw error;
  }
};