import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

// Define collection names as constants
export const COLLECTIONS = {
  USERS: 'users',
  PROPERTIES: 'properties',
  INQUIRIES: 'inquiries',
  PROPERTY_VIEWS: 'propertyViews',
} as const;

// Define the schema for each collection
export const SCHEMAS = {
  users: {
    uid: 'string',
    email: 'string',
    displayName: 'string',
    role: 'string', // 'user' | 'agent' | 'admin'
    phoneNumber: 'string?', // optional
    createdAt: 'timestamp',
    updatedAt: 'timestamp',
    photoURL: 'string?', // optional
    isVerified: 'boolean',
  },
  properties: {
    id: 'string',
    title: 'string',
    description: 'string',
    price: 'number',
    location: 'string',
    type: 'string', // 'commercial' | 'plot' | 'farm'
    size: 'number',
    sizeUnit: 'string', // 'sqm' | 'hectares' | 'acres'
    features: 'array', // string[]
    images: 'array', // string[] (URLs)
    agentId: 'string',
    status: 'string', // 'active' | 'sold' | 'pending'
    createdAt: 'timestamp',
    updatedAt: 'timestamp',
    coordinates: 'geopoint?', // optional
    views: 'number',
  },
  inquiries: {
    id: 'string',
    propertyId: 'string',
    userId: 'string',
    name: 'string',
    email: 'string',
    phone: 'string?',
    message: 'string',
    status: 'string', // 'new' | 'contacted' | 'closed'
    createdAt: 'timestamp',
    updatedAt: 'timestamp',
  },
  propertyViews: {
    id: 'string',
    propertyId: 'string',
    userId: 'string?', // optional, for anonymous views
    timestamp: 'timestamp',
    source: 'string?', // optional, track where the view came from
  },
} as const;

// Function to create an initial admin user
export async function createInitialAdminUser(adminEmail: string, adminUid: string, displayName: string) {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, adminUid);
    await setDoc(userRef, {
      uid: adminUid,
      email: adminEmail,
      displayName,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
      isVerified: true,
    });
    console.log('Initial admin user created successfully');
  } catch (error) {
    console.error('Error creating initial admin user:', error);
    throw error;
  }
}

// Function to create a new user document
export async function createUserDocument(
  uid: string,
  email: string,
  displayName: string,
  role: 'user' | 'agent' | 'admin' = 'user'
) {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    await setDoc(userRef, {
      uid,
      email,
      displayName,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      isVerified: false,
    });
    console.log('User document created successfully');
  } catch (error) {
    console.error('Error creating user document:', error);
    throw error;
  }
}

// Function to update a user's role
export async function updateUserRole(uid: string, newRole: 'user' | 'agent' | 'admin') {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    await setDoc(userRef, {
      role: newRole,
      updatedAt: new Date(),
    }, { merge: true });
    console.log('User role updated successfully');
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}