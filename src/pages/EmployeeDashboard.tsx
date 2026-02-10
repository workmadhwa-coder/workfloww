import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Progress } from '../components/ui/progress';
import { 
  Clock, 
  CheckCircle,
  FileText,
  TrendingUp,
  Award,
  MapPin
} from 'lucide-react';

interface Project {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  priority: string;
  tasks: Task[];
}

interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  status: string;
  priority: string;
  dueDate: string;
  subtasks: Subtask[];
}

interface Subtask {
  id: string;
  title: string;
  description: string;
  status: string;
  completedAt?: string;
}

interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  userDesignation: string;
  date: string;
  checkInTime: string;
  checkOutTime: string | null;
  hoursWorked: number;
  workReport: string;
  isActive: boolean;
  isLate: boolean;
  location?: string;
}

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

const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [workingTime, setWorkingTime] = useState(0);
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [showMarkAttendanceDialog, setShowMarkAttendanceDialog] = useState(false);
  const [workReport, setWorkReport] = useState('');
  const [todayWorkReport, setTodayWorkReport] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [myTasks, setMyTasks] = useState<{ project: Project; task: Task }[]>([]);
  const [attendancePercentage, setAttendancePercentage] = useState(0);
  const [dailyQuote] = useState(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
  const [userLocation, setUserLocation] = useState<string>('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadProjects();
    calculateAttendancePercentage();
    const interval = setInterval(() => {
      loadProjects();
      calculateAttendancePercentage();
    }, 5000);
    return () => clearInterval(interval);
  }, [user?.id]);

  useEffect(() => {
    const attendanceRecords: AttendanceRecord[] = JSON.parse(localStorage.getItem('attendanceRecords') || '[]');
    const today = new Date().toDateString();
    const todayRecord = attendanceRecords.find((record: AttendanceRecord) => 
      record.userId === user?.id && new Date(record.date).toDateString() === today
    );

    if (todayRecord && todayRecord.isActive) {
      setIsCheckedIn(true);
      setCheckInTime(new Date(todayRecord.checkInTime));
    } else if (todayRecord) {
      setTodayWorkReport(todayRecord.workReport || '');
    }
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

  const loadProjects = () => {
    const storedProjects: Project[] = JSON.parse(localStorage.getItem('projects') || '[]');
    const userProjects = storedProjects.filter(p => p.teamMembers?.includes(user?.id || ''));
    setProjects(userProjects);
    
    const tasksForMe: { project: Project; task: Task }[] = [];
    storedProjects.forEach(project => {
      const projectTasks = project.tasks || [];
      projectTasks.forEach(task => {
        if (task.assignedTo === user?.id) {
          tasksForMe.push({ project, task });
        }
      });
    });
    setMyTasks(tasksForMe);
  };

  const calculateAttendancePercentage = () => {
    const attendanceRecords: AttendanceRecord[] = JSON.parse(localStorage.getItem('attendanceRecords') || '[]');
    const userRecords = attendanceRecords.filter(record => record.userId === user?.id);
    
    // Calculate for current month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthRecords = userRecords.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= firstDayOfMonth && recordDate <= now;
    });

    // Count working days in current month up to today
    const workingDays = Math.floor((now.getTime() - firstDayOfMonth.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const attendedDays = new Set(currentMonthRecords.map(r => new Date(r.date).toDateString())).size;
    
    const percentage = workingDays > 0 ? (attendedDays / workingDays) * 100 : 0;
    setAttendancePercentage(Math.min(percentage, 100));
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        },
        (error) => {
          console.error('Error getting location:', error);
          setUserLocation('Location unavailable');
        }
      );
    } else {
      setUserLocation('Geolocation not supported');
    }
  };

  const handleMarkAttendance = () => {
    getUserLocation();
    setShowMarkAttendanceDialog(true);
  };

  const handleConfirmAttendance = () => {
    const now = new Date();
    const attendanceRecords: AttendanceRecord[] = JSON.parse(localStorage.getItem('attendanceRecords') || '[]');
    
    const newRecord: AttendanceRecord = {
      id: Date.now().toString(),
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
      location: userLocation
    };

    attendanceRecords.push(newRecord);
    localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords));
    
    setIsCheckedIn(true);
    setCheckInTime(now);
    setWorkingTime(0);
    setShowMarkAttendanceDialog(false);
    calculateAttendancePercentage();
  };

  const handleCheckOutClick = () => {
    setShowCheckoutDialog(true);
  };

  const handleCheckOut = () => {
    if (!workReport.trim()) {
      alert('Please enter your work report before checking out');
      return;
    }

    const now = new Date();
    const attendanceRecords: AttendanceRecord[] = JSON.parse(localStorage.getItem('attendanceRecords') || '[]');
    const today = new Date().toDateString();
    
    const recordIndex = attendanceRecords.findIndex((record: AttendanceRecord) => 
      record.userId === user?.id && new Date(record.date).toDateString() === today && record.isActive
    );

    if (recordIndex !== -1) {
      const checkInDateTime = new Date(attendanceRecords[recordIndex].checkInTime);
      const hoursWorked = (now.getTime() - checkInDateTime.getTime()) / (1000 * 60 * 60);
      
      attendanceRecords[recordIndex] = {
        ...attendanceRecords[recordIndex],
        checkOutTime: now.toISOString(),
        hoursWorked: hoursWorked,
        workReport: workReport,
        isActive: false
      };

      localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords));
      setTodayWorkReport(workReport);
    }
    
    setIsCheckedIn(false);
    setCheckInTime(null);
    setWorkingTime(0);
    setShowCheckoutDialog(false);
    setWorkReport('');
  };

  const handleToggleSubtask = (projectId: string, taskId: string, subtaskId: string) => {
    const storedProjects: Project[] = JSON.parse(localStorage.getItem('projects') || '[]');
    
    const updatedProjects = storedProjects.map(project => {
      if (project.id === projectId) {
        return {
          ...project,
          tasks: (project.tasks || []).map(task => {
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
      }
      return project;
    });

    localStorage.setItem('projects', JSON.stringify(updatedProjects));
    loadProjects();
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getAttendanceColor = () => {
    if (attendancePercentage >= 90) return 'text-green-600';
    if (attendancePercentage >= 75) return 'text-blue-600';
    if (attendancePercentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header with Quote */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-8 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">
              {getGreeting()}, {user?.name}! 👋
            </h1>
            <p className="text-green-100 text-lg italic mb-4">"{dailyQuote}"</p>
            <div className="flex items-center space-x-4 text-sm">
              <span className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {currentTime.toLocaleTimeString()}
              </span>
              <span className="flex items-center">
                <Award className="w-4 h-4 mr-1" />
                {user?.designation}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Attendance Tracking */}
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Attendance Tracking
            </CardTitle>
            <CardDescription>Your attendance for this month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Attendance</p>
                <p className={`text-4xl font-bold ${getAttendanceColor()}`}>
                  {attendancePercentage.toFixed(1)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={attendancePercentage >= 75 ? 'default' : 'destructive'} className="text-sm">
                  {attendancePercentage >= 90 ? 'Excellent' : attendancePercentage >= 75 ? 'Good' : attendancePercentage >= 60 ? 'Average' : 'Poor'}
                </Badge>
              </div>
            </div>
            <Progress value={attendancePercentage} className="h-3" />
            <p className="text-xs text-muted-foreground">
              Keep up the good work! Maintain above 75% for excellent performance.
            </p>
          </CardContent>
        </Card>

        {/* Mark Attendance Card */}
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!isCheckedIn && !todayWorkReport ? (
              <Button 
                onClick={handleMarkAttendance}
                className="w-full h-16 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                size="lg"
              >
                <MapPin className="w-5 h-5 mr-2" />
                Mark Attendance
              </Button>
            ) : isCheckedIn ? (
              <div className="space-y-3">
                <div className="p-4 bg-green-100 rounded-lg text-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="font-semibold text-green-800">Checked In</p>
                  <p className="text-sm text-green-600">{checkInTime?.toLocaleTimeString()}</p>
                </div>
                <Button 
                  onClick={handleCheckOutClick}
                  variant="outline"
                  className="w-full"
                >
                  Check Out
                </Button>
              </div>
            ) : (
              <div className="p-4 bg-gray-100 rounded-lg text-center">
                <CheckCircle className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="font-semibold text-gray-800">Completed</p>
                <p className="text-sm text-gray-600">Today's work done</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Working Time Display */}
      {isCheckedIn && (
        <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm mb-1">Currently Working</p>
                <p className="text-3xl font-bold">{formatTime(workingTime)}</p>
              </div>
              <Clock className="w-12 h-12 text-blue-200" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            My Assigned Tasks
          </CardTitle>
          <CardDescription>Tasks and subtasks assigned to you</CardDescription>
        </CardHeader>
        <CardContent>
          {myTasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No tasks assigned yet</p>
          ) : (
            <div className="space-y-4">
              {myTasks.map(({ project, task }) => (
                <Card key={task.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">{task.title}</CardTitle>
                        <CardDescription>{task.description}</CardDescription>
                        <p className="text-xs text-muted-foreground mt-1">Project: {project.title}</p>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <Badge variant={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  {task.subtasks && task.subtasks.length > 0 && (
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-medium">Subtasks</p>
                          <p className="text-xs text-muted-foreground">
                            {task.subtasks.filter(st => st.status === 'completed').length}/{task.subtasks.length} completed
                          </p>
                        </div>
                        <Progress 
                          value={(task.subtasks.filter(st => st.status === 'completed').length / task.subtasks.length) * 100} 
                          className="h-2 mb-3"
                        />
                        {task.subtasks.map((subtask) => (
                          <div key={subtask.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                            <input
                              type="checkbox"
                              checked={subtask.status === 'completed'}
                              onChange={() => handleToggleSubtask(project.id, task.id, subtask.id)}
                              className="mt-1 h-4 w-4 cursor-pointer"
                            />
                            <div className="flex-1">
                              <h4 className={`font-medium ${subtask.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                                {subtask.title}
                              </h4>
                              <p className="text-sm text-muted-foreground">{subtask.description}</p>
                              {subtask.completedAt && (
                                <p className="text-xs text-green-600 mt-1">
                                  ✓ Completed: {new Date(subtask.completedAt).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            All Projects
          </CardTitle>
          <CardDescription>View all company projects</CardDescription>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No projects available</p>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => (
                <Card key={project.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
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
                    <div className="grid grid-cols-2 gap-4 text-sm">
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
                    {project.tasks && project.tasks.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium mb-2">Tasks: {project.tasks.length}</p>
                        <div className="space-y-2">
                          {project.tasks.slice(0, 3).map((task) => (
                            <div key={task.id} className="text-sm p-2 bg-gray-50 rounded">
                              <p className="font-medium">{task.title}</p>
                              <p className="text-xs text-muted-foreground">
                                Assigned to: {task.assignedTo === user?.id ? 'You' : 'Other'}
                              </p>
                              {task.subtasks && task.subtasks.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  <p className="text-xs font-medium">Subtasks:</p>
                                  {task.subtasks.map((subtask) => (
                                    <div key={subtask.id} className="text-xs pl-2 border-l-2 border-gray-300">
                                      <p>{subtask.title}</p>
                                      <p className="text-muted-foreground">{subtask.description}</p>
                                      <Badge variant={subtask.status === 'completed' ? 'default' : 'secondary'} className="text-xs mt-1">
                                        {subtask.status}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                          {project.tasks.length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              +{project.tasks.length - 3} more tasks
                            </p>
                          )}
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

      {/* Today's Work Report */}
      {todayWorkReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              Today's Work Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{todayWorkReport}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mark Attendance Dialog */}
      <Dialog open={showMarkAttendanceDialog} onOpenChange={setShowMarkAttendanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Your Attendance</DialogTitle>
            <DialogDescription>
              Confirm your attendance for today
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
              {userLocation && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Location</span>
                  <span className="text-xs text-muted-foreground">{userLocation}</span>
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

      {/* Checkout Dialog */}
      <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
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
  );
};

export default EmployeeDashboard;