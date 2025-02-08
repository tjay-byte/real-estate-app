'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, limit, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Navbar from '@/components/Navbar';
import { BuildingOfficeIcon, MapPinIcon, ChartBarIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

interface Property {
  id: string;
  title: string;
  location: string;
  price: number;
  type: string;
  images: string[];
}

const features = [
  {
    name: 'Prime Locations',
    description: 'Access to exclusive commercial properties in prime locations across Potchefstroom and Klerksdorp.',
    icon: MapPinIcon,
  },
  {
    name: 'Investment Opportunities',
    description: 'High-potential investment opportunities in growing commercial areas and developing regions.',
    icon: ChartBarIcon,
  },
  {
    name: 'Expert Guidance',
    description: 'Professional real estate agents to guide you through every step of your property journey.',
    icon: BuildingOfficeIcon,
  },
  {
    name: 'Secure Transactions',
    description: 'Safe and secure property transactions with full legal compliance and documentation.',
    icon: ShieldCheckIcon,
  },
];

const testimonials = [
  {
    content: "Working with #teamvangass Properties was an excellent experience. They helped me find the perfect commercial plot for my business expansion.",
    author: "John Smith",
    role: "Business Owner",
  },
  {
    content: "The team's knowledge of the local market is outstanding. They made the entire process smooth and hassle-free.",
    author: "Sarah Johnson",
    role: "Property Investor",
  },
  {
    content: "I highly recommend their services. They found us an ideal location that perfectly matched our requirements.",
    author: "Michael Brown",
    role: "Entrepreneur",
  },
];

export default function Home() {
  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedProperties = async () => {
      try {
        const q = query(
          collection(db, 'properties'),
          orderBy('createdAt', 'desc'),
          limit(3)
        );
        const querySnapshot = await getDocs(q);
        const properties = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Property[];
        setFeaturedProperties(properties);
      } catch (error) {
        console.error('Error fetching featured properties:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeaturedProperties();
  }, []);

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section */}
      <div className="relative">
        <div className="absolute inset-0">
          <img
            className="h-full w-full object-cover"
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2070&q=80"
            alt="Commercial real estate"
          />
          <div className="absolute inset-0 bg-gray-900/70 mix-blend-multiply" />
        </div>
        <div className="relative">
          <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
                Your Gateway to Premium Commercial Properties
              </h1>
              <p className="mt-6 text-lg leading-8 text-gray-300">
                Discover exceptional commercial land, plots, and farms in Potchefstroom, Klerksdorp, and surrounding areas. Your next business opportunity awaits.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link
                  href="/listings"
                  className="rounded-md bg-orange-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
                >
                  View Listings
                </Link>
                <Link href="/contact" className="text-sm font-semibold leading-6 text-white">
                  Contact Us <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-orange-600">Why Choose Us</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need for your commercial property journey
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              We offer comprehensive real estate services tailored to your business needs, ensuring you find the perfect commercial property.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-4">
              {features.map((feature) => (
                <div key={feature.name} className="flex flex-col">
                  <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                    <feature.icon className="h-5 w-5 flex-none text-orange-600" aria-hidden="true" />
                    {feature.name}
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                    <p className="flex-auto">{feature.description}</p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Featured Properties Section */}
      <div className="bg-gray-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Featured Properties</h2>
            <p className="mt-2 text-lg leading-8 text-gray-600">
              Explore our handpicked selection of prime commercial properties.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {isLoading ? (
              <div className="col-span-3 flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600" />
              </div>
            ) : featuredProperties.length > 0 ? (
              featuredProperties.map((property) => (
                <div key={property.id} className="flex flex-col items-start justify-between bg-white p-6 rounded-lg shadow-lg">
                  <div className="relative w-full">
                    <div className="aspect-[16/9] w-full overflow-hidden rounded-lg">
                      {property.images && property.images[0] ? (
                        <img
                          src={property.images[0]}
                          alt={property.title}
                          className="h-48 w-full object-cover"
                        />
                      ) : (
                        <div className="h-48 bg-gray-200 flex items-center justify-center">
                          <BuildingOfficeIcon className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                      <h3 className="text-lg font-semibold leading-6 text-gray-900">
                        {property.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        {property.location}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-orange-600">
                        R {property.price?.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/properties/${property.id}`}
                    className="mt-4 text-sm font-semibold leading-6 text-orange-600 hover:text-orange-500"
                  >
                    View Details <span aria-hidden="true">→</span>
                  </Link>
                </div>
              ))
            ) : (
              <div className="col-span-3 text-center text-gray-500">
                No featured properties available at the moment.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-lg font-semibold leading-8 tracking-tight text-orange-600">Testimonials</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              What Our Clients Say
            </p>
          </div>
          <div className="mx-auto mt-16 flow-root max-w-2xl sm:mt-20 lg:mx-0 lg:max-w-none">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="flex flex-col justify-between bg-white p-8 shadow-lg rounded-lg">
                  <blockquote className="text-lg text-gray-600 leading-relaxed">
                    &ldquo;{testimonial.content}&rdquo;
                  </blockquote>
                  <div className="mt-6">
                    <p className="font-semibold text-gray-900">{testimonial.author}</p>
                    <p className="text-sm text-gray-600">{testimonial.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative isolate">
        <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Ready to Find Your Next Property?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-600">
              Let us help you find the perfect commercial property for your business. Contact our team of experts today.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/contact"
                className="rounded-md bg-orange-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
              >
                Contact Us
              </Link>
              <Link
                href="/listings"
                className="text-sm font-semibold leading-6 text-gray-900"
              >
                Browse Listings <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
    </div>
    </main>
  );
}
