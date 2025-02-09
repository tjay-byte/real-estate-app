'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { isAgent } from '@/lib/roles';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { uploadMultipleImages } from '@/lib/storage';
import Navbar from '@/components/Navbar';
import toast from 'react-hot-toast';

interface PropertyFormData {
  title: string;
  description: string;
  price: string;
  location: string;
  type: string;
  size: string;
  sizeUnit: string;
  features: string[];
  status: 'active' | 'pending' | 'sold';
}

const initialFormData: PropertyFormData = {
  title: '',
  description: '',
  price: '',
  location: '',
  type: 'commercial',
  size: '',
  sizeUnit: 'sqm',
  features: [],
  status: 'active',
};

export default function NewProperty() {
  const { user, userRole } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<PropertyFormData>(initialFormData);
  const [images, setImages] = useState<FileList | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feature, setFeature] = useState('');

  useEffect(() => {
    // Redirect if not an agent
    if (!user || !isAgent(userRole)) {
      router.push('/');
    }
  }, [user, userRole, router]);

  if (!user || !isAgent(userRole)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Checking permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddFeature = () => {
    if (feature.trim() && !formData.features.includes(feature.trim())) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, feature.trim()],
      }));
      setFeature('');
    }
  };

  const handleRemoveFeature = (featureToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter(f => f !== featureToRemove),
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImages(e.target.files);
    }
  };

  const uploadImages = async () => {
    if (!images || !user) return [];
    try {
      const files = Array.from(images);
      const results = await uploadMultipleImages(files, `properties/${user.uid}`);
      return results.map(result => ({ url: result.url, path: result.path }));
    } catch (error) {
      console.error('Error uploading images:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to upload images');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!user) {
        throw new Error('You must be logged in to create a property');
      }

      if (!isAgent(userRole)) {
        throw new Error('You must be an agent to create properties');
      }

      setIsSubmitting(true);

      // Validate required fields
      if (!formData.title || !formData.location || !formData.price || !formData.size) {
        throw new Error('Please fill in all required fields');
      }

      // Validate price and size are positive numbers
      const price = parseFloat(formData.price);
      const size = parseFloat(formData.size);

      if (isNaN(price) || price <= 0) {
        throw new Error('Please enter a valid positive price');
      }

      if (isNaN(size) || size <= 0) {
        throw new Error('Please enter a valid positive size');
      }

      // Upload images first
      let uploadedImages = [];
      try {
        uploadedImages = await uploadImages();
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Failed to upload images');
      }

      // Create property document
      const propertyData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        price,
        location: formData.location,
        type: formData.type,
        size,
        sizeUnit: formData.sizeUnit,
        features: formData.features,
        status: formData.status,
        agentId: user.uid,
        agentName: user.displayName || 'Unknown Agent',
        images: uploadedImages.map(img => img.url),
        imagePaths: uploadedImages.map(img => img.path),
        createdAt: new Date(),
        updatedAt: new Date(),
        views: 0,
        savedBy: [], // Initialize as empty array
      };

      // Add to Firestore
      const docRef = await addDoc(collection(db, 'properties'), propertyData);

      if (!docRef.id) {
        throw new Error('Failed to create property document');
      }

      toast.success('Property listed successfully!');

      // Use try-catch for navigation
      try {
        await router.push('/dashboard');
      } catch (navError) {
        console.error('Navigation error:', navError);
        // Even if navigation fails, the property was created successfully
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Error creating property:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create property listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="py-10">
        <header>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-orange-400">
              Add New Property
            </h1>
          </div>
        </header>
        <main>
          <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
            <div className="mt-8">
              <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow">
                {/* Basic Information */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                      Title
                    </label>
                    <input
                      type="text"
                      name="title"
                      id="title"
                      required
                      value={formData.title}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                      Location
                    </label>
                    <select
                      name="location"
                      id="location"
                      required
                      value={formData.location}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                    >
                      <option value="">Select location</option>
                      <option value="Potchefstroom">Potchefstroom</option>
                      <option value="Klerksdorp">Klerksdorp</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                      Price (R)
                    </label>
                    <input
                      type="number"
                      name="price"
                      id="price"
                      required
                      min="0"
                      value={formData.price}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                      Property Type
                    </label>
                    <select
                      name="type"
                      id="type"
                      required
                      value={formData.type}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                    >
                      <option value="commercial">Commercial Land</option>
                      <option value="plot">Plot</option>
                      <option value="farm">Farm</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="size" className="block text-sm font-medium text-gray-700">
                      Size
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="number"
                        name="size"
                        id="size"
                        required
                        min="0"
                        value={formData.size}
                        onChange={handleInputChange}
                        className="block w-full rounded-none rounded-l-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                      />
                      <select
                        name="sizeUnit"
                        value={formData.sizeUnit}
                        onChange={handleInputChange}
                        className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-white px-3 py-2 text-gray-900 sm:text-sm"
                      >
                        <option value="sqm">m²</option>
                        <option value="hectares">ha</option>
                        <option value="acres">acres</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <select
                      name="status"
                      id="status"
                      required
                      value={formData.status}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="sold">Sold</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    name="description"
                    id="description"
                    required
                    rows={4}
                    value={formData.description}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                  />
                </div>

                {/* Features */}
                <div>
                  <label htmlFor="features" className="block text-sm font-medium text-gray-700">
                    Features
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <input
                      type="text"
                      id="features"
                      value={feature}
                      onChange={(e) => setFeature(e.target.value)}
                      className="block w-full rounded-l-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                      placeholder="Add a feature"
                    />
                    <button
                      type="button"
                      onClick={handleAddFeature}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                    >
                      Add
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.features.map((f) => (
                      <span
                        key={f}
                        className="inline-flex items-center rounded-full bg-orange-100 px-3 py-0.5 text-sm font-medium text-orange-800"
                      >
                        {f}
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(f)}
                          className="ml-2 text-orange-600 hover:text-orange-900"
                        >
                          Remove
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Images */}
                <div>
                  <label htmlFor="images" className="block text-sm font-medium text-gray-700">
                    Images
                  </label>
                  <input
                    type="file"
                    id="images"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="mt-1 block w-full text-sm text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-orange-50 file:text-orange-700
                      hover:file:bg-orange-100"
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex justify-center rounded-md border border-transparent bg-orange-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Property'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}