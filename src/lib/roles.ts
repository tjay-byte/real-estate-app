import { User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export type UserRole = 'user' | 'agent' | 'admin';

export interface UserData {
  uid: string;
  email: string | null;
  displayName: string;
  role: UserRole;
  createdAt: string;
}

export async function verifyUserRole(user: User): Promise<void> {
  if (!user) return;

  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));

    // If user document doesn't exist, create it with default role
    if (!userDoc.exists()) {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'User',
        role: 'user', // Default role
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error verifying user role:', error);
    throw error;
  }
}

export async function getUserRole(user: User | null): Promise<UserRole | null> {
  if (!user) return null;

  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserData;
      return userData.role;
    }

    // If no role is found, verify and set default role
    await verifyUserRole(user);
    return 'user';
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
}

export function isAgent(role: UserRole | null): boolean {
  return role === 'agent' || role === 'admin';
}

export function isAdmin(role: UserRole | null): boolean {
  return role === 'admin';
}

// Function to set a user as an agent (admin only)
export async function setUserAsAgent(userId: string): Promise<void> {
  try {
    await setDoc(doc(db, 'users', userId), {
      role: 'agent',
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    console.error('Error setting user as agent:', error);
    throw error;
  }
}