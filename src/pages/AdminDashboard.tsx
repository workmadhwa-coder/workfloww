import React, { useState, useEffect } from 'react';
import StatsCards from '../components/admin/StatsCards';
import AttendanceSection from '../components/admin/AttendanceSection';
import ProjectSection from '../components/admin/ProjectSection';
import LeaveManagement from '../components/admin/LeaveManagement';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ScrollArea } from '../components/ui/scroll-area';
import { Checkbox } from '../components/ui/checkbox';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { attendanceService, projectService, employeeService } from '../services/firebaseService';
import type { AttendanceRecord, Project, Task, Employee } from '../types';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

const AdminDashboard: React.FC = () => {
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Employee[]>([]);
  const [selectedReport, setSelectedReport] = useState<AttendanceRecord | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isSubtaskDialogOpen, setIsSubtaskDialogOpen] = useState(false);
  const [isEditProjectDialogOpen, setIsEditProjectDialogOpen] = useState(false);
  const [isAssignClientDialogOpen, setIsAssignClientDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [selectedTeamMemberIds, setSelectedTeamMemberIds] = useState<string[]>([]);
  
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'active',
    priority: 'medium'
  });

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'medium',
    dueDate: ''
  });

  const [newSubtask, setNewSubtask] = useState({
    title: '',
    description: ''
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [attendanceRecords, allProjects, allEmployees] = await Promise.all([
        attendanceService.getAll(),
        projectService.getAll(),
        employeeService.getAll()
      ]);

      setAttendanceData(attendanceRecords);
      setProjects(allProjects);
      setEmployees(allEmployees.filter(e => e.role === 'employee'));
      setClients(allEmployees.filter(e => e.role === 'client'));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.title || !newProject.description) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      await projectService.create({
        ...newProject,
        createdAt: new Date().toISOString(),
        createdBy: 'Admin',
        tasks: [],
        assignedClients: [],
        teamMembers: selectedTeamMemberIds
      });

      await loadData();
      setNewProject({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        status: 'active',
        priority: 'medium'
      });
      setSelectedTeamMemberIds([]);
      setIsProjectDialogOpen(false);
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project. Please try again.');
    }
  };

  const handleUpdateProject = async () => {
    if (!selectedProject) return;

    try {
      await projectService.update(selectedProject.id, {
        title: selectedProject.title,
        description: selectedProject.description,
        priority: selectedProject.priority,
        status: selectedProject.status,
        teamMembers: selectedTeamMemberIds
      });

      await loadData();
      setIsEditProjectDialogOpen(false);
    } catch (error) {
      console.error('Error updating project:', error);
      alert('Failed to update project. Please try again.');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      await projectService.delete(projectId);
      await loadData();
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
    }
  };

  const handleOpenAssignClientDialog = (project: Project) => {
    setSelectedProject(project);
    setSelectedClientIds(project.assignedClients || []);
    setIsAssignClientDialogOpen(true);
  };

  const handleAssignClients = async () => {
    if (!selectedProject) return;

    try {
      await projectService.update(selectedProject.id, {
        assignedClients: selectedClientIds
      });

      await loadData();
      setIsAssignClientDialogOpen(false);
      setSelectedClientIds([]);
    } catch (error) {
      console.error('Error assigning clients:', error);
      alert('Failed to assign clients. Please try again.');
    }
  };

  const handleToggleClient = (clientId: string) => {
    setSelectedClientIds(prev => {
      if (prev.includes(clientId)) {
        return prev.filter(id => id !== clientId);
      } else {
        return [...prev, clientId];
      }
    });
  };

  const handleToggleTeamMember = (employeeId: string) => {
    setSelectedTeamMemberIds(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  };

  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.assignedTo || !selectedProject) {
      alert('Please fill in all required fields');
      return;
    }

    const teamMembers = selectedProject.teamMembers || [];
    if (!teamMembers.includes(newTask.assignedTo)) {
      alert('Selected employee is not a team member of this project');
      return;
    }

    try {
      const employee = employees.find(e => e.id === newTask.assignedTo);
      const task: Task = {
        id: Date.now().toString(),
        ...newTask,
        assignedToName: employee?.name || '',
        status: 'pending',
        createdAt: new Date().toISOString(),
        subtasks: []
      };

      const updatedTasks = [...(selectedProject.tasks || []), task];
      await projectService.update(selectedProject.id, { tasks: updatedTasks });

      await loadData();
      setNewTask({
        title: '',
        description: '',
        assignedTo: '',
        priority: 'medium',
        dueDate: ''
      });
      setIsTaskDialogOpen(false);
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task. Please try again.');
    }
  };

  const handleCreateSubtask = async () => {
    if (!newSubtask.title || !selectedTask || !selectedProject) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const subtask = {
        id: Date.now().toString(),
        ...newSubtask,
        status: 'pending'
      };

      const updatedTasks = selectedProject.tasks.map(t => {
        if (t.id === selectedTask.id) {
          return { ...t, subtasks: [...(t.subtasks || []), subtask] };
        }
        return t;
      });

      await projectService.update(selectedProject.id, { tasks: updatedTasks });

      await loadData();
      setNewSubtask({ title: '', description: '' });
      setIsSubtaskDialogOpen(false);
    } catch (error) {
      console.error('Error creating subtask:', error);
      alert('Failed to create subtask. Please try again.');
    }
  };

  const getTodayStats = () => {
    const today = new Date().toDateString();
    const todayRecords = attendanceData.filter(record => 
      new Date(record.date).toDateString() === today
    );

    return {
      checkedIn: todayRecords.length,
      currentlyWorking: todayRecords.filter(r => r.isActive).length,
      lateCheckIns: todayRecords.filter(r => r.isLate).length,
      totalHours: todayRecords.reduce((sum, r) => sum + (r.hoursWorked || 0), 0)
    };
  };

  const exportAttendance = () => {
    const csv = [
      ['Date', 'Employee Name', 'Designation', 'Check In', 'Check Out', 'Hours Worked', 'Status', 'Location', 'Work Report'].join(','),
      ...attendanceData.map(record => [
        new Date(record.date).toLocaleDateString(),
        record.userName,
        record.userDesignation,
        new Date(record.checkInTime).toLocaleTimeString(),
        record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString() : 'Still Working',
        record.hoursWorked ? record.hoursWorked.toFixed(2) : '0',
        record.isLate ? 'Late' : 'On Time',
        record.location || 'N/A',
        `"${record.workReport || 'N/A'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const stats = getTodayStats();

  const getPriorityColor = (priority: string): BadgeVariant => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string): BadgeVariant => {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'on-hold': return 'outline';
      default: return 'secondary';
    }
  };

  const getProjectTeamMembers = (project: Project) => {
    const teamMemberIds = project.teamMembers || [];
    return employees.filter(emp => teamMemberIds.includes(emp.id));
  };

  const getAvailableEmployeesForTask = () => {
    if (!selectedProject) return [];
    const teamMemberIds = selectedProject.teamMembers || [];
    return employees.filter(emp => teamMemberIds.includes(emp.id));
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-blue-100">Monitor attendance, manage projects and track employee work</p>
      </div>

      <StatsCards stats={stats} />

      {/* Tabs for different sections */}
      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="leaves">Leave Management</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="mt-6">
          <AttendanceSection
            attendanceData={attendanceData}
            onViewReport={(record) => {
              setSelectedReport(record);
              setIsReportDialogOpen(true);
            }}
            onExport={exportAttendance}
          />
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <ProjectSection
            projects={projects}
            onCreateProject={() => setIsProjectDialogOpen(true)}
            onEditProject={(project) => {
              setSelectedProject(project);
              setSelectedTeamMemberIds(project.teamMembers || []);
              setIsEditProjectDialogOpen(true);
            }}
            onDeleteProject={handleDeleteProject}
            onAssignClients={handleOpenAssignClientDialog}
            onAddTask={(project) => {
              setSelectedProject(project);
              setIsTaskDialogOpen(true);
            }}
            onAddSubtask={(project, task) => {
              setSelectedProject(project);
              setSelectedTask(task);
              setIsSubtaskDialogOpen(true);
            }}
            getPriorityColor={getPriorityColor}
            getStatusColor={getStatusColor}
          />
        </TabsContent>

        <TabsContent value="leaves" className="mt-6">
          <LeaveManagement />
        </TabsContent>
      </Tabs>

      {/* Create Project Dialog */}
      <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>Add project details visible to assigned clients and employees</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Project Title *</Label>
              <Input
                id="title"
                value={newProject.title}
                onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                placeholder="Enter project title"
              />
            </div>
            <div>
              <Label htmlFor="description">Project Description *</Label>
              <Textarea
                id="description"
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                placeholder="Detailed project description"
                rows={4}
              />
            </div>
            <div>
              <Label>Team Members</Label>
              <div className="mt-2 border rounded-lg p-3 max-h-48 overflow-y-auto">
                {employees.length === 0 ? (
                  <p className="text-center text-muted-foreground py-2">No employees available</p>
                ) : (
                  <div className="space-y-2">
                    {employees.map((employee) => (
                      <div key={employee.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                        <Checkbox
                          id={`team-${employee.id}`}
                          checked={selectedTeamMemberIds.includes(employee.id)}
                          onCheckedChange={() => handleToggleTeamMember(employee.id)}
                        />
                        <label
                          htmlFor={`team-${employee.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <p className="font-medium text-sm">{employee.name}</p>
                          <p className="text-xs text-muted-foreground">{employee.email}</p>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Selected: {selectedTeamMemberIds.length} team member(s)
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={newProject.priority} onValueChange={(value) => setNewProject({ ...newProject, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={newProject.status} onValueChange={(value) => setNewProject({ ...newProject, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={newProject.startDate}
                  onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={newProject.endDate}
                  onChange={(e) => setNewProject({ ...newProject, endDate: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={handleCreateProject} className="w-full">
              Create Project
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={isEditProjectDialogOpen} onOpenChange={setIsEditProjectDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update project details</DialogDescription>
          </DialogHeader>
          {selectedProject && (
            <div className="space-y-4">
              <div>
                <Label>Project Title</Label>
                <Input
                  value={selectedProject.title}
                  onChange={(e) => setSelectedProject({ ...selectedProject, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={selectedProject.description}
                  onChange={(e) => setSelectedProject({ ...selectedProject, description: e.target.value })}
                  rows={4}
                />
              </div>
              <div>
                <Label>Team Members</Label>
                <div className="mt-2 border rounded-lg p-3 max-h-48 overflow-y-auto">
                  {employees.length === 0 ? (
                    <p className="text-center text-muted-foreground py-2">No employees available</p>
                  ) : (
                    <div className="space-y-2">
                      {employees.map((employee) => (
                        <div key={employee.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                          <Checkbox
                            id={`edit-team-${employee.id}`}
                            checked={selectedTeamMemberIds.includes(employee.id)}
                            onCheckedChange={() => handleToggleTeamMember(employee.id)}
                          />
                          <label
                            htmlFor={`edit-team-${employee.id}`}
                            className="flex-1 cursor-pointer"
                          >
                            <p className="font-medium text-sm">{employee.name}</p>
                            <p className="text-xs text-muted-foreground">{employee.email}</p>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Selected: {selectedTeamMemberIds.length} team member(s)
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Priority</Label>
                  <Select value={selectedProject.priority} onValueChange={(value) => setSelectedProject({ ...selectedProject, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={selectedProject.status} onValueChange={(value) => setSelectedProject({ ...selectedProject, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on-hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleUpdateProject} className="w-full">
                Update Project
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Client Dialog */}
      <Dialog open={isAssignClientDialogOpen} onOpenChange={setIsAssignClientDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Project to Clients</DialogTitle>
            <DialogDescription>
              Select which clients can access this project
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {clients.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No clients available</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {clients.map((client) => (
                  <div key={client.id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                    <Checkbox
                      id={client.id}
                      checked={selectedClientIds.includes(client.id)}
                      onCheckedChange={() => handleToggleClient(client.id)}
                    />
                    <label
                      htmlFor={client.id}
                      className="flex-1 cursor-pointer"
                    >
                      <p className="font-medium">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{client.email}</p>
                    </label>
                  </div>
                ))}
              </div>
            )}
            <div className="flex space-x-2">
              <Button onClick={handleAssignClients} className="flex-1">
                Save Assignment
              </Button>
              <Button variant="outline" onClick={() => setIsAssignClientDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
            <DialogDescription>Create a new task and assign to employee</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Task Title *</Label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="Enter task title"
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Assign To *</Label>
                <Select value={newTask.assignedTo} onValueChange={(value) => setNewTask({ ...newTask, assignedTo: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableEmployeesForTask().length === 0 ? (
                      <SelectItem value="none" disabled>No team members available</SelectItem>
                    ) : (
                      getAvailableEmployeesForTask().map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedProject && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Only team members of this project can be assigned
                  </p>
                )}
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={newTask.priority} onValueChange={(value) => setNewTask({ ...newTask, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Due Date</Label>
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

      {/* Add Subtask Dialog */}
      <Dialog open={isSubtaskDialogOpen} onOpenChange={setIsSubtaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subtask</DialogTitle>
            <DialogDescription>Create a subtask for {selectedTask?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Subtask Title *</Label>
              <Input
                value={newSubtask.title}
                onChange={(e) => setNewSubtask({ ...newSubtask, title: e.target.value })}
                placeholder="Enter subtask title"
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

      {/* Work Report Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Work Report</DialogTitle>
            <DialogDescription>
              {selectedReport?.userName} - {selectedReport && new Date(selectedReport.date).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Check In</p>
                <p className="font-medium">{selectedReport && new Date(selectedReport.checkInTime).toLocaleTimeString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Check Out</p>
                <p className="font-medium">
                  {selectedReport?.checkOutTime 
                    ? new Date(selectedReport.checkOutTime).toLocaleTimeString() 
                    : 'Still Working'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Hours Worked</p>
                <p className="font-medium">{selectedReport?.hoursWorked?.toFixed(2) || '0'} hours</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge variant={selectedReport?.isLate ? 'destructive' : 'default'}>
                  {selectedReport?.isLate ? 'Late' : 'On Time'}
                </Badge>
              </div>
              {selectedReport?.location && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Location (GPS)</p>
                  <p className="font-medium text-sm">{selectedReport.location}</p>
                  <a 
                    href={`https://www.google.com/maps?q=${selectedReport.location}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View on Google Maps
                  </a>
                </div>
              )}
            </div>
            <div>
              <Label>Work Report</Label>
              <ScrollArea className="h-64 w-full rounded-md border p-4 mt-2">
                <p className="text-sm whitespace-pre-wrap">{selectedReport?.workReport || 'No report submitted'}</p>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;