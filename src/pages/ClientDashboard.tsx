import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ScrollArea } from '../components/ui/scroll-area';
import { Progress } from '../components/ui/progress';
import { 
  FileText,
  Calendar,
  AlertCircle,
  Plus,
  CheckCircle,
  Clock,
  MapPin,
  Monitor
} from 'lucide-react';
import { projectService, attendanceService, employeeService } from '../services/firebaseService';
import { getDeviceId, getDeviceInfo } from '../utils/deviceId';
import { toast } from 'sonner';
import type { Project, Task, AttendanceRecord } from '../types';


interface Subtask {
  id: string;
  title: string;
  description: string;
  status: string;
  completedAt?: string;
}

interface Issue {
  id: string;
  projectId: string;
  projectTitle: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  createdBy: string;
  createdByUserId: string;
}

const ClientDashboard: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [newIssue, setNewIssue] = useState({
    title: '',
    description: ''
  });

  // Attendance states
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [workingTime, setWorkingTime] = useState(0);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [showMarkAttendanceDialog, setShowMarkAttendanceDialog] = useState(false);
  const [workReport, setWorkReport] = useState('');
  const [userLocation, setUserLocation] = useState<string>('');
  const [currentAttendanceId, setCurrentAttendanceId] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [canCheckout, setCanCheckout] = useState(false);
  const [checkInDeviceInfo, setCheckInDeviceInfo] = useState<string>('');

  // Task and Subtask states
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isSubtaskDialogOpen, setIsSubtaskDialogOpen] = useState(false);
  const [selectedTaskForSubtask, setSelectedTaskForSubtask] = useState<{ projectId: string; taskId: string } | null>(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    dueDate: '',
    assignedTo: '',
    assignedToName: ''
  });
  const [newSubtask, setNewSubtask] = useState({
    title: '',
    description: ''
  });

  useEffect(() => {
    loadData();
    checkTodayAttendance();
    const interval = setInterval(() => {
      loadData();
      checkTodayAttendance();
    }, 5000);
    return () => clearInterval(interval);
  }, [user?.id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCheckedIn && checkInTime) {
      interval = setInterval(() => {
        const now = new Date();
        const timeDiff = now.getTime() - checkInTime.getTime();
        const hoursWorked = timeDiff / (1000 * 60 * 60);
        setWorkingTime(hoursWorked);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCheckedIn, checkInTime]);

  const loadData = async () => {
    try {
      if (!user?.id) return;
      
      // Load projects assigned to this client
      const clientProjects = await projectService.getByClientId(user.id);
      setProjects(clientProjects);
      
      // Load all employees
      const allEmployees = await employeeService.getAll();
      const employeesList = allEmployees.filter((e: any) => e.role === 'employee');
      setEmployees(employeesList);
      
      // Load issues created by this client
      const allIssues: Issue[] = JSON.parse(localStorage.getItem('issues') || '[]');
      const clientIssues = allIssues.filter(issue => issue.createdByUserId === user.id);
      setIssues(clientIssues);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const checkTodayAttendance = async () => {
    try {
      const todayRecord = await attendanceService.getTodayByUserId(user?.id || '');
      if (todayRecord && todayRecord.isActive) {
        setIsCheckedIn(true);
        setCheckInTime(new Date(todayRecord.checkInTime));
        setCurrentAttendanceId(todayRecord.id);
        setCheckInDeviceInfo(todayRecord.checkInDeviceInfo || 'Unknown Device');
        
        // Check if current device matches check-in device
        const currentDeviceId = getDeviceId();
        const canCheckoutFromThisDevice = todayRecord.checkInDeviceId === currentDeviceId;
        setCanCheckout(canCheckoutFromThisDevice);
        
        if (!canCheckoutFromThisDevice) {
          toast.info(`Attendance session active. Checked in from ${todayRecord.checkInDeviceInfo || 'another device'}.`, {
            duration: 5000
          });
        }
      }
    } catch (error) {
      console.error('Error checking attendance:', error);
    }
  };

  const getUserLocation = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      setIsGettingLocation(true);
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const locationString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          setIsGettingLocation(false);
          resolve(locationString);
        },
        (error) => {
          setIsGettingLocation(false);
          let errorMessage = 'Unable to retrieve location';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable. Please check your device settings.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again.';
              break;
          }
          
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  };

  const handleMarkAttendance = async () => {
    try {
      // Check if already checked in today
      const todayRecord = await attendanceService.getTodayByUserId(user?.id || '');
      if (todayRecord && todayRecord.isActive) {
        toast.error('You have already checked in today!');
        await checkTodayAttendance();
        return;
      }

      setIsGettingLocation(true);
      const location = await getUserLocation();
      setUserLocation(location);
      setShowMarkAttendanceDialog(true);
    } catch (error) {
      setIsGettingLocation(false);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get location';
      toast.error(`Location Error: ${errorMessage}`);
      alert(`Location Error: ${errorMessage}\n\nPlease:\n1. Enable location services on your device\n2. Allow location access for this website\n3. Try again`);
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
      setWorkingTime(0);
      setCanCheckout(true);
      setCheckInDeviceInfo(deviceInfo);
      setShowMarkAttendanceDialog(false);
      setUserLocation('');
      
      toast.success(`Checked in successfully from ${deviceInfo}`);
    } catch (error) {
      console.error('Error marking attendance:', error);
      toast.error('Failed to mark attendance. Please check your internet connection and try again.');
    }
  };

  const handleCheckOut = async () => {
    if (!canCheckout) {
      toast.error('Checkout is allowed only from the device used to check in.');
      return;
    }

    if (!workReport.trim()) {
      toast.error('Please enter your work report before checking out');
      return;
    }

    try {
      const now = new Date();
      const hoursWorked = checkInTime ? (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60) : 0;

      await attendanceService.update(currentAttendanceId || '', {
        checkOutTime: now.toISOString(),
        hoursWorked: hoursWorked,
        workReport: workReport,
        isActive: false
      });

      setIsCheckedIn(false);
      setCheckInTime(null);
      setWorkingTime(0);
      setShowCheckoutDialog(false);
      setWorkReport('');
      setCurrentAttendanceId(null);
      setCanCheckout(false);
      setCheckInDeviceInfo('');
      
      toast.success('Checked out successfully!');
      await checkTodayAttendance();
    } catch (error) {
      console.error('Error checking out:', error);
      toast.error('Failed to check out. Please try again.');
    }
  };

  const handleCreateIssue = () => {
    if (!newIssue.title || !newIssue.description || !selectedProject) {
      alert('Please fill in all fields');
      return;
    }

    const project = projects.find(p => p.id === selectedProject);
    const issue: Issue = {
      id: Date.now().toString(),
      projectId: selectedProject,
      projectTitle: project?.title || '',
      title: newIssue.title,
      description: newIssue.description,
      status: 'open',
      createdAt: new Date().toISOString(),
      createdBy: user?.name || 'Client',
      createdByUserId: user?.id || ''
    };

    const updatedIssues = [...issues, issue];
    const allIssues = JSON.parse(localStorage.getItem('issues') || '[]');
    allIssues.push(issue);
    localStorage.setItem('issues', JSON.stringify(allIssues));
    setIssues(updatedIssues);
    setNewIssue({ title: '', description: '' });
    setSelectedProject('');
    setIsIssueDialogOpen(false);
  };

  const handleCreateTask = async () => {
    if (!newTask.title || !selectedProject || !newTask.dueDate || !newTask.assignedTo) {
      alert('Please fill in all required fields including Assign To');
      return;
    }

    try {
      const project = projects.find(p => p.id === selectedProject);
      if (!project) return;

      const task: Task = {
        id: Date.now().toString(),
        title: newTask.title,
        description: newTask.description,
        assignedTo: newTask.assignedTo,
        assignedToName: newTask.assignedToName,
        status: newTask.status,
        priority: newTask.priority,
        dueDate: newTask.dueDate,
        createdAt: new Date().toISOString(),
        subtasks: []
      };

      const updatedProject = {
        ...project,
        tasks: [...(project.tasks || []), task]
      };

      await projectService.update(selectedProject, updatedProject);
      await loadData();

      setNewTask({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        dueDate: '',
        assignedTo: '',
        assignedToName: ''
      });
      setSelectedProject('');
      setIsTaskDialogOpen(false);
      toast.success('Task created successfully!');
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  };

  const handleCreateSubtask = async () => {
    if (!newSubtask.title || !selectedTaskForSubtask) {
      alert('Please fill in the subtask title');
      return;
    }

    try {
      const project = projects.find(p => p.id === selectedTaskForSubtask.projectId);
      if (!project) return;

      const updatedProject = {
        ...project,
        tasks: project.tasks?.map(task => {
          if (task.id === selectedTaskForSubtask.taskId) {
            const subtask: Subtask = {
              id: Date.now().toString(),
              title: newSubtask.title,
              description: newSubtask.description,
              status: 'pending'
            };
            return {
              ...task,
              subtasks: [...(task.subtasks || []), subtask]
            };
          }
          return task;
        })
      };

      await projectService.update(selectedTaskForSubtask.projectId, updatedProject);
      await loadData();

      setNewSubtask({ title: '', description: '' });
      setSelectedTaskForSubtask(null);
      setIsSubtaskDialogOpen(false);
      toast.success('Subtask created successfully!');
    } catch (error) {
      console.error('Error creating subtask:', error);
      toast.error('Failed to create subtask');
    }
  };

  const handleToggleSubtask = async (projectId: string, taskId: string, subtaskId: string) => {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      const updatedProject = {
        ...project,
        tasks: project.tasks?.map(task => {
          if (task.id === taskId) {
            return {
              ...task,
              subtasks: (task.subtasks || []).map(subtask => {
                if (subtask.id === subtaskId) {
                  return {
                    ...subtask,
                    status: subtask.status === 'completed' ? 'pending' : 'completed',
                    completedAt: subtask.status === 'completed' ? undefined : new Date().toISOString()
                  };
                }
                return subtask;
              })
            };
          }
          return task;
        })
      };

      await projectService.update(projectId, updatedProject);
      await loadData();
      toast.success('Subtask updated!');
    } catch (error) {
      console.error('Error updating subtask:', error);
      toast.error('Failed to update subtask');
    }
  };

  const formatTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    const s = Math.floor(((hours - h) * 60 - m) * 60);
    return `${h}h ${m}m ${s}s`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold">Welcome, {user?.name}!</h1>
        <p className="text-purple-100">Track your project progress, add tasks, and manage attendance</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Projects</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
            <p className="text-xs text-muted-foreground">Projects you can access</p>
          </CardContent>
        </Card>

        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projects.reduce((sum, p) => sum + (p.tasks?.length || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Across all projects</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isCheckedIn ? '✓' : '○'}</div>
            <p className="text-xs text-muted-foreground">{isCheckedIn ? 'Checked In' : 'Check In Now'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Section */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <div>
                <CardTitle>Daily Attendance</CardTitle>
                <CardDescription>Check in and out to track your work hours</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Instructions Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-2">Important Information</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Location permission is required for attendance verification</li>
                    <li>• Your attendance session will sync across all devices</li>
                    <li>• Checkout is only allowed from the device used to check in</li>
                    <li>• Timer will continue running even if you switch devices</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Device Info Card - Show when checked in from different device */}
          {isCheckedIn && !canCheckout && (
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <Monitor className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-900 mb-1">Attendance Session Active</h3>
                    <p className="text-sm text-amber-800">
                      Checked in from: <span className="font-medium">{checkInDeviceInfo}</span>
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      You can view your working time here, but checkout is only allowed from the original device.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              {!isCheckedIn ? (
                <Dialog open={showMarkAttendanceDialog} onOpenChange={setShowMarkAttendanceDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      onClick={handleMarkAttendance}
                      disabled={isGettingLocation}
                      className="w-full h-16 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      size="lg"
                    >
                      {isGettingLocation ? (
                        <>
                          <Clock className="w-5 h-5 mr-2 animate-spin" />
                          Getting Location...
                        </>
                      ) : (
                        <>
                          <MapPin className="w-5 h-5 mr-2" />
                          Mark Attendance
                        </>
                      )}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirm Attendance</DialogTitle>
                      <DialogDescription>
                        Please verify your attendance details
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Date</span>
                          <span className="text-sm">{new Date().toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Time</span>
                          <span className="text-sm">{new Date().toLocaleTimeString()}</span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Device</span>
                          <span className="text-sm">{getDeviceInfo()}</span>
                        </div>
                        {userLocation && (
                          <div className="flex items-start justify-between">
                            <span className="text-sm font-medium">Location</span>
                            <span className="text-xs text-muted-foreground text-right max-w-[200px]">{userLocation}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button onClick={handleConfirmAttendance} className="flex-1">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Confirm Attendance
                        </Button>
                        <Button variant="outline" onClick={() => setShowMarkAttendanceDialog(false)} className="flex-1">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 bg-green-100 rounded-lg text-center">
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="font-semibold text-green-800">Checked In</p>
                    <p className="text-sm text-green-600">{checkInTime?.toLocaleTimeString()}</p>
                    {checkInDeviceInfo && (
                      <p className="text-xs text-green-600 mt-1">
                        <Monitor className="w-3 h-3 inline mr-1" />
                        {checkInDeviceInfo}
                      </p>
                    )}
                  </div>
                  <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
                    <DialogTrigger asChild>
                      <Button 
                        onClick={() => {
                          if (!canCheckout) {
                            toast.error('Checkout is allowed only from the device used to check in.');
                          } else {
                            setShowCheckoutDialog(true);
                          }
                        }}
                        variant={canCheckout ? "default" : "outline"}
                        className="w-full"
                        disabled={!canCheckout}
                      >
                        {canCheckout ? 'Check Out' : 'Check Out (Disabled)'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Work Report</DialogTitle>
                        <DialogDescription>
                          Please describe what you accomplished today before checking out
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-medium mb-2">Working Hours: {formatTime(workingTime)}</p>
                          <Textarea
                            placeholder="Describe your work today:&#10;- Tasks completed&#10;- Projects worked on&#10;- Issues resolved&#10;- Progress made"
                            value={workReport}
                            onChange={(e) => setWorkReport(e.target.value)}
                            rows={10}
                            className="resize-none"
                          />
                        </div>
                        <div className="flex space-x-2">
                          <Button onClick={handleCheckOut} className="flex-1">
                            Submit & Check Out
                          </Button>
                          <Button variant="outline" onClick={() => setShowCheckoutDialog(false)} className="flex-1">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
              {!canCheckout && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Checkout only available on {checkInDeviceInfo}
                </p>
              )}
            </div>

            {/* Working Time Display */}
            {isCheckedIn && (
              <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <CardContent className="py-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm mb-1">Currently Working</p>
                      <p className="text-3xl font-bold">{formatTime(workingTime)}</p>
                      <p className="text-xs text-blue-200 mt-1">
                        Timer synced across all devices
                      </p>
                    </div>
                    <Clock className="w-12 h-12 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Projects Overview */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Your Projects
              </CardTitle>
              <CardDescription>Projects assigned to you by the admin - Manage tasks and subtasks</CardDescription>
            </div>
            <Dialog open={isIssueDialogOpen} onOpenChange={setIsIssueDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Raise Issue
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Raise an Issue</DialogTitle>
                  <DialogDescription>Report a problem or ask a question about a project</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Select Project *</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={selectedProject}
                      onChange={(e) => setSelectedProject(e.target.value)}
                    >
                      <option value="">Select a project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>{project.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Issue Title *</Label>
                    <Input
                      value={newIssue.title}
                      onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
                      placeholder="Brief description of the issue"
                    />
                  </div>
                  <div>
                    <Label>Description *</Label>
                    <Textarea
                      value={newIssue.description}
                      onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                      placeholder="Detailed description of the issue or question"
                      rows={5}
                    />
                  </div>
                  <Button onClick={handleCreateIssue} className="w-full">
                    Submit Issue
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg mb-2">No projects assigned yet</p>
              <p className="text-sm text-muted-foreground">
                Please contact the admin to get access to projects
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => (
                <Card key={project.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{project.title}</CardTitle>
                        <CardDescription className="mt-2">{project.description}</CardDescription>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <Badge variant={getPriorityColor(project.priority)}>
                          {project.priority}
                        </Badge>
                        <Badge variant="outline">
                          {project.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                      {project.startDate && (
                        <div>
                          <p className="text-muted-foreground">Start Date</p>
                          <p className="font-medium">{new Date(project.startDate).toLocaleDateString()}</p>
                        </div>
                      )}
                      {project.endDate && (
                        <div>
                          <p className="text-muted-foreground">End Date</p>
                          <p className="font-medium">{new Date(project.endDate).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>

                    {/* Add Task Button */}
                    <div className="mb-4">
                      <Dialog open={isTaskDialogOpen && selectedProject === project.id} onOpenChange={(open) => {
                        if (open) {
                          setSelectedProject(project.id);
                          setIsTaskDialogOpen(true);
                        } else {
                          setIsTaskDialogOpen(false);
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedProject(project.id);
                              setIsTaskDialogOpen(true);
                            }}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Task
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Task to {project.title}</DialogTitle>
                            <DialogDescription>Create a new task for this project</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Task Title *</Label>
                              <Input
                                value={newTask.title}
                                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                placeholder="Task title"
                              />
                            </div>
                            <div>
                              <Label>Description</Label>
                              <Textarea
                                value={newTask.description}
                                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                placeholder="Task description"
                                rows={3}
                              />
                            </div>
                            <div>
                              <Label>Assign To *</Label>
                              <select
                                className="w-full p-2 border rounded-md"
                                value={newTask.assignedTo}
                                onChange={(e) => {
                                  const selectedId = e.target.value;
                                  const selectedEmployee = employees.find(emp => emp.id === selectedId);
                                  setNewTask({
                                    ...newTask,
                                    assignedTo: selectedId,
                                    assignedToName: selectedEmployee?.name || ''
                                  });
                                }}
                              >
                                <option value="">Select Employee</option>
                                {(() => {
                                  const project = projects.find(p => p.id === selectedProject);
                                  if (!project || !project.teamMembers || project.teamMembers.length === 0) {
                                    return <option disabled>No team members assigned</option>;
                                  }
                                  return employees
                                    .filter(emp => project.teamMembers?.includes(emp.id))
                                    .map(emp => (
                                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                                    ));
                                })()}
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Priority</Label>
                                <select
                                  className="w-full p-2 border rounded-md"
                                  value={newTask.priority}
                                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                                >
                                  <option>low</option>
                                  <option selected>medium</option>
                                  <option>high</option>
                                </select>
                              </div>
                              <div>
                                <Label>Status</Label>
                                <select
                                  className="w-full p-2 border rounded-md"
                                  value={newTask.status}
                                  onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                                >
                                  <option selected>todo</option>
                                  <option>inprogress</option>
                                  <option>review</option>
                                  <option>done</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <Label>Due Date *</Label>
                              <Input
                                type="date"
                                value={newTask.dueDate}
                                onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                              />
                            </div>
                            <Button onClick={handleCreateTask} className="w-full">
                              Create Task
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    
                    {project.tasks && project.tasks.length > 0 && (
                      <div className="pt-4 border-t">
                        <p className="text-sm font-medium mb-3">Project Tasks ({project.tasks.length})</p>
                        <div className="space-y-2">
                          {project.tasks.map((task) => (
                            <div key={task.id} className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm">{task.title}</h4>
                                  <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                                  <div className="flex items-center space-x-2 mt-2">
                                    <Badge variant="outline" className="text-xs">
                                      {task.assignedToName}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      Due: {new Date(task.dueDate).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end space-y-1">
                                  <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                                    {task.priority}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {task.status}
                                  </Badge>
                                </div>
                              </div>

                              {task.subtasks && task.subtasks.length > 0 && (
                                <div className="mt-2 pt-2 border-t">
                                  <div className="flex justify-between items-center mb-2">
                                    <p className="text-xs text-muted-foreground">
                                      Subtasks: {task.subtasks.filter(st => st.status === 'completed').length}/{task.subtasks.length} completed
                                    </p>
                                  </div>
                                  <Progress 
                                    value={(task.subtasks.filter(st => st.status === 'completed').length / task.subtasks.length) * 100} 
                                    className="h-1 mb-2"
                                  />
                                  <div className="space-y-1">
                                    {task.subtasks.map((subtask) => (
                                      <div key={subtask.id} className="flex items-start space-x-2 p-2 bg-white rounded hover:bg-gray-100 transition-colors">
                                        <input
                                          type="checkbox"
                                          checked={subtask.status === 'completed'}
                                          onChange={() => handleToggleSubtask(project.id, task.id, subtask.id)}
                                          className="mt-0.5 h-3 w-3 cursor-pointer"
                                        />
                                        <div className="flex-1">
                                          <p className={`text-xs ${subtask.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                                            {subtask.title}
                                          </p>
                                          {subtask.description && (
                                            <p className="text-xs text-muted-foreground">{subtask.description}</p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Add Subtask Button */}
                              <div className="mt-2">
                                <Dialog 
                                  open={isSubtaskDialogOpen && selectedTaskForSubtask?.taskId === task.id && selectedTaskForSubtask?.projectId === project.id} 
                                  onOpenChange={(open) => {
                                    if (open) {
                                      setSelectedTaskForSubtask({ projectId: project.id, taskId: task.id });
                                      setIsSubtaskDialogOpen(true);
                                    } else {
                                      setIsSubtaskDialogOpen(false);
                                    }
                                  }}
                                >
                                  <DialogTrigger asChild>
                                    <Button 
                                      size="sm" 
                                      variant="ghost"
                                      className="text-xs"
                                      onClick={() => {
                                        setSelectedTaskForSubtask({ projectId: project.id, taskId: task.id });
                                        setIsSubtaskDialogOpen(true);
                                      }}
                                    >
                                      <Plus className="w-3 h-3 mr-1" />
                                      Add Subtask
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Add Subtask</DialogTitle>
                                      <DialogDescription>Create a subtask for "{task.title}"</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <Label>Subtask Title *</Label>
                                        <Input
                                          value={newSubtask.title}
                                          onChange={(e) => setNewSubtask({ ...newSubtask, title: e.target.value })}
                                          placeholder="Subtask title"
                                        />
                                      </div>
                                      <div>
                                        <Label>Description</Label>
                                        <Textarea
                                          value={newSubtask.description}
                                          onChange={(e) => setNewSubtask({ ...newSubtask, description: e.target.value })}
                                          placeholder="Subtask description"
                                          rows={3}
                                        />
                                      </div>
                                      <Button onClick={handleCreateSubtask} className="w-full">
                                        Create Subtask
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>


    </div>
  );
};

export default ClientDashboard;