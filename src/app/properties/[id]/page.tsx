'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, increment, addDoc, collection, Timestamp, query, where, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import Navbar from '@/components/Navbar';
import toast from 'react-hot-toast';
import { Dialog } from '@headlessui/react';
import ImageGallery from '@/components/ImageGallery';
import Image from 'next/image';

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
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [similarProperties, setSimilarProperties] = useState<Property[]>([]);
  const [agentProfile, setAgentProfile] = useState<AgentProfile | null>(null);

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

  useEffect(() => {
    const fetchSimilarProperties = async () => {
      if (!property) return;

      try {
        const q = query(
          collection(db, 'properties'),
          where('type', '==', property.type),
          where('id', '!=', property.id),
          limit(6)
        );

        const querySnapshot = await getDocs(q);
        const properties = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Property[];

        setSimilarProperties(properties);
      } catch (error) {
        console.error('Error fetching similar properties:', error);
      }
    };

    if (property) {
      fetchSimilarProperties();
    }
  }, [property]);

  useEffect(() => {
    const fetchAgentProfile = async () => {
      if (!property?.agentId) return;

      try {
        const agentDoc = await getDoc(doc(db, 'agents', property.agentId));
        if (agentDoc.exists()) {
          setAgentProfile(agentDoc.data() as AgentProfile);
        }
      } catch (error) {
        console.error('Error fetching agent profile:', error);
      }
    };

    fetchAgentProfile();
  }, [property?.agentId]);

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
        {/* Breadcrumb */}
        <nav className="mb-4">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            <li>
              <button onClick={() => router.push('/')} className="hover:text-orange-600">
                Home
              </button>
            </li>
            <li>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </li>
            <li>
              <button onClick={() => router.push('/listings')} className="hover:text-orange-600">
                Listings
              </button>
            </li>
            <li>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </li>
            <li className="text-gray-900 font-medium truncate">{property.title}</li>
          </ol>
        </nav>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Image Gallery */}
          <ImageGallery images={property.images} title={property.title} />

          <div className="p-6 sm:p-8">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              {/* Left Column - Title and Location */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                    {property.type}
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    {property.status}
                  </span>
                </div>
                <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900">{property.title}</h1>
                <div className="mt-2 flex items-start gap-2 text-gray-600">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mt-0.5 flex-shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <p className="text-base sm:text-lg">{property.location}</p>
                </div>
              </div>

              {/* Right Column - Price and Quick Info */}
              <div className="lg:text-right">
                <p className="text-3xl sm:text-4xl font-bold text-gray-900">
                  R {property.price.toLocaleString()}
                </p>
                <div className="mt-2 flex lg:justify-end items-center gap-4 text-gray-600">
                  <div className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                    </svg>
                    <span>{property.size} {property.sizeUnit}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{property.views} views</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Property Details Grid */}
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-900">Property Details</h2>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-600">Property Type</p>
                    <p className="font-medium text-gray-900">{property.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-600">Floor Area</p>
                    <p className="font-medium text-gray-900">{property.size} {property.sizeUnit}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-600">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-600">Listed</p>
                    <p className="font-medium text-gray-900">{new Date(property.createdAt.toDate()).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-900">Description</h2>
              <p className="mt-4 text-gray-600 whitespace-pre-line">{property.description}</p>
            </div>

            {/* Features */}
            {property.features && property.features.length > 0 && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold text-gray-900">Features & Amenities</h2>
                <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {property.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-gray-600">
                      <svg className="h-5 w-5 text-orange-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Agent Information */}
            <div className="mt-8 bg-gray-50 rounded-xl overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Listed By</h2>
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Agent Photo and Basic Info */}
                  <div className="flex items-start gap-4">
                    <div className="h-24 w-24 bg-gray-200 rounded-full flex-shrink-0 overflow-hidden">
                      {agentProfile?.photoURL ? (
                        <Image
                          src={agentProfile.photoURL}
                          alt={agentProfile?.displayName || property.agentName}
                          width={96}
                          height={96}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {agentProfile?.displayName || property.agentName}
                      </h3>
                      <p className="text-gray-600">Real Estate Agent</p>
                      {agentProfile?.experience && (
                        <p className="text-gray-600 mt-1">
                          {agentProfile.experience} years of experience
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Agent Details */}
                  <div className="flex-1 space-y-4">
                    {agentProfile?.bio && (
                      <p className="text-gray-600">{agentProfile.bio}</p>
                    )}

                    {agentProfile?.specialties && agentProfile.specialties.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Specialties</h4>
                        <div className="flex flex-wrap gap-2">
                          {agentProfile.specialties.map((specialty, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-orange-100 text-orange-800 text-sm rounded-full"
                            >
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {agentProfile?.languages && agentProfile.languages.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Languages</h4>
                        <p className="text-gray-600">{agentProfile.languages.join(', ')}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Buttons */}
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleContactAgent}
                    className="flex-1 px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                  >
                    Contact Agent
                  </button>
                  <button
                    onClick={() => router.push(`/agents/${property.agentId}`)}
                    className="flex-1 px-6 py-3 bg-white text-orange-600 font-medium rounded-lg border-2 border-orange-600 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                  >
                    View Full Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Similar Properties */}
        {similarProperties.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900">Similar Properties</h2>
            <p className="mt-2 text-gray-600">Discover more properties like this one</p>

            <div className="mt-6 relative">
              <div className="overflow-x-auto hide-scrollbar">
                <div className="flex gap-6 pb-4">
                  {similarProperties.map((prop) => (
                    <div
                      key={prop.id}
                      className="flex-shrink-0 w-[300px] bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <div className="relative h-[200px]">
                        <Image
                          src={prop.images[0]}
                          alt={prop.title}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute top-2 right-2">
                          <span className="px-2 py-1 text-sm font-medium bg-orange-100 text-orange-800 rounded-full">
                            {prop.type}
                          </span>
                        </div>
                      </div>

                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {prop.title}
                        </h3>
                        <p className="mt-1 text-gray-600 text-sm truncate">
                          {prop.location}
                        </p>
                        <div className="mt-2 flex items-center justify-between">
                          <p className="font-semibold text-gray-900">
                            R {prop.price.toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            {prop.size} {prop.sizeUnit}
                          </p>
                        </div>
                        <button
                          onClick={() => router.push(`/properties/${prop.id}`)}
                          className="mt-3 w-full px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
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

      <style jsx global>{`
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}