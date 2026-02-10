import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { Plus, Calendar, Users, DollarSign, Target, Clock, CheckCircle2 } from 'lucide-react';
import { mockProjects, mockTasks, mockUsers } from '../data/mockData';
import { Project, Task } from '../types';

const ProjectManagement: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [newProject, setNewProject] = useState<Partial<Project>>({
    status: 'planning',
    progress: 0,
  });
  const [newTask, setNewTask] = useState<Partial<Task>>({
    status: 'todo',
    priority: 'medium',
  });

  const handleCreateProject = () => {
    if (newProject.title && newProject.description) {
      const project: Project = {
        id: Date.now().toString(),
        tasks: [],
        teamMembers: [],
        ...newProject as Project,
      };
      setProjects([...projects, project]);
      setNewProject({ status: 'planning', progress: 0 });
      setIsProjectDialogOpen(false);
    }
  };

  const handleCreateTask = () => {
    if (newTask.title && selectedProject) {
      const task: Task = {
        id: Date.now().toString(),
        projectId: selectedProject,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: [],
        attachments: [],
        ...newTask as Task,
      };
      setTasks([...tasks, task]);
      setNewTask({ status: 'todo', priority: 'medium' });
      setIsTaskDialogOpen(false);
    }
  };

  const moveTask = (taskId: string, newStatus: Task['status']) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, status: newStatus, updatedAt: new Date().toISOString() } : task
    ));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'review': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTasksByStatus = (projectId: string, status: Task['status']) => {
    return tasks.filter(task => task.projectId === projectId && task.status === status);
  };

  const canManageProjects = () => {
    return user?.role === 'admin' || user?.role === 'mentor';
  };

  const getUserProjects = () => {
    if (user?.role === 'admin') return projects;
    if (user?.role === 'mentor') return projects.filter(p => p.mentorId === user.id);
    if (user?.role === 'employee') return projects.filter(p => p.teamMembers.includes(user.id));
    if (user?.role === 'client') return projects.filter(p => p.clientId === user.id);
    return [];
  };

  const userProjects = getUserProjects();

  const KanbanBoard = ({ project }: { project: Project }) => {
    const columns = [
      { status: 'todo' as const, title: 'To Do', icon: Target },
      { status: 'inprogress' as const, title: 'In Progress', icon: Clock },
      { status: 'review' as const, title: 'Review', icon: CheckCircle2 },
      { status: 'done' as const, title: 'Done', icon: CheckCircle2 },
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {columns.map((column) => {
          const Icon = column.icon;
          const columnTasks = getTasksByStatus(project.id, column.status);
          
          return (
            <Card key={column.status} className="h-fit">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Icon className="w-4 h-4" />
                    <CardTitle className="text-sm">{column.title}</CardTitle>
                  </div>
                  <Badge variant="secondary">{columnTasks.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {columnTasks.map((task) => {
                  const assignee = mockUsers.find(u => u.id === task.assigneeId);
                  return (
                    <Card key={task.id} className="p-3 cursor-pointer hover:shadow-md transition-shadow">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">{task.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                        <div className="flex items-center justify-between">
                          <Badge className={getPriorityColor(task.priority)} variant="secondary">
                            {task.priority}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {assignee?.name.split(' ')[0]}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Due: {new Date(task.deadline).toLocaleDateString()}
                        </div>
                        {canManageProjects() && (
                          <div className="flex space-x-1">
                            {columns.map((col) => (
                              <Button
                                key={col.status}
                                variant="ghost"
                                size="sm"
                                className="text-xs p-1 h-6"
                                onClick={() => moveTask(task.id, col.status)}
                                disabled={task.status === col.status}
                              >
                                {col.title}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Project Management</h2>
          <p className="text-muted-foreground">Manage projects and track progress</p>
        </div>
        
        <div className="flex space-x-2">
          {canManageProjects() && (
            <>
              <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Task
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                    <DialogDescription>Add a new task to a project</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="project">Project</Label>
                      <Select value={selectedProject} onValueChange={setSelectedProject}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          {userProjects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>{project.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="taskTitle">Task Title</Label>
                      <Input
                        id="taskTitle"
                        value={newTask.title || ''}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        placeholder="Enter task title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="taskDescription">Description</Label>
                      <Textarea
                        id="taskDescription"
                        value={newTask.description || ''}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        placeholder="Task description"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="assignee">Assignee</Label>
                        <Select value={newTask.assigneeId} onValueChange={(value) => setNewTask({ ...newTask, assigneeId: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select assignee" />
                          </SelectTrigger>
                          <SelectContent>
                            {mockUsers.filter(u => u.role === 'employee').map((user) => (
                              <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="priority">Priority</Label>
                        <Select value={newTask.priority} onValueChange={(value) => setNewTask({ ...newTask, priority: value as Task['priority'] })}>
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
                      <Label htmlFor="deadline">Deadline</Label>
                      <Input
                        id="deadline"
                        type="date"
                        value={newTask.deadline || ''}
                        onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                      />
                    </div>
                    <Button onClick={handleCreateTask} className="w-full">Create Task</Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    New Project
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Projectttt</DialogTitle>
                    <DialogDescription>Start a new project with team collaboration</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Project Title</Label>
                      <Input
                        id="title"
                        value={newProject.title || ''}
                        onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                        placeholder="Enter project title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newProject.description || ''}
                        onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                        placeholder="Project description"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startDate">Start Date</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={newProject.startDate || ''}
                          onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="endDate">End Date</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={newProject.endDate || ''}
                          onChange={(e) => setNewProject({ ...newProject, endDate: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="client">Client</Label>
                        <Select value={newProject.clientId} onValueChange={(value) => setNewProject({ ...newProject, clientId: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select client" />
                          </SelectTrigger>
                          <SelectContent>
                            {mockUsers.filter(u => u.role === 'client').map((user) => (
                              <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="budget">Budget ($)</Label>
                        <Input
                          id="budget"
                          type="number"
                          value={newProject.budget || ''}
                          onChange={(e) => setNewProject({ ...newProject, budget: parseInt(e.target.value) })}
                          placeholder="Project budget"
                        />
                      </div>
                    </div>
                    <Button onClick={handleCreateProject} className="w-full">Create Project</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Project Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userProjects.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userProjects.filter(p => p.status === 'active').length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${userProjects.reduce((sum, p) => sum + p.budget, 0).toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(userProjects.flatMap(p => p.teamMembers)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="kanban">Kanban Board</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-6">
            {userProjects.map((project) => {
              const client = mockUsers.find(u => u.id === project.clientId);
              const mentor = mockUsers.find(u => u.id === project.mentorId);
              const projectTasks = tasks.filter(t => t.projectId === project.id);
              
              return (
                <Card key={project.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{project.title}</CardTitle>
                        <CardDescription>{project.description}</CardDescription>
                      </div>
                      <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium">Client</p>
                        <p className="text-sm text-muted-foreground">{client?.name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Mentor</p>
                        <p className="text-sm text-muted-foreground">{mentor?.name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Budget</p>
                        <p className="text-sm text-muted-foreground">${project.budget.toLocaleString()}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="h-2" />
                    </div>
                    
                    <div className="flex justify-between text-sm text-muted-foreground mt-4">
                      <span>Tasks: {projectTasks.length}</span>
                      <span>{project.startDate} - {project.endDate}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
        
        <TabsContent value="kanban" className="space-y-6">
          {userProjects.map((project) => (
            <Card key={project.id}>
              <CardHeader>
                <CardTitle>{project.title}</CardTitle>
                <CardDescription>Task board for {project.title}</CardDescription>
              </CardHeader>
              <CardContent>
                <KanbanBoard project={project} />
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectManagement;