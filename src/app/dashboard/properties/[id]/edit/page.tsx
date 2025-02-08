'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { isAgent } from '@/lib/roles';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
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
  images: string[];
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
  images: [],
};

export default function EditProperty() {
  const params = useParams();
  const propertyId = params?.id as string;
  const { user, userRole } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<PropertyFormData>(initialFormData);
  const [newImages, setNewImages] = useState<FileList | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [feature, setFeature] = useState('');

  useEffect(() => {
    if (!propertyId) {
      toast.error('Property ID is missing');
      router.push('/dashboard');
      return;
    }

    const fetchProperty = async () => {
      if (!user || !isAgent(userRole)) {
        toast.error('Access denied. Agent privileges required.');
        router.push('/');
        return;
      }

      try {
        const propertyDoc = await getDoc(doc(db, 'properties', propertyId));
        if (!propertyDoc.exists()) {
          toast.error('Property not found');
          router.push('/dashboard');
          return;
        }

        const propertyData = propertyDoc.data();
        if (propertyData.agentId !== user.uid) {
          toast.error('You do not have permission to edit this property');
          router.push('/dashboard');
          return;
        }

        setFormData({
          title: propertyData.title,
          description: propertyData.description,
          price: propertyData.price.toString(),
          location: propertyData.location,
          type: propertyData.type,
          size: propertyData.size.toString(),
          sizeUnit: propertyData.sizeUnit,
          features: propertyData.features || [],
          status: propertyData.status,
          images: propertyData.images || [],
        });
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching property:', error);
        toast.error('Failed to load property');
        router.push('/dashboard');
      }
    };

    if (user && isAgent(userRole)) {
      fetchProperty();
    }
  }, [user, userRole, propertyId, router]);

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
      setNewImages(e.target.files);
    }
  };

  const handleRemoveImage = async (imageUrl: string) => {
    try {
      // Remove from storage
      const imageRef = ref(storage, imageUrl);
      await deleteObject(imageRef);

      // Remove from form data
      setFormData(prev => ({
        ...prev,
        images: prev.images.filter(img => img !== imageUrl),
      }));

      toast.success('Image removed successfully');
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('Failed to remove image');
    }
  };

  const uploadNewImages = async () => {
    if (!newImages || !user) return [];
    const uploadPromises = Array.from(newImages).map(async (image) => {
      const imageRef = ref(storage, `properties/${user.uid}/${Date.now()}-${image.name}`);
      const snapshot = await uploadBytes(imageRef, image);
      return getDownloadURL(snapshot.ref);
    });
    return Promise.all(uploadPromises);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !propertyId) return;

    setIsSubmitting(true);
    try {
      // Upload new images if any
      const newImageUrls = await uploadNewImages();

      // Update property document
      const propertyData = {
        ...formData,
        price: parseFloat(formData.price),
        size: parseFloat(formData.size),
        images: [...formData.images, ...newImageUrls],
        updatedAt: new Date(),
      };

      await updateDoc(doc(db, 'properties', propertyId), propertyData);
      toast.success('Property updated successfully!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error updating property:', error);
      toast.error('Failed to update property');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading property...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="py-10">
        <header>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900">
              Edit Property
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
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                        className="block w-full rounded-none rounded-l-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
                      className="block w-full rounded-l-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Add a feature"
                    />
                    <button
                      type="button"
                      onClick={handleAddFeature}
                      className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100"
                    >
                      Add
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.features.map((f) => (
                      <span
                        key={f}
                        className="inline-flex items-center rounded-full bg-blue-100 px-3 py-0.5 text-sm font-medium text-blue-800"
                      >
                        {f}
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(f)}
                          className="ml-1.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-blue-600 hover:bg-blue-200 hover:text-blue-900"
                        >
                          <span className="sr-only">Remove {f}</span>
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Existing Images */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Current Images
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                    {formData.images.map((imageUrl, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={imageUrl}
                          alt={`Property image ${index + 1}`}
                          className="h-40 w-full object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(imageUrl)}
                          className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <span className="sr-only">Remove image</span>
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add New Images */}
                <div>
                  <label htmlFor="newImages" className="block text-sm font-medium text-gray-700">
                    Add New Images
                  </label>
                  <input
                    type="file"
                    id="newImages"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isSubmitting ? 'Updating...' : 'Update Property'}
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