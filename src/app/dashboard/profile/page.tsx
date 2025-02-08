'use client';

import { useState, useEffect, useCallback } from 'react';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { isAgent } from '@/lib/roles';
import toast from 'react-hot-toast';
import Image from 'next/image';

interface AgentProfile {
  displayName: string;
  email: string;
  phone: string;
  bio: string;
  specialties: string[];
  experience: string;
  photoURL: string;
  languages: string[];
  certifications: string[];
}

export default function ProfilePage() {
  const { user, userRole } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<AgentProfile>({
    displayName: '',
    email: '',
    phone: '',
    bio: '',
    specialties: [],
    experience: '',
    photoURL: '',
    languages: [],
    certifications: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const docRef = doc(db, 'agents', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile({
          displayName: data.displayName || user.displayName || '',
          email: data.email || user.email || '',
          phone: data.phone || '',
          bio: data.bio || '',
          specialties: data.specialties || [],
          experience: data.experience || '',
          photoURL: data.photoURL || user.photoURL || '',
          languages: data.languages || [],
          certifications: data.certifications || []
        });
      } else {
        // Create initial profile if it doesn't exist
        const initialProfile = {
          displayName: user.displayName || '',
          email: user.email || '',
          phone: '',
          bio: '',
          specialties: [],
          experience: '',
          photoURL: user.photoURL || '',
          languages: [],
          certifications: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await setDoc(docRef, initialProfile);
        setProfile(initialProfile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Error loading profile');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user || !isAgent(userRole)) {
      router.push('/');
      return;
    }
    fetchProfile();
  }, [user, userRole, router, fetchProfile]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !user?.uid) return;

    try {
      setIsSaving(true);
      const file = e.target.files[0];
      const storageRef = ref(storage, `agent-photos/${user.uid}`);
      await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(storageRef);
      setProfile(prev => ({ ...prev, photoURL }));
      await setDoc(doc(db, 'agents', user.uid), { photoURL, updatedAt: new Date() }, { merge: true });
      toast.success('Photo updated successfully');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Error uploading photo');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleArrayInputChange = (name: string, value: string) => {
    const array = value.split(',').map(item => item.trim()).filter(Boolean);
    setProfile(prev => ({ ...prev, [name]: array }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    setIsSaving(true);
    try {
      const updateData = {
        ...profile,
        updatedAt: new Date(),
      };
      await setDoc(doc(db, 'agents', user.uid), updateData, { merge: true });
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Error updating profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <h1 className="text-3xl font-bold mb-8 text-orange-600">Agent Profile</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center space-x-6 mb-6">
          <div className="shrink-0">
            <Image
              className="h-32 w-32 object-cover rounded-full"
              src={profile.photoURL || '/placeholder-avatar.png'}
              alt="Profile photo"
              width={128}
              height={128}
            />
          </div>
          <label className="block">
            <span className="sr-only">Choose profile photo</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-orange-50 file:text-orange-700
                hover:file:bg-orange-100"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Display Name</label>
            <input
              type="text"
              name="displayName"
              value={profile.displayName}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              type="tel"
              name="phone"
              value={profile.phone}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-gray-900"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Bio</label>
            <textarea
              name="bio"
              value={profile.bio}
              onChange={handleInputChange}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Experience (years)</label>
            <input
              type="text"
              name="experience"
              value={profile.experience}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Specialties (comma-separated)</label>
            <input
              type="text"
              value={profile.specialties.join(', ')}
              onChange={(e) => handleArrayInputChange('specialties', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Languages (comma-separated)</label>
            <input
              type="text"
              value={profile.languages.join(', ')}
              onChange={(e) => handleArrayInputChange('languages', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Certifications (comma-separated)</label>
            <input
              type="text"
              value={profile.certifications.join(', ')}
              onChange={(e) => handleArrayInputChange('certifications', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-gray-900"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}