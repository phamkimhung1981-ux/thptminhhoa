import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Bell, Check, Clock, Plus, Trash2, MailOpen, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import { Notification } from '../types';
import { safeFormat } from '../utils/dateUtils';
import BackButton from '../components/ui/BackButton';

export default function Notifications() {
  const { notifications, markNotificationRead, addNotification, deleteNotification, updateNotification } = useAppContext();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Notification>>({
    type: 'system',
    title: '',
    content: ''
  });

  const filteredNotifications = notifications
    .filter(n => filter === 'all' ? true : !n.isRead)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllRead = () => {
    notifications.forEach(n => {
      if (!n.isRead) {
        markNotificationRead(n.id);
      }
    });
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Bạn có chắc chắn muốn xóa thông báo này?')) {
      deleteNotification(id);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return;

    const newNotification: Notification = {
      id: `notif${Date.now()}`,
      userId: 'u1', // sending to all or current user for demo
      title: formData.title,
      content: formData.content,
      type: formData.type as any || 'system',
      date: new Date().toISOString(),
      isRead: false
    };

    addNotification(newNotification);
    setIsModalOpen(false);
    setFormData({ type: 'system', title: '', content: '' });
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'task': return <Clock className="text-blue-500" size={20} />;
      case 'report': return <Check className="text-emerald-500" size={20} />;
      case 'discipline': return <Bell className="text-rose-500" size={20} />;
      default: return <Bell className="text-slate-500" size={20} />;
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center">
        <BackButton />
      </div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Thông báo</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý và theo dõi các thông báo của nhà trường</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <MailOpen className="mr-2 h-4 w-4" />
            Đánh dấu đã đọc tất cả
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Plus className="mr-2 h-4 w-4" />
            Tạo thông báo mới
          </button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
          <CardTitle>Danh sách thông báo</CardTitle>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setFilter('all')}
              className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-colors", filter === 'all' ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700")}
            >
              Tất cả
            </button>
            <button 
              onClick={() => setFilter('unread')}
              className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2", filter === 'unread' ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-700")}
            >
              Chưa đọc
              {unreadCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={cn(
                    "p-6 transition-colors group relative cursor-pointer",
                    !notification.isRead ? "bg-blue-50/30 hover:bg-blue-50/50" : "hover:bg-slate-50"
                  )}
                  onClick={() => !notification.isRead && markNotificationRead(notification.id)}
                >
                  <div className="flex gap-4">
                    <div className={cn(
                      "mt-1 p-2 rounded-full shrink-0",
                      !notification.isRead ? "bg-white shadow-sm" : "bg-slate-100"
                    )}>
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4 mb-1">
                        <h4 className={cn("text-base truncate", !notification.isRead ? "font-bold text-slate-900" : "font-medium text-slate-700")}>
                          {notification.title}
                        </h4>
                        <span className="text-xs text-slate-500 shrink-0 whitespace-nowrap">
                          {safeFormat(notification.date || notification.createdAt, 'HH:mm - dd/MM/yyyy', '--:-- - --/--/----')}
                        </span>
                      </div>
                      <p className={cn("text-sm line-clamp-2", !notification.isRead ? "text-slate-600" : "text-slate-500")}>
                        {notification.content}
                      </p>
                    </div>
                  </div>
                  
                  {/* Delete button appears on hover */}
                  <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => handleDelete(notification.id, e)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
                      title="Xóa thông báo"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  {/* Unread dot indicator */}
                  {!notification.isRead && (
                    <div className="absolute top-1/2 -translate-y-1/2 left-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-12 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Bell className="text-slate-400" size={32} />
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-1">Không có thông báo nào</h3>
                <p className="text-slate-500">Bạn đã xem hết tất cả thông báo trong danh sách này.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal tạo thông báo mới */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white/95 backdrop-blur-2xl rounded-[24px] shadow-2xl border border-white/50 w-full max-w-lg flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Tạo thông báo mới</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <form id="notification-form" onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Tiêu đề thông báo</label>
                  <input 
                    required 
                    type="text" 
                    value={formData.title} 
                    onChange={e => setFormData({...formData, title: e.target.value})} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" 
                    placeholder="VD: Họp giao ban đầu tuần..."
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Loại thông báo</label>
                  <select 
                    value={formData.type} 
                    onChange={e => setFormData({...formData, type: e.target.value as any})} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="system">Thông báo chung hệ thống</option>
                    <option value="task">Thông báo công việc</option>
                    <option value="report">Thông báo báo cáo</option>
                    <option value="discipline">Thông báo nền nếp</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Nội dung chi tiết</label>
                  <textarea 
                    required
                    value={formData.content} 
                    onChange={e => setFormData({...formData, content: e.target.value})} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500" 
                    rows={5}
                    placeholder="Nhập nội dung thông báo..."
                  />
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button type="submit" form="notification-form" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                <Bell size={16} />
                Gửi thông báo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
