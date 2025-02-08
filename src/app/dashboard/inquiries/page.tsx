'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { isAgent } from '@/lib/roles';
import {
  collection,
  query,
  where,
  orderBy,
  updateDoc,
  doc,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';

interface Inquiry {
  id: string;
  propertyId: string;
  propertyTitle: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  message: string;
  status: 'new' | 'contacted' | 'closed';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  agentNotes?: string;
  agentId: string;
}

export default function InquiriesManagement() {
  const { user, userRole } = useAuth();
  const router = useRouter();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [agentNotes, setAgentNotes] = useState('');

  useEffect(() => {
    if (!user || !isAgent(userRole)) {
      toast.error('Access denied. Agent privileges required.');
      router.push('/');
      return;
    }

    // Set up real-time listener for inquiries
    const inquiriesQuery = query(
      collection(db, 'inquiries'),
      where('agentId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      inquiriesQuery,
      (snapshot) => {
        const inquiriesList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Inquiry[];
        setInquiries(inquiriesList);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching inquiries:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    // Cleanup subscription
    return () => unsubscribe();
  }, [user, userRole, router]);

  // Filter and sort inquiries
  const filteredInquiries = inquiries
    .filter((inquiry: Inquiry) => {
      const matchesStatus = selectedStatus === 'all' || inquiry.status === selectedStatus;
      const matchesSearch =
        inquiry.propertyTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inquiry.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inquiry.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    })
    .sort((a: Inquiry, b: Inquiry) => {
      if (sortBy === 'date') {
        return sortOrder === 'desc'
          ? b.createdAt.seconds - a.createdAt.seconds
          : a.createdAt.seconds - b.createdAt.seconds;
      } else {
        return sortOrder === 'desc'
          ? b.status.localeCompare(a.status)
          : a.status.localeCompare(b.status);
      }
    });

  const handleUpdateStatus = async (inquiryId: string, newStatus: 'new' | 'contacted' | 'closed') => {
    try {
      await updateDoc(doc(db, 'inquiries', inquiryId), {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });
      toast.success('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleSaveNotes = async (inquiryId: string) => {
    try {
      await updateDoc(doc(db, 'inquiries', inquiryId), {
        agentNotes,
        updatedAt: Timestamp.now(),
      });
      toast.success('Notes saved successfully');
      setSelectedInquiry(null);
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save notes');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading inquiries...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900">Error loading inquiries</h2>
          <p className="mt-2 text-gray-600">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10">
      <header>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-gray-900">
            Manage Inquiries
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl sm:px-6 lg:px-8">
        {/* Filters and Search */}
        <div className="mt-8 bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search inquiries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div className="flex gap-4">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="closed">Closed</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'status')}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="date">Sort by Date</option>
                <option value="status">Sort by Status</option>
              </select>
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        {/* Inquiries List */}
        <div className="mt-8 flex flex-col">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                        Property
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Contact
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Date
                      </th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredInquiries?.map((inquiry) => (
                      <tr key={inquiry.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                          <div className="font-medium text-gray-900">{inquiry.propertyTitle}</div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <div>{inquiry.userName}</div>
                          <div>{inquiry.userEmail}</div>
                          {inquiry.userPhone && <div>{inquiry.userPhone}</div>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <select
                            value={inquiry.status}
                            onChange={(e) => handleUpdateStatus(inquiry.id, e.target.value as 'new' | 'contacted' | 'closed')}
                            className={`rounded-md text-sm ${
                              inquiry.status === 'new' ? 'bg-yellow-100 text-yellow-800' :
                              inquiry.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            }`}
                          >
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="closed">Closed</option>
                          </select>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {inquiry.createdAt.toDate().toLocaleDateString()}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            onClick={() => {
                              setSelectedInquiry(inquiry);
                              setAgentNotes(inquiry.agentNotes || '');
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Inquiry Details Modal */}
        {selectedInquiry && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity">
            <div className="fixed inset-0 z-10 overflow-y-auto">
              <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                  <div>
                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                      Inquiry Details
                    </h3>
                    <div className="mt-4">
                      <p className="text-sm text-gray-500">
                        <strong>Property:</strong> {selectedInquiry.propertyTitle}
                      </p>
                      <p className="mt-2 text-sm text-gray-500">
                        <strong>From:</strong> {selectedInquiry.userName} ({selectedInquiry.userEmail})
                      </p>
                      {selectedInquiry.userPhone && (
                        <p className="mt-1 text-sm text-gray-500">
                          <strong>Phone:</strong> {selectedInquiry.userPhone}
                        </p>
                      )}
                      <div className="mt-4">
                        <strong className="text-sm text-gray-500">Message:</strong>
                        <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">
                          {selectedInquiry.message}
                        </p>
                      </div>
                      <div className="mt-4">
                        <label htmlFor="agentNotes" className="block text-sm font-medium text-gray-700">
                          Agent Notes
                        </label>
                        <textarea
                          id="agentNotes"
                          rows={4}
                          value={agentNotes}
                          onChange={(e) => setAgentNotes(e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => handleSaveNotes(selectedInquiry.id)}
                      className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:col-start-2 sm:text-sm"
                    >
                      Save Notes
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedInquiry(null)}
                      className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:col-start-1 sm:mt-0 sm:text-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}