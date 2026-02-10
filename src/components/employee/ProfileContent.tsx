import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { User, Mail, Briefcase, Key, Save } from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const ProfileContent: React.FC = () => {
  const { user } = useAuth();
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleChangePassword = async () => {
    if (!user?.id) {
      alert('User not found');
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = passwordData;

    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);

      const userRef = doc(db, 'employees', user.id);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        alert('User record not found in database');
        return;
      }

      const dbUser = snap.data();

      // 🔐 Validate current password
      if (dbUser.password !== currentPassword) {
        alert('Current password is incorrect');
        return;
      }

      // ✅ Update password in Firestore
      await updateDoc(userRef, {
        password: newPassword,
        updatedAt: new Date()
      });

      alert('Password changed successfully!');

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      setIsEditingPassword(false);
    } catch (error) {
      console.error('Password update error:', error);
      alert('Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">My Details</h2>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="w-5 h-5 mr-2" />
            Personal Information
          </CardTitle>
          <CardDescription>Your account details and information</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-3xl font-bold text-white">
                {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-2xl font-bold">{user?.name}</h3>
              <Badge variant="secondary" className="mt-1">
                {user?.role}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Mail className="w-4 h-4 mr-2" />
                Email Address
              </div>
              <p className="font-medium">{user?.email}</p>
            </div>

            <div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Briefcase className="w-4 h-4 mr-2" />
                Designation
              </div>
              <p className="font-medium">{user?.designation || 'Not specified'}</p>
            </div>

            <div>
              <div className="flex items-center text-sm text-muted-foreground">
                <User className="w-4 h-4 mr-2" />
                Employee ID
              </div>
              <p className="font-medium">{user?.id}</p>
            </div>

            <div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Badge className="w-4 h-4 mr-2" />
                Account Status
              </div>
              <Badge>Active</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Key className="w-5 h-5 mr-2" />
            Change Password
          </CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>

        <CardContent>
          {!isEditingPassword ? (
            <Button onClick={() => setIsEditingPassword(true)}>
              Change Password
            </Button>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Current Password</Label>
                <Input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>Confirm New Password</Label>
                <Input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                />
              </div>

              <div className="flex space-x-2">
                <Button onClick={handleChangePassword} disabled={loading} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Password'}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditingPassword(false);
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Default Login Credentials</CardTitle>
          <CardDescription>Your initial login information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800 mb-2">
              <strong>Default Password:</strong> Your email address was used as your initial password.
            </p>
            <p className="text-xs text-blue-600">
              For security reasons, please change your password if you haven't already.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileContent;
