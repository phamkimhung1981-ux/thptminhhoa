import React, { useMemo } from 'react';
import { 
  Users, 
  FileCheck2, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  Award, 
  BarChart2, 
  PieChart as PieChartIcon,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  PieChart, 
  Pie, 
  Legend 
} from 'recharts';
import { KpiCbqlForm, KpiCbqlPeriod } from '../../types/kpiCbql';
import { Teacher } from '../../types';

interface KpiCbqlDashboardProps {
  forms: KpiCbqlForm[];
  periods: KpiCbqlPeriod[];
  cbqlTeachers: Teacher[];
  selectedPeriodId: string;
  onSelectPeriod: (periodId: string) => void;
  onCreateNew: () => void;
  onOpenPeriodManager: () => void;
  onOpenCriteriaManager: () => void;
  onOpenAuditLogs: () => void;
}

const GRADE_COLORS: Record<string, string> = {
  'Xuất sắc': '#10B981', // emerald
  'Tốt': '#3B82F6', // blue
  'Hoàn thành': '#F59E0B', // amber
  'Không hoàn thành': '#EF4444', // red
  'Chưa xếp loại': '#94A3B8' // slate
};

export default function KpiCbqlDashboard({
  forms,
  periods,
  cbqlTeachers,
  selectedPeriodId,
  onSelectPeriod,
  onCreateNew,
  onOpenPeriodManager,
  onOpenCriteriaManager,
  onOpenAuditLogs
}: KpiCbqlDashboardProps) {
  // Lọc phiếu theo kỳ đang chọn
  const filteredForms = useMemo(() => {
    if (!selectedPeriodId || selectedPeriodId === 'all') return forms;
    return forms.filter(f => f.periodId === selectedPeriodId);
  }, [forms, selectedPeriodId]);

  // Thống kê số liệu
  const stats = useMemo(() => {
    const totalCbql = cbqlTeachers.length;
    const totalCreated = filteredForms.length;
    const pending = filteredForms.filter(f => f.status === 'pending_evaluation' || f.status === 'draft').length;
    const completed = filteredForms.filter(f => f.status === 'locked' || f.status === 'evaluated').length;

    // Điểm trung bình
    let sumSelf = 0;
    let sumEvaluator = 0;
    let evalCount = 0;

    filteredForms.forEach(f => {
      sumSelf += (f.selfTotalScore || 0);
      if (f.evaluatorTotalScore > 0) {
        sumEvaluator += f.evaluatorTotalScore;
        evalCount++;
      }
    });

    const avgSelf = totalCreated > 0 ? Math.round((sumSelf / totalCreated) * 10) / 10 : 0;
    const avgEvaluator = evalCount > 0 ? Math.round((sumEvaluator / evalCount) * 10) / 10 : 0;

    return {
      totalCbql,
      totalCreated,
      pending,
      completed,
      avgSelf,
      avgEvaluator
    };
  }, [cbqlTeachers, filteredForms]);

  // Dữ liệu biểu đồ xếp loại
  const gradeDistributionData = useMemo(() => {
    const counts: Record<string, number> = {
      'Xuất sắc': 0,
      'Tốt': 0,
      'Hoàn thành': 0,
      'Không hoàn thành': 0
    };

    filteredForms.forEach(f => {
      if (f.grade && f.grade in counts) {
        counts[f.grade]++;
      } else if (f.status === 'locked' || f.status === 'evaluated') {
        if (f.evaluatorTotalScore >= 90) counts['Xuất sắc']++;
        else if (f.evaluatorTotalScore >= 80) counts['Tốt']++;
        else if (f.evaluatorTotalScore >= 70) counts['Hoàn thành']++;
        else if (f.evaluatorTotalScore > 0) counts['Không hoàn thành']++;
      }
    });

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: GRADE_COLORS[name] || '#94A3B8'
    }));
  }, [filteredForms]);

  // Dữ liệu so sánh điểm 3 nhóm
  const groupScoresComparisonData = useMemo(() => {
    if (filteredForms.length === 0) {
      return [
        { name: 'Nhóm I: Chính trị đạo đức', max: 15, self: 0, evaluator: 0 },
        { name: 'Nhóm II: Tác phong kỷ luật', max: 15, self: 0, evaluator: 0 },
        { name: 'Nhóm III: Thực hiện nhiệm vụ', max: 70, self: 0, evaluator: 0 }
      ];
    }

    let g1Self = 0, g1Eval = 0;
    let g2Self = 0, g2Eval = 0;
    let g3Self = 0, g3Eval = 0;

    filteredForms.forEach(f => {
      g1Self += (f.selfGroupScores?.group_I || 0);
      g1Eval += (f.evaluatorGroupScores?.group_I || 0);
      g2Self += (f.selfGroupScores?.group_II || 0);
      g2Eval += (f.evaluatorGroupScores?.group_II || 0);
      g3Self += (f.selfGroupScores?.group_III || 0);
      g3Eval += (f.evaluatorGroupScores?.group_III || 0);
    });

    const n = filteredForms.length;
    return [
      { 
        name: 'Nhóm I (Max 15đ)', 
        max: 15, 
        'Tự chấm': Math.round((g1Self / n) * 10) / 10, 
        'Thủ trưởng ĐG': Math.round((g1Eval / n) * 10) / 10 
      },
      { 
        name: 'Nhóm II (Max 15đ)', 
        max: 15, 
        'Tự chấm': Math.round((g2Self / n) * 10) / 10, 
        'Thủ trưởng ĐG': Math.round((g2Eval / n) * 10) / 10 
      },
      { 
        name: 'Nhóm III (Max 70đ)', 
        max: 70, 
        'Tự chấm': Math.round((g3Self / n) * 10) / 10, 
        'Thủ trưởng ĐG': Math.round((g3Eval / n) * 10) / 10 
      }
    ];
  }, [filteredForms]);

  return (
    <div className="space-y-6">
      {/* THANH ĐIỀU KHIỂN KỲ & CÁC NÚT TÁC VỤ QUẢN TRỊ */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700 whitespace-nowrap">Kỳ đánh giá:</span>
            <select
              id="kpi-cbql-period-filter-select"
              value={selectedPeriodId}
              onChange={(e) => onSelectPeriod(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">-- Tất cả các kỳ đánh giá --</option>
              {periods.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.academicYear}) {p.status === 'locked' ? '🔒 Đã chốt' : ''}
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {filteredForms.length} phiếu trong kỳ
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-start md:justify-end">
          <button
            id="btn-open-audit-logs"
            onClick={onOpenAuditLogs}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Xem lịch sử thao tác"
          >
            <Clock size={15} />
            <span>Lịch sử (Audit Log)</span>
          </button>
          
          <button
            id="btn-open-criteria-manager"
            onClick={onOpenCriteriaManager}
            className="px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Layers size={15} />
            <span>Bộ tiêu chí (100đ)</span>
          </button>

          <button
            id="btn-open-period-manager"
            onClick={onOpenPeriodManager}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Clock size={15} />
            <span>Quản lý kỳ</span>
          </button>

          <button
            id="btn-create-cbql-form"
            onClick={onCreateNew}
            className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowUpRight size={16} />
            <span>+ Tạo Phiếu Mới</span>
          </button>
        </div>
      </div>

      {/* 4 CARDS THỐNG KÊ TỔNG QUAN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng số CBQL & Phiếu */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Cán bộ Quản lý</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-800">{stats.totalCreated}</span>
              <span className="text-xs font-medium text-slate-500">/ {stats.totalCbql} CBQL</span>
            </div>
            <span className="text-[11px] font-medium text-blue-600 mt-0.5 block">
              {Math.round((stats.totalCreated / (stats.totalCbql || 1)) * 100)}% đã khởi tạo phiếu
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
        </div>

        {/* Card 2: Chờ đánh giá */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Chờ đánh giá</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-amber-600">{stats.pending}</span>
              <span className="text-xs font-medium text-slate-500">phiếu</span>
            </div>
            <span className="text-[11px] font-medium text-amber-600 mt-0.5 block">
              Cần thủ trưởng nhận xét & chấm
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock size={24} />
          </div>
        </div>

        {/* Card 3: Đã chốt hoàn thành */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">Đã chốt kết quả</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-emerald-600">{stats.completed}</span>
              <span className="text-xs font-medium text-slate-500">/ {stats.totalCreated} phiếu</span>
            </div>
            <span className="text-[11px] font-medium text-emerald-600 mt-0.5 block">
              Khóa dữ liệu an toàn
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={24} />
          </div>
        </div>

        {/* Card 4: Điểm trung bình */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-500">Điểm ĐG trung bình</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-indigo-600">{stats.avgEvaluator || '--'}</span>
              <span className="text-xs font-medium text-slate-500">/ 100</span>
            </div>
            <span className="text-[11px] font-medium text-slate-500 mt-0.5 block">
              Tự chấm TB: <strong className="text-slate-700">{stats.avgSelf || '--'}</strong>
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Award size={24} />
          </div>
        </div>
      </div>

      {/* BIỂU ĐỒ TRỰC QUAN HÓA SỐ LIỆU */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Biểu đồ cột so sánh điểm 3 nhóm */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <BarChart2 size={18} className="text-blue-600" />
                Đối Chiếu Điểm Trung Bình Theo 3 Nhóm Tiêu Chí
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                So sánh giữa điểm Tự chấm và Thủ trưởng chấm theo từng nhóm tiêu chuẩn
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groupScoresComparisonData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '12px', fontSize: '12px' }} 
                  itemStyle={{ color: '#fff' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Tự chấm" fill="#60A5FA" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Thủ trưởng ĐG" fill="#2563EB" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biểu đồ tròn phân bố xếp loại */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <PieChartIcon size={18} className="text-indigo-600" />
              Cơ Cấu Xếp Loại Chất Lượng CBQL
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tỷ lệ xuất sắc (≥90đ), tốt (≥80đ), hoàn thành (≥70đ)
            </p>
          </div>

          <div className="h-56 w-full flex items-center justify-center my-2">
            {filteredForms.length === 0 ? (
              <div className="text-center text-slate-400 text-xs">
                Chưa có dữ liệu phiếu trong kỳ đánh giá này
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gradeDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {gradeDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Legend 
                    formatter={(value) => <span className="text-xs text-slate-700 font-medium">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center">
            {gradeDistributionData.map(g => (
              <div key={g.name} className="p-1.5 rounded-lg bg-slate-50">
                <span className="text-[10px] font-semibold text-slate-500 block truncate">{g.name}</span>
                <span className="text-xs font-bold text-slate-800">{g.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
