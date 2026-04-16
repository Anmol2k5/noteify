export interface NoteImage {
  id: string;
  file: File;
  preview: string;
  enhancedPreview: string | null;
  status: 'uploaded' | 'processing' | 'ready' | 'error';
  text?: string;
  pageNumber?: number | null;
  order: number;
}

export interface ProcessingResult {
  text: string;
  pageNumber: number | null;
  enhancementSuggestion?: string;
}
