'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { HomeIcon, InboxIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/lib/auth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAgent } from '@/lib/roles';

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: HomeIcon },
  { name: 'Inquiries', href: '/dashboard/inquiries', icon: InboxIcon },
  { name: 'Profile', href: '/dashboard/profile', icon: UserCircleIcon },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, userRole } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect if not an agent
    if (!user || !isAgent(userRole)) {
      router.push('/');
    }
  }, [user, userRole, router]);

  if (!user || !isAgent(userRole)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Checking permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Layout - Unchanged */}
      <div className="hidden sm:block">
        <div className="flex">
          {/* Dashboard Navigation */}
          <div className="hidden sm:flex sm:w-64 sm:flex-col sm:fixed sm:inset-y-0">
            <div className="flex flex-col flex-grow bg-white overflow-y-auto border-r border-gray-200">
              {/* Logo Section */}
              <div className="flex items-center h-16 flex-shrink-0 px-4 border-b border-gray-200">
                <Link href="/dashboard" className="flex items-center">
                  <span className="text-orange-600 font-bold text-lg">#teamvangass</span>
                </Link>
              </div>
              <div className="flex-grow flex flex-col">
                <nav className="flex-1 px-4 pb-4 space-y-1 mt-4">
                  <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    <li>
                      <ul role="list" className="-mx-2 space-y-1">
                        {navigation.map((item) => {
                          const isActive = pathname === item.href;
                          return (
                            <li key={item.name}>
                              <Link
                                href={item.href}
                                className={`
                                  group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6
                                  ${isActive
                                    ? 'bg-orange-50 text-orange-600'
                                    : 'text-gray-700 hover:text-orange-600 hover:bg-orange-50'
                                  }
                                `}
                              >
                                <item.icon
                                  className={`h-6 w-6 shrink-0 ${
                                    isActive ? 'text-orange-600' : 'text-gray-400 group-hover:text-orange-600'
                                  }`}
                                  aria-hidden="true"
                                />
                                {item.name}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 sm:pl-64">
            <div className="py-6 px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="sm:hidden">
        <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4">
            <Link href="/dashboard" className="flex items-center">
              <span className="text-orange-600 font-bold text-lg">#teamvangass</span>
            </Link>
          </div>
        </div>

        {/* Mobile Main Content */}
        <div className="pt-16 pb-16">
          <div className="px-4 py-4">
            {children}
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
          <nav className="flex justify-around p-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex flex-col items-center p-2 rounded-md
                    ${isActive
                      ? 'text-orange-600'
                      : 'text-gray-700 hover:text-orange-600'
                    }
                  `}
                >
                  <item.icon
                    className={`h-6 w-6 ${
                      isActive ? 'text-orange-600' : 'text-gray-400'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="text-xs mt-1">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}