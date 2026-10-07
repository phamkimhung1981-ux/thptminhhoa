import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Calendar, 
  Users, 
  Clock, 
  Sparkles,
  ArrowRight,
  Eye,
  Check,
  RefreshCw
} from 'lucide-react';
import { parseDepartmentScheduleWord } from '../../utils/departmentScheduleWordParser';
import { downloadBlankTemplateWord } from '../../utils/departmentScheduleExportWord';
import { DepartmentWeeklySchedule, ParsedWordScheduleResult } from '../../types/departmentSchedule';
import { PRESET_DEPARTMENTS } from '../../pages/Tasks';

interface DepartmentScheduleWordUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSchedule: (schedule: DepartmentWeeklySchedule) => Promise<void>;
  currentDepartmentId?: string;
  currentDepartmentName?: string;
}

export default function DepartmentScheduleWordUploadModal({
  isOpen,
  onClose,
  onSaveSchedule,
  currentDepartmentId,
  currentDepartmentName
}: DepartmentScheduleWordUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedWordScheduleResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [selectedDeptId, setSelectedDeptId] = useState<string>(currentDepartmentId || 'd_toan_ly_tin_cn');
  const [selectedDeptName, setSelectedDeptName] = useState<string>(currentDepartmentName || 'Tổ Toán-Lý-Tin-CN');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFile = e.target.files[0];
    await processFile(selectedFile);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      await processFile(droppedFile);
    }
  };

  const processFile = async (f: File) => {
    const isDocx = f.name.toLowerCase().endsWith('.docx');
    const isDoc = f.name.toLowerCase().endsWith('.doc');

    if (!isDocx && !isDoc) {
      setErrorMsg('Vui lòng chọn tệp Word (.docx hoặc .doc) theo mẫu kế hoạch công tác.');
      return;
    }

    setFile(f);
    setErrorMsg(null);
    setLoading(true);

    try {
      const result = await parseDepartmentScheduleWord(f);
      setParsedData(result);
      
      // Auto-match department if parsed
      if (result.departmentName) {
        const foundDept = PRESET_DEPARTMENTS.find(d => 
          d.name.toLowerCase().includes(result.departmentName.toLowerCase()) || 
          result.departmentName.toLowerCase().includes(d.shortName.toLowerCase())
        );
        if (foundDept) {
          setSelectedDeptId(foundDept.id);
          setSelectedDeptName(foundDept.name);
        } else {
          setSelectedDeptName(result.departmentName);
        }
      }

      setStep('preview');
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Không thể đọc dữ liệu từ tệp Word này. Vui lòng kiểm tra xem tệp có bị khóa hoặc không đúng định dạng không.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!parsedData) return;

    try {
      setLoading(true);
      const scheduleToSave: DepartmentWeeklySchedule = {
        id: `dept_sched_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        schoolName: parsedData.schoolName || 'TRƯỜNG THPT MINH HÒA',
        departmentId: selectedDeptId,
        departmentName: selectedDeptName || parsedData.departmentName || 'Tổ chuyên môn',
        weekNumber: parsedData.weekNumber || 1,
        startDate: parsedData.startDate || '2026-09-28',
        endDate: parsedData.endDate || '2026-10-04',
        year: parsedData.year || 2026,
        academicYear: '2026-2027',
        days: parsedData.days,
        status: 'draft',
        sourceFile: file?.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await onSaveSchedule(scheduleToSave);
      setLoading(false);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Lỗi khi lưu lịch vào cơ sở dữ liệu: ' + (err.message || ''));
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadBlankTemplateWord(selectedDeptName, '5');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Upload size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-tight flex items-center gap-2">
                Tải lên lịch giao việc từ file Word
                <span className="text-[11px] font-bold text-blue-600 bg-blue-100/80 px-2 py-0.5 rounded-full lowercase">
                  .docx
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Tự động nhận diện Tên tổ, Tuần, Ngày và Bảng công việc Sáng / Chiều theo mẫu chuẩn
              </p>
            </div>
          </div>
          
          <button 
            type="button" 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {step === 'upload' ? (
            <div className="space-y-6">
              {/* Dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/40 hover:bg-blue-50/80 rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-200 group flex flex-col items-center justify-center space-y-3"
              >
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept=".docx,.doc" 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                
                <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 group-hover:scale-110 flex items-center justify-center transition-transform shadow-sm">
                  <FileText size={32} />
                </div>

                <div className="space-y-1">
                  <p className="text-base font-bold text-slate-800">
                    Kéo thả file Word vào đây hoặc <span className="text-blue-600 underline">bấm để chọn file</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Hỗ trợ file Microsoft Word (.docx) chứa biểu mẫu lịch giao việc tổ chuyên môn
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 bg-white px-3.5 py-1.5 rounded-full border border-blue-200 shadow-xs">
                  <Sparkles size={14} className="text-blue-500" />
                  Đọc trực tiếp bảng 5 cột: Thứ, Sáng, Chiều, Lãnh đạo trực, Ghi chú
                </div>
              </div>

              {/* Template download card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Download size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Chưa có file Word mẫu?</h4>
                    <p className="text-xs text-slate-500">Tải tệp Word mẫu chuẩn có sẵn bảng và tiêu đề để các tổ điền nội dung</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0"
                >
                  <Download size={14} className="text-blue-600" />
                  Tải mẫu Word (.docx)
                </button>
              </div>

              {errorMsg && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-rose-700 text-xs">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          ) : (
            /* Step: Preview */
            <div className="space-y-6">
              
              {/* Parsed Summary bar */}
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-4 border border-blue-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Tổ chuyên môn</span>
                  <select 
                    value={selectedDeptId}
                    onChange={(e) => {
                      setSelectedDeptId(e.target.value);
                      const found = PRESET_DEPARTMENTS.find(d => d.id === e.target.value);
                      if (found) setSelectedDeptName(found.name);
                    }}
                    className="mt-1 w-full bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 py-1.5 px-2.5 shadow-xs focus:ring-2 focus:ring-blue-500"
                  >
                    {PRESET_DEPARTMENTS.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                    <option value="custom">Tổ khác ({parsedData?.departmentName || 'Tổ chuyên môn'})</option>
                  </select>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Tuần học</span>
                  <div className="mt-1 flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-xs">
                    <Calendar size={14} className="text-blue-600 shrink-0" />
                    <span className="text-xs font-extrabold text-blue-700">Tuần {parsedData?.weekNumber || 1}</span>
                    <span className="text-[11px] text-slate-500">
                      ({parsedData?.startDate ? `${parsedData.startDate} → ${parsedData.endDate}` : 'Năm học 2026-2027'})
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Tệp nguồn</span>
                  <div className="mt-1 flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 shadow-xs text-xs font-semibold text-slate-700 truncate">
                    <FileText size={14} className="text-emerald-600 shrink-0" />
                    <span className="truncate">{file?.name}</span>
                  </div>
                </div>
              </div>

              {parsedData?.warnings && parsedData.warnings.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                  <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                  <div className="space-y-0.5">
                    {parsedData.warnings.map((w, i) => (
                      <div key={i}>{w}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Table Preview */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                    <Eye size={15} className="text-blue-600" />
                    Xem trước bảng dữ liệu trích xuất từ file Word
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('upload');
                      setFile(null);
                      setParsedData(null);
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <RefreshCw size={12} />
                    Chọn tệp khác
                  </button>
                </div>

                <div className="overflow-x-auto max-h-[380px]">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-700 font-extrabold uppercase text-[11px] sticky top-0 z-10 border-b border-slate-300 shadow-xs">
                      <tr>
                        <th rowSpan={2} className="px-3 py-2.5 border-r border-slate-300 w-28 text-center bg-slate-100">
                          Thứ, ngày
                        </th>
                        <th className="px-3 py-1.5 border-r border-slate-300 text-center bg-blue-50/50">
                          Sáng
                        </th>
                        <th className="px-3 py-1.5 border-r border-slate-300 text-center bg-amber-50/50">
                          Chiều
                        </th>
                        <th rowSpan={2} className="px-3 py-2.5 border-r border-slate-300 w-36 text-center bg-slate-100">
                          Lãnh đạo trực/đánh giá
                        </th>
                        <th rowSpan={2} className="px-3 py-2.5 w-28 text-center bg-slate-100">
                          Ghi chú
                        </th>
                      </tr>
                      <tr className="border-b border-slate-300 text-[10px] text-slate-500 font-bold italic">
                        <th className="px-3 py-1 border-r border-slate-300 text-center bg-blue-50/30">
                          Nội dung công việc
                        </th>
                        <th className="px-3 py-1 border-r border-slate-300 text-center bg-amber-50/30">
                          Nội dung công việc
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {parsedData?.days.map((day, idx) => (
                        <tr key={day.id || idx} className="hover:bg-slate-50/70">
                          <td className="px-3 py-2.5 border-r border-slate-200 font-bold text-slate-800 text-center bg-slate-50/30">
                            <div>{day.dayOfWeek}</div>
                            {day.date && (
                              <div className="text-[10px] text-slate-500 font-normal">
                                {day.date.split('-').reverse().slice(0, 2).join('/')}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 border-r border-slate-200 align-top text-slate-700 whitespace-pre-line leading-relaxed">
                            {day.morningTasks || <span className="text-slate-300 italic">Không có công việc</span>}
                          </td>
                          <td className="px-3 py-2.5 border-r border-slate-200 align-top text-slate-700 whitespace-pre-line leading-relaxed">
                            {day.afternoonTasks || <span className="text-slate-300 italic">Không có công việc</span>}
                          </td>
                          <td className="px-3 py-2.5 border-r border-slate-200 align-top text-slate-600 text-center font-medium">
                            {day.dutyLeaderOrEvaluation || '-'}
                          </td>
                          <td className="px-3 py-2.5 align-top text-slate-500 text-center">
                            {day.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 transition-colors"
          >
            Đóng
          </button>

          {step === 'preview' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors"
              >
                Quay lại
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmImport}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all"
              >
                {loading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Áp dụng & Lưu lịch tổ</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
