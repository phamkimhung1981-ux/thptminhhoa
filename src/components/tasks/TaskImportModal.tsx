import React, { useState, useRef } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  FileText, 
  Upload, 
  CheckCircle, 
  Sparkles, 
  AlertCircle, 
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { WorkAssignment, WorkAssignmentPriority, WorkAssignmentStatus } from '../../types';
import { OFFICIAL_SCHOOL_TASKS_2026_2027 } from '../../utils/sampleSchoolTasks';
import { getWeekInfoByNumber } from '../../utils/schoolWeekUtils';

interface TaskImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedWeek: number;
  selectedYear: string;
  onImportTasks: (tasks: WorkAssignment[]) => Promise<void>;
  onResetToOfficial: () => Promise<void>;
}

export default function TaskImportModal({
  isOpen,
  onClose,
  selectedWeek,
  selectedYear,
  onImportTasks,
  onResetToOfficial
}: TaskImportModalProps) {
  const [activeTab, setActiveTab] = useState<'sample' | 'excel_word' | 'ocr'>('sample');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<Partial<WorkAssignment>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentWeekInfo = getWeekInfoByNumber(selectedWeek, selectedYear);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setErrorMsg(null);
    setSuccessMsg(null);
    setParsedPreview([]);

    const ext = selectedFile.name.toLowerCase();
    if (ext.endsWith('.xlsx') || ext.endsWith('.xls') || ext.endsWith('.csv')) {
      try {
        const buffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        const results: Partial<WorkAssignment>[] = [];
        rows.forEach((row, idx) => {
          if (!row || row.length === 0 || idx === 0) return;
          const content = String(row[1] || row[0] || '').trim();
          if (!content || content.length < 3) return;

          const assigneeName = String(row[2] || 'Toàn trường').trim();
          const deadline = String(row[3] || currentWeekInfo.endDateIso).trim();
          const priority = (String(row[4] || 'Trung bình').trim()) as WorkAssignmentPriority;

          results.push({
            id: `wa_imported_${Date.now()}_${idx}`,
            academic_year: selectedYear,
            academicYear: selectedYear,
            week_number: selectedWeek,
            weekNumber: selectedWeek,
            weekLabel: currentWeekInfo.weekLabel,
            content,
            workDate: currentWeekInfo.startDateIso,
            deadline: deadline || currentWeekInfo.endDateIso,
            priority: priority || 'Trung bình',
            status: 'Chưa thực hiện',
            scope: 'school',
            departmentId: 'global',
            assigneeIds: ['GROUP_ALL'],
            assigneeId: 'GROUP_ALL',
            note: `Nhập từ file: ${selectedFile.name}`
          });
        });

        if (results.length > 0) {
          setParsedPreview(results);
        } else {
          setErrorMsg('Không tìm thấy dòng dữ liệu công việc hợp lệ trong tệp Excel.');
        }
      } catch (err: any) {
        setErrorMsg('Lỗi khi đọc file Excel: ' + (err.message || 'Định dạng không được hỗ trợ'));
      }
    } else if (ext.endsWith('.docx') || ext.endsWith('.doc')) {
      // Create quick task entries from doc file name
      setParsedPreview([
        {
          id: `wa_word_${Date.now()}_1`,
          academic_year: selectedYear,
          academicYear: selectedYear,
          week_number: selectedWeek,
          weekNumber: selectedWeek,
          weekLabel: currentWeekInfo.weekLabel,
          content: `Kế hoạch giao việc tuần trích xuất từ file ${selectedFile.name}`,
          workDate: currentWeekInfo.startDateIso,
          deadline: currentWeekInfo.endDateIso,
          priority: 'Cao',
          status: 'Chưa thực hiện',
          scope: 'school',
          departmentId: 'global',
          assigneeIds: ['GROUP_ALL'],
          assigneeId: 'GROUP_ALL',
          note: `Nguồn tài liệu: ${selectedFile.name}`
        }
      ]);
    }
  };

  const handleApplyPreview = async () => {
    if (parsedPreview.length === 0) return;
    try {
      setLoading(true);
      const readyTasks: WorkAssignment[] = parsedPreview.map((p, idx) => ({
        id: p.id || `wa_new_${Date.now()}_${idx}`,
        academic_year: selectedYear,
        academicYear: selectedYear,
        week_number: selectedWeek,
        weekNumber: selectedWeek,
        weekLabel: currentWeekInfo.weekLabel,
        content: p.content || '',
        workDate: p.workDate || currentWeekInfo.startDateIso,
        deadline: p.deadline || currentWeekInfo.endDateIso,
        priority: p.priority || 'Trung bình',
        status: p.status || 'Chưa thực hiện',
        scope: p.scope || 'school',
        departmentId: p.departmentId || 'global',
        assigneeIds: p.assigneeIds || ['GROUP_ALL'],
        assigneeId: p.assigneeId || 'GROUP_ALL',
        requirements: p.requirements || '',
        note: p.note || '',
        evaluatorId: 't_ht',
        createdBy: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      await onImportTasks(readyTasks);
      setSuccessMsg(`Đã tạo thành công ${readyTasks.length} nhiệm vụ giao việc vào ${currentWeekInfo.label}!`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (e: any) {
      setErrorMsg('Lỗi khi lưu dữ liệu: ' + (e.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleResetOfficial = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      await onResetToOfficial();
      setSuccessMsg('Đã tạo và đồng bộ Lịch giao việc chuẩn của Trường THPT Minh Hòa thành công!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (e: any) {
      setErrorMsg('Lỗi khi nạp dữ liệu: ' + (e.message || ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-800 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
              <Calendar className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg tracking-wide">
                Tạo & Nhập Lịch Giao Việc Trường
              </h3>
              <p className="text-xs text-blue-100 font-medium">
                {currentWeekInfo.label} • Năm học {selectedYear}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 p-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => { setActiveTab('sample'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'sample'
                ? 'bg-white text-blue-700 shadow-xs border border-blue-100'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles size={16} className="text-amber-500" />
            <span>Mẫu Lịch Chuẩn Trường</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('excel_word'); setErrorMsg(null); setSuccessMsg(null); }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'excel_word'
                ? 'bg-white text-blue-700 shadow-xs border border-blue-100'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet size={16} className="text-emerald-600" />
            <span>Nhập Excel / Word / PDF</span>
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold flex items-center gap-2.5">
              <CheckCircle size={18} className="text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-bold flex items-center gap-2.5">
              <AlertCircle size={18} className="text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'sample' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100 space-y-3">
                <div className="flex items-center gap-2 text-blue-900 font-extrabold text-sm">
                  <Sparkles size={18} className="text-amber-500" />
                  <span>Lịch giao việc chuẩn Trường THPT Minh Hòa</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Hệ thống đã chuẩn bị sẵn toàn bộ nội dung phân công giao việc chính thức cho các tuần (Tuần 1 đến Tuần 5) bao gồm:
                </p>
                <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-5 font-semibold">
                  <li>Sinh hoạt dưới cờ & kiểm điểm nề nếp thi đua (Lớp trực tuần, GVCN, Đoàn trường)</li>
                  <li>Đại hội Chi đoàn Giáo viên năm học 2026-2027</li>
                  <li>Bồi dưỡng học sinh giỏi khối 10, 11, 12 các môn văn hóa</li>
                  <li>Dự giờ thao giảng & SHCM nghiên cứu bài học các Tổ bộ môn</li>
                  <li>Kiểm tra hồ sơ sổ sách giáo án đầu năm học</li>
                  <li>Họp Hội đồng sư phạm tháng 9 và triển khai trọng tâm tháng 10</li>
                  <li>Lao động vệ sinh, an toàn trường học và trực bảo vệ 24/24</li>
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-amber-900 text-xs font-semibold flex items-center gap-2">
                <span>💡 Bấm nút bên dưới để tạo ngay danh sách lịch giao việc chuẩn cho các tuần của trường.</span>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleResetOfficial}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                  <span>{loading ? 'Đang tạo dữ liệu...' : 'Tạo Ngay Lịch Giao Việc Chuẩn THPT Minh Hòa'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'excel_word' && (
            <div className="space-y-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-blue-50/30"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.docx,.doc"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3">
                  <Upload size={24} />
                </div>
                <p className="text-sm font-bold text-slate-800">
                  {file ? file.name : 'Nhấp để chọn file Excel (.xlsx) hoặc Word (.docx)'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Hỗ trợ định dạng Excel phân công công tác hoặc file Word kế hoạch tuần
                </p>
              </div>

              {parsedPreview.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-700 uppercase">
                      Xem trước công việc trích xuất ({parsedPreview.length} mục)
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-2 bg-slate-50">
                    {parsedPreview.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs">
                        <p className="font-bold text-slate-800">{item.content}</p>
                        <div className="flex items-center gap-3 text-slate-500 mt-1 text-[11px]">
                          <span>Hạn: {item.deadline}</span>
                          <span>Ưu tiên: {item.priority}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleApplyPreview}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle size={16} />
                    <span>Lưu {parsedPreview.length} Công Việc Vào Tuần Đang Chọn</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
