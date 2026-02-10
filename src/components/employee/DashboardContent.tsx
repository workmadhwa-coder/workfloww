import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Clock, Award, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { attendanceService } from '../../services/firebaseService';
import type { AttendanceRecord } from '../../types';

const motivationalQuotes = [
  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
  "The only way to do great work is to love what you do.",
  "Believe you can and you're halfway there.",
  "Don't watch the clock; do what it does. Keep going.",
  "The future depends on what you do today.",
  "Success is the sum of small efforts repeated day in and day out.",
  "Your limitation—it's only your imagination.",
  "Great things never come from comfort zones.",
  "Dream it. Wish it. Do it.",
  "Success doesn't just find you. You have to go out and get it."
];

const DashboardContent: React.FC = () => {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dailyQuote] = useState(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  // Clock Timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Attendance Data
  useEffect(() => {
    const fetchAttendance = async () => {
      if (!user?.id) return;
      try {
        const records = await attendanceService.getByUserId(user.id);
        setAttendanceRecords(records);
      } catch (error) {
        console.error('Error fetching attendance for calendar:', error);
      }
    };
    fetchAttendance();
  }, [user?.id]);

  // Calendar Calculation Logic
  const calendarDays = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Leading empty slots for previous month's overflow
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ day: null, status: 'empty' });
    }

    // Actual days of the month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateCheck = new Date(year, month, d);
      const dateString = dateCheck.toDateString();
      const isToday = dateString === now.toDateString();
      
      // Check if user has a record for this specific day
      const hasRecord = attendanceRecords.some(r => new Date(r.date).toDateString() === dateString);
      
      let status = 'absent';
      if (hasRecord) {
        status = 'present';
      } else if (isToday) {
        status = 'today';
      } else if (dateCheck > now) {
        status = 'future';
      }

      days.push({ day: d, status });
    }
    return days;
  }, [attendanceRecords]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-8 rounded-2xl shadow-lg border-b-4 border-emerald-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-extrabold mb-2 tracking-tight">
              {getGreeting()}, {user?.name}! 👋
            </h1>
            <p className="text-green-50 text-lg italic opacity-90 max-w-2xl">"{dailyQuote}"</p>
          </div>
          <div className="flex flex-col items-end gap-2 bg-white/10 p-4 rounded-xl backdrop-blur-sm">
            <div className="flex items-center text-xl font-mono font-bold">
              <Clock className="w-5 h-5 mr-2 text-green-200" />
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800 border-none px-3">
              <Award className="w-3 h-3 mr-1" />
              {user?.designation}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Calendar Card */}
        <Card className="lg:col-span-2 shadow-md border-slate-200 overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center text-slate-800">
                  <CalendarIcon className="w-5 h-5 mr-2 text-emerald-600" />
                  Monthly Attendance
                </CardTitle>
                <CardDescription>
                  {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                </CardDescription>
              </div>
              <div className="flex gap-2 text-[10px] font-bold uppercase tracking-tighter">
                <span className="flex items-center"><div className="w-2 h-2 bg-green-500 rounded-full mr-1" /> Present</span>
                <span className="flex items-center"><div className="w-2 h-2 bg-red-500 rounded-full mr-1" /> Absent</span>
                <span className="flex items-center"><div className="w-2 h-2 bg-yellow-400 rounded-full mr-1" /> Today</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-bold text-slate-400 py-2">
                  {day}
                </div>
              ))}
              {calendarDays.map((item, idx) => (
                <div
                  key={idx}
                  className={`
                    h-12 md:h-16 flex flex-col items-center justify-center rounded-xl transition-all duration-200 border
                    ${item.status === 'empty' ? 'bg-transparent border-transparent' : ''}
                    ${item.status === 'present' ? 'bg-green-50 border-green-200 text-green-700 shadow-sm' : ''}
                    ${item.status === 'absent' ? 'bg-red-50 border-red-100 text-red-400' : ''}
                    ${item.status === 'today' ? 'bg-yellow-50 border-yellow-400 text-yellow-700 font-bold ring-2 ring-yellow-200 ring-offset-1' : ''}
                    ${item.status === 'future' ? 'bg-slate-50 border-slate-100 text-slate-300' : ''}
                  `}
                >
                  <span className="text-sm">{item.day}</span>
                  {item.status === 'present' && <div className="w-1 h-1 bg-green-500 rounded-full mt-1" />}
                </div>
              ))}
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border border-dashed border-slate-300">
              <p className="text-xs text-center text-slate-500 italic">
                Tip: Consistency is key! Red marks indicate missed shifts. Aim for a green streak this month.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Status Summary Card */}
        <Card className="shadow-md border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Stats at a Glance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <p className="text-emerald-600 text-xs font-bold uppercase mb-1">Total Present</p>
              <p className="text-3xl font-black text-emerald-800">
                {attendanceRecords.filter(r => {
                  const d = new Date(r.date);
                  return d.getMonth() === new Date().getMonth();
                }).length} Days
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-700">Quick Legend</h4>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center p-2 hover:bg-slate-50 rounded-lg transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-green-100 border border-green-200 flex items-center justify-center mr-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                  </div>
                  <span className="text-sm text-slate-600 font-medium">Duty Completed</span>
                </div>
                <div className="flex items-center p-2 hover:bg-slate-50 rounded-lg transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center mr-3">
                    <div className="w-2 h-2 bg-red-400 rounded-full" />
                  </div>
                  <span className="text-sm text-slate-600 font-medium">No Record Found</span>
                </div>
                <div className="flex items-center p-2 hover:bg-slate-50 rounded-lg transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-yellow-50 border border-yellow-300 flex items-center justify-center mr-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  </div>
                  <span className="text-sm text-slate-600 font-medium">In Progress (Today)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardContent;