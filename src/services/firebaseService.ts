import { db } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where,
  serverTimestamp,
  Timestamp,
  limit,
  orderBy
} from 'firebase/firestore';
import type { Employee, AttendanceRecord, Project, Issue } from '../types';

// Collections
const EMPLOYEES_COLLECTION = 'employees';
const ATTENDANCE_COLLECTION = 'attendance';
const PROJECTS_COLLECTION = 'projects';
const ISSUES_COLLECTION = 'issues';

// LocalStorage fallback keys
const LS_EMPLOYEES = 'ls_employees';
const LS_ATTENDANCE = 'ls_attendance';
const LS_PROJECTS = 'ls_projects';
const LS_ISSUES = 'ls_issues';

/**
 * LOCAL STORAGE HELPERS
 * Used as a resilient fallback if Firebase is unreachable
 */
const getFromLS = <T>(key: string): T[] => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveToLS = <T>(key: string, data: T[]): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

/**
 * ERROR LOGGING
 * Provides specific feedback for Permission Denied or Indexing issues
 */
const logFirebaseError = (operation: string, error: unknown) => {
  const err = error as { code?: string; message?: string };
  console.error(`Firebase ${operation} failed:`, {
    code: err.code,
    message: err.message,
    details: error
  });
  
  if (err.code === 'permission-denied') {
    console.error('❌ PERMISSION DENIED: Check Firestore Security Rules.');
  } else if (err.code === 'failed-precondition') {
    console.error('❌ INDEX MISSING: Click the link in the error object above to create the required index.');
  }
};

/**
 * EMPLOYEE SERVICE
 */
export const employeeService = {
  async create(employee: Omit<Employee, 'id'>) {
    try {
      const payload = {
        ...employee,
        password: employee.password ?? employee.email,
        createdAt: serverTimestamp()
      };
      const docRef = await addDoc(collection(db, EMPLOYEES_COLLECTION), payload);
      return { id: docRef.id, ...payload };
    } catch (error: unknown) {
      logFirebaseError('create employee', error);
      const employees = getFromLS<Employee>(LS_EMPLOYEES);
      const newEmployee = { 
        id: Date.now().toString(), 
        ...employee,
        password: employee.password ?? employee.email 
      };
      employees.push(newEmployee);
      saveToLS(LS_EMPLOYEES, employees);
      return newEmployee;
    }
  },

  async getAll(): Promise<Employee[]> {
    try {
      const querySnapshot = await getDocs(collection(db, EMPLOYEES_COLLECTION));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
    } catch (error: unknown) {
      logFirebaseError('get employees', error);
      return getFromLS<Employee>(LS_EMPLOYEES);
    }
  },

  async getByEmail(email: string): Promise<Employee | null> {
    try {
      const q = query(collection(db, EMPLOYEES_COLLECTION), where('email', '==', email));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) return null;
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Employee;
    } catch (error: unknown) {
      logFirebaseError('get employee by email', error);
      const employees = getFromLS<Employee>(LS_EMPLOYEES);
      return employees.find(e => e.email === email) || null;
    }
  },

  async update(id: string, data: Partial<Employee>) {
    try {
      const docRef = doc(db, EMPLOYEES_COLLECTION, id);
      await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
    } catch (error: unknown) {
      logFirebaseError('update employee', error);
      const employees = getFromLS<Employee>(LS_EMPLOYEES);
      const index = employees.findIndex(e => e.id === id);
      if (index !== -1) {
        employees[index] = { ...employees[index], ...data };
        saveToLS(LS_EMPLOYEES, employees);
      }
    }
  },

  async delete(id: string) {
    try {
      await deleteDoc(doc(db, EMPLOYEES_COLLECTION, id));
    } catch (error: unknown) {
      logFirebaseError('delete employee', error);
      const employees = getFromLS<Employee>(LS_EMPLOYEES);
      const filtered = employees.filter(e => e.id !== id);
      saveToLS(LS_EMPLOYEES, filtered);
    }
  }
};

/**
 * ATTENDANCE SERVICE
 * Handles the logic for Check-in, Check-out, and Re-hydration
 */
