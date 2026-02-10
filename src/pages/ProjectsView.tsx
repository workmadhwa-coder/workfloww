import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { FileText, Calendar, User } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
  createdBy: string;
}

const ProjectsView: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    loadProjects();
    const interval = setInterval(loadProjects, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadProjects = () => {
    const storedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
    if (user?.role === 'employee') {
      const userProjects = storedProjects.filter((p: any) => p.teamMembers?.includes(user.id));
      setProjects(userProjects);
    } else {
      setProjects(storedProjects);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold">Projects</h1>
        <p className="text-purple-100">View all company projects and their details</p>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        {projects.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No projects available yet</p>
                <p className="text-sm">Projects created by admin will appear here</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          projects.slice().reverse().map((project) => (
            <Card key={project.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{project.title}</CardTitle>
                    <CardDescription className="mt-2 text-base">
                      {project.description}
                    </CardDescription>
                  </div>
                  <Badge variant={project.status === 'active' ? 'default' : 'secondary'} className="ml-4">
                    {project.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {project.startDate && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Start Date</p>
                        <p className="text-sm font-medium">{new Date(project.startDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                  {project.endDate && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">End Date</p>
                        <p className="text-sm font-medium">{new Date(project.endDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Created By</p>
                      <p className="text-sm font-medium">{project.createdBy}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    Created on {new Date(project.createdAt).toLocaleDateString()} at {new Date(project.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ProjectsView;