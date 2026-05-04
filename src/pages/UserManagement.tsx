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
  DialogTrigger,
  DialogFooter
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
  Download,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  Clock,
  Fingerprint,
  Building2,
  ShieldCheck,
  Search
} from 'lucide-react';
import { employeeService } from '../services/firebaseService';
import type { Employee } from '../types';

/* ==========================================================================
   USER MANAGEMENT COMPONENT
   ========================================================================== */

const UserManagement: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBulkImportDialogOpen, setIsBulkImportDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Initial state for a fresh employee
  const initialEmployeeState = {
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
  };

  const [newEmployee, setNewEmployee] = useState(initialEmployeeState);

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
        ...newEmployee,
        email: cleanEmail,
        password: cleanEmail, // Default password is email
        forcePasswordChange: true,
        createdAt: new Date()
      });

      await loadEmployees();
      setNewEmployee(initialEmployeeState);
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
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    try {
      await employeeService.delete(id);
      await loadEmployees();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  /* =========================
      CSV TEMPLATE & IMPORT
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
        'Srinandan M',
        'srinandankollegal@gmail.com',
        'employee',
        'Full Stack',
        'Engineering',
        '9019754169',
        'intern',
        'day',
        '2026-02-09',
        '883953281458'
      ].join(',')
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee_import_template.csv';
    a.click();
  };

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
              forcePasswordChange: true,
              createdAt: new Date()
            });
            success++;
          } catch { failed++; }
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

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* =========================
      UI RENDERING
  ========================= */
  return (
    <div className="space-y-6 pb-10">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-8 rounded-xl shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">User Directory</h1>
            <p className="text-slate-400 mt-1">Manage, audit, and update all employee credentials and profiles.</p>
          </div>
          <div className="flex gap-3">
            <Dialog open={isBulkImportDialogOpen} onOpenChange={setIsBulkImportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="bg-slate-700 hover:bg-slate-600 border-none text-white">
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Import
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Import from CSV</DialogTitle>
                  <DialogDescription>Upload a CSV file to create multiple accounts at once.</DialogDescription>
                </DialogHeader>
                <Button onClick={downloadTemplate} variant="outline" className="w-full mb-4">
                  <Download className="w-4 h-4 mr-2" /> Download Template
                </Button>
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="csv-upload">Select CSV File</Label>
                  <Input id="csv-upload" type="file" accept=".csv" onChange={handleBulkImport} />
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-500">
                  <Plus className="w-4 h-4 mr-2" /> Add New User
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Employee Account</DialogTitle>
                  <DialogDescription>Enter full professional and personal details.</DialogDescription>
                </DialogHeader>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                  {/* Personal Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center">
                      <UserPlus className="w-4 h-4 mr-2" /> Personal Details
                    </h3>
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input placeholder="John Doe" value={newEmployee.name} onChange={e => setNewEmployee({ ...newEmployee, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input type="email" placeholder="john@example.com" value={newEmployee.email} onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input placeholder="10-digit mobile" value={newEmployee.phone} onChange={e => setNewEmployee({ ...newEmployee, phone: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Aadhar Number</Label>
                      <Input placeholder="12-digit UID" value={newEmployee.aadharNumber} onChange={e => setNewEmployee({ ...newEmployee, aadharNumber: e.target.value })} />
                    </div>
                  </div>

                  {/* Professional Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center">
                      <Briefcase className="w-4 h-4 mr-2" /> Professional Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Role *</Label>
                        <Select value={newEmployee.role} onValueChange={v => setNewEmployee({ ...newEmployee, role: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employee">Employee</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="client">Client</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Employment</Label>
                        <Select value={newEmployee.employmentType} onValueChange={v => setNewEmployee({ ...newEmployee, employmentType: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full-time">Full-time</SelectItem>
                            <SelectItem value="part-time">Part-time</SelectItem>
                            <SelectItem value="intern">Intern</SelectItem>
                            <SelectItem value="contract">Contract</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Designation *</Label>
                      <Input placeholder="e.g. Full Stack Developer" value={newEmployee.designation} onChange={e => setNewEmployee({ ...newEmployee, designation: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Input placeholder="e.g. Engineering" value={newEmployee.department} onChange={e => setNewEmployee({ ...newEmployee, department: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Shift</Label>
                        <Select value={newEmployee.workingShift} onValueChange={v => setNewEmployee({ ...newEmployee, workingShift: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="day">Day</SelectItem>
                            <SelectItem value="night">Night</SelectItem>
                            <SelectItem value="flexible">Flexible</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Joining Date</Label>
                        <Input type="date" value={newEmployee.joiningDate} onChange={e => setNewEmployee({ ...newEmployee, joiningDate: e.target.value })} />
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter className="border-t pt-4">
                  <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddEmployee} className="bg-blue-600">Create User Account</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Filters and List */}
      <Card className="border-none shadow-md">
        <CardHeader className="border-b bg-slate-50/50">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search name, email or department..." 
                className="pl-10" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-3 py-1 text-xs">{filteredEmployees.length} Total Users</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-semibold border-b">
                  <th className="px-6 py-4">Employee</th>
                  <th className="px-6 py-4">Designation & Dept</th>
                  <th className="px-6 py-4">Work Status</th>
                  <th className="px-6 py-4">Identity (Aadhar)</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map(emp => (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{emp.name}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {emp.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <p className="text-slate-700 font-medium">{emp.designation}</p>
                        <p className="text-xs text-slate-400">{emp.department || 'No Department'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <Badge variant="secondary" className="w-fit text-[10px] uppercase">
                            {emp.employmentType || 'full-time'}
                          </Badge>
                          <span className="text-[11px] text-slate-500 flex items-center">
                            <Clock className="w-3 h-3 mr-1" /> {emp.workingShift} shift
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-500">
                        {emp.aadharNumber || '---'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => {
                              setSelectedEmployee(emp);
                              setIsEditDialogOpen(true);
                            }}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() => handleDeleteEmployee(emp.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* EDIT MODAL - FULLY UPDATED */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile: {selectedEmployee?.name}</DialogTitle>
            <DialogDescription>Modify administrative and professional details.</DialogDescription>
          </DialogHeader>

          {selectedEmployee && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={selectedEmployee.name} onChange={e => setSelectedEmployee({ ...selectedEmployee, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={selectedEmployee.email} onChange={e => setSelectedEmployee({ ...selectedEmployee, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={selectedEmployee.phone} onChange={e => setSelectedEmployee({ ...selectedEmployee, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Aadhar Number</Label>
                  <Input value={selectedEmployee.aadharNumber} onChange={e => setSelectedEmployee({ ...selectedEmployee, aadharNumber: e.target.value })} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={selectedEmployee.role} onValueChange={v => setSelectedEmployee({ ...selectedEmployee, role: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Shift</Label>
                    <Select value={selectedEmployee.workingShift} onValueChange={v => setSelectedEmployee({ ...selectedEmployee, workingShift: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Day</SelectItem>
                        <SelectItem value="night">Night</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Designation</Label>
                  <Input value={selectedEmployee.designation} onChange={e => setSelectedEmployee({ ...selectedEmployee, designation: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input value={selectedEmployee.department} onChange={e => setSelectedEmployee({ ...selectedEmployee, department: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Joining Date</Label>
                  <Input type="date" value={selectedEmployee.joiningDate} onChange={e => setSelectedEmployee({ ...selectedEmployee, joiningDate: e.target.value })} />
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 pt-4 border-t flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleUpdateEmployee} className="bg-blue-600">Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;