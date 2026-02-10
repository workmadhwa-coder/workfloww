import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Download, Eye, Trash2, Monitor } from 'lucide-react';
import type { AttendanceRecord } from '../../types';
import { attendanceService } from '../../services/firebaseService';
import { toast } from 'sonner';

interface AttendanceSectionProps {
  attendanceData: AttendanceRecord[];
  onViewReport: (record: AttendanceRecord) => void;
  onExport: () => void;
  onRefresh: () => void;
}

const AttendanceSection: React.FC<AttendanceSectionProps> = ({
  attendanceData,
  onViewReport,
  onExport,
  onRefresh
}) => {
  const handleDeleteAttendance = async (record: AttendanceRecord) => {
    if (!confirm(`Are you sure you want to delete attendance record for ${record.userName} on ${new Date(record.date).toLocaleDateString()}?`)) {
      return;
    }

    try {
      await attendanceService.delete(record.id);
      toast.success('Attendance record deleted successfully!');
      onRefresh();
    } catch (error) {
      console.error('Error deleting attendance:', error);
      toast.error('Failed to delete attendance record. Please try again.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Attendance & Work Reports</CardTitle>
            <CardDescription>Real-time employee attendance and daily work reports</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {attendanceData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No attendance records yet</p>
          ) : (
            attendanceData.slice().reverse().map((record) => (
              <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4 flex-1">
                  <Avatar>
                    <AvatarFallback>{record.userName?.split(' ').map((n: string) => n[0]).join('') || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h4 className="font-medium">{record.userName}</h4>
                    <p className="text-sm text-muted-foreground">{record.userDesignation}</p>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground">
                      <span>Date: {new Date(record.date).toLocaleDateString()}</span>
                      <span>In: {new Date(record.checkInTime).toLocaleTimeString()}</span>
                      {record.checkOutTime && (
                        <span>Out: {new Date(record.checkOutTime).toLocaleTimeString()}</span>
                      )}
                      {record.hoursWorked > 0 && (
                        <span className="font-medium text-blue-600">
                          {record.hoursWorked.toFixed(2)}h worked
                        </span>
                      )}
                    </div>
                    {record.checkInDeviceInfo && (
                      <div className="flex items-center mt-1 text-xs text-muted-foreground">
                        <Monitor className="w-3 h-3 mr-1" />
                        <span>Checked in from: {record.checkInDeviceInfo}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={record.isActive ? 'default' : 'secondary'}>
                    {record.isActive ? 'Working' : 'Checked Out'}
                  </Badge>
                  {record.isLate && <Badge variant="destructive">Late</Badge>}
                  {record.workReport && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onViewReport(record)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Report
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteAttendance(record)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceSection;