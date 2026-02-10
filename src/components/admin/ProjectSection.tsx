import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Plus, Edit, Trash2, UserPlus, CheckSquare, Clock } from 'lucide-react';
import type { Project, Task } from '../../types';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

interface ProjectSectionProps {
  projects: Project[];
  onCreateProject: () => void;
  onEditProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onAssignClients: (project: Project) => void;
  onAddTask: (project: Project) => void;
  onAddSubtask: (project: Project, task: Task) => void;
  getPriorityColor: (priority: string) => BadgeVariant;
  getStatusColor: (status: string) => BadgeVariant;
}

const ProjectSection: React.FC<ProjectSectionProps> = ({
  projects,
  onCreateProject,
  onEditProject,
  onDeleteProject,
  onAssignClients,
  onAddTask,
  onAddSubtask,
  getPriorityColor,
  getStatusColor
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Project Management</CardTitle>
            <CardDescription>Create projects, assign tasks and manage client access</CardDescription>
          </div>
          <Button onClick={onCreateProject}>
            <Plus className="w-4 h-4 mr-2" />
            Create Project
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {projects.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No projects created yet</p>
          ) : (
            projects.slice().reverse().map((project) => (
              <Card key={project.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{project.title}</CardTitle>
                      <CardDescription className="mt-2">{project.description}</CardDescription>
                      {project.assignedClients && project.assignedClients.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground">
                            Assigned to {project.assignedClients.length} client(s)
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getPriorityColor(project.priority)}>
                        {project.priority}
                      </Badge>
                      <Badge variant={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onAssignClients(project)}
                        title="Assign to clients"
                      >
                        <UserPlus className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onEditProject(project)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onDeleteProject(project.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
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

                    <div className="flex justify-between items-center pt-4 border-t">
                      <p className="text-sm font-medium">Tasks: {(project.tasks || []).length}</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onAddTask(project)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Task
                      </Button>
                    </div>

                    {project.tasks && project.tasks.length > 0 && (
                      <div className="space-y-4">
                        {project.tasks.map((task) => (
                          <div key={task.id} className="p-3 border rounded-lg bg-gray-50/30">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-medium">{task.title}</h4>
                                <p className="text-sm text-muted-foreground">{task.description}</p>
                                <div className="flex items-center space-x-2 mt-2">
                                  <Badge variant="outline" className="text-xs">
                                    {task.assignedToName}
                                  </Badge>
                                  <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                                    {task.priority}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    Due: {new Date(task.dueDate).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => onAddSubtask(project, task)}
                              >
                                <CheckSquare className="w-4 h-4 mr-1" />
                                Add Subtask
                              </Button>
                            </div>

                            {/* SUBTASK LISTING WITH TIMESTAMPS */}
                            {task.subtasks && task.subtasks.length > 0 && (
                              <div className="mt-4 pl-4 border-l-2 border-gray-100 space-y-2">
                                {task.subtasks.map((subtask) => (
                                  <div key={subtask.id} className="flex items-center justify-between bg-white p-2 rounded border border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${subtask.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'}`} />
                                      <span className={`text-sm ${subtask.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                                        {subtask.title}
                                      </span>
                                    </div>
                                    
                                    {/* STATUS AND TIME REFLECTION */}
                                    {subtask.status === 'completed' ? (
                                      <div className="flex items-center gap-1.5 text-[10px] font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                                        <Clock className="w-3 h-3" />
                                        {subtask.completedAt ? 
                                          new Date(subtask.completedAt).toLocaleString([], { 
                                            dateStyle: 'short', 
                                            timeStyle: 'short' 
                                          }) : 'Completed'}
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-gray-400 italic">Pending</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProjectSection;