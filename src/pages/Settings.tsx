import React, { useState } from 'react';
import { useAuth } from '../store/AuthContext';
import { useAppContext } from '../store/AppContext';
import { Card } from '../components/ui/Card';
import Avatar from '../components/ui/Avatar';
import AvatarModal from '../components/profile/AvatarModal';
import BackButton from '../components/ui/BackButton';
import { 
  User, 
  Camera, 
  Building2, 
  Shield, 
  Save, 
  CheckCircle2, 
  School,
  Database,
  Calendar,
  Sparkles
} from 'lucide-react';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const { updateTeacher } = useAppContext();
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [name, setName] = useState(user?.name || 'System Admin');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveAvatar = async (newAvatarUrl: string) => {
    await updateUser({ avatar: newAvatarUrl });
    if (user?.id && user.id !== 'admin') {
      updateTeacher(user.id, { avatar: newAvatarUrl });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await updateUser({ name });
      if (user?.id && user.id !== 'admin') {
        updateTeacher(user.id, { name });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center">
        <BackButton />
      </div>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cài đặt & Hồ sơ cá nhân</h1>
        <p className="text-sm text-slate-500 mt-1">
          Quản lý tài khoản, cập nhật ảnh đại diện và xem thông tin hệ thống THPT Sơn Lương
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
          <span>Thông tin hồ sơ và ảnh đại diện đã được cập nhật thành công!</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Basic Info */}
        <Card className="p-6 flex flex-col items-center text-center space-y-4 md:col-span-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Ảnh đại diện
          </span>

          <div className="relative group">
            <Avatar
              src={user?.avatar}
              name={user?.name || 'User'}
              size="2xl"
              editable={true}
              onEdit={() => setIsAvatarModalOpen(true)}
              className="ring-4 ring-slate-100 shadow-md"
            />
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900">{user?.name || 'System Admin'}</h3>
            <p className="text-xs text-blue-600 font-semibold mt-0.5">Chức vụ: {user?.role || 'BGH'}</p>
            <p className="text-xs text-slate-400 mt-0.5">Tài khoản: @{user?.username || 'admin'}</p>
          </div>

          <button
            type="button"
            onClick={() => setIsAvatarModalOpen(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-colors border border-blue-200"
          >
            <Camera size={15} />
            Đổi ảnh đại diện
          </button>

          <div className="text-[11px] text-slate-400 leading-relaxed px-2">
            Hỗ trợ tải ảnh từ máy tính, dán URL ảnh hoặc chọn từ các mẫu ảnh đại diện có sẵn.
          </div>
        </Card>

        {/* Right Column: Profile Form & System Details */}
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <User size={18} className="text-blue-600" />
              Thông tin cá nhân
            </h2>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Họ và tên hiển thị
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Nhập họ và tên..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tên đăng nhập
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user?.username || 'admin'}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Vai trò / Phân quyền
                  </label>
                  <input
                    type="text"
                    disabled
                    value={user?.role || 'BGH'}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm shadow-blue-500/30"
                >
                  <Save size={15} />
                  {isSaving ? 'Đang lưu...' : 'Lưu thông tin cá nhân'}
                </button>
              </div>
            </form>
          </Card>

          {/* School & System Info */}
          <Card className="p-6">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <School size={18} className="text-blue-600" />
              Thông tin đơn vị & Hệ thống
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Tên hệ thống</span>
                <span className="font-bold text-slate-900">
                  Hệ Thống Quản Lý Giáo Viên THPT Sơn Lương
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Đơn vị trường</span>
                <span className="font-medium text-slate-800">
                  Trường THPT Sơn Lương
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Năm học</span>
                <span className="font-medium text-slate-800 flex items-center gap-1.5">
                  <Calendar size={14} className="text-slate-400" /> 2025 - 2026
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Website Production</span>
                <a 
                  href="https://webquanlythptsonluong.vercel.app/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 text-xs sm:text-sm"
                >
                  webquanlythptsonluong.vercel.app
                </a>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Phiên bản hệ thống</span>
                <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 text-xs">
                  v1.2.3 (2026-09-29)
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-500">Cơ sở dữ liệu đám mây</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Database size={12} /> Firebase Firestore đã kết nối
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <AvatarModal
        isOpen={isAvatarModalOpen}
        onClose={() => setIsAvatarModalOpen(false)}
        currentAvatar={user?.avatar}
        userName={user?.name || 'System Admin'}
        onSave={handleSaveAvatar}
      />
    </div>
  );
}
