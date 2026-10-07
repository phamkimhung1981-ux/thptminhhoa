import React, { useState, useRef } from 'react';
import { X, Upload, Check, Trash2, Image as ImageIcon, Sparkles } from 'lucide-react';
import Avatar from '../ui/Avatar';

interface AvatarModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatar?: string;
  userName: string;
  onSave: (newAvatarUrl: string) => Promise<void> | void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1580894732470-f8d9518ff244?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=faces',
];

export default function AvatarModal({
  isOpen,
  onClose,
  currentAvatar,
  userName,
  onSave,
}: AvatarModalProps) {
  const [avatarValue, setAvatarValue] = useState<string>(currentAvatar || '');
  const [urlInput, setUrlInput] = useState<string>(currentAvatar && !currentAvatar.startsWith('data:') ? currentAvatar : '');
  const [isSaving, setIsSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Process uploaded image file: resize to max 256x256 to ensure light storage in Firestore/localStorage
  const handleFileProcess = (file: File) => {
    setErrorMessage(null);
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Vui lòng chọn tệp hình ảnh (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Resize onto canvas to keep base64 compact (~15-40KB)
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setAvatarValue(dataUrl);
          setUrlInput('');
        }
      };
      img.onerror = () => {
        setErrorMessage('Không thể tải hình ảnh này. Vui lòng thử ảnh khác.');
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      setAvatarValue(urlInput.trim());
      setErrorMessage(null);
    }
  };

  const handleRemove = () => {
    setAvatarValue('');
    setUrlInput('');
    setErrorMessage(null);
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await onSave(avatarValue);
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMessage('Lỗi khi lưu ảnh đại diện. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white/95 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-white/50 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-lg font-bold text-slate-900">CẬP NHẬT ẢNH ĐẠI DIỆN</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Hệ Thống Quản Lý Giáo Viên THPT Minh Hòa
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 bg-white p-1 rounded-full shadow-sm hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {/* Current / Preview Avatar */}
          <div className="flex flex-col items-center justify-center gap-3 py-2 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Xem trước ảnh đại diện
            </span>
            <Avatar
              src={avatarValue}
              name={userName}
              size="2xl"
              className="ring-4 ring-white shadow-lg"
            />
            <div className="text-center">
              <div className="font-bold text-slate-800 text-sm">{userName}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {avatarValue ? (avatarValue.startsWith('data:') ? 'Ảnh tải từ máy tính' : 'Ảnh từ liên kết') : 'Ảnh mặc định theo tên viết tắt'}
              </div>
            </div>

            {avatarValue && (
              <button
                type="button"
                onClick={handleRemove}
                className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
              >
                <Trash2 size={13} />
                Xóa ảnh (dùng ảnh mặc định)
              </button>
            )}
          </div>

          {/* Upload from Computer */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              1. Tải ảnh từ thiết bị
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-blue-500 bg-blue-50/50'
                  : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50/70'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center gap-1.5">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Upload size={18} />
                </div>
                <div className="text-sm font-semibold text-slate-800">
                  Nhấp để chọn ảnh hoặc kéo thả vào đây
                </div>
                <div className="text-xs text-slate-400">
                  Hỗ trợ định dạng PNG, JPG, WebP (hệ thống tự động tối ưu hóa)
                </div>
              </div>
            </div>
          </div>

          {/* Paste Image URL */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              2. Hoặc dán đường dẫn ảnh (URL)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleUrlSubmit();
                  }
                }}
                placeholder="https://example.com/anh-dai-dien.jpg"
                className="flex-1 px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleUrlSubmit}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                Áp dụng
              </button>
            </div>
          </div>

          {/* Preset Avatars */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                3. Hoặc chọn ảnh giáo viên mẫu
              </label>
              <span className="text-[11px] text-blue-600 font-medium flex items-center gap-1">
                <Sparkles size={12} /> Có sẵn
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {PRESET_AVATARS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setAvatarValue(preset);
                    setUrlInput(preset);
                    setErrorMessage(null);
                  }}
                  className={`relative p-1 rounded-xl border-2 transition-all overflow-hidden ${
                    avatarValue === preset
                      ? 'border-blue-600 ring-2 ring-blue-500/30'
                      : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <img
                    src={preset}
                    alt={`Mẫu ${idx + 1}`}
                    className="w-full h-14 object-cover rounded-lg"
                  />
                  {avatarValue === preset && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center shadow">
                      <Check size={12} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            HỦY
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/30 flex items-center gap-1.5"
          >
            {isSaving ? 'ĐANG LƯU...' : 'LƯU THAY ĐỔI'}
          </button>
        </div>
      </div>
    </div>
  );
}
