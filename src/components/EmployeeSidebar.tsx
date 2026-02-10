import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import {
  LayoutDashboard,
  MapPin,
  FolderKanban,
  User,
  LogOut,
  Calendar
} from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';

interface EmployeeSidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const EmployeeSidebar: React.FC<EmployeeSidebarProps> = ({
  currentPage,
  onPageChange
}) => {
  const { user, logout } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'Attendance', icon: MapPin },
    { id: 'leave', label: 'Leave', icon: Calendar },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'profile', label: 'Profile', icon: User }
  ];

  return (
    <>
      {/* ===================== DESKTOP SIDEBAR (UNCHANGED) ===================== */}
      <div className="hidden md:flex w-64 bg-white border-r min-h-screen p-4 flex-col">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800">SS INPHINITE GROUP</h2>
          <p className="text-sm text-gray-500">Employee Portal</p>
        </div>

        {/* User Profile */}
        <div className="mb-6 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold">
                {user?.name
                  ?.split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user?.name}
              </p>
              <p className="text-xs text-gray-600 truncate">
                {user?.designation}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-2 flex-1">
          {menuItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={cn(
                  'w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors',
                  currentPage === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="mt-auto pt-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={logout}
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span className="font-medium">Logout</span>
          </Button>
        </div>
      </div>

      {/* ===================== MOBILE BOTTOM NAV ===================== */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t md:hidden">
        <div className="flex justify-around items-center h-16">
          {menuItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className={cn(
                  'flex flex-col items-center justify-center text-xs',
                  currentPage === item.id
                    ? 'text-blue-600'
                    : 'text-gray-500'
                )}
              >
                <Icon className="w-5 h-5 mb-1" />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Logout */}
          <button
            onClick={logout}
            className="flex flex-col items-center justify-center text-xs text-red-500"
          >
            <LogOut className="w-5 h-5 mb-1" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default EmployeeSidebar;
