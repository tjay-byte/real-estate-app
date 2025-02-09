'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/auth';
import { isAgent } from '@/lib/roles';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { Timestamp } from 'firebase/firestore';

interface Property {
  id: string;
  title: string;
  location: string;
  price: number;
  status: 'active' | 'pending' | 'sold';
  type: string;
  createdAt: Timestamp;
  views: number;
  images?: string[];
  size?: number;
  sizeUnit?: string;
}

export default function Dashboard() {
  const { user, userRole } = useAuth();
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [stats, setStats] = useState({
    totalListings: 0,
    activeListings: 0,
    totalViews: 0,
  });

  useEffect(() => {
    if (!user || !isAgent(userRole)) {
      toast.error('Access denied. Agent privileges required.');
      router.push('/');
      return;
    }

    const fetchProperties = async () => {
      try {
        const q = query(
          collection(db, 'properties'),
          where('agentId', '==', user.uid),
        );

        const querySnapshot = await getDocs(q);
        const propertiesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Property[];

        setProperties(propertiesData);

        // Calculate stats
        const stats = propertiesData.reduce(
          (acc, property) => ({
            totalListings: acc.totalListings + 1,
            activeListings: acc.activeListings + (property.status === 'active' ? 1 : 0),
            totalViews: acc.totalViews + (property.views || 0),
          }),
          { totalListings: 0, activeListings: 0, totalViews: 0 }
        );

        setStats(stats);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching properties:', error);
        toast.error('Failed to load properties');
        setIsLoading(false);
      }
    };

    fetchProperties();
  }, [user, userRole, router]);

  const handleAddProperty = () => {
    router.push('/dashboard/properties/new');
  };

  const handleEditProperty = (propertyId: string) => {
    router.push(`/dashboard/properties/${propertyId}/edit`);
  };

  // Filter and sort properties
  const filteredAndSortedProperties = properties
    .filter(property => {
      const matchesSearch =
        property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.location.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = !selectedType || property.type === selectedType;
      const matchesStatus = !selectedStatus || property.status === selectedStatus;
      return matchesSearch && matchesType && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return a.createdAt.seconds - b.createdAt.seconds;
        case 'price-high':
          return b.price - a.price;
        case 'price-low':
          return a.price - b.price;
        case 'views':
          return (b.views || 0) - (a.views || 0);
        case 'newest':
        default:
          return b.createdAt.seconds - a.createdAt.seconds;
      }
    });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard...</p>
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
            <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-orange-400">
              Agent Dashboard
            </h1>
          </div>
        </header>
        <main>
          <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
            {/* Dashboard Stats */}
            <div className="mt-8">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {/* Total Listings Card */}
                <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
                  <dt className="truncate text-base font-semibold text-gray-900">Total Listings</dt>
                  <dd className="mt-2 text-4xl font-bold tracking-tight text-orange-600">
                    {stats.totalListings}
                  </dd>
                </div>

                {/* Active Listings Card */}
                <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
                  <dt className="truncate text-base font-semibold text-gray-900">Active Listings</dt>
                  <dd className="mt-2 text-4xl font-bold tracking-tight text-orange-600">
                    {stats.activeListings}
                  </dd>
                </div>

                {/* Total Views Card */}
                <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
                  <dt className="truncate text-base font-semibold text-gray-900">Total Views</dt>
                  <dd className="mt-2 text-4xl font-bold tracking-tight text-orange-600">
                    {stats.totalViews}
                  </dd>
                </div>
              </div>
            </div>

            {/* Property Management Section */}
            <div className="mt-8">
              <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                  <h2 className="text-xl font-semibold text-gray-900">Your Properties</h2>
                  <p className="mt-2 text-sm text-gray-700">
                    Manage your property listings and track their performance.
                  </p>
                </div>
                <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                  <button
                    type="button"
                    onClick={handleAddProperty}
                    className="block rounded-md bg-orange-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
                  >
                    Add property
                  </button>
                </div>
              </div>

              {/* Property Performance Cards */}
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
                  <dt className="truncate text-base font-semibold text-gray-900">Average Views per Property</dt>
                  <dd className="mt-2 text-4xl font-bold tracking-tight text-orange-600">
                    {properties.length > 0 ? Math.round(stats.totalViews / properties.length) : 0}
                  </dd>
                  <div className="mt-2">
                    <div className="text-base font-medium text-gray-700">
                      Total Views: {stats.totalViews}
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
                  <dt className="truncate text-base font-semibold text-gray-900">Properties by Status</dt>
                  <dd className="mt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">Active</span>
                        <span className="font-bold text-green-600 text-lg">{stats.activeListings}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">Pending</span>
                        <span className="font-bold text-yellow-600 text-lg">
                          {properties.filter(p => p.status === 'pending').length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">Sold</span>
                        <span className="font-bold text-gray-600 text-lg">
                          {properties.filter(p => p.status === 'sold').length}
                        </span>
                      </div>
                    </div>
                  </dd>
                </div>

                <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
                  <dt className="truncate text-base font-semibold text-gray-900">Total Property Value</dt>
                  <dd className="mt-2">
                    <div className="flex flex-col">
                      <div className="flex items-baseline">
                        <span className="text-2xl sm:text-3xl font-bold tracking-tight text-orange-600 truncate">
                          R{properties.reduce((sum, prop) => sum + prop.price, 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-2 text-sm sm:text-base font-medium text-gray-600">
                        Avg: R{properties.length > 0 ? Math.round(properties.reduce((sum, prop) => sum + prop.price, 0) / properties.length).toLocaleString() : 0}
                      </div>
                    </div>
                  </dd>
                </div>

                <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
                  <dt className="truncate text-base font-semibold text-gray-900">Properties by Location</dt>
                  <dd className="mt-2">
                    <div className="space-y-3">
                      {Object.entries(
                        properties.reduce((acc, prop) => {
                          acc[prop.location] = (acc[prop.location] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([location, count]) => (
                        <div key={location} className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700 break-words min-w-0 mr-2">{location}</span>
                          <span className="font-bold text-orange-600 flex-shrink-0">{count}</span>
                        </div>
                      ))}
                    </div>
                  </dd>
                </div>
              </div>

              {/* Properties Table with Enhanced Features */}
              <div className="mt-8 flow-root">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                  <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                      <div className="min-w-full">
                        {/* Table Filters */}
                        <div className="bg-white px-4 py-3 border-b border-gray-200 sm:px-6">
                          <div className="flex flex-wrap gap-4 items-center justify-between">
                            <div className="flex-1 min-w-[200px]">
                              <input
                                type="text"
                                placeholder="Search properties..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-orange-600 sm:text-sm sm:leading-6"
                              />
                            </div>
                            <div className="flex gap-4">
                              <select
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                                className="rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-orange-600 sm:text-sm sm:leading-6"
                              >
                                <option value="">All Types</option>
                                <option value="commercial">Commercial</option>
                                <option value="plot">Plot</option>
                                <option value="farm">Farm</option>
                              </select>
                              <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-orange-600 sm:text-sm sm:leading-6"
                              >
                                <option value="">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="pending">Pending</option>
                                <option value="sold">Sold</option>
                              </select>
                              <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-orange-600 sm:text-sm sm:leading-6"
                              >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="price-high">Price: High to Low</option>
                                <option value="price-low">Price: Low to High</option>
                                <option value="views">Most Viewed</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Table Content */}
                        <table className="min-w-full divide-y divide-gray-300">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                                Title & Details
                              </th>
                              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                Performance
                              </th>
                              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                Status
                              </th>
                              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                Price
                              </th>
                              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                <span className="sr-only">Actions</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {filteredAndSortedProperties.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                  {searchTerm || selectedType || selectedStatus
                                    ? 'No properties found matching your filters.'
                                    : 'No properties found. Click "Add property" to create your first listing.'}
                                </td>
                              </tr>
                            ) : (
                              filteredAndSortedProperties.map((property) => (
                                <tr key={property.id}>
                                  <td className="py-4 pl-4 pr-3 sm:pl-6">
                                    <div className="flex items-center">
                                      <div className="h-16 w-16 flex-shrink-0">
                                        {property.images && property.images[0] ? (
                                          <img
                                            src={property.images[0]}
                                            alt=""
                                            className="h-16 w-16 rounded-md object-cover"
                                          />
                                        ) : (
                                          <div className="h-16 w-16 rounded-md bg-gray-100 flex items-center justify-center">
                                            <BuildingOfficeIcon className="h-8 w-8 text-gray-300" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="ml-4">
                                        <div className="font-medium text-gray-900">{property.title}</div>
                                        <div className="text-gray-500">{property.location}</div>
                                        <div className="text-gray-500 text-sm">
                                          {property.type.charAt(0).toUpperCase() + property.type.slice(1)} • {property.size} {property.sizeUnit}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                    <div className="space-y-1">
                                      <div>
                                        <span className="font-medium">{property.views || 0}</span> views
                                      </div>
                                      <div>
                                        <span className="font-medium">
                                          {/* Calculate days listed */}
                                          {Math.ceil((new Date().getTime() - property.createdAt.toDate().getTime()) / (1000 * 60 * 60 * 24))}
                                        </span> days listed
                                      </div>
                                    </div>
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                                      property.status === 'active'
                                        ? 'bg-green-100 text-green-800'
                                        : property.status === 'pending'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                                    </span>
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                    R {property.price.toLocaleString()}
                                  </td>
                                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                    <div className="flex justify-end gap-2">
                                      <button
                                        onClick={() => router.push(`/properties/${property.id}`)}
                                        className="text-orange-600 hover:text-orange-900"
                                      >
                                        View
                                      </button>
                                      <button
                                        onClick={() => handleEditProperty(property.id)}
                                        className="text-orange-600 hover:text-orange-900"
                                      >
                                        Edit
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}