export const attendanceService = {
  async create(attendance: Omit<AttendanceRecord, 'id'>) {
    try {
      const docRef = await addDoc(collection(db, ATTENDANCE_COLLECTION), {
        ...attendance,
        createdAt: serverTimestamp()
      });
      return { id: docRef.id, ...attendance };
    } catch (error: unknown) {
      logFirebaseError('create attendance', error);
      const records = getFromLS<AttendanceRecord>(LS_ATTENDANCE);
      const newRecord = { id: Date.now().toString(), ...attendance };
      records.push(newRecord);
      saveToLS(LS_ATTENDANCE, records);
      return newRecord;
    }
  },

  async getAll(): Promise<AttendanceRecord[]> {
    try {
      const querySnapshot = await getDocs(collection(db, ATTENDANCE_COLLECTION));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
    } catch (error: unknown) {
      logFirebaseError('get attendance', error);
      return getFromLS<AttendanceRecord>(LS_ATTENDANCE);
    }
  },

  async getByUserId(userId: string): Promise<AttendanceRecord[]> {
    try {
      const q = query(
        collection(db, ATTENDANCE_COLLECTION), 
        where('userId', '==', userId),
        orderBy('checkInTime', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
    } catch (error: unknown) {
      logFirebaseError('get attendance by user', error);
      return getFromLS<AttendanceRecord>(LS_ATTENDANCE).filter(r => r.userId === userId);
    }
  },

  /**
   * RE-HYDRATION LOGIC: This pulls the active session after refresh
   * Uses isActive flag for reliable state restoration
   */
  async getTodayByUserId(userId: string): Promise<AttendanceRecord | undefined> {
    if (!userId) return undefined;
    
    try {
      // Create a string for the current date to verify the session belongs to today
      const todayStr = new Date().toDateString();

      // Query for an active session belonging to the user
      const q = query(
        collection(db, ATTENDANCE_COLLECTION),
        where('userId', '==', userId),
        where('isActive', '==', true),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) return undefined;

      const record = { 
        id: querySnapshot.docs[0].id, 
        ...querySnapshot.docs[0].data() 
      } as AttendanceRecord;

      // Ensure the active session found started today
      const recordDateStr = new Date(record.checkInTime).toDateString();
      return recordDateStr === todayStr ? record : undefined;

    } catch (error: unknown) {
      logFirebaseError('get today attendance', error);
      const records = getFromLS<AttendanceRecord>(LS_ATTENDANCE);
      const todayStr = new Date().toDateString();
      return records.find(r => 
        r.userId === userId && 
        r.isActive === true && 
        new Date(r.checkInTime).toDateString() === todayStr
      );
    }
  },

  async update(id: string, data: Partial<AttendanceRecord>) {
    try {
      const docRef = doc(db, ATTENDANCE_COLLECTION, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error: unknown) {
      logFirebaseError('update attendance', error);
      const records = getFromLS<AttendanceRecord>(LS_ATTENDANCE);
      const index = records.findIndex(r => r.id === id);
      if (index !== -1) {
        records[index] = { ...records[index], ...data };
        saveToLS(LS_ATTENDANCE, records);
      }
    }
  },

  async delete(id: string) {
    try {
      await deleteDoc(doc(db, ATTENDANCE_COLLECTION, id));
    } catch (error: unknown) {
      logFirebaseError('delete attendance', error);
      const records = getFromLS<AttendanceRecord>(LS_ATTENDANCE);
      const filtered = records.filter(r => r.id !== id);
      saveToLS(LS_ATTENDANCE, filtered);
    }
  }
};

/**
 * PROJECT SERVICE
 */
export const projectService = {
  async create(project: Omit<Project, 'id'>) {
    try {
      const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), {
        ...project,
        createdAt: serverTimestamp()
      });
      return { id: docRef.id, ...project };
    } catch (error: unknown) {
      logFirebaseError('create project', error);
      const projects = getFromLS<Project>(LS_PROJECTS);
      const newProject = { id: Date.now().toString(), ...project };
      projects.push(newProject);
      saveToLS(LS_PROJECTS, projects);
      return newProject;
    }
  },

  async getAll(): Promise<Project[]> {
    try {
      const querySnapshot = await getDocs(collection(db, PROJECTS_COLLECTION));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
    } catch (error: unknown) {
      logFirebaseError('get projects', error);
      return getFromLS<Project>(LS_PROJECTS);
    }
  },

  async getByClientId(clientId: string): Promise<Project[]> {
    try {
      const q = query(
        collection(db, PROJECTS_COLLECTION),
        where('assignedClients', 'array-contains', clientId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
    } catch (error: unknown) {
      logFirebaseError('get projects by client', error);
      return getFromLS<Project>(LS_PROJECTS).filter(p => p.assignedClients?.includes(clientId));
    }
  },

  async update(id: string, data: Partial<Project>) {
    try {
      const docRef = doc(db, PROJECTS_COLLECTION, id);
      await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
    } catch (error: unknown) {
      logFirebaseError('update project', error);
      const projects = getFromLS<Project>(LS_PROJECTS);
      const index = projects.findIndex(p => p.id === id);
      if (index !== -1) {
        projects[index] = { ...projects[index], ...data };
        saveToLS(LS_PROJECTS, projects);
      }
    }
  },

  async delete(id: string) {
    try {
      await deleteDoc(doc(db, PROJECTS_COLLECTION, id));
    } catch (error: unknown) {
      logFirebaseError('delete project', error);
      const projects = getFromLS<Project>(LS_PROJECTS);
      const filtered = projects.filter(p => p.id !== id);
      saveToLS(LS_PROJECTS, filtered);
    }
  }
};

/**
 * ISSUE SERVICE
 */
export const issueService = {
  async create(issue: Omit<Issue, 'id'>) {
    try {
      const docRef = await addDoc(collection(db, ISSUES_COLLECTION), {
        ...issue,
        createdAt: serverTimestamp()
      });
      return { id: docRef.id, ...issue };
    } catch (error: unknown) {
      logFirebaseError('create issue', error);
      const issues = getFromLS<Issue>(LS_ISSUES);
      const newIssue = { id: Date.now().toString(), ...issue };
      issues.push(newIssue);
      saveToLS(LS_ISSUES, issues);
      return newIssue;
    }
  },

  async getAll(): Promise<Issue[]> {
    try {
      const querySnapshot = await getDocs(collection(db, ISSUES_COLLECTION));
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Issue));
    } catch (error: unknown) {
      logFirebaseError('get issues', error);
      return getFromLS<Issue>(LS_ISSUES);
    }
  },

  async getByUserId(userId: string): Promise<Issue[]> {
    try {
      const q = query(collection(db, ISSUES_COLLECTION), where('createdByUserId', '==', userId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Issue));
    } catch (error: unknown) {
      logFirebaseError('get issues by user', error);
      return getFromLS<Issue>(LS_ISSUES).filter(i => i.createdByUserId === userId);
    }
  },

  async update(id: string, data: Partial<Issue>) {
    try {
      const docRef = doc(db, ISSUES_COLLECTION, id);
      await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
    } catch (error: unknown) {
      logFirebaseError('update issue', error);
      const issues = getFromLS<Issue>(LS_ISSUES);
      const index = issues.findIndex(i => i.id === id);
      if (index !== -1) {
        issues[index] = { ...issues[index], ...data };
        saveToLS(LS_ISSUES, issues);
      }
    }
  }
};