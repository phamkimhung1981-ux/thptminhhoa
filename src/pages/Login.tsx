import React, { useState } from 'react';
import { useAuth } from '../store/AuthContext';
import { ThreeDIcon } from '../components/ui/ThreeDIcon';
import { SCHOOL_NAME, SCHOOL_SHORT_NAME } from '../constants/schoolConfig';

export default function Login() {
  const { login, error } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await login(username);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative">
      <div className="absolute inset-0 pointer-events-none">
        <img
          src="/hhhh.jpg"
          className="w-full h-full object-contain object-center opacity-10 p-12"
          alt={SCHOOL_NAME}
        />
      </div>
      <div className="absolute inset-0 bg-slate-50/80 backdrop-blur-sm pointer-events-none"></div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200/80 shadow-md flex items-center justify-center">
            <ThreeDIcon name="home" size={60} />
          </div>
        </div>
        <h2 className="mt-4 text-center text-3xl font-black text-slate-900 tracking-tight">
          Hệ Thống Quản Lý
          <br />
          <span className="text-blue-700">Giáo Viên {SCHOOL_SHORT_NAME}</span>
        </h2>
        <p className="mt-2 text-center text-sm font-semibold text-slate-500">
          Đăng nhập để truy cập hệ thống
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-200/80">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm font-semibold">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                Tên đăng nhập
              </label>
              <div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="appearance-none block w-full px-4 py-2.5 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-semibold"
                  placeholder="VD: admin"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">
                Mật khẩu
              </label>
              <div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-2.5 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-semibold"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-extrabold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50"
              >
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
              </button>
            </div>
            
            <div className="mt-4 text-xs text-slate-500 text-center space-y-1">
              <p className="font-semibold">Hệ thống đã kết nối Database thật.</p>
              <p>Tài khoản khởi tạo: <strong className="text-slate-700">admin</strong></p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
