'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, increment, addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import toast from 'react-hot-toast';
import { Dialog } from '@headlessui/react';

interface Property {
  id: string;
  title: string;
  description: string;
  location: string;
  price: number;
  type: string;
  size: number;
  sizeUnit: string;
  features: string[];
  status: string;
  images: string[];
  agentId: string;
  agentName: string;
  views: number;
  createdAt: {
    toDate: () => Date;
  };
}

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

const initialFormData: ContactFormData = {
  name: '',
  email: '',
  phone: '',
  message: '',
};

export default function PropertyDetails() {
  const params = useParams();
  const propertyId = params?.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const propertyDoc = await getDoc(doc(db, 'properties', propertyId));

        if (!propertyDoc.exists()) {
          toast.error('Property not found');
          router.push('/listings');
          return;
        }

        const propertyData = {
          id: propertyDoc.id,
          ...propertyDoc.data(),
        } as Property;

        setProperty(propertyData);

        // Try to increment view count if not the owner viewing
        if (user?.uid !== propertyData.agentId) {
          try {
            await updateDoc(doc(db, 'properties', propertyId), {
              views: increment(1)
            });
          } catch (viewError) {
            // Silently handle view count update error
            console.debug('View count not updated:', viewError);
          }
        }
      } catch (error) {
        console.error('Error fetching property:', error);
        toast.error('Failed to load property details');
      } finally {
        setIsLoading(false);
      }
    };

    if (propertyId) {
      fetchProperty();
    }
  }, [propertyId, router, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleContactAgent = () => {
    if (!user) {
      toast.error('Please log in to contact the agent');
      router.push('/login');
      return;
    }
    setIsContactModalOpen(true);
  };

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !property) return;

    try {
      setIsSubmitting(true);

      // Validate form data
      if (!formData.name || !formData.email || !formData.message) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Create inquiry document
      const inquiryData = {
        propertyId: property.id,
        propertyTitle: property.title,
        userId: user.uid,
        userName: formData.name,
        userEmail: formData.email,
        userPhone: formData.phone || '',
        message: formData.message,
        agentId: property.agentId,
        status: 'new',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        agentNotes: '',
      };

      await addDoc(collection(db, 'inquiries'), inquiryData);

      toast.success('Inquiry sent successfully!');
      setIsContactModalOpen(false);
      setFormData(initialFormData);
    } catch (error) {
      console.error('Error sending inquiry:', error);
      toast.error('Failed to send inquiry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreviousImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? (property?.images.length || 1) - 1 : prev - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === (property?.images.length || 1) - 1 ? 0 : prev + 1
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading property details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900">Property not found</h2>
            <p className="mt-2 text-gray-600">The property you&apos;re looking for doesn&apos;t exist or has been removed.</p>
            <button
              onClick={() => router.push('/listings')}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-500"
            >
              Back to Listings
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Image Gallery */}
          <div className="relative h-64 sm:h-96">
            {property.images && property.images.length > 0 ? (
              <>
                <img
                  src={property.images[currentImageIndex]}
                  alt={`${property.title} - Image ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover"
                />
                {property.images.length > 1 && (
                  <div className="absolute inset-0 flex items-center justify-between p-2 sm:p-4">
                    <button
                      onClick={handlePreviousImage}
                      className="bg-black bg-opacity-50 text-white w-8 h-8 sm:w-10 sm:h-10 rounded-full hover:bg-opacity-75 flex items-center justify-center"
                      aria-label="Previous image"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 sm:w-6 sm:h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                      </svg>
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="bg-black bg-opacity-50 text-white w-8 h-8 sm:w-10 sm:h-10 rounded-full hover:bg-opacity-75 flex items-center justify-center"
                      aria-label="Next image"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 sm:w-6 sm:h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  </div>
                )}
                <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                  {currentImageIndex + 1} / {property.images.length}
                </div>
              </>
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400">No images available</span>
              </div>
            )}
          </div>

          {/* Property Details */}
          <div className="p-4 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{property.title}</h1>
                <p className="mt-2 text-base sm:text-lg text-gray-600">{property.location}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  R {property.price.toLocaleString()}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {property.size} {property.sizeUnit}
                </p>
              </div>
            </div>

            {/* Property Type and Status */}
            <div className="mt-6">
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                  {property.type}
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  {property.status}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="mt-6">
              <h2 className="text-xl font-semibold text-gray-900">Description</h2>
              <p className="mt-2 text-gray-600 whitespace-pre-line">{property.description}</p>
            </div>

            {/* Features */}
            {property.features && property.features.length > 0 && (
              <div className="mt-6">
                <h2 className="text-xl font-semibold text-gray-900">Features</h2>
                <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {property.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-gray-600">
                      <svg className="h-5 w-5 text-orange-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Contact Button */}
            <div className="mt-8">
              <button
                onClick={handleContactAgent}
                className="w-full sm:w-auto px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                Contact Agent
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Modal */}
      <Dialog
        open={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-lg w-full rounded-xl bg-white p-4 sm:p-6">
            <Dialog.Title className="text-xl font-semibold text-gray-900">
              Contact Agent
            </Dialog.Title>

            <form onSubmit={handleSubmitInquiry} className="mt-4">
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={4}
                    value={formData.message}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(false)}
                  className="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto inline-flex justify-center rounded-md border border-transparent bg-orange-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}