/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Sparkles, 
  ArrowRight, 
  Download, 
  Trash2, 
  CheckCircle,
  LayoutGrid,
  History,
  Info,
  Wand2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { NoteImage } from './types';
import { ImageUploader } from './components/ImageUploader';
import { NoteGrid } from './components/NoteGrid';
import { enhanceImage } from './lib/imageProcessor';
import { processNoteImage, determineSmartSequence } from './lib/gemini';
import { generatePDF } from './lib/pdf';
import { uploadNoteImage, uploadEnhancedImage, getSupabase } from './lib/supabase';
import { AuthModal } from './components/AuthModal';
import confetti from 'canvas-confetti';
import { cn } from './lib/utils';
import { User } from '@supabase/supabase-js';

export default function App() {
  const [notes, setNotes] = useState<NoteImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [supabaseWarning, setSupabaseWarning] = useState(!import.meta.env.VITE_SUPABASE_URL);
  
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    let sub: any = null;
    try {
      const sb = getSupabase();
      sb.auth.getSession().then(({ data: { session } }: any) => {
        setUser(session?.user ?? null);
      });

      const { data: { subscription } } = sb.auth.onAuthStateChange((_event: string, session: any) => {
        setUser(session?.user ?? null);
      });
      sub = subscription;
    } catch (e) {
      console.warn("Auth initialization skipped (Supabase not configured)");
    }
    return () => sub?.unsubscribe?.();
  }, []);

  const handleLogout = async () => {
    const sb = getSupabase();
    await sb.auth.signOut();
  };

  const handleUpload = useCallback(async (files: File[]) => {
    const newNotes: NoteImage[] = files.map((file, index) => ({
      id: Math.random().toString(36).substring(7),
      file,
      preview: URL.createObjectURL(file),
      enhancedPreview: null,
      status: 'uploaded',
      order: notes.length + index,
    }));

    setNotes(prev => [...prev, ...newNotes]);
    
    // Automatically start processing new notes
    for (const note of newNotes) {
      processNote(note);
    }
  }, [notes.length]);

  const processNote = async (note: NoteImage) => {
    const id = note.id;
    setNotes(prev => prev.map(n => n.id === id ? { ...n, status: 'processing' } : n));
    
    try {
      // 1. Upload original to Supabase Storage
      let storageUrl = note.preview;
      try {
        const userPrefix = user ? `${user.id}/` : 'anonymous/';
        const path = `${userPrefix}original/${Date.now()}_${note.file.name}`;
        storageUrl = await uploadNoteImage(note.file, path);
      } catch (e) {
        console.warn("Supabase upload failed, falling back to local preview", e);
      }

      // 2. Local Image Enhancement
      const enhanced = await enhanceImage(note.preview);
      
      // 3. Upload enhanced to Supabase
      let enhancedStorageUrl = enhanced;
      try {
        const userPrefix = user ? `${user.id}/` : 'anonymous/';
        const enhancedPath = `${userPrefix}enhanced/${Date.now()}_enhanced_${note.file.name}`;
        enhancedStorageUrl = await uploadEnhancedImage(enhanced, enhancedPath);
      } catch (e) {
        console.warn("Supabase enhanced upload failed", e);
      }
      
      // 4. AI Analysis (Gemini)
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(note.file);
      });
      const base64 = await base64Promise;

      const aiResult = await processNoteImage(base64, note.file.type);

      setNotes(prev => prev.map(n => n.id === id ? { 
        ...n, 
        preview: storageUrl,
        enhancedPreview: enhancedStorageUrl,
        status: 'ready',
        text: aiResult.text,
        pageNumber: aiResult.pageNumber
      } : n));
    } catch (error) {
      console.error("Processing error:", error);
      setNotes(prev => prev.map(n => n.id === id ? { ...n, status: 'error' } : n));
    }
  };

  const smartSort = async () => {
    if (notes.length < 2) return;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const simplifiedNotes = notes.map(n => ({
        id: n.id,
        text: n.text || '',
        pageNumber: n.pageNumber || null
      }));

      const orderedIds = await determineSmartSequence(simplifiedNotes);
      
      const orderedNotes = orderedIds
        .map(id => notes.find(n => n.id === id))
        .filter((n): n is NoteImage => !!n)
        .map((n, i) => ({ ...n, order: i }));

      // Append any missing notes at the end
      const missingNotes = notes.filter(n => !orderedIds.includes(n.id))
        .map((n, i) => ({ ...n, order: orderedNotes.length + i }));

      setNotes([...orderedNotes, ...missingNotes]);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#818cf8', '#6366f1']
      });
    } catch (error) {
      console.error("Smart sort error:", error);
      setErrorMessage("Failed to smart sort. Please try manual reordering.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (notes.length === 0) return;
    setIsGeneratingPDF(true);
    try {
      const blob = await generatePDF(notes);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NoteStream_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 }
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      setErrorMessage("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const removeNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id).map((n, i) => ({ ...n, order: i })));
  };

  const clearAll = () => {
    if (confirm("Are you sure you want to clear all notes?")) {
      setNotes([]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 w-full bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <FileText className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">NoteFlow <span className="text-indigo-600">AI</span></h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
            <span className={cn(
              "flex items-center gap-2 text-xs font-bold",
              supabaseWarning ? "text-amber-500" : "text-emerald-500"
            )}>
              <span className={cn(
                "w-2 h-2 rounded-full",
                supabaseWarning ? "bg-amber-500" : "bg-emerald-500 animate-pulse"
              )}></span>
              {supabaseWarning ? "LOCAL MODE" : "SYSTEM ONLINE"}
            </span>
            <div className="h-4 w-[1px] bg-gray-200"></div>

            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-slate-900 text-xs font-bold truncate max-w-[120px]">{user.email?.split('@')[0]}</span>
                  <button 
                    onClick={handleLogout}
                    className="text-[10px] text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest font-bold"
                  >
                    Logout
                  </button>
                </div>
                <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs">
                  {user.email?.[0].toUpperCase()}
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setIsAuthModalOpen(true)}
                className="bg-slate-900 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-800 transition-all"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-12">
        {supabaseWarning && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 text-amber-800">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-medium">
                Supabase is not connected. Images will be stored locally in this session.
              </p>
            </div>
            <button 
              onClick={() => setSupabaseWarning(false)}
              className="text-amber-500 hover:text-amber-700 font-bold text-xs"
            >
              DISMISS
            </button>
          </motion.div>
        )}
        {/* Hero Section */}
        <section className="mb-12 text-center pt-12">
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Source Material
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto text-lg font-medium">
            Upload and organize your notes with AI assistance.
          </p>
        </section>

        {/* Upload Zone */}
        <div className="max-w-2xl mx-auto mb-16">
          <ImageUploader onUpload={handleUpload} isProcessing={isProcessing} />
        </div>

        {/* Action Bar & Grid */}
        <AnimatePresence>
          {notes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="space-y-8"
            >
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm sticky top-20 z-20">
                <div className="flex items-center gap-6">
                  <div className="flex flex-col">
                    <span className="label-caps">Documents</span>
                    <span className="text-sm font-bold text-slate-900">{notes.length} Pages</span>
                  </div>
                  <div className="h-8 w-[1px] bg-gray-100"></div>
                  <div className="flex flex-col">
                    <span className="label-caps">Status</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider">AI LOGIC ✓</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={smartSort}
                    disabled={isProcessing || notes.length < 2}
                    className="btn-minimal btn-minimal-secondary px-6 py-2.5 text-sm"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Smart Sequence
                  </button>
                  <button 
                    onClick={handleDownload}
                    disabled={isGeneratingPDF || notes.some(n => n.status === 'processing')}
                    className="btn-minimal btn-minimal-primary px-6 py-2.5 text-sm"
                  >
                    {isGeneratingPDF ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                        <Download className="w-4 h-4 mr-2" />
                    )}
                    Export PDF
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3 text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm font-medium">{errorMessage}</p>
                </div>
              )}

              <div className="bg-white/40 border border-slate-200/60 rounded-3xl p-6 sm:p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                      <LayoutGrid className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Note Sequence</h3>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider bg-slate-100/50 px-3 py-1.5 rounded-full border border-slate-200">
                    <Info className="w-3.5 h-3.5" />
                    Drag to reorder
                  </div>
                </div>

                <NoteGrid 
                  notes={[...notes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))} 
                  onReorder={(newOrder) => {
                    const updated = newOrder.map((n, i) => ({ ...n, order: i }));
                    setNotes(updated);
                  }}
                  onRemove={removeNote}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Features / Benefits */}
        {notes.length === 0 && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            {[
              {
                icon: <Sparkles className="w-6 h-6 text-amber-500" />,
                title: "AI Enhancement",
                desc: "Automatically fixes contrast, brightness, and removes noise from scan photos."
              },
              {
                icon: <Wand2 className="w-6 h-6 text-purple-500" />,
                title: "Smart Sequencing",
                desc: "Uses Gemini AI to detect page numbers and content flow for logical ordering."
              },
              {
                icon: <CheckCircle className="w-6 h-6 text-emerald-500" />,
                title: "Instant Download",
                desc: "Generate production-ready PDFs in seconds, optimized for sharing."
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"
              >
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h4 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-slate-200 py-10 text-center">
        <p className="text-slate-400 text-xs flex items-center justify-center gap-2 font-medium">
          NoteStream AI • Built for Students • Powered by Gemini 3.1
        </p>
      </footer>
    </div>
  );
}
