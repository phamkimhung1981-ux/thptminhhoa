import React, { useState } from 'react';
import { 
  X, 
  Layers, 
  CheckCircle2, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck,
  Award
} from 'lucide-react';
import { KpiCbqlCriterion } from '../../types/kpiCbql';
import { DEFAULT_CBQL_CRITERIA, DEFAULT_CBQL_CRITERIA_GROUPS } from '../../lib/kpiCbqlData';

interface KpiCbqlCriteriaModalProps {
  isOpen: boolean;
  onClose: () => void;
  criteria?: KpiCbqlCriterion[];
}

export default function KpiCbqlCriteriaModal({
  isOpen,
  onClose,
  criteria = DEFAULT_CBQL_CRITERIA
}: KpiCbqlCriteriaModalProps) {
  const [activeGroup, setActiveGroup] = useState<'all' | 'I' | 'II' | 'III'>('all');

  if (!isOpen) return null;

  const filteredCriteria = criteria.filter(c => {
    if (activeGroup === 'all') return true;
    return c.groupCode === activeGroup;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Layers size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base">Bộ Tiêu Chí Đánh Giá KPI Cán Bộ Quản Lý (Chuẩn 100 Điểm)</h3>
              <p className="text-xs text-blue-200">Trường THPT Minh Hòa — Căn cứ file mẫu quy định</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Group Filter Tabs */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 overflow-x-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveGroup('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeGroup === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tất cả (26 tiêu chí - 100đ)
            </button>
            <button
              onClick={() => setActiveGroup('I')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeGroup === 'I' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              Nhóm I (15đ - 8 TC)
            </button>
            <button
              onClick={() => setActiveGroup('II')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeGroup === 'II' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              Nhóm II (15đ - 7 TC)
            </button>
            <button
              onClick={() => setActiveGroup('III')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeGroup === 'III' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              Nhóm III (70đ - 11 TC)
            </button>
          </div>

          <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            {filteredCriteria.length} tiêu chí hiển thị
          </span>
        </div>

        {/* Body List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* Summary Box */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs">
              <span className="font-extrabold text-blue-900 block">I. CHÍNH TRỊ TƯ TƯỞNG (15đ)</span>
              <span className="text-blue-700 text-[11px] mt-0.5 block">8 tiêu chí: Lập trường, phẩm chất đạo đức, lối sống gương mẫu, tính tiền phong.</span>
            </div>
            <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs">
              <span className="font-extrabold text-indigo-900 block">II. TÁC PHONG KỶ LUẬT (15đ)</span>
              <span className="text-indigo-700 text-[11px] mt-0.5 block">7 tiêu chí: Năng động, trách nhiệm, văn hóa công vụ, chấp hành phân công, báo cáo.</span>
            </div>
            <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs">
              <span className="font-extrabold text-emerald-900 block">III. KẾT QUẢ NHIỆM VỤ (70đ)</span>
              <span className="text-emerald-700 text-[11px] mt-0.5 block">11 tiêu chí: Quản lý điều hành (15đ), Chỉ đạo chuyên môn (35đ), CSVC & đội ngũ (20đ).</span>
            </div>
          </div>

          {/* Criteria Cards */}
          <div className="space-y-3">
            {filteredCriteria.map((c, idx) => (
              <div key={c.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-blue-300 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-blue-600 text-white font-extrabold text-xs">
                        {c.code}
                      </span>
                      <h4 className="font-bold text-sm text-slate-800">{c.name}</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{c.description}</p>
                    {c.evidenceRequirement && (
                      <p className="text-[11px] text-blue-700 font-medium">
                        Minh chứng gợi ý: {c.evidenceRequirement}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <span className="px-3 py-1 bg-amber-100 text-amber-900 font-extrabold text-xs rounded-xl inline-block">
                      Tối đa: {c.maxScore}đ
                    </span>
                  </div>
                </div>

                {/* Levels list */}
                <div className="mt-3 pt-3 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {c.levels.map(lvl => (
                    <div key={lvl.id} className="p-2 rounded-lg bg-white border border-slate-200 text-xs">
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span>{lvl.label}</span>
                        <span className="text-blue-600 font-extrabold">{lvl.score}đ</span>
                      </div>
                      {lvl.description && (
                        <span className="text-[10px] text-slate-500 block mt-0.5 leading-tight">{lvl.description}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
}
