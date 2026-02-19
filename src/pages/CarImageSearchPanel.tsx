import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X, Search, Upload, Loader2, Check, AlertCircle, Link } from 'lucide-react';
import { toast } from 'react-toastify';
import apiService from '../services/apiService';
import type { CarSearchResult } from '../services/apiService';

interface CarImageSearchPanelProps {
  make: string;
  model: string;
  onClose: () => void;
  onImageUploaded: (blobUrl: string) => void;
}

const CarImageSearchPanel: React.FC<CarImageSearchPanelProps> = ({
  make,
  model,
  onClose,
  onImageUploaded,
}) => {
  const [searchResults, setSearchResults] = useState<CarSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [searchElapsed, setSearchElapsed] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [processStatus, setProcessStatus] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState('');
  const [manualPreviewOk, setManualPreviewOk] = useState<boolean | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const handleSearch = useCallback(async () => {
    setSearching(true);
    setSearchResults([]);
    setSelectedUrl(null);
    setProcessStatus(null);
    setSearchMessage('Starting search...');
    setSearchElapsed(0);

    try {
      // Запускаем фоновый поиск
      const jobId = await apiService.startCarImageSearch(make, model, 16);

      // Polling каждые 2 секунды
      let errorCount = 0;
      pollingRef.current = setInterval(async () => {
        try {
          const status = await apiService.getCarImageSearchStatus(jobId);
          errorCount = 0; // reset on success
          setSearchMessage(status.message);
          setSearchElapsed(Math.round(status.elapsedSeconds));

          // Таймаут 120 секунд
          if (status.elapsedSeconds > 120 && status.status !== 'completed') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
            setSearchResults(status.results || []);
            setSearching(false);
            toast.warning(`Search timed out. Found ${(status.results || []).length} images.`);
            return;
          }

          if (status.status === 'completed') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
            setSearchResults(status.results || []);
            setSearching(false);
            if ((status.results || []).length === 0) {
              toast.info('No images found for this make/model');
            }
          } else if (status.status === 'error') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
            setSearching(false);
            toast.error(status.message || 'Search failed');
          }
          // Показываем промежуточные результаты если есть
          if (status.foundCount > 0 && status.results && status.results.length > 0) {
            setSearchResults(status.results);
          }
        } catch (err: any) {
          errorCount++;
          console.error(`Polling error (${errorCount}/5):`, err);
          // Останавливаем после 5 ошибок подряд
          if (errorCount >= 5) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
            setSearching(false);
            toast.error('Search status unavailable. Please try again.');
          }
        }
      }, 2000);
    } catch (err: any) {
      console.error('Search start failed:', err);
      toast.error(`Search failed: ${err.message || 'Unknown error'}`);
      setSearching(false);
    }
  }, [make, model]);

  const handleProcess = useCallback(async () => {
    const urlToProcess = selectedUrl || (manualUrl.trim().startsWith('http') ? manualUrl.trim() : null);
    if (!urlToProcess) return;
    setProcessing(true);
    setProcessStatus('Downloading & processing...');
    try {
      const result = await apiService.processCarImage(make, model, urlToProcess);
      if (result.status === 'success') {
        setProcessStatus('success');
        toast.success(`Image uploaded: ${result.fileName}`);
        onImageUploaded(result.blobUrl);
      } else {
        setProcessStatus(`Error: ${result.status}`);
        toast.error(`Processing failed: ${result.status}`);
      }
    } catch (err: any) {
      console.error('Process failed:', err);
      const serverError = err.response?.data?.error || err.response?.data?.result?.status || err.message;
      setProcessStatus(`Error: ${serverError}`);
      toast.error(`Processing failed: ${serverError || 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  }, [make, model, selectedUrl, manualUrl, onImageUploaded]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-[520px] bg-white shadow-xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Find Car Images</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {make} {model} — cars.com + Google Images
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-200 transition"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Search Button */}
        <div className="px-5 py-4 border-b border-gray-100">
          <button
            onClick={handleSearch}
            disabled={searching}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait transition text-sm font-medium"
          >
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {searching ? 'Searching...' : `Search images for ${make} ${model}`}
          </button>

          {/* Live status */}
          {searching && (
            <div className="mt-3 flex items-center gap-2 text-sm">
              <div className="flex-1 bg-gray-100 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{searchMessage}</span>
                  <span className="text-gray-400 text-xs font-mono">{searchElapsed}s</span>
                </div>
                {/* Progress bar */}
                <div className="mt-1.5 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Manual URL input */}
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Link className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-xs text-gray-500 font-medium">Or paste image URL manually</span>
          </div>
          <div className="flex gap-2">
            <input
              type="url"
              value={manualUrl}
              onChange={(e) => {
                setManualUrl(e.target.value);
                setManualPreviewOk(null);
                if (e.target.value.trim()) setSelectedUrl(null); // deselect grid
              }}
              placeholder="https://example.com/car-photo.jpg"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={processing}
            />
            {manualUrl.trim().startsWith('http') && (
              <button
                onClick={() => {
                  setSelectedUrl(null);
                  handleProcess();
                }}
                disabled={processing}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition text-sm font-medium whitespace-nowrap flex items-center gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                Process
              </button>
            )}
          </div>
          {/* Manual URL preview */}
          {manualUrl.trim().startsWith('http') && (
            <div className="mt-2 flex items-start gap-3">
              <img
                src={manualUrl.trim()}
                alt="Preview"
                className="h-20 w-32 object-contain rounded border border-gray-200 bg-white"
                onLoad={() => setManualPreviewOk(true)}
                onError={() => setManualPreviewOk(false)}
              />
              <div className="text-xs mt-1">
                {manualPreviewOk === true && (
                  <span className="text-green-600 flex items-center gap-1"><Check className="h-3 w-3" /> Preview OK</span>
                )}
                {manualPreviewOk === false && (
                  <span className="text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Can't load preview</span>
                )}
                {manualPreviewOk === null && (
                  <span className="text-gray-400">Loading preview...</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Results Grid */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {searchResults.length === 0 && !searching && !manualUrl.trim() && (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <Search className="h-10 w-10 mb-3" />
              <p className="text-sm">Search or paste a URL above</p>
            </div>
          )}

          {searchResults.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-3">
                {searching ? `Found ${searchResults.length} so far...` : `Found ${searchResults.length} images. Click to select, then "Process & Upload".`}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    onClick={() => !searching && setSelectedUrl(result.sourceUrl === selectedUrl ? null : result.sourceUrl)}
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      selectedUrl === result.sourceUrl
                        ? 'border-blue-500 ring-2 ring-blue-200 shadow-md'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <img
                      src={result.thumbnailUrl}
                      alt={`${result.make} ${result.model}`}
                      className="w-full h-32 object-cover bg-gray-100"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '';
                        target.className = 'hidden';
                        if (target.parentElement) {
                          const placeholder = document.createElement('div');
                          placeholder.className = 'flex items-center justify-center h-32 text-gray-400 text-xs bg-gray-100';
                          placeholder.textContent = 'Image unavailable';
                          target.parentElement.appendChild(placeholder);
                        }
                      }}
                    />
                    {/* Source badge */}
                    <span className={`absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      result.source === 'google'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {result.source === 'google' ? 'Google' : 'cars.com'}
                    </span>
                    {selectedUrl === result.sourceUrl && (
                      <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="px-5 py-4 border-t border-gray-200 bg-gray-50">
          {processStatus === 'success' ? (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-4 py-3">
              <Check className="h-5 w-5" />
              <span className="text-sm font-medium">Image processed and uploaded to blob storage!</span>
            </div>
          ) : processStatus && processStatus.startsWith('Error') ? (
            <div className="flex items-center gap-2 text-red-700 bg-red-50 rounded-lg px-4 py-3 mb-3">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">{processStatus}</span>
            </div>
          ) : null}

          {processStatus !== 'success' && (
            <button
              onClick={handleProcess}
              disabled={(!selectedUrl && !manualUrl.trim().startsWith('http')) || processing || searching}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing... (may take up to 2 min)
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Process & Upload
                </>
              )}
            </button>
          )}

          {processStatus === 'success' && (
            <button
              onClick={onClose}
              className="w-full mt-3 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default CarImageSearchPanel;
