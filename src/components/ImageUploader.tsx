import React, { useRef, useState } from 'react';
import { Upload, FileImage, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ImageUploaderProps {
  onUpload: (files: File[]) => void;
  isProcessing: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onUpload, isProcessing }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((file: File) => file.type.startsWith('image/'));
    if (files.length > 0) {
      onUpload(files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(Array.from(e.target.files));
    }
  };

  return (
    <div
      className={cn(
        "relative border-2 border-dashed rounded-xl p-10 transition-all duration-200 ease-in-out flex flex-col items-center justify-center gap-4 cursor-pointer bg-white",
        isDragging ? "border-indigo-500 bg-indigo-50/30" : "border-gray-200 hover:border-indigo-300",
        isProcessing && "opacity-50 pointer-events-none"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center font-bold text-xl text-slate-400 group-hover:text-indigo-500 transition-colors">
        +
      </div>
      <div className="text-center">
        <p className="text-sm text-slate-500">
          Drop images here or <strong className="text-indigo-600">browse</strong>
        </p>
      </div>
    </div>
  );
};
