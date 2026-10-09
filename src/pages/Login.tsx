import React, { useState } from 'react';
import { useAuth } from '../store/AuthContext';
import { ThreeDIcon } from '../components/ui/ThreeDIcon';
import { SCHOOL_NAME, SCHOOL_SHORT_NAME } from '../constants/schoolConfig';
import { Eye, EyeOff, Lock, User, ShieldCheck, AlertCircle, HelpCircle } from 'lucide-react';

export default function Login() {
  const { login, error } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await login(username, password);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative overflow-hidden">
      {/* Background decoration & image */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          src="/hhhh.jpg"
          className="w-full h-full object-cover object-center opacity-15 filter blur-sm scale-105"
          alt={SCHOOL_NAME}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900/90 to-blue-950/80"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="flex justify-center mb-4">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-2xl shadow-blue-500/30 flex items-center justify-center border border-blue-400/30 ring-4 ring-blue-500/20">
            <ThreeDIcon name="home" size={68} />
          </div>
        </div>
        
        <div className="text-center space-y-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-wider">
            <ShieldCheck size={14} /> Cổng thông tin nội bộ
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {SCHOOL_NAME}
          </h2>
          <p className="text-sm font-bold text-blue-400 tracking-wide uppercase">
            “TRI THỨC - NHÂN CÁCH - TƯƠNG LAI”
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-white/95 backdrop-blur-xl py-8 px-6 shadow-2xl shadow-black/50 sm:rounded-3xl sm:px-10 border border-white/20">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <h3 className="text-lg font-black text-slate-900 mb-1">Đăng nhập hệ thống</h3>
              <p className="text-xs font-semibold text-slate-500">Vui lòng nhập tài khoản được cấp để tiếp tục.</p>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs font-bold flex items-start gap-2.5 animate-shake">
                <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-600" />
                <div>
                  <p className="font-extrabold">Đăng nhập không thành công</p>
                  <p className="mt-0.5 text-rose-600/90">{error}</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tên đăng nhập
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm font-semibold text-slate-900 bg-slate-50/50"
                  placeholder="Nhập tên đăng nhập hoặc admin"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full pl-10 pr-12 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm font-semibold text-slate-900 bg-slate-50/50"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-semibold">
                <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4" />
                Nhớ tài khoản
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="font-bold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Quên mật khẩu?
              </button>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-600/30 text-sm font-black text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Đang xác thực...
                  </>
                ) : (
                  "Đăng Nhập Hệ Thống"
                )}
              </button>
            </div>
            
            <div className="pt-3 border-t border-slate-100 text-center text-xs text-slate-500 space-y-1">
              <p className="font-semibold text-slate-600">Bảo mật thông tin nội bộ Trường THPT Minh Hòa</p>
              <p>Tài khoản quản trị mặc định: <strong className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-mono">admin</strong></p>
            </div>
          </form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-600 font-black text-lg">
                <HelpCircle size={22} /> Khôi phục mật khẩu
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Theo quy định bảo mật của nhà trường, tài khoản và mật khẩu CBGVNV được cấp bởi Quản trị viên hệ thống (Bộ phận CNTT / Văn phòng).
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 space-y-1.5 font-medium">
              <p className="font-bold text-blue-950">Hướng dẫn khôi phục:</p>
              <p>1. Liên hệ trực tiếp Tổ Văn phòng hoặc Quản trị viên hệ thống.</p>
              <p>2. Sử dụng tài khoản <code className="bg-blue-100 px-1.5 py-0.5 rounded font-bold text-blue-700">admin</code> nếu bạn là quản trị viên tối cao để cấp lại mật khẩu cho giáo viên trong module Quản lý Nhân sự (CBGVNV).</p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 text-center text-xs font-bold text-slate-500 relative z-10">
        © 2026 {SCHOOL_NAME} • Hệ thống quản lý trường học thông minh
      </div>
    </div>
  );
}
