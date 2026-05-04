import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Clock, Award, Calendar as CalendarIcon, Lock, Check, X } from 'lucide-react';
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
    now.setHours(0, 0, 0, 0); 
    const year = now.getFullYear();
    const month = now.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Leading empty slots
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ day: null, status: 'empty' });
    }

    // Actual days of the month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateCheck = new Date(year, month, d);
      const dateString = dateCheck.toDateString();
      const isToday = dateString === now.toDateString();
      const isPast = dateCheck < now;
      const dayOfWeek = dateCheck.getDay(); // 0 = Sunday, 6 = Saturday
      
      let status = '';
      if (isToday) {
        status = 'today';
      } else if (dateCheck > now) {
        status = 'future';
      } else if (isPast) {
        // Condition: Feb 9th or later AND NOT Saturday/Sunday
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        if (d >= 9 && !isWeekend) {
          status = 'present';
        } else {
          status = 'past_unmarked';
        }
      }

      days.push({ day: d, status });
    }
    return days;
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10 p-4">
      {/* Welcome Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white p-8 rounded-3xl shadow-2xl border-b-4 border-blue-500/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-3 tracking-tight">
              {getGreeting()}, <span className="text-blue-400">{user?.name}</span>! 👋
            </h1>
            <p className="text-slate-300 text-lg italic opacity-90 max-w-2xl leading-relaxed">
              "{dailyQuote}"
            </p>
          </div>
          <div className="flex flex-col items-end gap-3 bg-white/5 p-5 rounded-2xl backdrop-blur-md border border-white/10">
            <div className="flex items-center text-2xl font-mono font-bold text-blue-400">
              <Clock className="w-6 h-6 mr-3 text-blue-400 animate-pulse" />
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30 px-4 py-1">
              <Award className="w-4 h-4 mr-2" />
              {user?.designation}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Attendance Calendar Card */}
        <Card className="lg:col-span-3 shadow-xl border-none bg-white rounded-3xl overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center text-slate-800 text-xl">
                  <CalendarIcon className="w-6 h-6 mr-2 text-blue-600" />
                  Attendance Log
                </CardTitle>
                <CardDescription className="text-slate-500 font-medium">
                  {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                </CardDescription>
              </div>
              <div className="hidden md:flex gap-3">
                <div className="flex items-center text-[10px] font-bold uppercase text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 shadow-[0_0_8px_rgba(96,165,250,0.8)]" /> Today
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-7 gap-4 mb-6">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-black text-slate-300 uppercase tracking-widest">
                  {day}
                </div>
              ))}
              {calendarDays.map((item, idx) => (
                <div
                  key={idx}
                  className={`
                    relative h-14 md:h-20 flex flex-col items-center justify-center rounded-2xl transition-all duration-300 border
                    ${item.status === 'empty' ? 'bg-transparent border-transparent' : ''}
                    ${item.status === 'present' ? 'bg-emerald-50 border-emerald-100 text-emerald-700 shadow-sm' : ''}
                    ${item.status === 'past_unmarked' ? 'bg-white border-slate-100 text-slate-400' : ''}
                    ${item.status === 'today' ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold ring-4 ring-blue-50 shadow-inner' : ''}
                    ${item.status === 'future' ? 'bg-slate-50/50 border-slate-100 text-slate-300' : ''}
                  `}
                >
                  <span className={`text-sm mb-1 ${item.status === 'today' ? 'scale-110' : ''}`}>{item.day}</span>
                  
                  {item.status === 'present' && <Check className="w-5 h-5 text-emerald-500" strokeWidth={3} />}
                  {item.status === 'future' && <Lock className="w-3 h-3 text-slate-200" />}
                  {item.status === 'today' && (
                    <div className="absolute inset-0 rounded-2xl bg-blue-400/10 blur-md animate-pulse" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stats Sidebar */}
        <div className="space-y-6">
          <Card className="shadow-xl border-none bg-white rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-800">Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl text-white shadow-lg shadow-emerald-200">
                <p className="text-emerald-100 text-xs font-bold uppercase mb-1">Monthly Progress</p>
                <p className="text-4xl font-black">
                  {calendarDays.filter(d => d.status === 'present').length}
                </p>
                <p className="text-xs text-emerald-100 mt-2 flex items-center">
                  <Check className="w-3 h-3 mr-1" /> Days Completed
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Legend</h4>
                <div className="space-y-2">
                  <div className="flex items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center mr-3">
                      <Check className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-xs text-slate-600 font-bold">Weekdays (9th+)</span>
                  </div>
                  <div className="flex items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center mr-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                    </div>
                    <span className="text-xs text-slate-600 font-bold">Current Day</span>
                  </div>
                  <div className="flex items-center p-3 bg-slate-50 rounded-2xl border border-slate-100 opacity-60">
                    <div className="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center mr-3">
                      <Lock className="w-4 h-4 text-slate-400" />
                    </div>
                    <span className="text-xs text-slate-600 font-bold">Weekend/Past</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;