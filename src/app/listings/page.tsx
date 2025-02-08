'use client';

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Navbar from '@/components/Navbar';
import toast from 'react-hot-toast';

interface Property {
  id: string;
  title: string;
  location: string;
  price: number;
  type: string;
  status: string;
  images: string[];
}

export default function Listings() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedType, setSelectedType] = useState('');

  useEffect(() => {
    // Create a query to fetch all active properties
    const q = query(
      collection(db, 'properties'),
      orderBy('createdAt', 'desc')
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const propertyList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Property[];
        setProperties(propertyList);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching properties:', error);
        toast.error('Failed to load properties');
        setIsLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Filter properties based on search term and filters
  const filteredProperties = properties.filter(property => {
    const matchesSearch =
      property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesLocation = !selectedLocation || property.location === selectedLocation;
    const matchesType = !selectedType || property.type === selectedType;

    return matchesSearch && matchesLocation && matchesType;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading properties...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Search and Filter Section */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="w-full md:w-96">
            <label htmlFor="search" className="sr-only">
              Search properties
            </label>
            <div className="relative">
              <input
                type="text"
                name="search"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full rounded-md border-0 py-1.5 pl-4 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-orange-600 sm:text-sm sm:leading-6"
                placeholder="Search properties..."
              />
            </div>
          </div>

          <div className="flex gap-4">
            <select
              id="location"
              name="location"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-orange-600 sm:text-sm sm:leading-6"
            >
              <option value="">All Locations</option>
              <option value="Potchefstroom">Potchefstroom</option>
              <option value="Klerksdorp">Klerksdorp</option>
              <option value="Other">Other</option>
            </select>

            <select
              id="propertyType"
              name="propertyType"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-orange-600 sm:text-sm sm:leading-6"
            >
              <option value="">All Types</option>
              <option value="commercial">Commercial Land</option>
              <option value="plot">Plot</option>
              <option value="farm">Farm</option>
            </select>
          </div>
        </div>
      </div>

      {/* Properties Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {filteredProperties.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No properties found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
            {filteredProperties.map((property) => (
              <div key={property.id} className="group relative bg-white p-4 rounded-lg shadow-sm">
                <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-lg bg-gray-200">
                  {property.images && property.images.length > 0 ? (
                    <img
                      src={property.images[0]}
                      alt={property.title}
                      className="h-48 w-full object-cover"
                    />
                  ) : (
                    <div className="h-48 bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-400">No image available</span>
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {property.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">{property.location}</p>
                  <p className="mt-1 text-lg font-medium text-gray-900">
                    R {property.price?.toLocaleString()}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                      {property.type.charAt(0).toUpperCase() + property.type.slice(1)}
                    </span>
                    <button
                      onClick={() => window.location.href = `/properties/${property.id}`}
                      className="text-sm font-semibold text-orange-600 hover:text-orange-500"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}