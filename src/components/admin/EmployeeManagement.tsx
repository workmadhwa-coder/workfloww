import React, { useState, useEffect } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger
} from '../ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../ui/select';
import { Badge } from '../ui/badge';
import { Plus, Edit, Trash2, UserPlus } from 'lucide-react';
import { employeeService } from '../../services/firebaseService';
import type { Employee } from '../../types';

const EmployeeManagement: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    role: 'employee',
    designation: ''
  });

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    const data = await employeeService.getAll();
    setEmployees(data);
  };

  /* =========================
     ADD EMPLOYEE
     ========================= */
  const handleAddEmployee = async () => {
    if (!newEmployee.name || !newEmployee.email || !newEmployee.designation) {
      alert('All fields are required');
      return;
    }

    await employeeService.create({
      name: newEmployee.name,
      email: newEmployee.email,
      role: newEmployee.role,
      designation: newEmployee.designation,
      password: newEmployee.email, // ✅ DEFAULT PASSWORD STORED IN DB
      forcePasswordChange: true
    });

    await loadEmployees();
    setNewEmployee({ name: '', email: '', role: 'employee', designation: '' });
    setIsAddDialogOpen(false);

    alert(`Employee created.\nDefault password: ${newEmployee.email}`);
  };

  /* =========================
     UPDATE EMPLOYEE
     ========================= */
  const handleUpdateEmployee = async () => {
    if (!selectedEmployee) return;

    await employeeService.update(selectedEmployee.id, {
      name: selectedEmployee.name,
      email: selectedEmployee.email,
      designation: selectedEmployee.designation,
      role: selectedEmployee.role
    });

    await loadEmployees();
    setIsEditDialogOpen(false);
    setSelectedEmployee(null);
  };

  /* =========================
     DELETE EMPLOYEE
     ========================= */
  const handleDeleteEmployee = async (id: string) => {
    if (!confirm('Delete this employee?')) return;
    await employeeService.delete(id);
    await loadEmployees();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center">
              <UserPlus className="w-5 h-5 mr-2" />
              Employee Management
            </CardTitle>
            <CardDescription>
              Employee credentials are stored securely in database
            </CardDescription>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Employee
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Employee</DialogTitle>
                <DialogDescription>
                  Default password will be employee email
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={newEmployee.name}
                    onChange={e => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={newEmployee.email}
                    onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Designation *</Label>
                  <Input
                    value={newEmployee.designation}
                    onChange={e => setNewEmployee({ ...newEmployee, designation: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Role</Label>
                  <Select
                    value={newEmployee.role}
                    onValueChange={value =>
                      setNewEmployee({ ...newEmployee, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full" onClick={handleAddEmployee}>
                  Create Employee
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {employees.map(emp => (
          <div key={emp.id} className="p-4 border rounded flex justify-between mb-3">
            <div>
              <h4 className="font-semibold">{emp.name}</h4>
              <p className="text-sm text-muted-foreground">{emp.email}</p>
              <div className="mt-1 flex gap-2">
                <Badge>{emp.designation}</Badge>
                <Badge variant="secondary">{emp.role}</Badge>
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline"
                onClick={() => {
                  setSelectedEmployee(emp);
                  setIsEditDialogOpen(true);
                }}>
                <Edit size={16} />
              </Button>

              <Button size="sm" variant="outline"
                onClick={() => handleDeleteEmployee(emp.id)}>
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      {/* EDIT DIALOG */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>

          {selectedEmployee && (
            <div className="space-y-4">
              <Input
                value={selectedEmployee.name}
                onChange={e =>
                  setSelectedEmployee({ ...selectedEmployee, name: e.target.value })
                }
              />
              <Input
                value={selectedEmployee.email}
                onChange={e =>
                  setSelectedEmployee({ ...selectedEmployee, email: e.target.value })
                }
              />
              <Input
                value={selectedEmployee.designation}
                onChange={e =>
                  setSelectedEmployee({ ...selectedEmployee, designation: e.target.value })
                }
              />
              <Button onClick={handleUpdateEmployee}>Update</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default EmployeeManagement;
