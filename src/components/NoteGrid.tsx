import React from 'react';
import { motion, Reorder } from 'motion/react';
import { NoteImage } from '../types';
import { GripVertical, X, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

interface NoteGridProps {
  notes: NoteImage[];
  onReorder: (notes: NoteImage[]) => void;
  onRemove: (id: string) => void;
}

export const NoteGrid: React.FC<NoteGridProps> = ({ notes, onReorder, onRemove }) => {
  return (
    <Reorder.Group axis="y" values={notes} onReorder={onReorder} className="space-y-4">
      {notes.map((note) => (
        <Reorder.Item
          key={note.id}
          value={note}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={cn(
            "group relative bg-white border border-gray-200 rounded-lg p-3 flex gap-4 items-center shadow-sm hover:shadow-md transition-shadow",
            note.status === 'processing' && "bg-gray-50/50"
          )}
        >
          <div className="cursor-grab active:cursor-grabbing p-1 text-gray-300 group-hover:text-gray-400">
            <GripVertical className="w-5 h-5" />
          </div>
          
          <div className="relative w-20 h-28 flex-shrink-0 bg-slate-100 rounded border border-gray-100 overflow-hidden">
            <img 
              src={note.enhancedPreview || note.preview} 
              alt="Note preview" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {note.status === 'processing' && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
              </div>
            )}
          </div>

          <div className="flex-grow min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="text-sm font-semibold text-slate-800 truncate">
                {note.file.name}
              </h3>
              <span className="flex-shrink-0 px-2 py-0.5 bg-slate-900 text-white text-[10px] font-bold rounded">
                {String(note.order + 1).padStart(2, '0')}
              </span>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-2">
              {note.pageNumber !== undefined && note.pageNumber !== null && (
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter">
                  Detected: p{note.pageNumber}
                </span>
              )}
              {note.enhancedPreview && (
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> Enhanced
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 mt-2 line-clamp-1 italic font-medium">
              {note.status === 'processing' ? 'AI Analyzing...' : (note.text || 'Extracted summary...')}
            </p>
          </div>

          <div className="flex items-center gap-4 pr-1">
            <button
              onClick={() => onRemove(note.id)}
              className="p-1.5 text-gray-300 hover:text-slate-900 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {note.status === 'processing' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gray-100 overflow-hidden rounded-b-lg">
              <motion.div 
                className="h-full bg-indigo-500"
                initial={{ width: "0%" }}
                animate={{ width: "70%" }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          )}
        </Reorder.Item>
      ))}
    </Reorder.Group>
  );
};
