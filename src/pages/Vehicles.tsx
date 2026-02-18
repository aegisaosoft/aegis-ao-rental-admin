import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import apiService from '../services/apiService';
import { Car, ChevronLeft, ChevronRight, Image, ImageOff, Filter, RefreshCw } from 'lucide-react';
import Layout from '../components/Layout';

const BLOB_BASE = 'https://aegisaorentalstorage.blob.core.windows.net/models';

type ImageFilter = 'all' | 'with_image' | 'without_image';

// Уникальная запись Make+Model с агрегацией по годам
interface MakeModelRow {
  key: string; // MAKE_MODEL
  make: string;
  modelName: string;
  years: number[];
  categoryName: string | null;
  fuelType: string | null;
  transmission: string | null;
  seats: number | null;
  blobUrl: string;
  imageExists: boolean | null; // null = loading
  imageSize: number | null; // bytes
}

function buildBlobUrl(make: string, model: string): string {
  const m = (make || '').toUpperCase().trim();
  const mod = (model || '').toUpperCase().trim().replace(/\s+/g, '_');
  return `${BLOB_BASE}/${m}_${mod}.png`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const Vehicles: React.FC = () => {
  const [rows, setRows] = useState<MakeModelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingImages, setCheckingImages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [imageFilter, setImageFilter] = useState<ImageFilter>('all');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);

  // 1. Загрузить модели из API, сгруппировать по Make+Model
  const loadModels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getAllModels();

      // Группируем по Make+Model (верхний регистр)
      const map = new Map<string, MakeModelRow>();
      for (const m of data) {
        const makeUp = (m.make || '').toUpperCase().trim();
        const modelUp = (m.modelName || '').toUpperCase().trim();
        const key = `${makeUp}_${modelUp}`;
        if (map.has(key)) {
          const existing = map.get(key)!;
          if (!existing.years.includes(m.year)) {
            existing.years.push(m.year);
            existing.years.sort((a, b) => b - a);
          }
        } else {
          map.set(key, {
            key,
            make: makeUp,
            modelName: modelUp,
            years: [m.year],
            categoryName: m.categoryName,
            fuelType: m.fuelType,
            transmission: m.transmission,
            seats: m.seats,
            blobUrl: buildBlobUrl(m.make, m.modelName),
            imageExists: null,
            imageSize: null,
          });
        }
      }

      const rowList = Array.from(map.values()).sort((a, b) =>
        a.make.localeCompare(b.make) || a.modelName.localeCompare(b.modelName)
      );
      setRows(rowList);
    } catch (err: any) {
      console.error('Failed to load models:', err);
      setError(err.message || 'Failed to load models');
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. Проверить существование картинок через HEAD-запросы
  const checkImages = useCallback(async (rowList: MakeModelRow[]) => {
    if (rowList.length === 0) return;

    // Прерываем предыдущую проверку
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setCheckingImages(true);

    // Проверяем батчами по 5 параллельно
    const batchSize = 5;
    for (let i = 0; i < rowList.length; i += batchSize) {
      if (controller.signal.aborted) break;

      const batch = rowList.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (row) => {
          try {
            const resp = await fetch(row.blobUrl, {
              method: 'HEAD',
              signal: controller.signal,
            });
            return {
              key: row.key,
              exists: resp.ok,
              size: resp.ok ? parseInt(resp.headers.get('content-length') || '0', 10) : null,
            };
          } catch {
            return { key: row.key, exists: false, size: null };
          }
        })
      );

      if (controller.signal.aborted) break;

      // Обновляем состояние инкрементально
      setRows((prev) => {
        const updated = [...prev];
        for (const result of results) {
          if (result.status === 'fulfilled') {
            const idx = updated.findIndex((r) => r.key === result.value.key);
            if (idx >= 0) {
              updated[idx] = {
                ...updated[idx],
                imageExists: result.value.exists,
                imageSize: result.value.size,
              };
            }
          }
        }
        return updated;
      });
    }

    setCheckingImages(false);
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // Запускаем проверку картинок после загрузки
  useEffect(() => {
    if (rows.length > 0 && rows.some((r) => r.imageExists === null)) {
      checkImages(rows);
    }
  }, [rows.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Фильтрация по наличию картинки
  const filteredRows = useMemo(() => {
    if (imageFilter === 'with_image') return rows.filter((r) => r.imageExists === true);
    if (imageFilter === 'without_image') return rows.filter((r) => r.imageExists === false);
    return rows;
  }, [rows, imageFilter]);

  const toggleSelect = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedKeys((prev) =>
      prev.size === filteredRows.length ? new Set() : new Set(filteredRows.map((r) => r.key))
    );
  }, [filteredRows]);

  const stats = useMemo(() => {
    const total = rows.length;
    const withImage = rows.filter((r) => r.imageExists === true).length;
    const withoutImage = rows.filter((r) => r.imageExists === false).length;
    const checking = rows.filter((r) => r.imageExists === null).length;
    const totalSize = rows.reduce((sum, r) => sum + (r.imageSize || 0), 0);
    return { total, withImage, withoutImage, checking, totalSize };
  }, [rows]);

  const columns = useMemo<ColumnDef<MakeModelRow>[]>(
    () => [
      {
        id: 'select',
        header: () => (
          <input
            type="checkbox"
            checked={selectedKeys.size === filteredRows.length && filteredRows.length > 0}
            onChange={toggleSelectAll}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
        ),
        cell: (info) => (
          <input
            type="checkbox"
            checked={selectedKeys.has(info.row.original.key)}
            onChange={() => toggleSelect(info.row.original.key)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
        ),
        size: 40,
        enableSorting: false,
      },
      {
        id: 'image',
        header: 'Image',
        cell: (info) => {
          const row = info.row.original;
          if (row.imageExists === null) {
            return (
              <div className="h-10 w-16 bg-gray-50 rounded border border-gray-200 flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-500" />
              </div>
            );
          }
          if (row.imageExists) {
            return (
              <img
                src={row.blobUrl}
                alt={`${row.make} ${row.modelName}`}
                className="h-10 w-16 object-contain rounded border border-gray-200 bg-white"
              />
            );
          }
          return (
            <div className="h-10 w-16 bg-gray-100 rounded border border-dashed border-gray-300 flex items-center justify-center">
              <ImageOff className="h-4 w-4 text-gray-400" />
            </div>
          );
        },
        size: 80,
        enableSorting: false,
      },
      {
        accessorKey: 'make',
        header: 'Make',
        cell: (info) => <span className="font-medium text-gray-900">{info.getValue() as string}</span>,
      },
      {
        accessorKey: 'modelName',
        header: 'Model',
        cell: (info) => <span className="text-gray-700">{info.getValue() as string}</span>,
      },
      {
        id: 'years',
        header: 'Years',
        cell: (info) => {
          const years = info.row.original.years;
          if (years.length <= 3) {
            return <span className="text-gray-600 text-sm">{years.join(', ')}</span>;
          }
          return (
            <span className="text-gray-600 text-sm" title={years.join(', ')}>
              {years[0]}...{years[years.length - 1]} ({years.length})
            </span>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: 'categoryName',
        header: 'Category',
        cell: (info) => {
          const val = info.getValue() as string | null;
          return val ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
              {val}
            </span>
          ) : (
            <span className="text-gray-400 text-sm">&mdash;</span>
          );
        },
      },
      {
        id: 'imageStatus',
        header: 'Image Status',
        cell: (info) => {
          const row = info.row.original;
          if (row.imageExists === null) {
            return <span className="text-gray-400 text-xs">Checking...</span>;
          }
          if (row.imageExists) {
            return (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                <Image className="h-3 w-3" />
                OK
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
              <ImageOff className="h-3 w-3" />
              Missing
            </span>
          );
        },
        enableSorting: false,
      },
      {
        id: 'imageSize',
        header: 'Size',
        cell: (info) => {
          const row = info.row.original;
          if (row.imageExists === null) return <span className="text-gray-400 text-xs">&mdash;</span>;
          if (!row.imageExists) return <span className="text-gray-400 text-xs">&mdash;</span>;
          return (
            <span className="text-gray-700 text-sm font-mono">
              {row.imageSize ? formatBytes(row.imageSize) : '?'}
            </span>
          );
        },
        enableSorting: false,
      },
      {
        id: 'blobFile',
        header: 'Blob File',
        cell: (info) => {
          const row = info.row.original;
          const fileName = `${row.make}_${row.modelName.replace(/\s+/g, '_')}.png`;
          return (
            <span className="text-gray-500 text-xs font-mono truncate max-w-[180px] block" title={row.blobUrl}>
              {fileName}
            </span>
          );
        },
        enableSorting: false,
      },
    ],
    [selectedKeys, filteredRows.length, toggleSelect, toggleSelectAll]
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  const handleRefresh = () => {
    setRows((prev) => prev.map((r) => ({ ...r, imageExists: null, imageSize: null })));
    // checkImages будет вызван через useEffect
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            <p className="text-gray-500 text-sm">Loading models...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 font-medium">Error: {error}</p>
            <button
              onClick={loadModels}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Car className="h-7 w-7 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Vehicles &mdash; Make / Models</h1>
              <p className="text-sm text-gray-500">
                Blob images: {BLOB_BASE}/MAKE_MODEL.png
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={checkingImages}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
          >
            <RefreshCw className={`h-4 w-4 ${checkingImages ? 'animate-spin' : ''}`} />
            Re-check images
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Make/Models</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-green-200 p-4">
            <p className="text-xs text-green-600 uppercase tracking-wide">With Image</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.withImage}</p>
            {stats.totalSize > 0 && (
              <p className="text-xs text-gray-400 mt-1">Total: {formatBytes(stats.totalSize)}</p>
            )}
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-4">
            <p className="text-xs text-red-600 uppercase tracking-wide">Missing Image</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.withoutImage}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Checking</p>
            <p className="text-2xl font-bold text-gray-400 mt-1">
              {stats.checking > 0 ? stats.checking : <span className="text-green-500">Done</span>}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search make, model..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button
                  onClick={() => setImageFilter('all')}
                  className={`px-3 py-2 text-sm font-medium transition ${
                    imageFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  All ({stats.total})
                </button>
                <button
                  onClick={() => setImageFilter('with_image')}
                  className={`px-3 py-2 text-sm font-medium border-l border-gray-300 transition ${
                    imageFilter === 'with_image' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <Image className="h-3.5 w-3.5" />
                    Has Image ({stats.withImage})
                  </span>
                </button>
                <button
                  onClick={() => setImageFilter('without_image')}
                  className={`px-3 py-2 text-sm font-medium border-l border-gray-300 transition ${
                    imageFilter === 'without_image' ? 'bg-red-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <ImageOff className="h-3.5 w-3.5" />
                    No Image ({stats.withoutImage})
                  </span>
                </button>
              </div>
            </div>

            {selectedKeys.size > 0 && (
              <span className="text-sm text-blue-600 font-medium">{selectedKeys.size} selected</span>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((header) => (
                      <th
                        key={header.id}
                        className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                          header.column.getCanSort() ? 'cursor-pointer select-none hover:bg-gray-100' : ''
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                        style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      >
                        <div className="flex items-center gap-1">
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getIsSorted() === 'asc' && ' \u2191'}
                          {header.column.getIsSorted() === 'desc' && ' \u2193'}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-500">
                      No models found
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-gray-50 transition ${
                        selectedKeys.has(row.original.key) ? 'bg-blue-50' : ''
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-2.5 whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-700">
              Showing{' '}
              <span className="font-medium">
                {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
              </span>{' '}
              to{' '}
              <span className="font-medium">
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  filteredRows.length
                )}
              </span>{' '}
              of <span className="font-medium">{filteredRows.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-700">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </span>
              <button
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="p-2 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Vehicles;
