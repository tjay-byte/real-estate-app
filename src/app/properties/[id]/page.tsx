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

        // Increment view count if not the owner viewing
        if (user?.uid !== propertyData.agentId) {
          await updateDoc(doc(db, 'properties', propertyId), {
            views: increment(1)
          });
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Image Gallery */}
          <div className="relative h-96">
            {property.images && property.images.length > 0 ? (
              <>
                <img
                  src={property.images[currentImageIndex]}
                  alt={`${property.title} - Image ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover"
                />
                {property.images.length > 1 && (
                  <div className="absolute inset-0 flex items-center justify-between p-4">
                    <button
                      onClick={handlePreviousImage}
                      className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
                    >
                      ←
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75"
                    >
                      →
                    </button>
                  </div>
                )}
                <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
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
          <div className="p-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{property.title}</h1>
                <p className="mt-2 text-lg text-gray-600">{property.location}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">
                  R {property.price.toLocaleString()}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {property.size} {property.sizeUnit}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-xl font-semibold text-gray-900">Description</h2>
              <p className="mt-2 text-gray-600 whitespace-pre-line">{property.description}</p>
            </div>

            <div className="mt-6">
              <h2 className="text-xl font-semibold text-gray-900">Features</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {property.features.map((feature, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center rounded-full bg-orange-100 px-3 py-0.5 text-sm font-medium text-orange-800"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <h2 className="text-xl font-semibold text-gray-900">Property Details</h2>
              <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Property Type</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {property.type.charAt(0).toUpperCase() + property.type.slice(1)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Listed By</dt>
                  <dd className="mt-1 text-sm text-gray-900">{property.agentName}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Views</dt>
                  <dd className="mt-1 text-sm text-gray-900">{property.views}</dd>
                </div>
              </dl>
            </div>

            {/* Contact Agent Button */}
            <div className="mt-8 flex justify-end">
              <button
                onClick={handleContactAgent}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                Contact Agent
              </button>
            </div>
          </div>
        </div>

        {/* Contact Modal */}
        <Dialog
          open={isContactModalOpen}
          onClose={() => setIsContactModalOpen(false)}
          className="relative z-50"
        >
          {/* Background overlay */}
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

          {/* Modal container */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="mx-auto max-w-lg rounded-lg bg-white p-6 shadow-xl">
              <Dialog.Title className="text-lg font-medium leading-6 text-gray-900">
                Contact Agent about {property?.title}
              </Dialog.Title>

              <form onSubmit={handleSubmitInquiry} className="mt-4 space-y-4">
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
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-orange-500 sm:text-sm"
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
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-orange-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-orange-500 sm:text-sm"
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
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-orange-500 sm:text-sm text-gray-900"
                    placeholder="Hello, I would like to inquire about this property. I'm particularly interested in viewing it and would appreciate more information about..."
                  />
                </div>

                <div className="mt-6 flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setIsContactModalOpen(false)}
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`inline-flex justify-center rounded-md border border-transparent bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                      isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </form>
            </Dialog.Panel>
          </div>
        </Dialog>
      </div>
    </div>
  );
}