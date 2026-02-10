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
  orderBy
} from 'firebase/firestore';
import type { LeaveRequest } from '../types';

const LEAVES_COLLECTION = 'leaves';
const LS_LEAVES = 'ls_leaves';

/* ---------------- LocalStorage Helpers ---------------- */

const getFromLS = (): LeaveRequest[] => {
  try {
    const data = localStorage.getItem(LS_LEAVES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveToLS = (data: LeaveRequest[]) => {
  try {
    localStorage.setItem(LS_LEAVES, JSON.stringify(data));
  } catch (err) {
    console.error('LocalStorage save failed', err);
  }
};

/* ---------------- Leave Service ---------------- */

export const leaveService = {
  /* CREATE */
  async create(leave: Omit<LeaveRequest, 'id'>) {
    try {
      const docRef = await addDoc(collection(db, LEAVES_COLLECTION), {
        ...leave,
        reviewerComments: leave.reviewerComments || '',
        reviewedAt: null,
        reviewedBy: null,
        createdAt: serverTimestamp()
      });

      return { id: docRef.id, ...leave };
    } catch (error) {
      console.warn('Firebase create failed, using LocalStorage');

      const leaves = getFromLS();
      const newLeave: LeaveRequest = {
        id: Date.now().toString(),
        ...leave,
        reviewerComments: '',
        reviewedAt: undefined,
        reviewedBy: undefined
      };

      saveToLS([...leaves, newLeave]);
      return newLeave;
    }
  },

  /* GET ALL (ADMIN) */
  async getAll(): Promise<LeaveRequest[]> {
    try {
      const q = query(
        collection(db, LEAVES_COLLECTION),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LeaveRequest[];
    } catch (error) {
      console.warn('Firebase getAll failed, using LocalStorage');
      return getFromLS().sort(
        (a, b) =>
          new Date(b.appliedAt).getTime() -
          new Date(a.appliedAt).getTime()
      );
    }
  },

  /* GET BY USER ID (OLD – KEEP) */
  async getByUserId(userId: string): Promise<LeaveRequest[]> {
    try {
      const q = query(
        collection(db, LEAVES_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LeaveRequest[];
    } catch (error) {
      console.warn('Firebase getByUserId failed, using LocalStorage');
      return getFromLS()
        .filter(l => l.userId === userId)
        .sort(
          (a, b) =>
            new Date(b.appliedAt).getTime() -
            new Date(a.appliedAt).getTime()
        );
    }
  },

  /* ✅ GET BY USER EMAIL (FIXED – NO orderBy) */
  async getByUserEmail(email: string): Promise<LeaveRequest[]> {
    try {
      const q = query(
        collection(db, LEAVES_COLLECTION),
        where('userEmail', '==', email)
      );

      const snapshot = await getDocs(q);

      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LeaveRequest[];

      // ✅ sort safely in JS (no Firestore index needed)
      return data.sort(
        (a, b) =>
          new Date(b.appliedAt).getTime() -
          new Date(a.appliedAt).getTime()
      );
    } catch (error) {
      console.error('getByUserEmail failed:', error);
      return [];
    }
  },

  /* GET PENDING */
  async getPending(): Promise<LeaveRequest[]> {
    try {
      const q = query(
        collection(db, LEAVES_COLLECTION),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LeaveRequest[];
    } catch {
      return getFromLS()
        .filter(l => l.status === 'pending')
        .sort(
          (a, b) =>
            new Date(b.appliedAt).getTime() -
            new Date(a.appliedAt).getTime()
        );
    }
  },

  /* UPDATE (ADMIN APPROVE / REJECT) */
  async update(id: string, data: Partial<LeaveRequest>) {
    try {
      const ref = doc(db, LEAVES_COLLECTION, id);
      await updateDoc(ref, {
        ...data,
        reviewedAt: serverTimestamp()
      });
    } catch (error) {
      console.warn('Firebase update failed, using LocalStorage');

      const leaves = getFromLS();
      const index = leaves.findIndex(l => l.id === id);

      if (index !== -1) {
        leaves[index] = {
          ...leaves[index],
          ...data,
          reviewedAt: new Date().toISOString()
        };
        saveToLS(leaves);
      }
    }
  },

  /* DELETE */
  async delete(id: string) {
    try {
      await deleteDoc(doc(db, LEAVES_COLLECTION, id));
    } catch {
      saveToLS(getFromLS().filter(l => l.id !== id));
    }
  }
};
