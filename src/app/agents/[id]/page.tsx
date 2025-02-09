'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Navbar from '@/components/Navbar';
import Image from 'next/image';
import toast from 'react-hot-toast';

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

interface Property {
  id: string;
  title: string;
  location: string;
  price: number;
  type: string;
  size: number;
  sizeUnit: string;
  status: string;
  images: string[];
  views: number;
}

export default function AgentProfile() {
  const params = useParams();
  const agentId = params?.id as string;
  const router = useRouter();
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAgentProfile = async () => {
      try {
        const agentDoc = await getDoc(doc(db, 'agents', agentId));
        if (!agentDoc.exists()) {
          toast.error('Agent not found');
          router.push('/');
          return;
        }
        setAgent(agentDoc.data() as AgentProfile);

        // Fetch agent's properties
        const propertiesQuery = query(
          collection(db, 'properties'),
          where('agentId', '==', agentId),
          where('status', '==', 'active')
        );

        const propertiesSnapshot = await getDocs(propertiesQuery);
        const propertiesData = propertiesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Property[];

        setProperties(propertiesData);
      } catch (error) {
        console.error('Error fetching agent profile:', error);
        toast.error('Failed to load agent profile');
      } finally {
        setIsLoading(false);
      }
    };

    if (agentId) {
      fetchAgentProfile();
    }
  }, [agentId, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading agent profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-900">Agent not found</h2>
            <p className="mt-2 text-gray-600">The agent profile you're looking for doesn't exist.</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-500"
            >
              Back to Home
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
        {/* Agent Profile Header */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="relative h-48 bg-gradient-to-r from-orange-600 to-orange-400">
            <div className="absolute -bottom-16 left-8">
              <div className="h-32 w-32 rounded-full border-4 border-white overflow-hidden bg-white">
                {agent.photoURL ? (
                  <Image
                    src={agent.photoURL}
                    alt={agent.displayName}
                    width={128}
                    height={128}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-gray-100">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-20 pb-8 px-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{agent.displayName}</h1>
                <p className="mt-1 text-lg text-gray-600">Real Estate Agent</p>
                {agent.experience && (
                  <p className="mt-1 text-gray-600">{agent.experience} years of experience</p>
                )}
              </div>
              <div className="mt-4 lg:mt-0 flex flex-col sm:flex-row gap-3">
                {agent.phone && (
                  <a
                    href={`tel:${agent.phone}`}
                    className="inline-flex items-center justify-center px-6 py-3 border border-orange-600 text-orange-600 font-medium rounded-lg hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                    Call Agent
                  </a>
                )}
                {agent.email && (
                  <a
                    href={`mailto:${agent.email}`}
                    className="inline-flex items-center justify-center px-6 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                    Email Agent
                  </a>
                )}
              </div>
            </div>

            {/* Agent Details */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column - Bio and Specialties */}
              <div className="lg:col-span-2 space-y-6">
                {agent.bio && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">About Me</h2>
                    <p className="mt-4 text-gray-600 whitespace-pre-line">{agent.bio}</p>
                  </div>
                )}

                {agent.specialties && agent.specialties.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Specialties</h2>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {agent.specialties.map((specialty, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Additional Info */}
              <div className="space-y-6">
                {agent.languages && agent.languages.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Languages</h2>
                    <div className="mt-4 space-y-2">
                      {agent.languages.map((language, index) => (
                        <div key={index} className="flex items-center gap-2 text-gray-600">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-orange-500">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
                          </svg>
                          {language}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {agent.certifications && agent.certifications.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Certifications</h2>
                    <div className="mt-4 space-y-2">
                      {agent.certifications.map((certification, index) => (
                        <div key={index} className="flex items-center gap-2 text-gray-600">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-orange-500">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                          </svg>
                          {certification}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Agent's Properties */}
        {properties.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900">Active Listings</h2>
            <p className="mt-2 text-gray-600">Properties currently listed by {agent.displayName}</p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => (
                <div
                  key={property.id}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="relative h-48">
                    <Image
                      src={property.images[0]}
                      alt={property.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-1 text-sm font-medium bg-orange-100 text-orange-800 rounded-full">
                        {property.type}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 truncate">{property.title}</h3>
                    <p className="mt-1 text-gray-600 text-sm truncate">{property.location}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="font-semibold text-gray-900">
                        R {property.price.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">
                        {property.size} {property.sizeUnit}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{property.views} views</span>
                      </div>
                      <button
                        onClick={() => router.push(`/properties/${property.id}`)}
                        className="text-orange-600 hover:text-orange-700 font-medium"
                      >
                        View Details →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}