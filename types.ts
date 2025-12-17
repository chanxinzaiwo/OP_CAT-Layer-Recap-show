
export type Language = 'en' | 'zh' | 'both';

export interface BilingualText {
  en?: string;
  zh?: string;
}

export interface ContextSettings {
  persona: string;       // e.g. "Expert PR Director..."
  
  // Changed to Array for multiple inputs
  eventContexts: string[];  
  
  keyThemes: string;     // e.g. "OP_CAT expansion..."
  tone: string;          // e.g. "Professional, Visionary..."
  
  // Reference Fields
  referenceUrls: string[]; // Changed to Array
  referenceContent?: string; // Aggregated content from analysis
  referenceStyle?: string;   // Aggregated style
  
  // Branding
  brandLogo?: string; // Base64 string for the logo
  brandName?: string; // e.g. "OP_CAT Press"
  brandLocation?: string; // e.g. "Dubai • Abu Dhabi"
  
  // Author & Socials
  authorName?: string;
  authorRole?: string;
  websiteUrl?: string;
  twitterUrl?: string;
  telegramUrl?: string;
}

export interface TripEntry {
  id: string;
  images: string[];
  heroImageIndices?: number[]; 
  
  // [NEW] AI Title for the entry
  aiTitle?: string; 
  
  note: string;       // User's manual context/instructions
  aiCaption?: string; // AI's visual analysis
  aiCopy?: string;    // High-quality PR copy
  timestamp: number;
}

// Separate draft interface for the controller inputs
export interface ReportDraft {
  title?: BilingualText;
  subtitle?: BilingualText;
  executiveSummary?: BilingualText;
  keyTakeaways?: BilingualText[]; 
  conclusion?: BilingualText;
}

export interface GeneratedReport extends ReportDraft {
  highlights: {
    title: BilingualText;
    description: BilingualText;
    location: BilingualText;
    relatedEntryId?: string;
    // [NEW] Store images directly in the report for persistence/portability
    embeddedImages?: string[];
  }[];
}

// [NEW] Interface for reports published to the public site
export interface PublishedReport extends GeneratedReport {
  id: string;
  publishDate: number;
  coverImage?: string; // Optional cover image from the first entry
  authorName?: string;
  authorRole?: string;
}

export enum AppState {
  HOME = 'HOME',           // Public Landing Page
  LOGIN = 'LOGIN',         // Admin Password Screen
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD', // The InputSection
  ADMIN_PREVIEW = 'ADMIN_PREVIEW',     // The ReportDisplay (Editable)
  PUBLIC_ARTICLE = 'PUBLIC_ARTICLE',   // The ReportDisplay (Read-Only)
  GENERATING = 'GENERATING',
  ERROR = 'ERROR'
}

// [NEW] Generation Mode for Translation
export type GenerationMode = 'creative' | 'zh_to_en' | 'en_to_zh';
