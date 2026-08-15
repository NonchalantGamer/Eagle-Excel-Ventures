import React, { useState, useRef, useEffect, DragEvent, ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { 
  Camera, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  X, 
  Image as ImageIcon, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { AVATAR_PRESETS, AvatarPreset } from './avatarPresets';
import { useModalFocusLock } from '../../hooks/useModalFocusLock';

interface ProfilePhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPhotoURL: string;
  onSelectPhoto: (photoDataUrl: string) => void;
  userType?: 'customer' | 'admin' | 'all';
  title?: string;
  subtitle?: string;
}

/**
 * Resizes and compresses an image file using an offscreen canvas.
 * This guarantees the resulting data URL is lightweight (typically 30-80KB)
 * and safe for localStorage and fast instant rendering across devices.
 */
const processAndCompressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select a valid image file (PNG, JPG, WEBP).'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIMENSION = 400; // 400x400 max is perfect for high-res crisp avatar
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIMENSION) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          }
        } else {
          if (height > MAX_DIMENSION) {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(readerEvent.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Export as WebP or JPEG with quality 0.85
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to parse the selected image.'));
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Error reading the image file from device.'));
    reader.readAsDataURL(file);
  });
};

export const ProfilePhotoModal: React.FC<ProfilePhotoModalProps> = ({
  isOpen,
  onClose,
  currentPhotoURL,
  onSelectPhoto,
  userType = 'all',
  title = 'Choose Profile Picture',
  subtitle = 'Upload a photo from your gallery or choose a curated avatar'
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<string>(currentPhotoURL);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useModalFocusLock(isOpen, onClose);

  if (!isOpen) return null;

  const filteredPresets = AVATAR_PRESETS.filter(
    preset => userType === 'all' || preset.role === 'all' || preset.role === userType
  );

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleImageFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handleImageFile(file);
    }
  };

  const handleImageFile = async (file: File) => {
    setErrorMessage(null);
    setIsProcessing(true);
    try {
      // 10MB maximum file size check before resizing
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Image file is too large. Please select a photo under 10MB.');
      }
      const dataUrl = await processAndCompressImage(file);
      setSelectedPhoto(dataUrl);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not load photo from device.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleApply = () => {
    if (selectedPhoto) {
      onSelectPhoto(selectedPhoto);
    }
    onClose();
  };

  const handleRemovePhoto = () => {
    const defaultUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';
    setSelectedPhoto(defaultUrl);
    setErrorMessage(null);
  };

  return typeof document !== 'undefined' ? createPortal(
    <div 
      data-portal-modal="true"
      className="fixed inset-0 z-[99999] isolate flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-xl overflow-hidden animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-[#181818] rounded-3xl p-6 border border-slate-200 dark:border-white/10 shadow-2xl space-y-5 animate-scaleUp text-slate-900 dark:text-zinc-100 overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4 shrink-0">
          <div className="space-y-0.5">
            <h3 className="text-base font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-[#F27D26]" />
              <span>{title}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto overscroll-contain flex-1 space-y-5 pr-1">

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Current / Selected Preview + Upload Button */}
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5">
          <div className="relative shrink-0">
            <img 
              src={selectedPhoto} 
              alt="Selected profile preview" 
              className="w-20 h-20 rounded-full object-cover ring-3 ring-[#F27D26] shadow-md bg-slate-200 dark:bg-zinc-800"
            />
            {isProcessing && (
              <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center text-white text-[10px] font-bold">
                Loading...
              </div>
            )}
          </div>

          <div className="space-y-2 text-center sm:text-left flex-1">
            <div className="text-xs font-bold text-slate-900 dark:text-zinc-100">
              Selected Profile Photo
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-snug">
              Preview of how your avatar appears across orders, quotes, and navigation.
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
              {/* Native Gallery / File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="gallery-file-input"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="px-3.5 py-1.5 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload From Gallery</span>
              </button>

              <button
                type="button"
                onClick={handleRemovePhoto}
                className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-700 dark:text-zinc-300 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3 text-rose-500" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>

        {/* Drag & Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-4 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer ${
            isDragging 
              ? 'border-[#F27D26] bg-[#F27D26]/10' 
              : 'border-slate-300 dark:border-white/15 hover:border-[#F27D26]/50 bg-slate-50/50 dark:bg-white/[0.02]'
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-1.5 text-xs text-slate-600 dark:text-zinc-300">
            <ImageIcon className="w-5 h-5 text-[#F27D26]" />
            <span className="font-semibold">
              Tap to browse photos or drag and drop an image here
            </span>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500">
              Supports JPEG, PNG, WEBP, HEIC (Auto-optimized)
            </span>
          </div>
        </div>

        {/* Curated Presets Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 dark:text-zinc-200">
              Or Choose Curated Preset
            </span>
            <span className="text-[11px] text-slate-400 dark:text-zinc-500">
              {filteredPresets.length} presets available
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 max-h-48 overflow-y-auto p-1 scrollbar-thin">
            {filteredPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setSelectedPhoto(preset.url);
                  setErrorMessage(null);
                }}
                className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all cursor-pointer hover:scale-105 ${
                  selectedPhoto === preset.url 
                    ? 'border-[#F27D26] ring-2 ring-[#F27D26]/40 scale-102' 
                    : 'border-slate-200 dark:border-white/10 opacity-80 hover:opacity-100'
                }`}
                title={preset.name}
              >
                <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                {selectedPhoto === preset.url && (
                  <div className="absolute inset-0 bg-[#F27D26]/30 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-slate-950 bg-white rounded-full" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-5 py-2 rounded-xl bg-[#F27D26] hover:bg-[#e06d1a] text-slate-950 font-extrabold text-xs shadow-md transition-all cursor-pointer"
          >
            Use This Picture
          </button>
        </div>

      </div>
    </div>,
    document.body
  ) : null;
};
