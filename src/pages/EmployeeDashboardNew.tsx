import React, { useState } from 'react';
import EmployeeSidebar from '../components/EmployeeSidebar';
import EmployeeDashboardContent from '../components/employee/DashboardContent';
import EmployeeAttendanceContent from '../components/employee/AttendanceContent';
import EmployeeProjectsContent from '../components/employee/ProjectsContent';
import ProfileContent from '../components/employee/ProfileContent';
import LeaveContent from '../components/employee/LeaveContent';

const EmployeeDashboardNew: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <EmployeeDashboardContent />;
      case 'attendance':
        return <EmployeeAttendanceContent />;
      case 'leave':
        return <LeaveContent />;
      case 'projects':
        return <EmployeeProjectsContent />;
      case 'profile':
        return <ProfileContent />;
      default:
        return <EmployeeDashboardContent />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <EmployeeSidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <div className="flex-1 p-6">
        {renderContent()}
      </div>
    </div>
  );
};

export default EmployeeDashboardNew;