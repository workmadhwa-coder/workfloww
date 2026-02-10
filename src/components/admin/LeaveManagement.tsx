import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { useAuth } from '../../contexts/AuthContext';
import { leaveService } from '../../services/leaveService';
import type { LeaveRequest } from '../../types';
import { CalendarDays, Clock, CheckCircle2, XCircle, AlertCircle, User, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

export default function LeaveManagement() {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [reviewComments, setReviewComments] = useState('');
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLeaves();
  }, []);

  const loadLeaves = async () => {
    try {
      const data = await leaveService.getAll();
      setLeaves(data);
    } catch (error) {
      console.error('Error loading leaves:', error);
    }
  };

  const handleReview = async () => {
    if (!selectedLeave || !user) return;

    setLoading(true);
    try {
      await leaveService.update(selectedLeave.id, {
        status: reviewAction === 'approve' ? 'approved' : 'rejected',
        reviewedAt: new Date().toISOString(),
        reviewedBy: user.name,
        reviewerComments: reviewComments
      });

      toast.success(`Leave request ${reviewAction === 'approve' ? 'approved' : 'rejected'} successfully!`);
      setIsReviewDialogOpen(false);
      setReviewComments('');
      setSelectedLeave(null);
      loadLeaves();
    } catch (error) {
      console.error('Error reviewing leave:', error);
      toast.error('Failed to review leave request');
    } finally {
      setLoading(false);
    }
  };

  const openReviewDialog = (leave: LeaveRequest, action: 'approve' | 'reject') => {
    setSelectedLeave(leave);
    setReviewAction(action);
    setIsReviewDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const getLeaveTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      sick: 'bg-red-100 text-red-800',
      casual: 'bg-blue-100 text-blue-800',
      annual: 'bg-purple-100 text-purple-800',
      unpaid: 'bg-gray-100 text-gray-800',
      other: 'bg-orange-100 text-orange-800'
    };
    return <Badge className={colors[type] || 'bg-gray-100'}>{type.charAt(0).toUpperCase() + type.slice(1)}</Badge>;
  };

  const pendingLeaves = leaves.filter(l => l.status === 'pending');
  const approvedLeaves = leaves.filter(l => l.status === 'approved');
  const rejectedLeaves = leaves.filter(l => l.status === 'rejected');

  const renderLeaveCard = (leave: LeaveRequest, showActions: boolean = false) => (
    <div key={leave.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            {getLeaveTypeBadge(leave.leaveType)}
            {getStatusBadge(leave.status)}
          </div>
          
          <div className="space-y-2 mb-3">
            <div className="flex items-center text-sm">
              <User className="w-4 h-4 mr-2 text-gray-500" />
              <span className="font-medium">{leave.userName}</span>
              <span className="text-muted-foreground ml-2">({leave.userDesignation})</span>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <Mail className="w-4 h-4 mr-2" />
              {leave.userEmail}
            </div>
          </div>

          <div className="bg-gray-50 rounded p-3 mb-3">
            <p className="text-sm font-medium mb-1">Reason:</p>
            <p className="text-sm text-gray-700">{leave.reason}</p>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
            <span className="flex items-center">
              <CalendarDays className="w-4 h-4 mr-1" />
              {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
            </span>
            <span className="font-medium text-purple-600">{leave.totalDays} days</span>
          </div>

          <p className="text-xs text-muted-foreground">
            Applied on {new Date(leave.appliedAt).toLocaleDateString()}
          </p>

          {leave.reviewerComments && (
            <div className="mt-3 p-3 bg-blue-50 rounded">
              <p className="text-sm font-medium text-blue-900">Admin Comments:</p>
              <p className="text-sm text-blue-700">{leave.reviewerComments}</p>
              {leave.reviewedBy && (
                <p className="text-xs text-blue-600 mt-1">
                  Reviewed by {leave.reviewedBy} on {leave.reviewedAt ? new Date(leave.reviewedAt).toLocaleDateString() : ''}
                </p>
              )}
            </div>
          )}
        </div>

        {showActions && leave.status === 'pending' && (
          <div className="flex flex-col gap-2 ml-4">
            <Button
              size="sm"
              className="bg-green-500 hover:bg-green-600"
              onClick={() => openReviewDialog(leave, 'approve')}
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => openReviewDialog(leave, 'reject')}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Reject
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Leave Management</h2>
        <p className="text-muted-foreground">Review and manage employee leave requests</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{leaves.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{pendingLeaves.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{approvedLeaves.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{rejectedLeaves.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Leave Requests Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
          <CardDescription>Review and manage all leave applications</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">
                Pending ({pendingLeaves.length})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Approved ({approvedLeaves.length})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Rejected ({rejectedLeaves.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4 mt-4">
              {pendingLeaves.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-muted-foreground">No pending leave requests</p>
                </div>
              ) : (
                pendingLeaves.map(leave => renderLeaveCard(leave, true))
              )}
            </TabsContent>

            <TabsContent value="approved" className="space-y-4 mt-4">
              {approvedLeaves.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-muted-foreground">No approved leave requests</p>
                </div>
              ) : (
                approvedLeaves.map(leave => renderLeaveCard(leave, false))
              )}
            </TabsContent>

            <TabsContent value="rejected" className="space-y-4 mt-4">
              {rejectedLeaves.length === 0 ? (
                <div className="text-center py-12">
                  <XCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-muted-foreground">No rejected leave requests</p>
                </div>
              ) : (
                rejectedLeaves.map(leave => renderLeaveCard(leave, false))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Approve' : 'Reject'} Leave Request
            </DialogTitle>
            <DialogDescription>
              {selectedLeave && (
                <>
                  {selectedLeave.userName}'s leave request for {selectedLeave.totalDays} days
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Comments (Optional)</label>
              <Textarea
                placeholder="Add any comments or notes..."
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleReview}
                disabled={loading}
                className={reviewAction === 'approve' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}
              >
                {loading ? 'Processing...' : reviewAction === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}