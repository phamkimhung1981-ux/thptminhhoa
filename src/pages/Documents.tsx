import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit2, 
  Trash2, 
  Building2, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Paperclip, 
  Send, 
  FileSpreadsheet, 
  X, 
  Printer, 
  Sparkles, 
  ExternalLink,
  ShieldAlert,
  ArrowDownLeft,
  ArrowUpRight,
  BookOpenCheck,
  UploadCloud,
  FileUp,
  File,
  Loader2
} from 'lucide-react';
import { OfficialDocument, DocumentCategory, DocumentType, DocumentUrgency, DocumentStatus } from '../types/document';
import { 
  subscribeToDocuments, 
  createOfficialDocument, 
  updateOfficialDocument, 
  deleteOfficialDocument 
} from '../services/documentService';
import { useAppContext } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';
import BackButton from '../components/ui/BackButton';

export default function Documents() {
  const { departments } = useAppContext();
  const { user } = useAuth();

  const [documents, setDocuments] = useState<OfficialDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<'all' | DocumentCategory>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterUrgency, setFilterUrgency] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingDoc, setEditingDoc] = useState<OfficialDocument | null>(null);
  const [viewingDoc, setViewingDoc] = useState<OfficialDocument | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<OfficialDocument | null>(null);

  // File Upload State & Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState<Partial<OfficialDocument>>({
    documentNumber: '',
    title: '',
    category: 'incoming',
    documentType: 'Công văn',
    issuingAuthority: 'Sở GD&ĐT',
    issueDate: new Date().toISOString().split('T')[0],
    receivedDate: new Date().toISOString().split('T')[0],
    urgency: 'Thường',
    assignedDepartmentIds: [],
    assignedDepartmentNames: [],
    signerName: '',
    signerPosition: '',
    fileUrl: '',
    fileDriveLink: '',
    fileName: '',
    summaryNote: '',
    status: 'processing'
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Subscribe to real-time documents from Firestore
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToDocuments((docs) => {
      setDocuments(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(docItem => {
      // Category filter
      if (selectedCategory !== 'all' && docItem.category !== selectedCategory) {
        return false;
      }
      // Type filter
      if (filterType !== 'all' && docItem.documentType !== filterType) {
        return false;
      }
      // Urgency filter
      if (filterUrgency !== 'all' && docItem.urgency !== filterUrgency) {
        return false;
      }
      // Status filter
      if (filterStatus !== 'all' && docItem.status !== filterStatus) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchNum = docItem.documentNumber.toLowerCase().includes(query);
        const matchTitle = docItem.title.toLowerCase().includes(query);
        const matchAuth = docItem.issuingAuthority.toLowerCase().includes(query);
        const matchSigner = (docItem.signerName || '').toLowerCase().includes(query);
        if (!matchNum && !matchTitle && !matchAuth && !matchSigner) {
          return false;
        }
      }
      return true;
    });
  }, [documents, selectedCategory, filterType, filterUrgency, filterStatus, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = documents.length;
    const incoming = documents.filter(d => d.category === 'incoming').length;
    const outgoing = documents.filter(d => d.category === 'outgoing').length;
    const internal = documents.filter(d => d.category === 'internal').length;
    const urgent = documents.filter(d => d.urgency === 'Khẩn' || d.urgency === 'Thượng khẩn').length;
    const pending = documents.filter(d => d.status === 'processing' || d.status === 'pending').length;
    return { total, incoming, outgoing, internal, urgent, pending };
  }, [documents]);

  const handleOpenCreateModal = () => {
    setEditingDoc(null);
    setFormData({
      documentNumber: '',
      title: '',
      category: 'incoming',
      documentType: 'Công văn',
      issuingAuthority: 'Sở GD&ĐT tỉnh',
      issueDate: new Date().toISOString().split('T')[0],
      receivedDate: new Date().toISOString().split('T')[0],
      urgency: 'Thường',
      assignedDepartmentIds: [],
      assignedDepartmentNames: [],
      signerName: 'Lãnh đạo',
      signerPosition: 'Giám đốc',
      fileUrl: '',
      fileDriveLink: '',
      fileName: '',
      summaryNote: '',
      status: 'processing'
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (docItem: OfficialDocument) => {
    setEditingDoc(docItem);
    setFormData({ ...docItem });
    setIsCreateModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.documentNumber || !formData.title) {
      alert('Vui lòng nhập Số/Ký hiệu và Trích yếu văn bản!');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingDoc) {
        await updateOfficialDocument(editingDoc.id, formData);
      } else {
        await createOfficialDocument({
          documentNumber: formData.documentNumber || '',
          title: formData.title || '',
          category: formData.category || 'incoming',
          documentType: formData.documentType || 'Công văn',
          issuingAuthority: formData.issuingAuthority || 'Trường THPT Minh Hòa',
          issueDate: formData.issueDate || new Date().toISOString().split('T')[0],
          receivedDate: formData.receivedDate,
          urgency: formData.urgency || 'Thường',
          assignedDepartmentIds: formData.assignedDepartmentIds || [],
          assignedDepartmentNames: formData.assignedDepartmentNames || [],
          signerName: formData.signerName || '',
          signerPosition: formData.signerPosition || '',
          fileUrl: formData.fileUrl || '',
          fileDriveLink: formData.fileDriveLink || '',
          fileName: formData.fileName || '',
          summaryNote: formData.summaryNote || '',
          status: formData.status || 'processing',
          createdByName: user?.name || 'Quản trị viên'
        });
      }
      setIsCreateModalOpen(false);
      setEditingDoc(null);
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi lưu văn bản. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deletingDoc) {
      try {
        await deleteOfficialDocument(deletingDoc.id);
        setDeletingDoc(null);
      } catch (err) {
        console.error(err);
        alert('Lỗi khi xóa văn bản.');
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('Dung lượng tệp vượt quá 15MB. Vui lòng chọn tệp nhỏ hơn hoặc dán liên kết Google Drive!');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setFormData(prev => ({
          ...prev,
          fileName: file.name,
          fileUrl: result
        }));
      }
      setIsUploading(false);
    };
    reader.onerror = () => {
      alert('Lỗi đọc tệp tin. Vui lòng thử lại!');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setFormData(prev => ({
      ...prev,
      fileName: '',
      fileUrl: ''
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getUrgencyBadge = (urgency: DocumentUrgency) => {
    switch (urgency) {
      case 'Thượng khẩn':
        return <span className="px-2.5 py-1 text-[11px] font-extrabold bg-rose-100 text-rose-800 rounded-lg border border-rose-200 animate-pulse inline-flex items-center gap-1"><ShieldAlert size={12} /> Thượng khẩn</span>;
      case 'Khẩn':
        return <span className="px-2.5 py-1 text-[11px] font-bold bg-amber-100 text-amber-800 rounded-lg border border-amber-200 inline-flex items-center gap-1"><AlertCircle size={12} /> Khẩn</span>;
      default:
        return <span className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 text-slate-700 rounded-lg border border-slate-200">Thường</span>;
    }
  };

  const getCategoryBadge = (category: DocumentCategory) => {
    switch (category) {
      case 'incoming':
        return <span className="px-2.5 py-1 text-[11px] font-bold bg-sky-100 text-sky-800 rounded-lg border border-sky-200 inline-flex items-center gap-1"><ArrowDownLeft size={13} /> VB Đến</span>;
      case 'outgoing':
        return <span className="px-2.5 py-1 text-[11px] font-bold bg-purple-100 text-purple-800 rounded-lg border border-purple-200 inline-flex items-center gap-1"><ArrowUpRight size={13} /> VB Đi</span>;
      case 'internal':
        return <span className="px-2.5 py-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-200 inline-flex items-center gap-1"><BookOpenCheck size={13} /> Nội bộ / Quy chế</span>;
    }
  };

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case 'completed':
        return <span className="px-2.5 py-1 text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg inline-flex items-center gap-1"><CheckCircle2 size={12} /> Đã hoàn thành</span>;
      case 'processing':
        return <span className="px-2.5 py-1 text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-lg inline-flex items-center gap-1"><Clock size={12} /> Đang xử lý</span>;
      case 'pending':
        return <span className="px-2.5 py-1 text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded-lg inline-flex items-center gap-1"><Clock size={12} /> Mới đến / Chờ xử lý</span>;
      case 'archived':
        return <span className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 rounded-lg">Đã lưu trữ</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1500px] mx-auto space-y-6 pb-16 font-sans">
      <div className="flex items-center">
        <BackButton />
      </div>
      
      {/* HEADER SECTION */}
      <div className="bg-white/90 backdrop-blur-xl p-6 rounded-[24px] border border-white/60 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="w-13 h-13 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-800 uppercase tracking-wide">Quản lý Văn bản & Công văn</h1>
              <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-100 text-blue-800 rounded-full border border-blue-200">THPT Minh Hòa</span>
            </div>
            <p className="text-sm font-medium text-slate-500 mt-0.5">Lưu trữ, tra cứu và theo dõi xử lý công văn đến, công văn đi và văn bản chỉ đạo nội bộ</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer w-full md:w-auto"
          >
            <Plus size={16} />
            <span>Thêm Văn Bản Mới</span>
          </button>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div 
          onClick={() => setSelectedCategory('all')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${selectedCategory === 'all' ? 'bg-slate-900 text-white border-slate-800 shadow-md scale-[1.02]' : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200/80 shadow-sm'}`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${selectedCategory === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>Tất cả Văn bản</span>
            <FileText size={16} className={selectedCategory === 'all' ? 'text-blue-400' : 'text-blue-600'} />
          </div>
          <p className="text-2xl font-black mt-2">{stats.total}</p>
        </div>

        <div 
          onClick={() => setSelectedCategory('incoming')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${selectedCategory === 'incoming' ? 'bg-sky-700 text-white border-sky-800 shadow-md scale-[1.02]' : 'bg-white hover:bg-sky-50/50 text-slate-800 border-slate-200/80 shadow-sm'}`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${selectedCategory === 'incoming' ? 'text-sky-100' : 'text-sky-700'}`}>Văn bản Đến</span>
            <ArrowDownLeft size={16} className={selectedCategory === 'incoming' ? 'text-sky-200' : 'text-sky-600'} />
          </div>
          <p className="text-2xl font-black mt-2">{stats.incoming}</p>
        </div>

        <div 
          onClick={() => setSelectedCategory('outgoing')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${selectedCategory === 'outgoing' ? 'bg-purple-700 text-white border-purple-800 shadow-md scale-[1.02]' : 'bg-white hover:bg-purple-50/50 text-slate-800 border-slate-200/80 shadow-sm'}`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${selectedCategory === 'outgoing' ? 'text-purple-100' : 'text-purple-700'}`}>Văn bản Đi</span>
            <ArrowUpRight size={16} className={selectedCategory === 'outgoing' ? 'text-purple-200' : 'text-purple-600'} />
          </div>
          <p className="text-2xl font-black mt-2">{stats.outgoing}</p>
        </div>

        <div 
          onClick={() => setSelectedCategory('internal')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${selectedCategory === 'internal' ? 'bg-emerald-700 text-white border-emerald-800 shadow-md scale-[1.02]' : 'bg-white hover:bg-emerald-50/50 text-slate-800 border-slate-200/80 shadow-sm'}`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${selectedCategory === 'internal' ? 'text-emerald-100' : 'text-emerald-700'}`}>Quy chế / Nội bộ</span>
            <BookOpenCheck size={16} className={selectedCategory === 'internal' ? 'text-emerald-200' : 'text-emerald-600'} />
          </div>
          <p className="text-2xl font-black mt-2">{stats.internal}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700">Công văn Khẩn</span>
            <AlertCircle size={16} className="text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-700 mt-2">{stats.urgent}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700">Đang xử lý</span>
            <Clock size={16} className="text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700 mt-2">{stats.pending}</p>
        </div>
      </div>

      {/* SEARCH AND FILTERS TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo số hiệu, trích yếu nội dung, cơ quan ban hành, người ký..."
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Filter Type */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Tất cả loại VB</option>
              <option value="Công văn">Công văn</option>
              <option value="Quyết định">Quyết định</option>
              <option value="Kế hoạch">Kế hoạch</option>
              <option value="Thông báo">Thông báo</option>
              <option value="Tờ trình">Tờ trình</option>
              <option value="Hướng dẫn">Hướng dẫn</option>
              <option value="Quy chế">Quy chế</option>
              <option value="Báo cáo">Báo cáo</option>
            </select>

            {/* Filter Urgency */}
            <select
              value={filterUrgency}
              onChange={(e) => setFilterUrgency(e.target.value)}
              className="px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Độ khẩn (Tất cả)</option>
              <option value="Thường">Mức Thường</option>
              <option value="Khẩn">Mức Khẩn</option>
              <option value="Thượng khẩn">Thượng Khẩn</option>
            </select>

            {/* Filter Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="all">Trạng thái (Tất cả)</option>
              <option value="processing">Đang xử lý</option>
              <option value="completed">Đã hoàn thành</option>
              <option value="pending">Chờ xử lý</option>
              <option value="archived">Đã lưu trữ</option>
            </select>
          </div>
        </div>
      </div>

      {/* DOCUMENT TABLE LIST */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-slate-200 font-bold uppercase tracking-wider text-[11px] border-b border-slate-800">
                <th className="p-3.5 w-12 text-center">STT</th>
                <th className="p-3.5 w-32">Phân loại</th>
                <th className="p-3.5 w-36">Số / Ký hiệu</th>
                <th className="p-3.5 min-w-[280px]">Trích yếu nội dung văn bản</th>
                <th className="p-3.5 w-44">Cơ quan ban hành</th>
                <th className="p-3.5 w-28 text-center">Ngày ban hành</th>
                <th className="p-3.5 w-28 text-center">Độ khẩn</th>
                <th className="p-3.5 w-32 text-center">Trạng thái</th>
                <th className="p-3.5 w-28 text-center">Tệp tin</th>
                <th className="p-3.5 w-28 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="font-semibold text-slate-600 text-xs">Đang tải danh sách văn bản...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText size={32} className="text-slate-300" />
                      <p className="font-semibold text-slate-600">Không tìm thấy văn bản nào phù hợp.</p>
                      <p className="text-xs text-slate-400">Thử thay đổi bộ lọc hoặc tìm kiếm theo thông tin khác.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((docItem, idx) => (
                  <tr 
                    key={docItem.id}
                    className="hover:bg-blue-50/40 transition-colors group"
                  >
                    <td className="p-3.5 text-center font-bold text-slate-400">{idx + 1}</td>
                    
                    <td className="p-3.5">
                      {getCategoryBadge(docItem.category)}
                    </td>

                    <td className="p-3.5 font-extrabold text-blue-900 font-mono text-[11.5px]">
                      {docItem.documentNumber}
                    </td>

                    <td className="p-3.5">
                      <div className="space-y-1">
                        <div className="font-bold text-slate-800 text-[12.5px] leading-snug group-hover:text-blue-700 transition-colors">
                          {docItem.title}
                        </div>
                        {docItem.assignedDepartmentNames && docItem.assignedDepartmentNames.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-slate-400 font-semibold">Đơn vị xử lý:</span>
                            {docItem.assignedDepartmentNames.slice(0, 3).map((dept, i) => (
                              <span key={i} className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded">
                                {dept}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5 font-medium text-slate-700">
                      {docItem.issuingAuthority}
                    </td>

                    <td className="p-3.5 text-center font-semibold text-slate-600 whitespace-nowrap">
                      {docItem.issueDate}
                    </td>

                    <td className="p-3.5 text-center">
                      {getUrgencyBadge(docItem.urgency)}
                    </td>

                    <td className="p-3.5 text-center">
                      {getStatusBadge(docItem.status)}
                    </td>

                    <td className="p-3.5 text-center">
                      {docItem.fileUrl ? (
                        <a 
                          href={docItem.fileUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg text-[11px] transition-colors"
                          title={docItem.fileName || 'Xem tệp tin'}
                        >
                          <Paperclip size={13} />
                          <span>Tệp VB</span>
                        </a>
                      ) : (
                        <span className="text-slate-300 text-[11px]">Không có</span>
                      )}
                    </td>

                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setViewingDoc(docItem)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Xem chi tiết"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(docItem)}
                          className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="Chỉnh sửa"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => setDeletingDoc(docItem)}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Xóa văn bản"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="text-blue-400" size={18} />
                <h3 className="font-extrabold text-sm uppercase">
                  {editingDoc ? 'Chỉnh sửa thông tin văn bản' : 'Thêm mới văn bản / công văn'}
                </h3>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phân loại văn bản <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as DocumentCategory })}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="incoming">Văn bản Đến</option>
                    <option value="outgoing">Văn bản Đi</option>
                    <option value="internal">Văn bản Nội bộ / Quy chế</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Loại văn bản <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.documentType}
                    onChange={(e) => setFormData({ ...formData, documentType: e.target.value as DocumentType })}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="Công văn">Công văn</option>
                    <option value="Quyết định">Quyết định</option>
                    <option value="Kế hoạch">Kế hoạch</option>
                    <option value="Thông báo">Thông báo</option>
                    <option value="Tờ trình">Tờ trình</option>
                    <option value="Hướng dẫn">Hướng dẫn</option>
                    <option value="Quy chế">Quy chế</option>
                    <option value="Báo cáo">Báo cáo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số / Ký hiệu văn bản <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.documentNumber || ''}
                    onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                    placeholder="VD: 1025/SGDĐT-TCCB hoặc 48/KH-THPTSL"
                    className="w-full px-3 py-2 text-xs font-bold font-mono bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cơ quan ban hành / Nơi gửi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.issuingAuthority || ''}
                    onChange={(e) => setFormData({ ...formData, issuingAuthority: e.target.value })}
                    placeholder="VD: Sở GD&ĐT tỉnh / Trường THPT Minh Hòa"
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Trích yếu nội dung văn bản <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Nhập tóm tắt nội dung chính của công văn / văn bản..."
                  className="w-full p-3 text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ngày ban hành</label>
                  <input
                    type="date"
                    value={formData.issueDate || ''}
                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Độ khẩn</label>
                  <select
                    value={formData.urgency}
                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value as DocumentUrgency })}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="Thường">Thường</option>
                    <option value="Khẩn">Khẩn</option>
                    <option value="Thượng khẩn">Thượng khẩn</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Trạng thái xử lý</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as DocumentStatus })}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="processing">Đang xử lý</option>
                    <option value="completed">Đã hoàn thành</option>
                    <option value="pending">Chờ xử lý</option>
                    <option value="archived">Đã lưu trữ</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Người ký</label>
                  <input
                    type="text"
                    value={formData.signerName || ''}
                    onChange={(e) => setFormData({ ...formData, signerName: e.target.value })}
                    placeholder="VD: Nguyễn Văn A"
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chức vụ người ký</label>
                  <input
                    type="text"
                    value={formData.signerPosition || ''}
                    onChange={(e) => setFormData({ ...formData, signerPosition: e.target.value })}
                    placeholder="VD: Giám đốc / Hiệu trưởng"
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* UPLOAD TỆP ĐÍNH KÈM */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Tệp tin đính kèm (PDF, Word, Excel, Ảnh...)</span>
                  <span className="text-[11px] text-slate-400 font-normal">Tối đa 15MB/tệp</span>
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.zip,.rar"
                  className="hidden"
                />

                {formData.fileUrl ? (
                  <div className="p-3.5 bg-blue-50/80 rounded-2xl border border-blue-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow">
                        <FileText size={20} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-blue-900 truncate">
                          {formData.fileName || 'Tệp văn bản đã chọn'}
                        </p>
                        <p className="text-[11px] text-blue-600 font-medium flex items-center gap-1.5 mt-0.5">
                          <CheckCircle2 size={12} className="text-emerald-600" />
                          <span>Sẵn sàng lưu kèm công văn</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={formData.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 bg-white hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-1"
                      >
                        <Eye size={13} />
                        <span>Xem</span>
                      </a>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                        title="Xóa tệp đính kèm"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-5 border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/70 hover:bg-blue-50/30 rounded-2xl transition-all cursor-pointer text-center group"
                  >
                    {isUploading ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-2">
                        <Loader2 size={24} className="text-blue-600 animate-spin" />
                        <span className="text-xs font-bold text-blue-800">Đang tải và xử lý tệp tin...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 text-blue-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                          <UploadCloud size={20} />
                        </div>
                        <div className="text-xs font-bold text-slate-700 group-hover:text-blue-700 transition-colors mt-1">
                          Bấm vào đây để chọn tệp từ máy tính
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          Hỗ trợ định dạng .PDF, .DOC, .DOCX, .XLS, .XLSX, .PNG, .JPG
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Hoặc nhập liên kết thủ công */}
                <div className="mt-2.5">
                  <details className="text-xs">
                    <summary className="text-[11px] font-semibold text-slate-500 hover:text-blue-600 cursor-pointer select-none">
                      + Dán liên kết tệp tin (Google Drive, OneDrive, URL bên ngoài)
                    </summary>
                    <input
                      type="text"
                      value={formData.fileUrl || ''}
                      onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value, fileName: e.target.value })}
                      placeholder="Dán đường dẫn https://... vào đây"
                      className="w-full mt-2 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </details>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú / Yêu cầu chỉ đạo của Ban Giám hiệu
                </label>
                <textarea
                  rows={2}
                  value={formData.summaryNote || ''}
                  onChange={(e) => setFormData({ ...formData, summaryNote: e.target.value })}
                  placeholder="Nhập phân công nhiệm vụ, chỉ đạo xử lý..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Đang lưu...</span>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>{editingDoc ? 'Cập Nhật Văn Bản' : 'Lưu Văn Bản Mới'}</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAIL MODAL */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="text-blue-400" size={18} />
                <h3 className="font-extrabold text-sm uppercase">Chi tiết văn bản công văn</h3>
              </div>
              <button 
                onClick={() => setViewingDoc(null)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto font-sans">
              
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  {getCategoryBadge(viewingDoc.category)}
                  {getUrgencyBadge(viewingDoc.urgency)}
                </div>
                <div>
                  {getStatusBadge(viewingDoc.status)}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Số / Ký hiệu:</span>
                <p className="text-lg font-black text-blue-900 font-mono mt-0.5">{viewingDoc.documentNumber}</p>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Trích yếu nội dung:</span>
                <p className="text-sm font-bold text-slate-800 leading-relaxed mt-0.5">{viewingDoc.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[11px] font-bold text-slate-400">Cơ quan ban hành:</span>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5">{viewingDoc.issuingAuthority}</p>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-400">Ngày ban hành:</span>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5">{viewingDoc.issueDate}</p>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-400">Người ký:</span>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5">
                    {viewingDoc.signerName || 'Chưa cập nhật'} {viewingDoc.signerPosition ? `(${viewingDoc.signerPosition})` : ''}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-400">Loại văn bản:</span>
                  <p className="text-xs font-semibold text-slate-800 mt-0.5">{viewingDoc.documentType}</p>
                </div>
              </div>

              {viewingDoc.summaryNote && (
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1 text-amber-800">
                    <Sparkles size={13} /> Ghi chú / Chỉ đạo của Ban Giám hiệu:
                  </span>
                  <p className="text-xs font-medium mt-1 leading-relaxed">{viewingDoc.summaryNote}</p>
                </div>
              )}

              {viewingDoc.fileUrl && (
                <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Paperclip className="text-blue-600" size={16} />
                    <span className="text-xs font-bold text-blue-900">Tệp tin đính kèm</span>
                  </div>
                  <a
                    href={viewingDoc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1"
                  >
                    <ExternalLink size={13} />
                    <span>Mở / Tải về</span>
                  </a>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  onClick={() => setViewingDoc(null)}
                  className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-xl cursor-pointer"
                >
                  Đóng
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 size={22} />
            </div>
            <div className="text-center">
              <h3 className="font-extrabold text-slate-800 text-base">Xác nhận xóa văn bản</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Bạn có chắc chắn muốn xóa văn bản số <strong className="text-slate-800">{deletingDoc.documentNumber}</strong> không?
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeletingDoc(null)}
                className="flex-1 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow cursor-pointer"
              >
                Xóa ngay
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
