import React, { useState, useEffect } from 'react';
import { Calendar } from '../ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../ui/dialog';
import { Badge } from '../ui/badge';
import { useAuth } from '../../contexts/AuthContext';
import { leaveService } from '../../services/leaveService';
import type { LeaveRequest } from '../../types';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';

export default function LeaveContent() {
  const { user } = useAuth();

  /* =========================
     STATE
  ========================= */
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    leaveType: 'casual' as LeaveRequest['leaveType'],
    reason: '',
    startDate: '',
    endDate: ''
  });

  /* =========================
     LOAD LEAVES
  ========================= */
  useEffect(() => {
    if (user) loadLeaves();
  }, [user]);

  const loadLeaves = async () => {
    if (!user) return;

    try {
      const rawLeaves = await leaveService.getByUserEmail(user.email);


      const normalized: LeaveRequest[] = rawLeaves.map((l: any) => {
        const createdAt =
          l.createdAt?.seconds
            ? new Date(l.createdAt.seconds * 1000)
            : l.createdAt
            ? new Date(l.createdAt)
            : new Date(l.appliedAt);

        return {
          ...l,
          appliedAt: l.appliedAt || new Date().toISOString(),
          reviewerComments:
            typeof l.reviewerComments === 'string'
              ? l.reviewerComments
              : '',
          reviewedBy: l.reviewedBy ?? null,
          reviewedAt: l.reviewedAt ?? null,
          __createdAt: createdAt
        };
      });

      normalized.sort(
        (a: any, b: any) =>
          b.__createdAt.getTime() - a.__createdAt.getTime()
      );

      setLeaves(normalized);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load leaves');
    }
  };

  /* =========================
     UTILS
  ========================= */
  const calculateDays = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    return Math.ceil((e.getTime() - s.getTime()) / 86400000) + 1;
  };

  /* =========================
     SUBMIT LEAVE
  ========================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.startDate || !formData.endDate) {
      toast.error('Please select dates');
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      toast.error('End date must be after start date');
      return;
    }

    setLoading(true);

    try {
      const totalDays = calculateDays(
        formData.startDate,
        formData.endDate
      );

      const payload: Omit<LeaveRequest, 'id'> = {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userDesignation: user.designation || 'Employee',
        leaveType: formData.leaveType,
        reason: formData.reason,
        startDate: formData.startDate,
        endDate: formData.endDate,
        totalDays,
        status: 'pending',
        appliedAt: new Date().toISOString(),
        reviewedAt: null,
        reviewedBy: null,
        reviewerComments: ''
      };

      await leaveService.create(payload);

      toast.success('Leave request submitted');

      setFormData({
        leaveType: 'casual',
        reason: '',
        startDate: '',
        endDate: ''
      });

      setIsDialogOpen(false);
      loadLeaves();
    } catch {
      toast.error('Failed to submit leave');
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     BADGES
  ========================= */
  const getStatusBadge = (status: string) => {
    if (status === 'approved')
      return (
        <Badge className="bg-green-500 text-white">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
        </Badge>
      );
    if (status === 'rejected')
      return (
        <Badge className="bg-red-500 text-white">
          <XCircle className="w-3 h-3 mr-1" /> Rejected
        </Badge>
      );
    return (
      <Badge className="bg-yellow-500 text-white">
        <Clock className="w-3 h-3 mr-1" /> Pending
      </Badge>
    );
  };

  const getLeaveTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      sick: 'bg-red-100 text-red-800',
      casual: 'bg-blue-100 text-blue-800',
      annual: 'bg-purple-100 text-purple-800',
      unpaid: 'bg-gray-100 text-gray-800',
      other: 'bg-orange-100 text-orange-800'
    };
    return (
      <Badge className={colors[type]}>
        {type.toUpperCase()}
      </Badge>
    );
  };

  /* =========================
     SUMMARY
  ========================= */
  const pendingCount = leaves.filter(l => l.status === 'pending').length;
  const approvedCount = leaves.filter(l => l.status === 'approved').length;
  const rejectedCount = leaves.filter(l => l.status === 'rejected').length;

  const totalApprovedDays = leaves
    .filter(l => l.status === 'approved')
    .reduce((sum, l) => sum + l.totalDays, 0);

  const leaveDates = leaves
    .filter(l => l.status === 'approved')
    .flatMap(l => {
      const dates: Date[] = [];
      const s = new Date(l.startDate);
      const e = new Date(l.endDate);
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }
      return dates;
    });

  /* =========================
     UI
  ========================= */
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">
            Leave Management
          </h2>
          <p className="text-muted-foreground text-sm">
            Apply for leave and track requests
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600">
              <Plus className="w-4 h-4 mr-2" />
              Apply for Leave
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Apply for Leave</DialogTitle>
              <DialogDescription>
                Submit your leave request
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Leave Type</Label>
                  <Select
                    value={formData.leaveType}
                    onValueChange={v =>
                      setFormData({ ...formData, leaveType: v as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sick">Sick</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Total Days</Label>
                  <Input
                    disabled
                    value={
                      formData.startDate && formData.endDate
                        ? calculateDays(
                            formData.startDate,
                            formData.endDate
                          )
                        : 0
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      startDate: e.target.value
                    })
                  }
                />
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      endDate: e.target.value
                    })
                  }
                />
              </div>

              <Textarea
                placeholder="Reason for leave"
                value={formData.reason}
                onChange={e =>
                  setFormData({
                    ...formData,
                    reason: e.target.value
                  })
                }
              />

              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* CALENDAR + SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Leave Calendar</CardTitle>
            <CardDescription>Approved leaves</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center overflow-x-auto">
            <Calendar mode="multiple" selected={leaveDates} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leave Summary</CardTitle>
            <CardDescription>Status overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-yellow-50 p-3 rounded">
                <div className="text-xl font-bold">{pendingCount}</div>
                Pending
              </div>
              <div className="bg-green-50 p-3 rounded">
                <div className="text-xl font-bold">{approvedCount}</div>
                Approved
              </div>
              <div className="bg-red-50 p-3 rounded">
                <div className="text-xl font-bold">{rejectedCount}</div>
                Rejected
              </div>
            </div>

            <div className="pt-4 border-t text-center">
              <h4 className="font-semibold">Total Approved Days</h4>
              <div className="text-3xl font-bold text-purple-600">
                {totalApprovedDays}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* HISTORY */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Requests History</CardTitle>
          <CardDescription>
            Status pulled directly from database
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leaves.length === 0 ? (
            <div className="text-center py-10">
              <AlertCircle className="w-10 h-10 mx-auto text-gray-400 mb-2" />
              No leave requests found
            </div>
          ) : (
            <div className="space-y-4">
              {leaves.map(l => (
                <div
                  key={l.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex flex-wrap gap-2">
                    {getLeaveTypeBadge(l.leaveType)}
                    {getStatusBadge(l.status)}
                  </div>

                  <p className="font-medium break-words">
                    {l.reason}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {l.startDate} → {l.endDate} ({l.totalDays} days)
                  </p>

                  {l.reviewerComments?.trim() && (
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="text-sm font-semibold">
                        Admin Comment
                      </p>
                      <p className="text-sm">
                        {l.reviewerComments}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
