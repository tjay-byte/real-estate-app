'use client';

import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Navbar from '@/components/Navbar';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';

interface Property {
  id: string;
  title: string;
  location: string;
  price: number;
  type: string;
  status: string;
  images: string[];
  size?: number;
  sizeUnit?: string;
  features?: string[];
  createdAt: { seconds: number };
  savedBy?: string[];
}

export default function Listings() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [isFeatureFilterVisible, setIsFeatureFilterVisible] = useState(false);
  const [availableFeatures, setAvailableFeatures] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState({
    min: '',
    max: ''
  });
  const [sizeRange, setSizeRange] = useState({
    min: '',
    max: '',
    unit: 'sqm'
  });
  const [isPriceFilterVisible, setIsPriceFilterVisible] = useState(false);
  const [isSizeFilterVisible, setIsSizeFilterVisible] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [isAllFiltersVisible, setIsAllFiltersVisible] = useState(false);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const { user } = useAuth();

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

        // Extract unique features from all properties
        const features = new Set<string>();
        propertyList.forEach(property => {
          property.features?.forEach(feature => {
            features.add(feature);
          });
        });
        setAvailableFeatures(Array.from(features).sort());

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

  // Convert size to selected unit
  const convertSize = (size: number, fromUnit: string, toUnit: string): number => {
    if (fromUnit === toUnit) return size;

    // Convert to square meters first
    let inSqm = size;
    if (fromUnit === 'hectares') inSqm = size * 10000;
    if (fromUnit === 'acres') inSqm = size * 4046.86;

    // Convert from square meters to target unit
    if (toUnit === 'sqm') return inSqm;
    if (toUnit === 'hectares') return inSqm / 10000;
    if (toUnit === 'acres') return inSqm / 4046.86;

    return size;
  };

  // Add function to handle saving/unsaving properties
  const handleSaveProperty = async (propertyId: string, isSaved: boolean) => {
    if (!user) {
      toast.error('Please log in to save properties');
      return;
    }

    try {
      const propertyRef = doc(db, 'properties', propertyId);
      const propertyDoc = await getDoc(propertyRef);

      if (!propertyDoc.exists()) {
        toast.error('Property not found');
        return;
      }

      const propertyData = propertyDoc.data();
      const currentSavedBy = propertyData.savedBy || [];

      if (isSaved) {
        // Remove user from savedBy array
        await updateDoc(propertyRef, {
          savedBy: currentSavedBy.filter((uid: string) => uid !== user.uid)
        });
        toast.success('Property removed from saved listings');
      } else {
        // Add user to savedBy array
        await updateDoc(propertyRef, {
          savedBy: [...currentSavedBy, user.uid]
        });
        toast.success('Property saved to your listings');
      }
    } catch (error) {
      console.error('Error saving property:', error);
      toast.error('Failed to save property');
    }
  };

  // Update the filter properties function
  const filteredProperties = properties.filter(property => {
    const matchesSearch =
      property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesLocation = !selectedLocation || property.location === selectedLocation;
    const matchesType = !selectedType || property.type === selectedType;

    const matchesPrice = (
      (!priceRange.min || property.price >= Number(priceRange.min)) &&
      (!priceRange.max || property.price <= Number(priceRange.max))
    );

    const matchesSize = !property.size ? true : (
      (!sizeRange.min || convertSize(property.size, property.sizeUnit || 'sqm', sizeRange.unit) >= Number(sizeRange.min)) &&
      (!sizeRange.max || convertSize(property.size, property.sizeUnit || 'sqm', sizeRange.unit) <= Number(sizeRange.max))
    );

    const matchesFeatures = selectedFeatures.length === 0 ||
      selectedFeatures.every(feature => property.features?.includes(feature));

    const matchesSaved = !showSavedOnly || (user && property.savedBy?.includes(user.uid));

    return matchesSearch && matchesLocation && matchesType && matchesPrice && matchesSize && matchesFeatures && matchesSaved;
  });

  // Sort properties
  const sortProperties = (properties: Property[]) => {
    return [...properties].sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'size-small':
          const sizeA = a.size ? convertSize(a.size, a.sizeUnit || 'sqm', 'sqm') : 0;
          const sizeB = b.size ? convertSize(b.size, b.sizeUnit || 'sqm', 'sqm') : 0;
          return sizeA - sizeB;
        case 'size-large':
          const sizeLargeA = a.size ? convertSize(a.size, a.sizeUnit || 'sqm', 'sqm') : 0;
          const sizeLargeB = b.size ? convertSize(b.size, b.sizeUnit || 'sqm', 'sqm') : 0;
          return sizeLargeB - sizeLargeA;
        case 'oldest':
          return a.createdAt.seconds - b.createdAt.seconds;
        case 'newest':
        default:
          return b.createdAt.seconds - a.createdAt.seconds;
      }
    });
  };

  // Apply both filtering and sorting
  const filteredAndSortedProperties = sortProperties(filteredProperties);

  // Handle price range change
  const handlePriceRangeChange = (type: 'min' | 'max', value: string) => {
    // Only allow numbers and empty string
    if (value === '' || /^\d*$/.test(value)) {
      setPriceRange(prev => ({
        ...prev,
        [type]: value
      }));
    }
  };

  // Clear price filter
  const clearPriceFilter = () => {
    setPriceRange({ min: '', max: '' });
  };

  // Handle size range change
  const handleSizeRangeChange = (type: 'min' | 'max' | 'unit', value: string) => {
    if (type === 'unit') {
      setSizeRange(prev => ({ ...prev, unit: value }));
    } else if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setSizeRange(prev => ({ ...prev, [type]: value }));
    }
  };

  // Clear size filter
  const clearSizeFilter = () => {
    setSizeRange({ min: '', max: '', unit: 'sqm' });
  };

  // Handle feature selection
  const toggleFeature = (feature: string) => {
    setSelectedFeatures(prev =>
      prev.includes(feature)
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  // Clear feature filter
  const clearFeatureFilter = () => {
    setSelectedFeatures([]);
  };

  // Function to collapse all filters
  const collapseAllFilters = () => {
    setIsPriceFilterVisible(false);
    setIsSizeFilterVisible(false);
    setIsFeatureFilterVisible(false);
  };

  // Function to toggle all filters
  const toggleAllFilters = () => {
    if (isAllFiltersVisible) {
      collapseAllFilters();
    }
    setIsAllFiltersVisible(!isAllFiltersVisible);
  };

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
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {/* Main Search Bar with Icon */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              name="search"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full rounded-lg border-0 py-3 pl-10 pr-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-orange-600 sm:text-sm sm:leading-6"
              placeholder="Search by property title or location..."
            />
          </div>

          {/* Basic Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <select
                id="location"
                name="location"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="block w-full rounded-lg border-0 py-2.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-orange-600 sm:text-sm sm:leading-6"
              >
                <option value="">All Locations</option>
                <option value="Potchefstroom">Potchefstroom</option>
                <option value="Klerksdorp">Klerksdorp</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="relative">
              <label htmlFor="propertyType" className="block text-sm font-medium text-gray-700 mb-1">
                Property Type
              </label>
              <select
                id="propertyType"
                name="propertyType"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="block w-full rounded-lg border-0 py-2.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-orange-600 sm:text-sm sm:leading-6"
              >
                <option value="">All Types</option>
                <option value="commercial">Commercial Land</option>
                <option value="plot">Plot</option>
                <option value="farm">Farm</option>
              </select>
            </div>

            <div className="relative">
              <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                id="sortBy"
                name="sortBy"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="block w-full rounded-lg border-0 py-2.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-orange-600 sm:text-sm sm:leading-6"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="size-small">Size: Small to Large</option>
                <option value="size-large">Size: Large to Small</option>
              </select>
            </div>
          </div>

          {/* Advanced Filters Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex flex-wrap gap-4">
              <button
                type="button"
                onClick={() => setIsPriceFilterVisible(!isPriceFilterVisible)}
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                  isPriceFilterVisible
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-2">{isPriceFilterVisible ? '−' : '+'}</span>
                Price Range
              </button>

              <button
                type="button"
                onClick={() => setIsSizeFilterVisible(!isSizeFilterVisible)}
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                  isSizeFilterVisible
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-2">{isSizeFilterVisible ? '−' : '+'}</span>
                Size Range
              </button>

              <button
                type="button"
                onClick={() => setIsFeatureFilterVisible(!isFeatureFilterVisible)}
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                  isFeatureFilterVisible
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-2">{isFeatureFilterVisible ? '−' : '+'}</span>
                Features
              </button>

              <button
                type="button"
                onClick={() => setShowSavedOnly(!showSavedOnly)}
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                  showSavedOnly
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-2">
                  <svg className="w-4 h-4" fill={showSavedOnly ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </span>
                Saved Properties
              </button>

              {(isPriceFilterVisible || isSizeFilterVisible || isFeatureFilterVisible) && (
                <button
                  type="button"
                  onClick={collapseAllFilters}
                  className="ml-auto text-sm font-medium text-orange-600 hover:text-orange-500"
                >
                  Collapse All
                </button>
              )}
            </div>

            {/* Filter Panels */}
            {isPriceFilterVisible && (
              <div className="mt-4 bg-gray-50 rounded-lg p-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-900">Price Range</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="min-price" className="block text-sm text-gray-600">
                        Minimum Price (R)
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <input
                          type="text"
                          id="min-price"
                          value={priceRange.min}
                          onChange={(e) => handlePriceRangeChange('min', e.target.value)}
                          className="block w-full rounded-md border-0 py-2.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-orange-600 sm:text-sm sm:leading-6"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="max-price" className="block text-sm text-gray-600">
                        Maximum Price (R)
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <input
                          type="text"
                          id="max-price"
                          value={priceRange.max}
                          onChange={(e) => handlePriceRangeChange('max', e.target.value)}
                          className="block w-full rounded-md border-0 py-2.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-orange-600 sm:text-sm sm:leading-6"
                          placeholder="No limit"
                        />
                      </div>
                    </div>
                  </div>
                  {(priceRange.min || priceRange.max) && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={clearPriceFilter}
                        className="text-sm font-medium text-orange-600 hover:text-orange-500"
                      >
                        Clear Price Filter
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {isSizeFilterVisible && (
              <div className="mt-4 bg-gray-50 rounded-lg p-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-900">Size Range</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="min-size" className="block text-sm text-gray-600">
                        Minimum Size
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <input
                          type="text"
                          id="min-size"
                          value={sizeRange.min}
                          onChange={(e) => handleSizeRangeChange('min', e.target.value)}
                          className="block w-full rounded-md border-0 py-2.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-orange-600 sm:text-sm sm:leading-6"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="max-size" className="block text-sm text-gray-600">
                        Maximum Size
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <input
                          type="text"
                          id="max-size"
                          value={sizeRange.max}
                          onChange={(e) => handleSizeRangeChange('max', e.target.value)}
                          className="block w-full rounded-md border-0 py-2.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-orange-600 sm:text-sm sm:leading-6"
                          placeholder="No limit"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="size-unit" className="block text-sm text-gray-600">
                        Unit
                      </label>
                      <select
                        id="size-unit"
                        value={sizeRange.unit}
                        onChange={(e) => handleSizeRangeChange('unit', e.target.value)}
                        className="mt-1 block w-full rounded-md border-0 py-2.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-orange-600 sm:text-sm sm:leading-6"
                      >
                        <option value="sqm">Square Meters (m²)</option>
                        <option value="hectares">Hectares (ha)</option>
                        <option value="acres">Acres</option>
                      </select>
                    </div>
                  </div>
                  {(sizeRange.min || sizeRange.max) && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={clearSizeFilter}
                        className="text-sm font-medium text-orange-600 hover:text-orange-500"
                      >
                        Clear Size Filter
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {isFeatureFilterVisible && (
              <div className="mt-4 bg-gray-50 rounded-lg p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900">Property Features</h3>
                    {selectedFeatures.length > 0 && (
                      <button
                        type="button"
                        onClick={clearFeatureFilter}
                        className="text-sm font-medium text-orange-600 hover:text-orange-500"
                      >
                        Clear All Features
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {availableFeatures.map((feature) => (
                      <label
                        key={feature}
                        className={`relative flex items-center px-4 py-2 rounded-lg cursor-pointer ${
                          selectedFeatures.includes(feature)
                            ? 'bg-orange-100 ring-2 ring-orange-600'
                            : 'bg-white hover:bg-gray-100 ring-1 ring-gray-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFeatures.includes(feature)}
                          onChange={() => toggleFeature(feature)}
                          className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-600"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-900">{feature}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Active Filters Display */}
          {(priceRange.min || priceRange.max || sizeRange.min || sizeRange.max || selectedFeatures.length > 0) && (
            <div className="border-t border-gray-200 pt-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Active Filters:</span>
                <div className="flex flex-wrap gap-2">
                  {(priceRange.min || priceRange.max) && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 text-sm font-medium">
                      <span>
                        Price: {priceRange.min ? `R${Number(priceRange.min).toLocaleString()}` : 'R0'}
                        {' - '}
                        {priceRange.max ? `R${Number(priceRange.max).toLocaleString()}` : 'No limit'}
                      </span>
                      <button
                        onClick={clearPriceFilter}
                        className="ml-1 hover:text-orange-800"
                        aria-label="Clear price filter"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {(sizeRange.min || sizeRange.max) && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 text-sm font-medium">
                      <span>
                        Size: {sizeRange.min || '0'} - {sizeRange.max || 'No limit'} {sizeRange.unit === 'sqm' ? 'm²' : sizeRange.unit}
                      </span>
                      <button
                        onClick={clearSizeFilter}
                        className="ml-1 hover:text-orange-800"
                        aria-label="Clear size filter"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {selectedFeatures.map((feature) => (
                    <span
                      key={feature}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-orange-100 text-orange-700 text-sm font-medium"
                    >
                      <span>{feature}</span>
                      <button
                        onClick={() => toggleFeature(feature)}
                        className="ml-1 hover:text-orange-800"
                        aria-label={`Remove ${feature} filter`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Properties Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {filteredAndSortedProperties.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No properties found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
            {filteredAndSortedProperties.map((property) => (
              <div
                key={property.id}
                className="group relative bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden flex flex-col h-full"
              >
                {/* Image Section with Gallery Preview */}
                <div className="relative aspect-[4/3] overflow-hidden flex-shrink-0">
                  <img
                    src={property.images?.[0] || '/placeholder-property.jpg'}
                    alt={property.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Status Badge */}
                  <div className="absolute top-4 left-4">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium
                      ${property.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : property.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'}`}
                    >
                      {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                    </span>
                  </div>
                  {/* Image Count Indicator */}
                  {property.images && property.images.length > 1 && (
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-1">
                      {property.images.slice(0, 4).map((_, index) => (
                        <span
                          key={index}
                          className="w-1.5 h-1.5 rounded-full bg-white opacity-75"
                        />
                      ))}
                      {property.images.length > 4 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white opacity-75" />
                      )}
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <div className="p-4 flex flex-col flex-grow">
                  {/* Title and Price Row */}
                  <div className="mb-3">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-semibold text-gray-900 leading-tight line-clamp-2">
                        {property.title}
                      </h3>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleSaveProperty(property.id, property.savedBy?.includes(user?.uid || '') || false);
                        }}
                        className="ml-2 p-1.5 rounded-full hover:bg-gray-100 transition-colors duration-200 flex-shrink-0"
                        aria-label={property.savedBy?.includes(user?.uid || '') ? "Unsave property" : "Save property"}
                      >
                        <svg
                          className={`w-5 h-5 ${
                            property.savedBy?.includes(user?.uid || '')
                              ? 'text-orange-600 fill-current'
                              : 'text-gray-400 hover:text-orange-600'
                          }`}
                          fill={property.savedBy?.includes(user?.uid || '') ? "currentColor" : "none"}
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                          />
                        </svg>
                      </button>
                    </div>
                    <p className="mt-1 text-2xl font-bold text-orange-600">
                      R {property.price?.toLocaleString()}
                    </p>
                  </div>

                  {/* Property Details */}
                  <div className="space-y-3 flex-grow">
                    {/* Location */}
                    <div className="flex items-center text-gray-600">
                      <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm">{property.location}</span>
                    </div>

                    {/* Size and Type */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-gray-600">
                        <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                        <span>{property.size} {property.sizeUnit}</span>
                      </div>
                      <span className="inline-flex items-center rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20">
                        {property.type.charAt(0).toUpperCase() + property.type.slice(1)}
                      </span>
                    </div>

                    {/* Features Preview */}
                    {property.features && property.features.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {property.features.slice(0, 3).map((feature, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-xs text-gray-600"
                          >
                            {feature}
                          </span>
                        ))}
                        {property.features.length > 3 && (
                          <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-xs text-gray-600">
                            +{property.features.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* View Details Button */}
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => window.location.href = `/properties/${property.id}`}
                      className="w-full text-center px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition-colors duration-200"
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