import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { MapPin, CheckCircle, Clock, AlertCircle, Monitor, Loader2 } from 'lucide-react';
import { attendanceService } from '../../services/firebaseService';
import { getDeviceId, getDeviceInfo } from '../../utils/deviceId';
import { toast } from 'sonner';

const AttendanceContent: React.FC = () => {
  const { user } = useAuth();
  
  // State Management
  const [loading, setLoading] = useState(true);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [workingTime, setWorkingTime] = useState(0);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [showMarkAttendanceDialog, setShowMarkAttendanceDialog] = useState(false);
  const [workReport, setWorkReport] = useState('');
  const [userLocation, setUserLocation] = useState<string>('');
  const [currentAttendanceId, setCurrentAttendanceId] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [checkInDeviceInfo, setCheckInDeviceInfo] = useState<string>('');

  /**
   * RE-HYDRATION LOGIC
   * Fetches the existing session from Firebase and restores local state
   */
  const checkTodayAttendance = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Pulling data from the corrected firebaseService logic
      const todayRecord = await attendanceService.getTodayByUserId(user.id);
      
      if (todayRecord && todayRecord.isActive) {
        // Convert ISO string back to JS Date object
        const startTime = new Date(todayRecord.checkInTime);
        
        setIsCheckedIn(true);
        setCheckInTime(startTime);
        setCurrentAttendanceId(todayRecord.id);
        setCheckInDeviceInfo(todayRecord.checkInDeviceInfo || 'Unknown Device');
        
        // Immediate Timer Sync
        const now = new Date();
        const timeDiff = now.getTime() - startTime.getTime();
        setWorkingTime(timeDiff / (1000 * 60 * 60));

        toast.success("Attendance session restored.");
      } else {
        setIsCheckedIn(false);
        setCheckInTime(null);
        setWorkingTime(0);
        setCurrentAttendanceId(null);
      }
    } catch (error) {
      console.error('Error syncing attendance:', error);
      toast.error('Failed to sync session from database');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Initial load
  useEffect(() => {
    checkTodayAttendance();
  }, [checkTodayAttendance]);

  /**
   * LIVE TIMER LOGIC
   */
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCheckedIn && checkInTime) {
      interval = setInterval(() => {
        const now = new Date();
        const timeDiff = now.getTime() - checkInTime.getTime();
        setWorkingTime(timeDiff / (1000 * 60 * 60));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCheckedIn, checkInTime]);

  const getUserLocation = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      setIsGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
          setIsGettingLocation(false);
          resolve(loc);
        },
        (error) => {
          setIsGettingLocation(false);
          reject(new Error('Location permission denied.'));
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const handleMarkAttendance = async () => {
    try {
      setIsGettingLocation(true);
      const location = await getUserLocation();
      setUserLocation(location);
      setShowMarkAttendanceDialog(true);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleConfirmAttendance = async () => {
    try {
      const now = new Date();
      const deviceId = getDeviceId();
      const deviceInfo = getDeviceInfo();
      
      const newRecord = {
        userId: user?.id || '',
        userName: user?.name || '',
        userDesignation: user?.designation || '',
        date: now.toISOString(),
        checkInTime: now.toISOString(),
        checkOutTime: null,
        hoursWorked: 0,
        workReport: '',
        isActive: true,
        isLate: now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 15),
        location: userLocation,
        checkInDeviceId: deviceId,
        checkInDeviceInfo: deviceInfo
      };

      const result = await attendanceService.create(newRecord);
      
      setCurrentAttendanceId(result.id);
      setIsCheckedIn(true);
      setCheckInTime(now);
      setCheckInDeviceInfo(deviceInfo);
      setShowMarkAttendanceDialog(false);
      
      toast.success(`Checked in on ${deviceInfo}`);
    } catch (error) {
      toast.error('Failed to save attendance.');
    }
  };

  const handleCheckOut = async () => {
    if (!workReport.trim()) {
      toast.error('Please enter your work report.');
      return;
    }

    try {
      const now = new Date();
      const finalHours = checkInTime ? (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60) : 0;

      await attendanceService.update(currentAttendanceId || '', {
        checkOutTime: now.toISOString(),
        hoursWorked: finalHours,
        workReport: workReport,
        isActive: false
      });

      setIsCheckedIn(false);
      setCheckInTime(null);
      setWorkingTime(0);
      setShowCheckoutDialog(false);
      setWorkReport('');
      setCurrentAttendanceId(null);
      
      toast.success('Shift ended successfully!');
    } catch (error) {
      toast.error('Checkout failed. Please try again.');
    }
  };

  const formatTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    const s = Math.floor(((hours - h) * 60 - m) * 60);
    return `${h}h ${m}m ${s}s`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-muted-foreground animate-pulse">Checking active sessions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <h2 className="text-2xl font-bold">Attendance Tracking</h2>

      {/* Notice Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1 text-sm text-blue-800 space-y-1">
              <p className="font-semibold">System Information:</p>
              <p>• Your timer is synced to the database and persists across refreshes.</p>
              <p>• You can check out from any device once logged in.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Action Card */}
      <Card className="shadow-lg border-t-4 border-t-blue-600">
        <CardHeader>
          <CardTitle className="text-lg">Daily Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isCheckedIn ? (
            <Button 
              onClick={handleMarkAttendance}
              disabled={isGettingLocation}
              className="w-full h-16 text-xl bg-blue-600 hover:bg-blue-700"
            >
              {isGettingLocation ? <Loader2 className="mr-2 animate-spin" /> : <MapPin className="mr-2" />}
              {isGettingLocation ? "Locating..." : "Check In Now"}
            </Button>
          ) : (
            <div className="space-y-6">
              <div className="p-8 bg-green-50 border border-green-200 rounded-2xl text-center">
                <div className="bg-green-500 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="text-white w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-green-900">Shift is Active</h3>
                <p className="text-green-700 mt-1">Started: {checkInTime?.toLocaleTimeString()}</p>
                <div className="mt-3 flex items-center justify-center text-xs font-medium text-green-600 bg-white border border-green-100 py-1.5 px-4 rounded-full w-fit mx-auto">
                  <Monitor className="w-3.5 h-3.5 mr-2" />
                  Checked in via: {checkInDeviceInfo}
                </div>
              </div>

              {/* Enhanced Timer Display */}
              <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-inner">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-slate-400 text-sm font-bold uppercase tracking-widest">Live Work Duration</span>
                  <Clock className="text-blue-400 animate-pulse w-5 h-5" />
                </div>
                <div className="text-5xl font-mono font-black text-center tabular-nums bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
                  {formatTime(workingTime)}
                </div>
              </div>

              <Button 
                onClick={() => setShowCheckoutDialog(true)}
                className="w-full h-14 bg-red-500 hover:bg-red-600 text-lg font-bold shadow-md"
              >
                End Shift & Check Out
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check-In Dialog */}
      <Dialog open={showMarkAttendanceDialog} onOpenChange={setShowMarkAttendanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Check-In</DialogTitle>
            <DialogDescription>Your coordinates will be attached to this record.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="flex justify-between text-sm p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-500">Device Detected:</span>
              <span className="font-semibold text-slate-700">{getDeviceInfo()}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">GPS Coordinates:</p>
              <p className="text-xs font-mono">{userLocation}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowMarkAttendanceDialog(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleConfirmAttendance} className="flex-1 bg-blue-600">Start My Shift</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Check-Out Dialog */}
      <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Final Work Report</DialogTitle>
            <DialogDescription>Total time logged: {formatTime(workingTime)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Daily Summary</label>
              <Textarea
                placeholder="Briefly describe your tasks completed today..."
                value={workReport}
                onChange={(e) => setWorkReport(e.target.value)}
                className="min-h-[180px] text-base"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setShowCheckoutDialog(false)} className="flex-1">Back</Button>
              <Button onClick={handleCheckOut} className="flex-1 bg-red-600 hover:bg-red-700 font-bold">Submit & Log Out</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttendanceContent;