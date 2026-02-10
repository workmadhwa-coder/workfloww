import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { employeeService } from '../services/firebaseService';

/* =========================
   ADMIN LOGIN (HARDCODED)
========================= */
const ADMIN_EMAIL = 'ad@ii.in';
const ADMIN_PASSWORD_CHECK = (password: string) =>
  password === 'Tri@11';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  /* =========================
     RESTORE SESSION
  ========================= */
  useEffect(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  /* =========================
     LOGIN FUNCTION
  ========================= */
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    /* =========================
       ADMIN LOGIN
    ========================= */
    if (cleanEmail === ADMIN_EMAIL) {
      if (!ADMIN_PASSWORD_CHECK(cleanPassword)) {
        console.warn('Login failed: wrong admin password');
        return { success: false, error: 'Invalid password' };
      }
      
      const adminUser: User = {
        id: 'admin-001',
        name: 'System Administrator',
        email: ADMIN_EMAIL,
        role: 'admin'
      };

      setUser(adminUser);
      localStorage.setItem('currentUser', JSON.stringify(adminUser));
      return { success: true };  
    }

    /* =========================
       EMPLOYEE LOGIN (DB ONLY)
    ========================= */
    try {
      // 🔍 Get employee by email
      const employee = await employeeService.getByEmail(cleanEmail);

      // ❌ Email not found
      if (!employee) {
        console.warn('Login failed: email not found');
        return { success: false, error: 'Email not found' };
      }

      // ❌ Password missing in DB (bad data)
      if (!employee.password) {
        console.error('Login blocked: password not set in database');
        return { success: false, error: 'Password not set. Contact administrator' };
      }

      // ❌ Password mismatch
      if (employee.password !== cleanPassword) {
        console.warn('Login failed: wrong password');
        return { success: false, error: 'Invalid password' };
      }

      // ✅ SUCCESS
      const loggedUser: User = {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        designation: employee.designation,
        department: employee.department,
        phone: employee.phone,
        employmentType: employee.employmentType,
        workingShift: employee.workingShift,
        joiningDate: employee.joiningDate,
        aadharNumber: employee.aadharNumber
      };

      setUser(loggedUser);
      localStorage.setItem('currentUser', JSON.stringify(loggedUser));
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login error. Please try again' };
    }
  };

  /* =========================
     LOGOUT
  ========================= */
  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
