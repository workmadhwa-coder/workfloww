import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { 
  User, 
  Mail, 
  Briefcase, 
  Key, 
  Save, 
  Phone, 
  Fingerprint, 
  Calendar, 
  Clock, 
  ShieldCheck,
  Building2,
  UserCheck
} from 'lucide-react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const ProfileContent: React.FC = () => {
  const { user } = useAuth();
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fullUserData, setFullUserData] = useState<any>(null);
  const [fetchingData, setFetchingData] = useState(true);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Fetch complete user data from Firestore on mount
  useEffect(() => {
    const fetchFullProfile = async () => {
      if (!user?.id) return;
      try {
        const userRef = doc(db, 'employees', user.id);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          setFullUserData(snap.data());
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setFetchingData(false);
      }
    };

    fetchFullProfile();
  }, [user?.id]);

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
        updatedAt: new Date(),
        forcePasswordChange: false
      });

      alert('Password changed successfully!');

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      setIsEditingPassword(false);
      // Update local state
      setFullUserData({ ...fullUserData, password: newPassword });
    } catch (error) {
      console.error('Password update error:', error);
      alert('Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData) {
    return <div className="p-8 text-center">Loading profile information...</div>;
  }

  // Use either the real-time DB data or the auth context fallback
  const displayData = fullUserData || user;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">My Profile</h2>
        {displayData?.forcePasswordChange && (
          <Badge variant="destructive" className="animate-pulse">
            Action Required: Change Password
          </Badge>
        )}
      </div>

      {/* --- Section 1: Personal Information --- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="w-5 h-5 mr-2 text-primary" />
            Personal Information
          </CardTitle>
          <CardDescription>Your identity and contact details</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-3xl font-bold text-white">
                {displayData?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-2xl font-bold">{displayData?.name}</h3>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="capitalize">
                  {displayData?.role}
                </Badge>
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-none">
                  Active Account
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <div className="flex items-center text-sm text-muted-foreground">
                <Mail className="w-4 h-4 mr-2" />
                Email Address
              </div>
              <p className="font-medium">{displayData?.email}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center text-sm text-muted-foreground">
                <Phone className="w-4 h-4 mr-2" />
                Phone Number
              </div>
              <p className="font-medium">{displayData?.phone || 'N/A'}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center text-sm text-muted-foreground">
                <Fingerprint className="w-4 h-4 mr-2" />
                Aadhar Number
              </div>
              <p className="font-medium tracking-widest">
                {displayData?.aadharNumber ? `XXXX-XXXX-${displayData.aadharNumber.slice(-4)}` : 'Not Provided'}
              </p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center text-sm text-muted-foreground">
                <UserCheck className="w-4 h-4 mr-2" />
                Employee ID
              </div>
              <p className="font-medium">{user?.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --- Section 2: Work Information --- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Briefcase className="w-5 h-5 mr-2 text-primary" />
            Employment Details
          </CardTitle>
          <CardDescription>Information regarding your role and schedule</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <div className="flex items-center text-sm text-muted-foreground">
                <Building2 className="w-4 h-4 mr-2" />
                Department
              </div>
              <p className="font-medium">{displayData?.department || 'Engineering'}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center text-sm text-muted-foreground">
                <Briefcase className="w-4 h-4 mr-2" />
                Designation
              </div>
              <p className="font-medium">{displayData?.designation || 'Full Stack'}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center text-sm text-muted-foreground">
                <ShieldCheck className="w-4 h-4 mr-2" />
                Employment Type
              </div>
              <Badge variant="secondary" className="mt-1 capitalize">
                {displayData?.employmentType || 'Intern'}
              </Badge>
            </div>

            <div className="space-y-1">
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="w-4 h-4 mr-2" />
                Joining Date
              </div>
              <p className="font-medium">{displayData?.joiningDate || 'N/A'}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="w-4 h-4 mr-2" />
                Working Shift
              </div>
              <p className="font-medium capitalize">{displayData?.workingShift || 'Day'} Shift</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="w-4 h-4 mr-2" />
                Record Created
              </div>
              <p className="text-xs">
                {displayData?.createdAt?.seconds 
                  ? new Date(displayData.createdAt.seconds * 1000).toLocaleDateString() 
                  : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --- Section 3: Change Password --- */}
      <Card className={displayData?.forcePasswordChange ? "border-amber-500 shadow-md" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Key className="w-5 h-5 mr-2 text-primary" />
            Security
          </CardTitle>
          <CardDescription>Manage your account password</CardDescription>
        </CardHeader>

        <CardContent>
          {!isEditingPassword ? (
            <div className="flex flex-col space-y-4">
               {displayData?.forcePasswordChange && (
                <p className="text-sm text-amber-600 font-medium italic">
                  * Admin has requested a password change for your account.
                </p>
              )}
              <Button onClick={() => setIsEditingPassword(true)} variant={displayData?.forcePasswordChange ? "default" : "outline"} className="w-fit">
                Change Account Password
              </Button>
            </div>
          ) : (
            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <Input
                  type="password"
                  placeholder="Enter current password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <Input
                  type="password"
                  placeholder="Confirm your new password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <Button onClick={handleChangePassword} disabled={loading} className="flex-1">
                  {loading ? (
                    'Updating...'
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" /> Save New Password
                    </>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  disabled={loading}
                  onClick={() => {
                    setIsEditingPassword(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
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

      {/* --- Section 4: Login Info Helper --- */}
      <Card className="bg-slate-50 border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Login Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your account was registered with <strong>{displayData?.email}</strong>. 
            If this is your first time logging in, your default password was your email address. 
            Aadhar number: <strong>{displayData?.aadharNumber}</strong> is linked to this profile for verification purposes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileContent;