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
import { toast } from 'react-toastify';
import apiService from '../services/apiService';
import type { VehicleCategory } from '../services/apiService';
import { Car, ChevronLeft, ChevronRight, Image, ImageOff, Filter, RefreshCw, Search } from 'lucide-react';
import Layout from '../components/Layout';
import CarImageSearchPanel from './CarImageSearchPanel';

const BLOB_BASE = 'https://aegisaorentalstorage.blob.core.windows.net/models';

type ImageFilter = 'all' | 'with_image' | 'without_image' | 'no_category';

interface MakeModelRow {
  key: string;
  make: string;
  modelName: string;
  years: number[];
  modelIds: string[]; // все id моделей в этой группе
  categoryId: string | null;
  categoryName: string | null;
  fuelType: string | null;
  transmission: string | null;
  seats: number | null;
  blobUrl: string;
  imageExists: boolean | null;
  imageSize: number | null;
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

// Компонент дропдауна категории
const CategorySelect: React.FC<{
  row: MakeModelRow;
  categories: VehicleCategory[];
  onCategoryChange: (row: MakeModelRow, categoryId: string | null) => Promise<void>;
}> = ({ row, categories, onCategoryChange }) => {
  const [saving, setSaving] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const newCategoryId = val === '' ? null : val;
    setSaving(true);
    try {
      await onCategoryChange(row, newCategoryId);
    } finally {
      setSaving(false);
    }
  };

  return (
    <select
      value={row.categoryId || ''}
      onChange={handleChange}
      disabled={saving}
      className={`text-xs border rounded px-2 py-1 w-full max-w-[160px] ${
        saving ? 'opacity-50 cursor-wait' : 'cursor-pointer'
      } ${
        row.categoryId
          ? 'border-blue-300 bg-blue-50 text-blue-800'
          : 'border-gray-300 bg-white text-gray-500'
      }`}
    >
      <option value="">— No category —</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.categoryName}
        </option>
      ))}
    </select>
  );
};

// Read initial state from URL search params
function getUrlState() {
  const params = new URLSearchParams(window.location.search);
  return {
    filter: (params.get('filter') as ImageFilter) || 'without_image',
    search: params.get('q') || '',
    page: parseInt(params.get('page') || '0', 10),
    sortId: params.get('sortBy') || '',
    sortDesc: params.get('sortDir') === 'desc',
  };
}

function setUrlState(updates: Record<string, string | null>) {
  const params = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === '' || value === '0') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }
  const qs = params.toString();
  const newUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
  window.history.replaceState(null, '', newUrl);
}

const Vehicles: React.FC = () => {
  const urlState = useMemo(() => getUrlState(), []);

  const [rows, setRows] = useState<MakeModelRow[]>([]);
  const [categories, setCategories] = useState<VehicleCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingImages, setCheckingImages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>(
    urlState.sortId ? [{ id: urlState.sortId, desc: urlState.sortDesc }] : []
  );
  const [globalFilter, setGlobalFilter] = useState(urlState.search);
  const [imageFilter, setImageFilter] = useState<ImageFilter>(urlState.filter);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [searchPanelRow, setSearchPanelRow] = useState<MakeModelRow | null>(null);
  const [initialPage] = useState(urlState.page);
  const abortRef = useRef<AbortController | null>(null);

  // Sync state changes to URL
  useEffect(() => {
    setUrlState({ filter: imageFilter === 'without_image' ? null : imageFilter });
  }, [imageFilter]);

  useEffect(() => {
    setUrlState({ q: globalFilter || null });
  }, [globalFilter]);

  useEffect(() => {
    if (sorting.length > 0) {
      setUrlState({ sortBy: sorting[0].id, sortDir: sorting[0].desc ? 'desc' : 'asc' });
    } else {
      setUrlState({ sortBy: null, sortDir: null });
    }
  }, [sorting]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [modelsData, categoriesData] = await Promise.all([
        apiService.getAllModels(),
        apiService.getCategories(),
      ]);

      setCategories(categoriesData);

      // Группируем по Make+Model
      const map = new Map<string, MakeModelRow>();
      for (const m of modelsData) {
        const makeUp = (m.make || '').toUpperCase().trim();
        const modelUp = (m.modelName || '').toUpperCase().trim();
        const key = `${makeUp}_${modelUp}`;
        if (map.has(key)) {
          const existing = map.get(key)!;
          if (!existing.years.includes(m.year)) {
            existing.years.push(m.year);
            existing.years.sort((a, b) => b - a);
          }
          if (!existing.modelIds.includes(m.id)) {
            existing.modelIds.push(m.id);
          }
        } else {
          map.set(key, {
            key,
            make: makeUp,
            modelName: modelUp,
            years: [m.year],
            modelIds: [m.id],
            categoryId: m.categoryId,
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
      console.error('Failed to load data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Проверка картинок через HEAD
  const checkImages = useCallback(async (rowList: MakeModelRow[]) => {
    if (rowList.length === 0) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setCheckingImages(true);

    const batchSize = 5;
    for (let i = 0; i < rowList.length; i += batchSize) {
      if (controller.signal.aborted) break;
      const batch = rowList.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (row) => {
          try {
            const resp = await fetch(row.blobUrl, { method: 'HEAD', signal: controller.signal });
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

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (rows.length > 0 && rows.some((r) => r.imageExists === null)) {
      checkImages(rows);
    }
  }, [rows.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Обработчик смены категории — обновляет все модели в группе
  const handleCategoryChange = useCallback(async (row: MakeModelRow, categoryId: string | null) => {
    try {
      // Обновляем все model id в этой группе
      await Promise.all(row.modelIds.map((id) => apiService.updateModelCategory(id, categoryId)));

      const catName = categories.find((c) => c.id === categoryId)?.categoryName || null;

      setRows((prev) =>
        prev.map((r) =>
          r.key === row.key ? { ...r, categoryId, categoryName: catName } : r
        )
      );
      toast.success(`Category updated for ${row.make} ${row.modelName}`);
    } catch (err: any) {
      console.error('Failed to update category:', err);
      toast.error(`Failed to update category: ${err.message}`);
    }
  }, [categories]);

  const handleImageUploaded = useCallback((blobUrl: string) => {
    // Обновляем статус строки — картинка теперь есть
    if (searchPanelRow) {
      setRows((prev) =>
        prev.map((r) =>
          r.key === searchPanelRow.key
            ? { ...r, imageExists: true, imageSize: null, blobUrl: blobUrl || r.blobUrl }
            : r
        )
      );
      // Re-check this one image to get size
      const rowToCheck = rows.find((r) => r.key === searchPanelRow.key);
      if (rowToCheck) {
        fetch(rowToCheck.blobUrl, { method: 'HEAD' })
          .then((resp) => {
            if (resp.ok) {
              const size = parseInt(resp.headers.get('content-length') || '0', 10);
              setRows((prev) =>
                prev.map((r) =>
                  r.key === searchPanelRow.key ? { ...r, imageSize: size } : r
                )
              );
            }
          })
          .catch(() => {});
      }
    }
  }, [searchPanelRow, rows]);

  const filteredRows = useMemo(() => {
    if (imageFilter === 'with_image') return rows.filter((r) => r.imageExists === true);
    if (imageFilter === 'without_image') return rows.filter((r) => r.imageExists === false);
    if (imageFilter === 'no_category') return rows.filter((r) => !r.categoryId);
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
    const noCategory = rows.filter((r) => !r.categoryId).length;
    const totalSize = rows.reduce((sum, r) => sum + (r.imageSize || 0), 0);
    return { total, withImage, withoutImage, checking, noCategory, totalSize };
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
        cell: (info) => (
          <CategorySelect
            row={info.row.original}
            categories={categories}
            onCategoryChange={handleCategoryChange}
          />
        ),
      },
      {
        id: 'imageStatus',
        header: 'Image Status',
        cell: (info) => {
          const row = info.row.original;
          if (row.imageExists === null) return <span className="text-gray-400 text-xs">Checking...</span>;
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
          if (row.imageExists === null || !row.imageExists) return <span className="text-gray-400 text-xs">&mdash;</span>;
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
      {
        id: 'actions',
        header: '',
        cell: (info) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSearchPanelRow(info.row.original);
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition"
            title="Find images on cars.com"
          >
            <Search className="h-3 w-3" />
            Find
          </button>
        ),
        size: 70,
        enableSorting: false,
      },
    ],
    [selectedKeys, filteredRows.length, toggleSelect, toggleSelectAll, categories, handleCategoryChange]
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
    autoResetPageIndex: false, // Don't reset page on data changes (category update, image check, etc.)
    initialState: { pagination: { pageSize: 25, pageIndex: initialPage } },
  });

  // Sync page changes to URL
  const currentPageIndex = table.getState().pagination.pageIndex;
  useEffect(() => {
    setUrlState({ page: currentPageIndex > 0 ? String(currentPageIndex) : null });
  }, [currentPageIndex, setUrlState]);

  const handleRefresh = () => {
    setRows((prev) => prev.map((r) => ({ ...r, imageExists: null, imageSize: null })));
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
            <button onClick={loadData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition">
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
              <p className="text-sm text-gray-500">Blob images: {BLOB_BASE}/MAKE_MODEL.png</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedKeys.size === 1 && (() => {
              const selectedRow = filteredRows.find((r) => selectedKeys.has(r.key));
              return selectedRow ? (
                <button
                  onClick={() => setSearchPanelRow(selectedRow)}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <Search className="h-4 w-4" />
                  Find Images
                </button>
              ) : null;
            })()}
            <button
              onClick={handleRefresh}
              disabled={checkingImages}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
            >
              <RefreshCw className={`h-4 w-4 ${checkingImages ? 'animate-spin' : ''}`} />
              Re-check images
            </button>
          </div>
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
            {stats.totalSize > 0 && <p className="text-xs text-gray-400 mt-1">Total: {formatBytes(stats.totalSize)}</p>}
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
                  className={`px-3 py-2 text-sm font-medium transition ${imageFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  All ({stats.total})
                </button>
                <button
                  onClick={() => setImageFilter('with_image')}
                  className={`px-3 py-2 text-sm font-medium border-l border-gray-300 transition ${imageFilter === 'with_image' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  <span className="flex items-center gap-1">
                    <Image className="h-3.5 w-3.5" />
                    Has Image ({stats.withImage})
                  </span>
                </button>
                <button
                  onClick={() => setImageFilter('without_image')}
                  className={`px-3 py-2 text-sm font-medium border-l border-gray-300 transition ${imageFilter === 'without_image' ? 'bg-red-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  <span className="flex items-center gap-1">
                    <ImageOff className="h-3.5 w-3.5" />
                    No Image ({stats.withoutImage})
                  </span>
                </button>
                <button
                  onClick={() => setImageFilter('no_category')}
                  className={`px-3 py-2 text-sm font-medium border-l border-gray-300 transition ${imageFilter === 'no_category' ? 'bg-orange-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  No Category ({stats.noCategory})
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
                        className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${header.column.getCanSort() ? 'cursor-pointer select-none hover:bg-gray-100' : ''}`}
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
                      className={`hover:bg-gray-50 transition ${selectedKeys.has(row.original.key) ? 'bg-blue-50' : ''}`}
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
              </span>{' '}to{' '}
              <span className="font-medium">
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  filteredRows.length
                )}
              </span>{' '}of <span className="font-medium">{filteredRows.length}</span>
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

      {/* Car Image Search Panel (slide-over) */}
      {searchPanelRow && (
        <CarImageSearchPanel
          make={searchPanelRow.make}
          model={searchPanelRow.modelName}
          onClose={() => setSearchPanelRow(null)}
          onImageUploaded={handleImageUploaded}
        />
      )}
    </Layout>
  );
};

export default Vehicles;
