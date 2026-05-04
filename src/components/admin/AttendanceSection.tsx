import React, { useState, useMemo } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Input } from '../ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { 
  Download, 
  Eye, 
  Trash2, 
  Calendar, 
  ArrowUpDown, 
  Clock,
  FilterX,
  History,
  User
} from 'lucide-react';
import type { AttendanceRecord } from '../../types';
import { attendanceService } from '../../services/firebaseService';
import { toast } from 'sonner';

interface AttendanceSectionProps {
  attendanceData: AttendanceRecord[];
  onViewReport: (record: AttendanceRecord) => void;
  onExport: () => void;
  onRefresh: () => void;
}

type SortOption = 'newest' | 'oldest' | 'earliest-in';

const AttendanceSection: React.FC<AttendanceSectionProps> = ({
  attendanceData,
  onViewReport,
  onExport,
  onRefresh
}) => {
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterDate, setFilterDate] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // --- Handlers ---
  const handleDeleteAttendance = async (record: AttendanceRecord) => {
    if (!confirm(`Are you sure you want to delete record for ${record.userName}?`)) return;
    try {
      await attendanceService.delete(record.id);
      toast.success('Deleted successfully!');
      onRefresh();
    } catch (error) {
      toast.error('Failed to delete.');
    }
  };

  // --- Logic for Main List ---
  const processedData = useMemo(() => {
    let result = [...attendanceData];

    if (filterDate) {
      result = result.filter(r => new Date(r.date).toISOString().split('T')[0] === filterDate);
    }

    if (sortBy === 'earliest-in') {
      const firstEntries: Record<string, AttendanceRecord> = {};
      result.forEach(r => {
        const userId = r.userId || r.userName;
        if (!firstEntries[userId] || new Date(r.checkInTime).getTime() < new Date(firstEntries[userId].checkInTime).getTime()) {
          firstEntries[userId] = r;
        }
      });
      result = Object.values(firstEntries).sort((a, b) => 
        new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime()
      );
    } else {
      result.sort((a, b) => {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
      });
    }
    return result;
  }, [attendanceData, sortBy, filterDate]);

  // --- Logic for Individual Stats Modal ---
  const employeeStats = useMemo(() => {
    if (!selectedEmployeeId) return null;
    const history = attendanceData.filter(r => (r.userId || r.userName) === selectedEmployeeId);
    const totalHours = history.reduce((acc, curr) => acc + (curr.hoursWorked || 0), 0);
    const firstDate = history.length > 0 
      ? new Date(Math.min(...history.map(r => new Date(r.date).getTime()))).toLocaleDateString()
      : 'N/A';

    return {
      name: history[0]?.userName || 'Employee',
      designation: history[0]?.userDesignation || 'Staff',
      totalHours,
      totalDays: history.length,
      startDate: firstDate,
      history: history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };
  }, [selectedEmployeeId, attendanceData]);

  const clearFilters = () => {
    setFilterDate('');
    setSortBy('newest');
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b bg-gray-50/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="text-xl font-bold">Attendance & Work Reports</CardTitle>
            <CardDescription>Monitor daily employee presence and individual totals</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onExport} className="h-9">
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-4">
          <div className="flex items-center gap-2 bg-white border rounded-md px-3 py-1 shadow-sm">
            <Calendar className="w-4 h-4 text-gray-500" />
            <Input 
              type="date" 
              className="border-none focus-visible:ring-0 h-7 p-0 text-sm"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={sortBy === 'newest' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setSortBy('newest')}
              className="h-8 text-xs"
            >
              <ArrowUpDown className="w-3 h-3 mr-1" /> Latest
            </Button>
            <Button 
              variant={sortBy === 'earliest-in' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setSortBy('earliest-in')}
              className="h-8 text-xs"
            >
              <Clock className="w-3 h-3 mr-1" /> First Check-in
            </Button>
            {(filterDate || sortBy !== 'newest') && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs text-red-500">
                <FilterX className="w-3 h-3 mr-1" /> Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="space-y-3">
          {processedData.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-xl">
              <p className="text-muted-foreground">No records found.</p>
            </div>
          ) : (
            processedData.map((record) => (
              <div 
                key={record.id} 
                className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border rounded-xl hover:shadow-md transition-all bg-white group"
              >
                <div 
                  className="flex items-center space-x-4 flex-1 cursor-pointer"
                  onClick={() => setSelectedEmployeeId(record.userId || record.userName)}
                >
                  <Avatar className="h-10 w-10 border group-hover:border-primary transition-colors">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {record.userName?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">{record.userName}</h4>
                      {record.isLate && <Badge variant="destructive" className="text-[10px] h-4">Late</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">{record.userDesignation}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-gray-500">
                      <span className="flex items-center"><Calendar className="w-3 h-3 mr-1 text-blue-500"/> {new Date(record.date).toLocaleDateString()}</span>
                      <span className="flex items-center"><Clock className="w-3 h-3 mr-1 text-green-500"/> In: {new Date(record.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      {record.hoursWorked > 0 && (
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                          {record.hoursWorked.toFixed(1)}h Worked
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 mt-4 lg:mt-0 border-t lg:border-t-0 pt-3 lg:pt-0">
                  <Badge variant={record.isActive ? 'default' : 'secondary'}>
                    {record.isActive ? 'Active' : 'Finished'}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => onViewReport(record)} className="h-8">
                    <Eye className="w-3.5 h-3.5 mr-1.5" /> Report
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteAttendance(record)}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      {/* --- INDIVIDUAL WORK HOURS POPUP --- */}
      <Dialog open={!!selectedEmployeeId} onOpenChange={() => setSelectedEmployeeId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Employee Work Summary
            </DialogTitle>
            <DialogDescription>
              Lifetime performance and accumulated hours.
            </DialogDescription>
          </DialogHeader>

          {employeeStats && (
            <div className="space-y-6 py-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border">
                <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                  <AvatarFallback className="bg-primary text-white">
                    {employeeStats.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{employeeStats.name}</h3>
                  <p className="text-sm text-muted-foreground">{employeeStats.designation}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-xs text-blue-600 font-semibold uppercase">Total Hours</p>
                  <p className="text-2xl font-black text-blue-900">{employeeStats.totalHours.toFixed(1)} <span className="text-sm font-normal">hrs</span></p>
                </div>
                <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                  <p className="text-xs text-green-600 font-semibold uppercase">Days Worked</p>
                  <p className="text-2xl font-black text-green-900">{employeeStats.totalDays}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <History className="w-4 h-4" /> Recent Activity
                </h4>
                <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2">
                  {employeeStats.history.slice(0, 5).map((log, i) => (
                    <div key={i} className="flex justify-between items-center text-sm p-2 border-b last:border-0">
                      <span className="text-gray-600">{new Date(log.date).toLocaleDateString()}</span>
                      <span className="font-medium">{log.hoursWorked.toFixed(1)} hrs</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-center text-muted-foreground italic">
                  Tracking since: {employeeStats.startDate}
                </p>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={() => setSelectedEmployeeId(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AttendanceSection;