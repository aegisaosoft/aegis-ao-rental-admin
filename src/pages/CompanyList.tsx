import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from '@tanstack/react-table';
import companyService, { Company } from '../services/companyService';
import { Building2, Plus, Trash2, Edit, ChevronLeft, ChevronRight, CreditCard } from 'lucide-react';
import Layout from '../components/Layout';

const CompanyList: React.FC = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);

  const loadCompanies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await companyService.getAllCompanies(includeInactive);
      setCompanies(data);
    } catch (err: any) {
      console.error('Failed to load companies:', err);
      setError(err.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const handleDelete = useCallback(async (id: string, companyName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${companyName}?`)) {
      return;
    }

    try {
      await companyService.deleteCompany(id);
      alert('Company deleted successfully');
      loadCompanies();
    } catch (err: any) {
      alert('Failed to delete company: ' + err.message);
    }
  }, [loadCompanies]);

  const columns = useMemo<ColumnDef<Company>[]>(
    () => [
      {
        id: 'actions',
        header: 'Actions',
        cell: (info) => {
          const company = info.row.original;
          return (
            <div className="flex gap-2 justify-start">
              <button
                onClick={() => navigate(`/companies/${company.id}`)}
                className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                title="Edit"
              >
                <Edit className="h-5 w-5" />
              </button>
              <button
                onClick={() => navigate(`/companies/${company.id}/stripe`)}
                className="text-purple-600 hover:text-purple-800 p-1 hover:bg-purple-50 rounded"
                title="Manage Stripe Account"
              >
                <CreditCard className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleDelete(company.id, company.companyName)}
                className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded"
                title="Delete"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          );
        },
      },
      {
        accessorKey: 'companyName',
        header: 'Company Name',
        cell: (info) => (
          <div className="font-medium text-gray-900">{info.getValue() as string}</div>
        ),
      },
      {
        accessorKey: 'subdomain',
        header: 'Subdomain',
        cell: (info) => {
          const subdomain = info.getValue() as string | null | undefined;
          return subdomain ? (
            <code className="px-2 py-1 bg-gray-100 rounded text-sm">
              {subdomain}
            </code>
          ) : (
            <span className="text-gray-400 italic text-sm">Not set</span>
          );
        },
      },
      {
        accessorKey: 'fullDomain',
        header: 'Full Domain',
        cell: (info) => {
          const domain = info.getValue() as string | undefined;
          return domain ? (
            <a
              href={`https://${domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              {domain} ↗
            </a>
          ) : null;
        },
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: (info) => (
          <span className="text-sm text-gray-600">{info.getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'currency',
        header: 'Currency',
        cell: (info) => (
          <span className="text-sm font-mono text-gray-700">{info.getValue() as string}</span>
        ),
      },
      {
        accessorKey: 'securityDeposit',
        header: 'Security Deposit',
        cell: (info) => {
          const value = info.getValue() as number | null | undefined;
          if (value == null) {
            return <span className="text-sm text-gray-400 italic">Not set</span>;
          }
          return (
            <span className="text-sm text-gray-700 font-medium">
              {new Intl.NumberFormat(undefined, { style: 'currency', currency: info.row.original.currency || 'USD', minimumFractionDigits: 0 }).format(value)}
            </span>
          );
        },
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        cell: (info) => {
          const company = info.row.original;
          return (
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  company.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {company.isActive ? '✓ Active' : '✗ Inactive'}
              </span>
              {company.bookingIntegrated && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  📅 Booking
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: (info) => (
          <span className="text-sm text-gray-600">
            {new Date(info.getValue() as string).toLocaleDateString()}
          </span>
        ),
      },
    ],
    [navigate, handleDelete]
  );

  const table = useReactTable({
    data: companies,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    initialState: {
      pagination: {
        pageSize: 8,
      },
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error Loading Companies</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={loadCompanies}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Building2 className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Company Management</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/companies/new')}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              <Plus className="h-5 w-5" />
              Create New Company
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex items-center">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-gray-700">Include inactive companies</span>
          </label>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-3xl font-bold text-gray-900 mb-2">{companies.length}</h3>
            <p className="text-gray-600">Total Companies</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-3xl font-bold text-green-600 mb-2">
              {companies.filter((c) => c.isActive).length}
            </h3>
            <p className="text-gray-600">Active</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-3xl font-bold text-blue-600 mb-2">
              {companies.filter((c) => c.bookingIntegrated).length}
            </h3>
            <p className="text-gray-600">With Booking</p>
          </div>
        </div>

        {/* Companies Table */}
        {companies.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg mb-4">No companies found</p>
            <button
              onClick={() => navigate('/companies/new')}
              className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition"
            >
              Create Your First Company
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                            header.id === 'actions' ? 'text-left' : 'text-left'
                          }`}
                        >
                          {header.isPlaceholder ? null : (
                            <div
                              className={
                                header.column.getCanSort()
                                  ? 'cursor-pointer select-none flex items-center gap-2'
                                  : ''
                              }
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {{
                                asc: ' ↑',
                                desc: ' ↓',
                              }[header.column.getIsSorted() as string] ?? null}
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className={!row.original.isActive ? 'bg-gray-50' : ''}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={`px-6 py-4 whitespace-nowrap ${
                            cell.column.id === 'actions' ? 'text-left' : ''
                          }`}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">
                  Showing{' '}
                  <strong>
                    {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
                  </strong>{' '}
                  to{' '}
                  <strong>
                    {Math.min(
                      (table.getState().pagination.pageIndex + 1) *
                        table.getState().pagination.pageSize,
                      table.getFilteredRowModel().rows.length
                    )}
                  </strong>{' '}
                  of <strong>{table.getFilteredRowModel().rows.length}</strong> results
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: table.getPageCount() }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => table.setPageIndex(page - 1)}
                      className={`px-3 py-1 text-sm font-medium rounded ${
                        table.getState().pagination.pageIndex === page - 1
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CompanyList;
