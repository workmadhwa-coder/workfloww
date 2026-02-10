import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import {
  AlertCircle,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  /* =====================
     LOAD REMEMBER ME
     ===================== */
  useEffect(() => {
    const saved = localStorage.getItem('rememberLogin');
    if (saved) {
      const parsed = JSON.parse(saved);
      setEmail(parsed.email || '');
      setPassword(parsed.password || '');
      setRemember(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return;
    }

    try {
      const result = await login(email, password);
      const success = typeof result === 'boolean' ? result : result?.success;

      if (!success) {
        setError(result?.error || 'Invalid email or password');
        return;
      }

      if (remember) {
        localStorage.setItem('rememberLogin', JSON.stringify({ email, password }));
      } else {
        localStorage.removeItem('rememberLogin');
      }

      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      setError('Login error. Please try again');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center p-4">

      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-10 items-center">

        {/* ================= LEFT SIDE ================= */}
        <div className="hidden md:flex flex-col items-center relative">

          {/* LOGO OUTSIDE & TOP OF INSTRUCTION BOX */}
          <img
            src="ss.png"
            alt="SS Inphinite"
            className="h-20 mb-6 drop-shadow-xl"
          />

          {/* BLUR GLASS INFO PANEL */}
          <div className="w-full rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-8 text-white space-y-8 shadow-xl">

            {/* COMPANY LOGOS */}
            <div className="flex gap-4 items-center">
              <img src="vini.png" className="h-16" alt="Vinidra Softech" />
              <img src="madhwa.png" className="h-16" alt="Madhwa Infotech" />
              <img src="zo.png" className="h-16" alt="Zodiac Creations" />
            </div>

            {/* ATTENDANCE INSTRUCTIONS */}
            <div className="space-y-4 text-sm text-indigo-100 leading-relaxed">
              <h3 className="text-lg font-semibold text-white">
                Attendance Instructions
              </h3>

              <p>
                All employees and interns are required to check in and check out
                strictly according to company working hours.
              </p>

              <p>
                Attendance must be marked daily. Failure to check in or check out
                may impact attendance records and evaluations.
              </p>
            </div>
          </div>
        </div>

        {/* ================= RIGHT SIDE – LOGIN ================= */}
        <Card className="bg-white/95 backdrop-blur-xl shadow-2xl border-0">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Employee Login
            </CardTitle>
            <CardDescription>
              Secure access to attendance & project dashboard
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* EMAIL */}
              <div className="space-y-1">
                <Label>Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="pl-10 h-12"
                    required
                  />
                </div>
              </div>

              {/* PASSWORD + SHOW */}
              <div className="space-y-1">
                <Label>Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-10 pr-12 h-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* REMEMBER ME */}
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={remember}
                  onCheckedChange={(v) => setRemember(!!v)}
                />
                <span className="text-sm text-gray-600">
                  Remember me
                </span>
              </div>

              {/* ERROR */}
              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* SUBMIT */}
              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90"
              >
                Sign In
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </form>

            <p className="text-xs text-gray-500 text-center leading-relaxed">
              Login credentials will be provided after onboarding.
              After first login, password change is mandatory.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
