import React, { useState, useEffect } from 'react';
import { X, Sliders, CheckCircle, AlertCircle } from 'lucide-react';
import { ConductSettings } from '../../types/homeroom';

interface ConductSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ConductSettings;
  onSaveSettings: (settings: ConductSettings) => Promise<void>;
}

export default function ConductSettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings
}: ConductSettingsModalProps) {
  const [baseScore, setBaseScore] = useState(100);
  const [totMin, setTotMin] = useState(90);
  const [khaMin, setKhaMin] = useState(70);
  const [datMin, setDatMin] = useState(50);
  const [schoolYear, setSchoolYear] = useState('2026–2027');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setBaseScore(settings.baseScore || 100);
      setTotMin(settings.thresholds?.totMin || 90);
      setKhaMin(settings.thresholds?.khaMin || 70);
      setDatMin(settings.thresholds?.datMin || 50);
      setSchoolYear(settings.schoolYear || '2026–2027');
      setErrorMsg('');
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totMin <= khaMin || khaMin <= datMin) {
      setErrorMsg('Mức điểm quy định xếp loại phải theo thứ tự Tốt > Khá > Đạt > Chưa đạt.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      await onSaveSettings({
        id: settings.id || 'default_conduct_settings',
        schoolYear,
        baseScore: Number(baseScore),
        thresholds: {
          totMin: Number(totMin),
          khaMin: Number(khaMin),
          datMin: Number(datMin)
        }
      });

      setSubmitting(false);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Lỗi khi lưu cấu hình.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-8">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-5 flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Sliders size={20} className="text-amber-400" />
            CẤU HÌNH ĐIỂM CHUẨN & NGƯỠNG XẾP LOẠI
          </h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Năm học áp dụng
            </label>
            <input
              type="text"
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Điểm rèn luyện khởi điểm ban đầu (Mặc định 100đ)
            </label>
            <input
              type="number"
              value={baseScore}
              onChange={(e) => setBaseScore(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl outline-none"
              required
            />
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Ngưỡng xếp loại kết quả rèn luyện
            </h3>

            <div>
              <label className="block text-xs font-semibold text-emerald-800 mb-1">
                Mức TỐT: Điểm rèn luyện từ
              </label>
              <input
                type="number"
                value={totMin}
                onChange={(e) => setTotMin(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded-lg outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-blue-800 mb-1">
                Mức KHÁ: Điểm rèn luyện từ
              </label>
              <input
                type="number"
                value={khaMin}
                onChange={(e) => setKhaMin(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs font-bold text-blue-800 bg-blue-50 border border-blue-300 rounded-lg outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-amber-800 mb-1">
                Mức ĐẠT: Điểm rèn luyện từ
              </label>
              <input
                type="number"
                value={datMin}
                onChange={(e) => setDatMin(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-300 rounded-lg outline-none"
                required
              />
            </div>

            <p className="text-[11px] text-slate-500 italic">
              * Dưới {datMin} điểm sẽ tự động xếp loại: <strong>CHƯA ĐẠT</strong>
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow transition-colors flex items-center gap-1.5"
            >
              <CheckCircle size={16} />
              {submitting ? 'Đang lưu...' : 'Lưu cấu hình'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
