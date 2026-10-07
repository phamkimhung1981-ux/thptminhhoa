import React, { useMemo, useState } from 'react';
import { WorkAssignment, Teacher } from '../../types';
import { useAppContext } from '../../store/AppContext';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Download, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import TeacherEvaluationReportModal from './TeacherEvaluationReportModal';
import { safeFormatLocale } from '../../utils/dateUtils';

export default function TaskEvaluationsHistory() {
  const { workAssignments, teachers } = useAppContext();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [selectedReport, setSelectedReport] = useState<any>(null);

  // Extract all individual evaluations
  const allEvaluations = useMemo(() => {
    const records: any[] = [];
    workAssignments.forEach(wa => {
      if (wa.evaluations) {
        Object.keys(wa.evaluations).forEach(assigneeId => {
          const ev = wa.evaluations![assigneeId];
          const teacher = teachers.find(t => t.id === assigneeId);
          if (teacher && ev.evaluatedAt) {
            records.push({
              id: `${wa.id}_${assigneeId}`,
              waId: wa.id,
              taskContent: wa.content,
              teacherId: assigneeId,
              teacherName: teacher.name,
              evaluatedAt: ev.evaluatedAt,
              evaluatorId: ev.evaluatorId,
              evaluatorName: teachers.find(t => t.id === ev.evaluatorId)?.name || 'Hệ thống',
              result: ev.result,
              noiQuy: ev.noiQuyResult,
              chuyenMon: ev.quyCheChuyenMonResult,
              vanHoa: ev.vanHoaCongSoResult,
              thongTin: ev.thongTinBaoCaoResult,
            });
          }
        });
      }
    });
    return records.sort((a, b) => new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime());
  }, [workAssignments, teachers]);

  const filteredRecords = useMemo(() => {
    return allEvaluations.filter(r => {
      const date = new Date(r.evaluatedAt);
      const matchSearch = r.taskContent.toLowerCase().includes(searchTerm.toLowerCase()) || r.teacherName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchMonth = filterMonth ? (date.getMonth() + 1).toString() === filterMonth : true;
      const matchYear = filterYear ? date.getFullYear().toString() === filterYear : true;
      const matchTeacher = filterTeacher ? r.teacherId === filterTeacher : true;
      return matchSearch && matchMonth && matchYear && matchTeacher;
    });
  }, [allEvaluations, searchTerm, filterMonth, filterYear, filterTeacher]);

  const handleExport = () => {
    const data = filteredRecords.map(r => ({
      'Ngày đánh giá': safeFormatLocale(r.evaluatedAt, 'toLocaleDateString', 'Chưa cập nhật'),
      'CBGVNV': r.teacherName,
      'Công việc': r.taskContent,
      'Công việc được giao': r.result,
      'Nội quy': r.noiQuy,
      'Chuyên môn': r.chuyenMon,
      'Văn hóa công sở': r.vanHoa,
      'Thông tin, báo cáo': r.thongTin,
      'Người đánh giá': r.evaluatorName
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lich_su_danh_gia");
    XLSX.writeFile(wb, `Lich_su_danh_gia_${new Date().getTime()}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white/90 backdrop-blur-xl p-4 rounded-[20px] border border-white/40 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] flex flex-wrap gap-4 items-center">
        <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
          <option value="">Tất cả tháng</option>
          {Array.from({length: 12}).map((_, i) => <option key={i+1} value={i+1}>Tháng {i+1}</option>)}
        </select>
        
        <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
          <option value="">Tất cả năm</option>
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>Năm {y}</option>)}
        </select>

        <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400" value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)}>
          <option value="">Tất cả giáo viên</option>
          {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Tìm kiếm..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
          />
        </div>
        
        <button onClick={handleExport} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm font-medium">
          <Download size={16} /> Xuất Excel
        </button>
      </div>

      <Card className="overflow-hidden border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-slate-400">
            <thead>
              <tr className="bg-blue-50/80 text-sm font-bold text-slate-800 text-center">
                <th className="px-3 py-3 border border-slate-400 w-48">CBGVNV</th>
                <th className="px-4 py-3 border border-slate-400 text-left min-w-[200px]">Công việc</th>
                <th className="px-3 py-3 border border-slate-400 min-w-[120px]">Công việc được giao</th>
                <th className="px-3 py-3 border border-slate-400 min-w-[120px]">Nội quy</th>
                <th className="px-3 py-3 border border-slate-400 min-w-[120px]">Chuyên môn</th>
                <th className="px-3 py-3 border border-slate-400 min-w-[120px]">Văn hóa công sở</th>
                <th className="px-3 py-3 border border-slate-400 min-w-[120px]">Thông tin, báo cáo</th>
                <th className="px-3 py-3 border border-slate-400 w-32">Người đánh giá</th>
                <th className="px-3 py-3 border border-slate-400 w-28">Ngày</th>
                <th className="px-3 py-3 border border-slate-400 w-24"></th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {filteredRecords.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-500">Không có dữ liệu</td></tr>
              ) : (
                filteredRecords.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-3 border border-slate-400 text-center font-medium text-sm text-slate-800">{r.teacherName}</td>
                    <td className="px-4 py-3 border border-slate-400 text-sm text-slate-700">{r.taskContent}</td>
                    <td className="px-3 py-3 border border-slate-400 text-center text-sm">{r.result || '-'}</td>
                    <td className="px-3 py-3 border border-slate-400 text-center text-sm">{r.noiQuy || '-'}</td>
                    <td className="px-3 py-3 border border-slate-400 text-center text-sm">{r.chuyenMon || '-'}</td>
                    <td className="px-3 py-3 border border-slate-400 text-center text-sm">{r.vanHoa || '-'}</td>
                    <td className="px-3 py-3 border border-slate-400 text-center text-sm">{r.thongTin || '-'}</td>
                    <td className="px-3 py-3 border border-slate-400 text-center text-sm text-slate-500">{r.evaluatorName}</td>
                    <td className="px-3 py-3 border border-slate-400 text-center text-sm text-slate-500">{safeFormatLocale(r.evaluatedAt, 'toLocaleDateString', 'Chưa cập nhật')}</td>
                    <td className="px-3 py-3 border border-slate-400 text-center"><button onClick={() => setSelectedReport(r)} className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold underline">Xem</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
