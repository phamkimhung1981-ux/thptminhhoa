import React, { useState, useMemo } from 'react';
import { ParseExcelResult } from '../../utils/teacherExcelParser';
import { Teacher } from '../../types';
import { 
  X, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Filter, 
  Info,
  ArrowRight
} from 'lucide-react';

interface TeacherImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  parseResult: ParseExcelResult;
  onConfirmImport: (teachersToImport: Teacher[], updateExisting: boolean) => Promise<void>;
  existingTeachers: Teacher[];
}

export default function TeacherImportModal({
  isOpen,
  onClose,
  parseResult,
  onConfirmImport,
  existingTeachers
}: TeacherImportModalProps) {
  const [duplicateAction, setDuplicateAction] = useState<'skip' | 'update'>('skip');
  const [skipSampleRows, setSkipSampleRows] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'all' | 'valid' | 'duplicate' | 'error'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lọc các dòng hiển thị theo tab
  const filteredRows = useMemo(() => {
    return parseResult.rows.filter(row => {
      if (skipSampleRows && row.isSampleRow) return false;
      if (activeTab === 'all') return true;
      if (activeTab === 'valid') return row.isValid && !row.isDuplicateWithExisting;
      if (activeTab === 'duplicate') return row.isValid && row.isDuplicateWithExisting;
      if (activeTab === 'error') return !row.isValid;
      return true;
    });
  }, [parseResult.rows, activeTab, skipSampleRows]);

  // Tính số lượng thực tế sẽ được nhập vào hệ thống
  const importableRows = useMemo(() => {
    return parseResult.rows.filter(row => {
      if (!row.isValid) return false;
      if (skipSampleRows && row.isSampleRow) return false;
      if (row.isDuplicateWithExisting && duplicateAction === 'skip') return false;
      return true;
    });
  }, [parseResult.rows, duplicateAction, skipSampleRows]);

  const existingMap = useMemo(() => {
    const map = new Map<string, Teacher>();
    existingTeachers.forEach(t => {
      if (t.code) map.set(t.code.trim().toUpperCase(), t);
    });
    return map;
  }, [existingTeachers]);

  const handleConfirm = async () => {
    if (importableRows.length === 0) {
      alert('Không có bản ghi hợp lệ nào để nhập.');
      return;
    }

    setIsSubmitting(true);
    try {
      const teachersToImport: Teacher[] = importableRows.map(row => {
        const existing = existingMap.get(row.code.trim().toUpperCase());
        return {
          id: existing ? existing.id : `t_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          code: row.code,
          name: row.name,
          role: row.role,
          position: row.position,
          departmentId: row.departmentId,
          departmentName: row.departmentName,
          status: row.status,
          phone: row.phone || (existing ? existing.phone : ''),
          email: row.email || (existing ? existing.email : ''),
          subject: row.subject || (existing ? existing.subject : ''),
          username: existing?.username || row.code.toLowerCase(),
          degree: existing?.degree
        };
      });

      await onConfirmImport(teachersToImport, duplicateAction === 'update');
      onClose();
    } catch (err: any) {
      console.error('Lỗi import CBGVNV:', err);
      alert('Có lỗi xảy ra trong quá trình lưu dữ liệu: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[24px] shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden font-sans">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/80 to-indigo-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                XÁC NHẬN NHẬP DỮ LIỆU
              </h2>
              <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span className="font-bold text-blue-700">Tệp:</span> {parseResult.fileName}
                <span className="text-slate-300">•</span>
                <span className="font-bold text-slate-600">Sheet:</span> {parseResult.sheetName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SUMMARY STATS & NOTICES */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/60 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Tổng đọc được</span>
              <span className="text-xl font-extrabold text-slate-800">{parseResult.totalRows}</span>
              <span className="text-[11px] text-slate-500 ml-1">dòng</span>
            </div>

            <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200/80 shadow-2xs">
              <span className="text-[11px] font-bold uppercase text-emerald-600 block mb-1">Hợp lệ</span>
              <span className="text-xl font-extrabold text-emerald-700">{parseResult.validCount}</span>
              <span className="text-[11px] text-emerald-600 ml-1">dòng mới</span>
            </div>

            <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/80 shadow-2xs">
              <span className="text-[11px] font-bold uppercase text-amber-600 block mb-1">Trùng Mã GV</span>
              <span className="text-xl font-extrabold text-amber-700">{parseResult.duplicateCount}</span>
              <span className="text-[11px] text-amber-600 ml-1">dòng</span>
            </div>

            <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200/80 shadow-2xs">
              <span className="text-[11px] font-bold uppercase text-rose-600 block mb-1">Dòng lỗi</span>
              <span className="text-xl font-extrabold text-rose-700">{parseResult.invalidCount}</span>
              <span className="text-[11px] text-rose-600 ml-1">dòng</span>
            </div>
          </div>

          {/* CẢNH BÁO DÒNG LỖI NẾU CÓ */}
          {parseResult.invalidCount > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-rose-800">
                    Có {parseResult.invalidCount} dòng dữ liệu không hợp lệ.
                  </h4>
                  <button
                    type="button"
                    onClick={() => setActiveTab('error')}
                    className="text-[11px] font-bold text-rose-700 underline hover:text-rose-900 cursor-pointer"
                  >
                    Xem chi tiết các dòng lỗi →
                  </button>
                </div>
                <p className="text-[11px] text-rose-600 mt-0.5">
                  Các dòng bị lỗi sẽ không được lưu vào hệ thống. Xem cột "Kiểm tra / Chi tiết" để biết chính xác dòng và cột bị lỗi.
                </p>
              </div>
            </div>
          )}

          {/* CẤU HÌNH XỬ LÝ TRÙNG LẶP */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-blue-600" />
                Khi trùng Mã GV:
              </span>
              <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 hover:text-blue-600">
                <input
                  type="radio"
                  name="duplicateAction"
                  value="skip"
                  checked={duplicateAction === 'skip'}
                  onChange={() => setDuplicateAction('skip')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>Bỏ qua bản ghi trùng (Mặc định)</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 hover:text-blue-600">
                <input
                  type="radio"
                  name="duplicateAction"
                  value="update"
                  checked={duplicateAction === 'update'}
                  onChange={() => setDuplicateAction('update')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>Cập nhật đè bản ghi cũ</span>
              </label>
            </div>

            <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700 hover:text-blue-600 self-start md:self-auto">
              <input
                type="checkbox"
                checked={skipSampleRows}
                onChange={e => setSkipSampleRows(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Bỏ qua các dòng dữ liệu mẫu (DỮ LIỆU MẪU)</span>
            </label>
          </div>
        </div>

        {/* TABS LỌC DANH SÁCH DÒNG */}
        <div className="px-6 py-2.5 bg-slate-100/60 border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-blue-700 shadow-2xs font-extrabold border border-blue-200'
                  : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              Tất cả ({parseResult.totalRows})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('valid')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'valid'
                  ? 'bg-white text-emerald-700 shadow-2xs font-extrabold border border-emerald-200'
                  : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              Hợp lệ ({parseResult.validCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('duplicate')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'duplicate'
                  ? 'bg-white text-amber-700 shadow-2xs font-extrabold border border-amber-200'
                  : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              Trùng mã ({parseResult.duplicateCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('error')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'error'
                  ? 'bg-white text-rose-700 shadow-2xs font-extrabold border border-rose-200'
                  : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              Lỗi ({parseResult.invalidCount})
            </button>
          </div>

          <div className="text-xs font-bold text-slate-500 hidden sm:block">
            Dự kiến nạp: <span className="text-blue-700 font-extrabold">{importableRows.length}</span> bản ghi
          </div>
        </div>

        {/* PREVIEW TABLE */}
        <div className="flex-1 overflow-auto max-h-[60vh] min-h-[380px] custom-scrollbar border-b border-slate-200 bg-white">
          <table className="w-full min-w-[1350px] text-left text-xs border-collapse">
            <thead className="bg-slate-100/90 backdrop-blur-sm sticky top-0 z-20 border-b border-slate-200 text-slate-700 uppercase font-black tracking-wider text-[11px] shadow-xs">
              <tr>
                <th className="p-3 w-[60px] min-w-[60px] text-center">Dòng</th>
                <th className="p-3 w-[100px] min-w-[100px]">Trạng thái</th>
                <th className="p-3 w-[120px] min-w-[110px]">Mã GV</th>
                <th className="p-3 w-[220px] min-w-[200px]">Họ và tên</th>
                <th className="p-3 w-[150px] min-w-[140px]">Chức vụ</th>
                <th className="p-3 w-[180px] min-w-[160px]">Tổ chuyên môn</th>
                <th className="p-3 w-[150px] min-w-[140px]">Môn dạy</th>
                <th className="p-3 w-[150px] min-w-[140px]">Tình trạng</th>
                <th className="p-3 min-w-[250px]">Kiểm tra / Chi tiết lỗi & cảnh báo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    Không có dòng nào phù hợp trong bộ lọc này.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  return (
                    <tr 
                      key={`row_${row.rowNumber}_${row.code}`}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        !row.isValid 
                          ? 'bg-rose-50/40' 
                          : row.isDuplicateWithExisting 
                          ? 'bg-amber-50/30' 
                          : row.isSampleRow
                          ? 'bg-blue-50/20'
                          : ''
                      }`}
                    >
                      <td className="p-3 w-[60px] min-w-[60px] text-center text-slate-400 font-bold">{row.rowNumber}</td>
                      
                      <td className="p-3 w-[100px] min-w-[100px]">
                        {!row.isValid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                            <XCircle className="w-3 h-3" /> Lỗi
                          </span>
                        ) : row.isDuplicateWithExisting ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            <AlertTriangle className="w-3 h-3" /> Trùng mã
                          </span>
                        ) : row.isSampleRow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                            <Info className="w-3 h-3" /> Bản ghi mẫu
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" /> Hợp lệ
                          </span>
                        )}
                      </td>

                      <td className="p-3 w-[120px] min-w-[110px] font-mono font-bold text-slate-800" title={row.code}>
                        {row.code}
                      </td>
                      
                      <td className="p-3 w-[220px] min-w-[200px] font-bold text-slate-900 whitespace-normal break-words" title={row.name}>
                        <span>{row.name}</span>
                        {row.isSampleRow && (
                          <span className="text-[10px] font-semibold text-blue-600 block mt-0.5 italic">(Dữ liệu mẫu)</span>
                        )}
                      </td>
                      
                      <td className="p-3 w-[150px] min-w-[140px]" title={row.roleDisplay}>
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold">
                          {row.roleDisplay}
                        </span>
                      </td>

                      <td className="p-3 w-[180px] min-w-[160px] text-slate-700 font-semibold whitespace-normal break-words" title={row.departmentName}>
                        {row.departmentName}
                      </td>
                      
                      <td className="p-3 w-[150px] min-w-[140px] text-slate-600 whitespace-normal break-words" title={row.subject || '—'}>
                        {row.subject || '—'}
                      </td>

                      <td className="p-3 w-[150px] min-w-[140px] text-slate-600" title={row.status}>
                        {row.status}
                      </td>

                      <td className="p-3 min-w-[250px]">
                        {row.errors.length > 0 && (
                          <div className="space-y-0.5">
                            {row.errors.map((err, i) => (
                              <p key={i} className="text-[11px] text-rose-600 font-bold flex items-center gap-1">
                                • {err}
                              </p>
                            ))}
                          </div>
                        )}
                        {row.warnings.length > 0 && (
                          <div className="space-y-0.5">
                            {row.warnings.map((warn, i) => (
                              <p key={i} className="text-[11px] text-amber-700 font-medium">
                                ⚠ {warn}
                              </p>
                            ))}
                          </div>
                        )}
                        {row.errors.length === 0 && row.warnings.length === 0 && (
                          <span className="text-slate-400 text-[11px]">Sẵn sàng nạp</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50">
          <div className="text-xs text-slate-600 font-medium">
            {importableRows.length > 0 ? (
              <span className="flex items-center gap-1.5 text-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Sẽ nạp <span className="font-extrabold text-blue-700">{importableRows.length}</span> / {parseResult.totalRows} cán bộ, giáo viên vào hệ thống
              </span>
            ) : (
              <span className="text-rose-600 font-bold flex items-center gap-1">
                <XCircle className="w-4 h-4" /> Không có dòng nào thỏa mãn để nạp
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting || importableRows.length === 0}
              className="px-5 py-2.5 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                'Đang lưu...'
              ) : (
                <>
                  <span>Xác nhận nhập ({importableRows.length})</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
