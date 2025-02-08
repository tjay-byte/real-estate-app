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
      <div className="flex">
        {/* Dashboard Navigation */}
        <div className="hidden sm:flex sm:w-64 sm:flex-col sm:fixed sm:inset-y-0 sm:pt-16">
          <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4">
            <nav className="flex flex-1 flex-col">
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

        {/* Main Content */}
        <div className="sm:pl-64 flex-1">
          <div className="py-10">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}