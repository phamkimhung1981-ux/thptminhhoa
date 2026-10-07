import React, { useState, useMemo } from 'react';
import { useAppContext } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { 
  Search, Plus, Filter, FileText, CheckCircle, XCircle, Trash2, 
  Eye, Download, FileSpreadsheet, Printer, Award, TrendingUp, Users, CheckSquare, X
} from 'lucide-react';
import { Report, ReportStatus } from '../types';
import * as XLSX from 'xlsx';
import { safeFormatLocale } from '../utils/dateUtils';
import BackButton from '../components/ui/BackButton';

export default function Reports() {
  const { reports, teachers, departments, kpis, kpiRecords, addReport, updateReport, deleteReport } = useAppContext();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'submissions' | 'kpi_summary' | 'staff_stats'>('submissions');

  // TAB 1 STATES (SUBMISSIONS)
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterType, setFilterType] = useState<string>('All');
  
  // MODAL STATES
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  
  // NEW REPORT FORM
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('Báo cáo tuần');
  const [newDeptId, setNewDeptId] = useState(departments[0]?.id || '');
  const [newContent, setNewContent] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // REVIEW FORM
  const [reviewStatus, setReviewStatus] = useState<'Đã duyệt' | 'Yêu cầu chỉnh sửa'>('Đã duyệt');
  const [reviewFeedback, setReviewFeedback] = useState('');

  // TAB 2 STATES (KPI SUMMARY)
  const [selectedMonth, setSelectedMonth] = useState('09/2026');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');

  const getAuthorName = (id: string) => teachers.find(t => t.id === id)?.name || 'Chưa rõ';
  const getDeptName = (id: string) => departments.find(d => d.id === id)?.name || 'Chưa rõ';

  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
      case 'Đã duyệt': return 'success';
      case 'Chờ duyệt': return 'warning';
      case 'Yêu cầu chỉnh sửa': return 'danger';
      default: return 'default';
    }
  };

  // FILTERED REPORTS
  const filteredReports = useMemo(() => {
    return (reports || []).filter(report => {
      const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            getAuthorName(report.authorId).toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'All' || report.status === filterStatus;
      const matchesType = filterType === 'All' || report.type === filterType;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [reports, searchTerm, filterStatus, filterType, teachers]);

  // HANDLE CREATE REPORT
  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      alert("Vui lòng nhập đầy đủ Tiêu đề và Nội dung báo cáo!");
      return;
    }

    setSubmitting(true);
    const newReport: Report = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: newTitle.trim(),
      authorId: user?.id || teachers[0]?.id || 't1',
      departmentId: newDeptId || departments[0]?.id || 'd1',
      date: new Date().toISOString().split('T')[0],
      type: newType,
      content: newContent.trim(),
      status: 'Chờ duyệt',
      fileName: newFileName ? newFileName : undefined
    };

    await addReport(newReport);
    setSubmitting(false);
    setIsAddModalOpen(false);
    setNewTitle('');
    setNewContent('');
    setNewFileName('');
    alert("Đã gửi báo cáo thành công!");
  };

  // HANDLE REVIEW SUBMIT
  const handleReviewSubmit = async () => {
    if (!selectedReport) return;
    setSubmitting(true);
    await updateReport(selectedReport.id, {
      status: reviewStatus,
      feedback: reviewFeedback,
      reviewerId: user?.id,
      reviewDate: new Date().toISOString().split('T')[0]
    });
    setSubmitting(false);
    setIsReviewModalOpen(false);
    setSelectedReport(null);
    setReviewFeedback('');
    alert(`Đã cập nhật trạng thái báo cáo thành "${reviewStatus}"!`);
  };

  // HANDLE DELETE REPORT
  const handleDeleteReport = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa báo cáo này không?")) {
      await deleteReport(id);
    }
  };

  // KPI STATS COMPUTATION FOR TAB 2
  const kpiReportData = useMemo(() => {
    const activeCatalogKpis = (kpis || []).filter(k => k.status === 'active');
    const standardTotal = activeCatalogKpis.reduce((sum, k) => sum + (k.standardScore || k.pointValue || 10), 0) || 100;

    let totalScoreSum = 0;
    let excellentCount = 0;
    let goodCount = 0;
    let fairCount = 0;
    let poorCount = 0;

    const teacherRows = teachers.map(t => {
      const tRecords = (kpiRecords || []).filter(r => r.teacherId === t.id && r.status === 'confirmed');
      let minus = 0;
      let plus = 0;

      tRecords.forEach(r => {
        if (r.type === 'minus') minus += Math.abs(Number(r.totalPoints) || Number(r.totalDeduction) || 0);
        else if (r.type === 'plus') plus += Math.abs(Number(r.totalPoints) || 0);
        else {
          const val = Number(r.totalPoints) || Number(r.totalDeduction) || 0;
          if (val < 0) minus += Math.abs(val);
          else if (val > 0) plus += val;
        }
      });

      const finalScore = Math.max(0, standardTotal - minus + plus);
      totalScoreSum += finalScore;

      let grade = 'Tốt';
      if (finalScore >= 95) { grade = 'Xuất sắc'; excellentCount++; }
      else if (finalScore >= 85) { grade = 'Tốt'; goodCount++; }
      else if (finalScore >= 70) { grade = 'Đạt'; fairCount++; }
      else { grade = 'Chưa đạt'; poorCount++; }

      return {
        id: t.id,
        code: t.code,
        name: t.name,
        departmentId: t.departmentId,
        departmentName: departments.find(d => d.id === t.departmentId)?.name || 'Chưa phân tổ',
        role: t.role,
        standardScore: standardTotal,
        plusPoints: plus,
        minusPoints: minus,
        finalScore,
        grade
      };
    });

    const filteredRows = teacherRows.filter(r => selectedDeptFilter === 'All' || r.departmentId === selectedDeptFilter);
    const avgScore = teacherRows.length > 0 ? (totalScoreSum / teacherRows.length).toFixed(1) : '0.0';

    return {
      teacherRows: filteredRows,
      allRows: teacherRows,
      avgScore,
      excellentCount,
      goodCount,
      fairCount,
      poorCount
    };
  }, [teachers, kpis, kpiRecords, departments, selectedDeptFilter]);

  // EXPORT KPI SUMMARY TO EXCEL
  const exportKpiSummaryExcel = () => {
    const dataToExport = kpiReportData.teacherRows.map((t, idx) => ({
      'STT': idx + 1,
      'Mã GV': t.code,
      'Họ và Tên': t.name,
      'Tổ chuyên môn': t.departmentName,
      'Chức vụ': t.role,
      'Điểm chuẩn': t.standardScore,
      'Điểm cộng (+)': t.plusPoints,
      'Điểm trừ (-)': t.minusPoints,
      'Điểm tổng kết': t.finalScore,
      'Xếp loại': t.grade
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'KPI_Thang');
    XLSX.writeFile(workbook, `Bao_Cao_KPI_Thang_${selectedMonth.replace('/', '_')}.xlsx`);
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-6 pb-12 font-sans">
      <div className="flex items-center">
        <BackButton />
      </div>
      
      {/* HEADER BAR */}
      <div className="bg-white/90 backdrop-blur-xl p-6 rounded-[20px] border border-white/40 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 uppercase tracking-wide">Báo Cáo & Thống Kê System</h1>
            <p className="text-sm font-medium text-slate-500 mt-0.5">Tổng hợp đánh giá KPI, báo cáo tuần, tháng và thống kê nhân sự nhà trường</p>
          </div>
        </div>
        
        {activeTab === 'submissions' && (
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent rounded-xl shadow-sm text-[13px] font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Plus className="mr-2 h-4 w-4" />
            Lập báo cáo mới
          </button>
        )}

        {activeTab === 'kpi_summary' && (
          <div className="flex items-center gap-2">
            <button 
              onClick={exportKpiSummaryExcel}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-emerald-300 text-[13px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
              Xuất Excel (.xlsx)
            </button>
            <button 
              onClick={() => window.print()}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-slate-300 text-[13px] font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <Printer className="mr-2 h-4 w-4 text-slate-600" />
              In báo cáo
            </button>
          </div>
        )}
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('submissions')}
          className={`pb-3 px-4 font-bold text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'submissions'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText size={18} />
          Báo cáo & Đề xuất ({reports?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('kpi_summary')}
          className={`pb-3 px-4 font-bold text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'kpi_summary'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Award size={18} />
          Báo cáo Tổng hợp KPI
        </button>

        <button
          onClick={() => setActiveTab('staff_stats')}
          className={`pb-3 px-4 font-bold text-sm transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'staff_stats'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users size={18} />
          Thống kê CBGVNV
        </button>
      </div>

      {/* TAB 1: BÁO CÁO & ĐỀ XUẤT */}
      {activeTab === 'submissions' && (
        <Card>
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between bg-slate-50/50 rounded-t-xl">
            <div className="relative max-w-md w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                placeholder="Tìm kiếm báo cáo theo tiêu đề hoặc người lập..."
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="block pl-3 pr-8 py-2 text-sm border-slate-300 focus:ring-blue-500 rounded-lg border bg-white font-medium"
                >
                  <option value="All">Tất cả loại báo cáo</option>
                  <option value="Báo cáo tuần">Báo cáo tuần</option>
                  <option value="Báo cáo tháng">Báo cáo tháng</option>
                  <option value="Báo cáo chuyên môn">Báo cáo chuyên môn</option>
                  <option value="Báo cáo KPI">Báo cáo KPI</option>
                  <option value="Đề xuất - Kiến nghị">Đề xuất - Kiến nghị</option>
                </select>
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="block pl-3 pr-8 py-2 text-sm border-slate-300 focus:ring-blue-500 rounded-lg border bg-white font-medium"
              >
                <option value="All">Tất cả trạng thái</option>
                <option value="Chờ duyệt">Chờ duyệt</option>
                <option value="Đã duyệt">Đã duyệt</option>
                <option value="Yêu cầu chỉnh sửa">Yêu cầu chỉnh sửa</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tên báo cáo</th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Người lập & Tổ</th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày nộp</th>
                  <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                  <th scope="col" className="px-6 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0 mt-0.5">
                          <FileText size={20} />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-slate-900 block leading-snug">{report.title}</span>
                          <span className="text-xs font-semibold text-slate-500 mt-0.5 inline-block bg-slate-100 px-2 py-0.5 rounded-md">{report.type}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">{getAuthorName(report.authorId)}</span>
                        <span className="text-xs font-medium text-slate-500">{getDeptName(report.departmentId)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-600">
                      {safeFormatLocale(report.date, 'toLocaleDateString', 'Chưa cập nhật')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={getStatusColor(report.status)} className="font-bold">{report.status}</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setSelectedReport(report); setIsDetailModalOpen(true); }}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye size={18} />
                        </button>
                        
                        {report.status === 'Chờ duyệt' && (
                          <>
                            <button 
                              onClick={() => {
                                setSelectedReport(report);
                                setReviewStatus('Đã duyệt');
                                setIsReviewModalOpen(true);
                              }}
                              className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Duyệt báo cáo"
                            >
                              <CheckCircle size={18} />
                            </button>
                            <button 
                              onClick={() => {
                                setSelectedReport(report);
                                setReviewStatus('Yêu cầu chỉnh sửa');
                                setIsReviewModalOpen(true);
                              }}
                              className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Yêu cầu sửa"
                            >
                              <XCircle size={18} />
                            </button>
                          </>
                        )}

                        <button 
                          onClick={() => handleDeleteReport(report.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Xóa báo cáo"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredReports.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm font-medium text-slate-500">
                      Chưa có báo cáo nào phù hợp với bộ lọc
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: BÁO CÁO TỔNG HỢP KPI */}
      {activeTab === 'kpi_summary' && (
        <div className="space-y-6">
          {/* STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-[16px] border border-slate-200 shadow-sm">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Điểm KPI Trung bình</div>
              <div className="text-3xl font-black text-blue-700 mt-2">{kpiReportData.avgScore}</div>
              <div className="text-xs font-bold text-blue-600 mt-1">Toàn trường</div>
            </div>

            <div className="bg-emerald-50/50 p-5 rounded-[16px] border border-emerald-100 shadow-sm">
              <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Xuất sắc (≥95 điểm)</div>
              <div className="text-3xl font-black text-emerald-800 mt-2">{kpiReportData.excellentCount}</div>
              <div className="text-xs font-bold text-emerald-700 mt-1">CBGVNV</div>
            </div>

            <div className="bg-blue-50/50 p-5 rounded-[16px] border border-blue-100 shadow-sm">
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">Tốt (85-94 điểm)</div>
              <div className="text-3xl font-black text-blue-800 mt-2">{kpiReportData.goodCount}</div>
              <div className="text-xs font-bold text-blue-700 mt-1">CBGVNV</div>
            </div>

            <div className="bg-amber-50/50 p-5 rounded-[16px] border border-amber-100 shadow-sm">
              <div className="text-xs font-bold text-amber-600 uppercase tracking-wider">Đạt (70-84 điểm)</div>
              <div className="text-3xl font-black text-amber-800 mt-2">{kpiReportData.fairCount}</div>
              <div className="text-xs font-bold text-amber-700 mt-1">CBGVNV</div>
            </div>

            <div className="bg-rose-50/50 p-5 rounded-[16px] border border-rose-100 shadow-sm">
              <div className="text-xs font-bold text-rose-600 uppercase tracking-wider">Chưa đạt (&lt;70 điểm)</div>
              <div className="text-3xl font-black text-rose-800 mt-2">{kpiReportData.poorCount}</div>
              <div className="text-xs font-bold text-rose-700 mt-1">Cần hỗ trợ</div>
            </div>
          </div>

          {/* TABLE CONTAINER */}
          <Card>
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between bg-slate-50/50 rounded-t-xl">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-700">Tháng đánh giá:</span>
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 bg-white"
                >
                  <option value="09/2026">Tháng 09/2026</option>
                  <option value="08/2026">Tháng 08/2026</option>
                  <option value="07/2026">Tháng 07/2026</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-700">Tổ chuyên môn:</span>
                <select 
                  value={selectedDeptFilter} 
                  onChange={(e) => setSelectedDeptFilter(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 bg-white"
                >
                  <option value="All">Tất cả các tổ</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th scope="col" className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase">Mã GV</th>
                    <th scope="col" className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase">Họ và Tên</th>
                    <th scope="col" className="px-5 py-3.5 text-left text-xs font-bold text-slate-500 uppercase">Tổ chuyên môn</th>
                    <th scope="col" className="px-5 py-3.5 text-center text-xs font-bold text-slate-500 uppercase">Điểm chuẩn</th>
                    <th scope="col" className="px-5 py-3.5 text-center text-xs font-bold text-emerald-600 uppercase">Điểm cộng (+)</th>
                    <th scope="col" className="px-5 py-3.5 text-center text-xs font-bold text-rose-600 uppercase">Điểm trừ (-)</th>
                    <th scope="col" className="px-5 py-3.5 text-center text-xs font-bold text-blue-700 uppercase">Điểm tổng kết</th>
                    <th scope="col" className="px-5 py-3.5 text-center text-xs font-bold text-slate-500 uppercase">Xếp loại</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {kpiReportData.teacherRows.map((teacher) => (
                    <tr key={teacher.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-mono font-bold text-slate-600">{teacher.code}</td>
                      <td className="px-5 py-3.5 text-sm font-bold text-slate-900">{teacher.name}</td>
                      <td className="px-5 py-3.5 text-sm font-medium text-slate-600">{teacher.departmentName}</td>
                      <td className="px-5 py-3.5 text-sm font-bold text-center text-slate-600">{teacher.standardScore}</td>
                      <td className="px-5 py-3.5 text-sm font-bold text-center text-emerald-600">+{teacher.plusPoints}</td>
                      <td className="px-5 py-3.5 text-sm font-bold text-center text-rose-600">-{teacher.minusPoints}</td>
                      <td className="px-5 py-3.5 text-base font-black text-center text-blue-700">{teacher.finalScore}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold ${
                          teacher.grade === 'Xuất sắc' ? 'bg-emerald-100 text-emerald-800' :
                          teacher.grade === 'Tốt' ? 'bg-blue-100 text-blue-800' :
                          teacher.grade === 'Đạt' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {teacher.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {kpiReportData.teacherRows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-sm font-medium text-slate-500">
                        Chưa có dữ liệu giáo viên
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: THỐNG KÊ CBGVNV */}
      {activeTab === 'staff_stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/90 backdrop-blur-xl p-6 rounded-[20px] border border-white/40 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)]">
              <h3 className="text-sm font-bold text-slate-500 uppercase mb-4">Cơ cấu nhân sự</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-slate-600">Cán bộ Quản lý (BGH):</span>
                  <span className="font-extrabold text-blue-700">{teachers.filter(t=>t.role==='BGH').length} người</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-slate-600">Giáo viên giảng dạy:</span>
                  <span className="font-extrabold text-blue-700">{teachers.filter(t=>t.role!=='BGH' && t.role!=='Nhân viên').length} người</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-slate-600">Nhân viên hành chính:</span>
                  <span className="font-extrabold text-blue-700">{teachers.filter(t=>t.role==='Nhân viên').length} người</span>
                </div>
                <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-sm font-black text-slate-900">
                  <span>Tổng số CBGVNV:</span>
                  <span className="text-base text-blue-900">{teachers.length} người</span>
                </div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-xl p-6 rounded-[20px] border border-white/40 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.05)] md:col-span-2">
              <h3 className="text-sm font-bold text-slate-500 uppercase mb-4">Thống kê theo Tổ Chuyên Môn</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {departments.map(dept => {
                  const count = teachers.filter(t => t.departmentId === dept.id).length;
                  const head = teachers.find(t => t.id === dept.headId);
                  return (
                    <div key={dept.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-800 text-sm">{dept.name}</div>
                        <div className="text-xs text-slate-500">Tổ trưởng: {head ? head.name : 'Chưa phân công'}</div>
                      </div>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 font-extrabold text-xs rounded-full">{count} thành viên</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW REPORT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">Lập báo cáo mới</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateReport} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tiêu đề báo cáo *</label>
                <input 
                  type="text" 
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="VD: Báo cáo kế hoạch giảng dạy tuần 2..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Loại báo cáo</label>
                  <select 
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="Báo cáo tuần">Báo cáo tuần</option>
                    <option value="Báo cáo tháng">Báo cáo tháng</option>
                    <option value="Báo cáo chuyên môn">Báo cáo chuyên môn</option>
                    <option value="Báo cáo KPI">Báo cáo KPI</option>
                    <option value="Đề xuất - Kiến nghị">Đề xuất - Kiến nghị</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tổ chuyên môn</label>
                  <select 
                    value={newDeptId}
                    onChange={(e) => setNewDeptId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nội dung báo cáo *</label>
                <textarea 
                  rows={4}
                  required
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Nhập nội dung báo cáo chi tiết..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tệp đính kèm (nếu có)</label>
                <input 
                  type="text" 
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="VD: ke_hoach_t9.docx"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Đang gửi...' : 'Gửi báo cáo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REPORT DETAIL MODAL */}
      {isDetailModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">Chi tiết Báo cáo</h3>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase block">Tiêu đề</span>
                <span className="text-base font-extrabold text-slate-900">{selectedReport.title}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block">Người lập</span>
                  <span className="font-bold text-slate-800">{getAuthorName(selectedReport.authorId)}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block">Tổ chuyên môn</span>
                  <span className="font-bold text-slate-800">{getDeptName(selectedReport.departmentId)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block">Ngày gửi</span>
                  <span className="font-bold text-slate-700">{safeFormatLocale(selectedReport.date, 'toLocaleDateString', 'Chưa cập nhật')}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase block">Trạng thái</span>
                  <Badge variant={getStatusColor(selectedReport.status)}>{selectedReport.status}</Badge>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Nội dung báo cáo</span>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {selectedReport.content}
                </div>
              </div>

              {selectedReport.feedback && (
                <div>
                  <span className="text-xs font-bold text-rose-500 uppercase block mb-1">Phản hồi của BGH / Cán bộ duyệt</span>
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 font-medium">
                    {selectedReport.feedback}
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end">
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-200"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REVIEW MODAL */}
      {isReviewModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-800">Duyệt Báo cáo</h3>
              <button onClick={() => setIsReviewModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Quyết định</label>
                <select 
                  value={reviewStatus}
                  onChange={(e: any) => setReviewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-bold"
                >
                  <option value="Đã duyệt">Duyệt báo cáo (Thông qua)</option>
                  <option value="Yêu cầu chỉnh sửa">Yêu cầu chỉnh sửa lại</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ý kiến chỉ đạo / Nhận xét</label>
                <textarea 
                  rows={3}
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  placeholder="Nhập ý kiến chỉ đạo hoặc yêu cầu bổ sung (nếu có)..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  onClick={() => setIsReviewModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleReviewSubmit}
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : 'Xác nhận Duyệt'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
