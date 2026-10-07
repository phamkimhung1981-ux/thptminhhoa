import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import BackButton from '../components/ui/BackButton';

export default function Analytics() {
  const trendData = [
    { month: 'T8', completion: 75, discipline: 80 },
    { month: 'T9', completion: 82, discipline: 85 },
    { month: 'T10', completion: 85, discipline: 88 },
    { month: 'T11', completion: 90, discipline: 92 },
    { month: 'T12', completion: 95, discipline: 94 },
    { month: 'T1', completion: 88, discipline: 90 },
    { month: 'T2', completion: 92, discipline: 95 },
    { month: 'T3', completion: 96, discipline: 98 },
  ];

  const deptComparison = [
    { name: 'Toán-Tin', tasks: 120, reports: 100, onTime: 95 },
    { name: 'Văn-Sử', tasks: 90, reports: 98, onTime: 92 },
    { name: 'Lý-Hóa-Sinh', tasks: 110, reports: 95, onTime: 88 },
    { name: 'Ngoại Ngữ', tasks: 85, reports: 100, onTime: 97 },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center">
        <BackButton />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Thống kê & Phân tích</h1>
        <p className="text-sm text-slate-500 mt-1">Báo cáo tổng hợp hiệu suất và chất lượng toàn trường</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Xu hướng Hoàn thành công việc & Nền nếp</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDisc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} domain={[0, 100]} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="completion" name="Hoàn thành CV (%)" stroke="#3b82f6" fillOpacity={1} fill="url(#colorComp)" />
                  <Area type="monotone" dataKey="discipline" name="Nền nếp (%)" stroke="#10b981" fillOpacity={1} fill="url(#colorDisc)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>So sánh chất lượng giữa các Tổ chuyên môn</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptComparison} layout="vertical" margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" domain={[0, 150]} axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="tasks" name="Số công việc" fill="#cbd5e1" radius={[0, 4, 4, 0]} barSize={16} />
                  <Bar dataKey="onTime" name="Đúng hạn (%)" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
