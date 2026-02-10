import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import {
  Plus,
  Edit,
  Trash2,
  UserPlus,
  Upload,
  Download
} from 'lucide-react';
import { employeeService } from '../services/firebaseService';
import type { Employee } from '../types';

/* =========================
   USER MANAGEMENT
========================= */

const UserManagement: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBulkImportDialogOpen, setIsBulkImportDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    role: 'employee',
    designation: '',
    department: '',
    phone: '',
    employmentType: 'full-time',
    workingShift: 'day',
    joiningDate: '',
    aadharNumber: ''
  });

  /* =========================
     LOAD USERS
  ========================= */
  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const data = await employeeService.getAll();
      setEmployees(data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  /* =========================
     ADD USER
  ========================= */
  const handleAddEmployee = async () => {
    if (!newEmployee.name || !newEmployee.email || !newEmployee.designation) {
      alert('Name, Email and Designation are required');
      return;
    }

    try {
      const cleanEmail = newEmployee.email.trim().toLowerCase();

      await employeeService.create({
        name: newEmployee.name,
        email: cleanEmail,
        role: newEmployee.role,
        designation: newEmployee.designation,
        department: newEmployee.department,
        phone: newEmployee.phone,
        employmentType: newEmployee.employmentType,
        workingShift: newEmployee.workingShift,
        joiningDate: newEmployee.joiningDate,
        aadharNumber: newEmployee.aadharNumber,

        // 🔐 AUTH
        password: cleanEmail,
        forcePasswordChange: true
      });

      await loadEmployees();

      setNewEmployee({
        name: '',
        email: '',
        role: 'employee',
        designation: '',
        department: '',
        phone: '',
        employmentType: 'full-time',
        workingShift: 'day',
        joiningDate: '',
        aadharNumber: ''
      });

      setIsAddDialogOpen(false);
      alert(`User added successfully!\nDefault password: ${cleanEmail}`);
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Failed to add user');
    }
  };

  /* =========================
     UPDATE USER
  ========================= */
  const handleUpdateEmployee = async () => {
    if (!selectedEmployee) return;

    try {
      await employeeService.update(selectedEmployee.id, {
        name: selectedEmployee.name,
        email: selectedEmployee.email,
        role: selectedEmployee.role,
        designation: selectedEmployee.designation,
        department: selectedEmployee.department,
        phone: selectedEmployee.phone,
        employmentType: selectedEmployee.employmentType,
        workingShift: selectedEmployee.workingShift,
        joiningDate: selectedEmployee.joiningDate,
        aadharNumber: selectedEmployee.aadharNumber
      });

      await loadEmployees();
      setIsEditDialogOpen(false);
      setSelectedEmployee(null);
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user');
    }
  };

  /* =========================
     DELETE USER
  ========================= */
  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await employeeService.delete(id);
      await loadEmployees();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  /* =========================
     CSV TEMPLATE
  ========================= */
  const downloadTemplate = () => {
    const csv = [
      [
        'Full Name*',
        'Email*',
        'Role*',
        'Designation*',
        'Department',
        'Phone',
        'Employment Type',
        'Working Shift',
        'Joining Date (YYYY-MM-DD)',
        'Aadhar Number'
      ].join(','),
      [
        'John Doe',
        'john@company.com',
        'employee',
        'Software Engineer',
        'Engineering',
        '9876543210',
        'full-time',
        'day',
        '2024-01-15',
        '123456789012'
      ].join(',')
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee_import_template.csv';
    a.click();
  };

  /* =========================
     BULK IMPORT (UNCHANGED)
  ========================= */
  const handleBulkImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const rows = text.split('\n').filter(Boolean);

        let success = 0;
        let failed = 0;

        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i].split(',').map(c => c.trim());
          if (cols.length < 4) continue;

          try {
            const email = cols[1].toLowerCase();

            await employeeService.create({
              name: cols[0],
              email,
              role: cols[2] || 'employee',
              designation: cols[3],
              department: cols[4] || '',
              phone: cols[5] || '',
              employmentType: cols[6] || 'full-time',
              workingShift: cols[7] || 'day',
              joiningDate: cols[8] || '',
              aadharNumber: cols[9] || '',

              password: email,
              forcePasswordChange: true
            });

            success++;
          } catch {
            failed++;
          }
        }

        await loadEmployees();
        setIsBulkImportDialogOpen(false);
        alert(`Bulk import completed\nSuccess: ${success}\nFailed: ${failed}`);
      } catch (error) {
        console.error(error);
        alert('CSV import failed');
      }
    };

    reader.readAsText(file);
  };

  /* =========================
     UI
  ========================= */
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-blue-100">Manage employee and client accounts</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center">
                <UserPlus className="w-5 h-5 mr-2" />
                All Users
              </CardTitle>
              <CardDescription>
                Firebase-based authentication (email = default password)
              </CardDescription>
            </div>

            <div className="flex gap-2">
              <Dialog open={isBulkImportDialogOpen} onOpenChange={setIsBulkImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Bulk Import
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Bulk Import Users</DialogTitle>
                    <DialogDescription>
                      Email will be used as default password
                    </DialogDescription>
                  </DialogHeader>

                  <Button
                    onClick={downloadTemplate}
                    variant="outline"
                    className="w-full mb-4"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                  </Button>

                  <Input type="file" accept=".csv" onChange={handleBulkImport} />
                </DialogContent>
              </Dialog>

              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                    <DialogDescription>
                      All employee details + default password
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Full Name *</Label>
                      <Input value={newEmployee.name}
                        onChange={e => setNewEmployee({ ...newEmployee, name: e.target.value })} />
                    </div>
                    <div>
                      <Label>Email *</Label>
                      <Input value={newEmployee.email}
                        onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })} />
                    </div>
                    <div>
                      <Label>Role *</Label>
                      <Select value={newEmployee.role}
                        onValueChange={v => setNewEmployee({ ...newEmployee, role: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="client">Client</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Designation *</Label>
                      <Input value={newEmployee.designation}
                        onChange={e => setNewEmployee({ ...newEmployee, designation: e.target.value })} />
                    </div>
                    <div>
                      <Label>Department</Label>
                      <Input value={newEmployee.department}
                        onChange={e => setNewEmployee({ ...newEmployee, department: e.target.value })} />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input value={newEmployee.phone}
                        onChange={e => setNewEmployee({ ...newEmployee, phone: e.target.value })} />
                    </div>
                    <div>
                      <Label>Employment Type</Label>
                      <Select value={newEmployee.employmentType}
                        onValueChange={v => setNewEmployee({ ...newEmployee, employmentType: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full-time">Full-time</SelectItem>
                          <SelectItem value="part-time">Part-time</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="intern">Intern</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Working Shift</Label>
                      <Select value={newEmployee.workingShift}
                        onValueChange={v => setNewEmployee({ ...newEmployee, workingShift: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="day">Day</SelectItem>
                          <SelectItem value="night">Night</SelectItem>
                          <SelectItem value="flexible">Flexible</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Joining Date</Label>
                      <Input type="date" value={newEmployee.joiningDate}
                        onChange={e => setNewEmployee({ ...newEmployee, joiningDate: e.target.value })} />
                    </div>
                    <div>
                      <Label>Aadhar Number</Label>
                      <Input value={newEmployee.aadharNumber}
                        onChange={e => setNewEmployee({ ...newEmployee, aadharNumber: e.target.value })} />
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-xs text-blue-800">
                      <strong>Note:</strong> Email will be used as default password
                    </p>
                  </div>

                  <Button className="w-full mt-4" onClick={handleAddEmployee}>
                    Create User
                  </Button>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {employees.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No users added yet
            </p>
          ) : (
            employees.map(emp => (
              <div key={emp.id} className="flex justify-between border p-4 rounded mb-3">
                <div>
                  <h4 className="font-medium">{emp.name}</h4>
                  <p className="text-sm text-muted-foreground">{emp.email}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <Badge>{emp.designation}</Badge>
                    <Badge variant="secondary">{emp.role}</Badge>
                    {emp.department && <Badge variant="outline">{emp.department}</Badge>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline"
                    onClick={() => {
                      setSelectedEmployee(emp);
                      setIsEditDialogOpen(true);
                    }}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline"
                    onClick={() => handleDeleteEmployee(emp.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* EDIT DIALOG */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user details</DialogDescription>
          </DialogHeader>

          {selectedEmployee && (
            <div className="grid grid-cols-2 gap-4">
              <Input value={selectedEmployee.name}
                onChange={e => setSelectedEmployee({ ...selectedEmployee, name: e.target.value })} />
              <Input value={selectedEmployee.email}
                onChange={e => setSelectedEmployee({ ...selectedEmployee, email: e.target.value })} />
              <Input value={selectedEmployee.designation}
                onChange={e => setSelectedEmployee({ ...selectedEmployee, designation: e.target.value })} />
              <Button className="col-span-2" onClick={handleUpdateEmployee}>
                Update User
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
