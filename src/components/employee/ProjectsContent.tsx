import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { CheckCircle, FileText } from 'lucide-react';
import { projectService } from '../../services/firebaseService';
import type { Project, Task, Subtask } from '../../types';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

interface TaskWithProject {
  project: Project;
  task: Task;
}

const ProjectsContent: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [myTasks, setMyTasks] = useState<TaskWithProject[]>([]);

  useEffect(() => {
    loadProjects();
  }, [user?.id]);

  const loadProjects = async () => {
    try {
      const allProjects: Project[] = await projectService.getAll();
      const userProjects = allProjects.filter(p => p.teamMembers?.includes(user?.id || ''));
      setProjects(userProjects);

      const tasksForMe: TaskWithProject[] = [];
      allProjects.forEach((project) => {
        project.tasks?.forEach((task) => {
          if (task.assignedTo === user?.id) {
            tasksForMe.push({ project, task });
          }
        });
      });
      setMyTasks(tasksForMe);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const handleToggleSubtask = async (projectId: string, taskId: string, subtaskId: string) => {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;

      const updatedTasks = project.tasks.map((task) => {
        if (task.id === taskId) {
          return {
            ...task,
            subtasks: task.subtasks.map((subtask) =>
              subtask.id === subtaskId
                ? {
                    ...subtask,
                    status: subtask.status === 'completed' ? 'pending' : 'completed',
                    completedAt:
                      subtask.status === 'completed' ? undefined : new Date().toISOString()
                  }
                : subtask
            )
          };
        }
        return task;
      });

      await projectService.update(projectId, { tasks: updatedTasks });
      loadProjects();
    } catch (error) {
      console.error('Error toggling subtask:', error);
    }
  };

  /* ---------- PRIORITY STYLES ---------- */
  const getPriorityBadge = (priority: string): BadgeVariant => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getPriorityCardStyle = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-2 border-red-500 shadow-red-200 animate-pulse bg-red-50/40';
      case 'medium':
        return 'border-2 border-amber-400 bg-amber-50/40';
      case 'low':
        return 'border-2 border-green-400 bg-green-50/40';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">My Projects & Tasks</h2>

      {/* ================= MY TASKS ================= */}
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
                <Card
                  key={task.id}
                  className={`transition-all hover:shadow-lg ${getPriorityCardStyle(task.priority)}`}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">{task.title}</CardTitle>
                        <CardDescription>{task.description}</CardDescription>
                        <p className="text-xs text-muted-foreground mt-1">
                          Project: {project.title}
                        </p>
                      </div>

                      <div className="flex flex-col items-end space-y-1">
                        <Badge variant={getPriorityBadge(task.priority)}>
                          {task.priority.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  {task.subtasks?.length > 0 && (
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-medium">Subtasks</p>
                          <p className="text-xs text-muted-foreground">
                            {task.subtasks.filter(st => st.status === 'completed').length}/
                            {task.subtasks.length} completed
                          </p>
                        </div>

                        <Progress
                          value={
                            (task.subtasks.filter(st => st.status === 'completed').length /
                              task.subtasks.length) *
                            100
                          }
                          className="h-2"
                        />

                        {task.subtasks.map((subtask) => (
                          <div
                            key={subtask.id}
                            className="flex space-x-3 p-3 border rounded-lg bg-white hover:bg-gray-50 transition"
                          >
                            <input
                              type="checkbox"
                              checked={subtask.status === 'completed'}
                              onChange={() =>
                                handleToggleSubtask(project.id, task.id, subtask.id)
                              }
                              className="mt-1 h-4 w-4"
                            />
                            <div>
                              <h4
                                className={`font-medium ${
                                  subtask.status === 'completed'
                                    ? 'line-through text-muted-foreground'
                                    : ''
                                }`}
                              >
                                {subtask.title}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {subtask.description}
                              </p>
                              {subtask.completedAt && (
                                <p className="text-xs text-green-600 mt-1">
                                  ✓ Completed {new Date(subtask.completedAt).toLocaleString()}
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

      {/* ================= ALL PROJECTS ================= */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            All Projects
          </CardTitle>
          <CardDescription>View projects assigned to you</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {projects.map((project) => (
              <Card
                key={project.id}
                className={`transition-all hover:shadow-lg ${getPriorityCardStyle(
                  project.priority
                )}`}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{project.title}</CardTitle>
                      <CardDescription className="mt-2">
                        {project.description}
                      </CardDescription>
                    </div>

                    <div className="flex flex-col items-end space-y-1">
                      <Badge variant={getPriorityBadge(project.priority)}>
                        {project.priority.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">{project.status}</Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {project.startDate && (
                      <div>
                        <p className="text-muted-foreground">Start Date</p>
                        <p className="font-medium">
                          {new Date(project.startDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {project.endDate && (
                      <div>
                        <p className="text-muted-foreground">End Date</p>
                        <p className="font-medium">
                          {new Date(project.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectsContent;
