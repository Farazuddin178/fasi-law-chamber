/**
 * Bulk Case Search Component
 * Allows searching for multiple cases at once with progress tracking
 */

import { useState } from 'react';
import { X, Upload, Play, AlertCircle, CheckCircle, XCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchMultipleCases, CaseDetail } from '@/lib/caseService';

interface BulkCaseSearchProps {
  courts: Array<{ id: string; court_code: string; court_name: string }>;
  onClose: () => void;
  onCasesLoaded: (cases: CaseDetail[]) => void;
}

interface CaseInput {
  id: string;
  court_id: string;
  case_type: string;
  case_number: string;
  case_year: string;
}

interface SearchResult {
  caseInput: CaseInput;
  result: CaseDetail | null;
  error: string | null;
  status: 'pending' | 'loading' | 'success' | 'error';
}

export function BulkCaseSearchModal({ courts, onClose, onCasesLoaded }: BulkCaseSearchProps) {
  const [cases, setCases] = useState<CaseInput[]>([
    { id: '1', court_id: '', case_type: '', case_number: '', case_year: new Date().getFullYear().toString() },
  ]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const addCase = () => {
    setCases([
      ...cases,
      {
        id: Date.now().toString(),
        court_id: '',
        case_type: '',
        case_number: '',
        case_year: new Date().getFullYear().toString(),
      },
    ]);
  };

  const removeCase = (id: string) => {
    if (cases.length > 1) {
      setCases(cases.filter((c) => c.id !== id));
    }
  };

  const updateCase = (id: string, field: keyof CaseInput, value: string) => {
    setCases(
      cases.map((c) =>
        c.id === id ? { ...c, [field]: value } : c
      )
    );
  };

  const validateCases = (): boolean => {
    for (const c of cases) {
      if (!c.court_id || !c.case_type || !c.case_number) {
        toast.error('All cases must have court, type, and number');
        return false;
      }
      if (!c.case_year || parseInt(c.case_year) < 1950) {
        toast.error('Invalid case year');
        return false;
      }
    }
    return true;
  };

  const handleSearch = async () => {
    if (!validateCases()) return;

    setIsSearching(true);
    setResults([]);

    try {
      // Initialize results with pending status
      const initialResults: SearchResult[] = cases.map((caseInput) => ({
        caseInput,
        result: null,
        error: null,
        status: 'pending',
      }));
      setResults(initialResults);

      // Prepare cases for parallel fetch
      const fetchOptions = cases.map((c) => {
        const court = courts.find((ct) => ct.id === c.court_id);
        return {
          court_code: court?.court_code || '',
          court_name: court?.court_name || '',
          case_number: c.case_number,
          case_year: parseInt(c.case_year, 10),
          case_type: c.case_type,
          useBackendAPI: true,
        };
      });

      // Update results with loading status
      setResults((prev) =>
        prev.map((r) => ({ ...r, status: 'loading' }))
      );

      // Fetch all cases with concurrency limit
      const fetchedCases = await fetchMultipleCases(fetchOptions, 3);

      // Update results with actual results
      const finalResults: SearchResult[] = cases.map((caseInput, idx) => {
        const fetchResult = fetchedCases[idx];

        if (fetchResult instanceof Error) {
          return {
            caseInput,
            result: null,
            error: fetchResult.message,
            status: 'error',
          };
        }

        if (!fetchResult) {
          return {
            caseInput,
            result: null,
            error: 'No data returned',
            status: 'error',
          };
        }

        return {
          caseInput,
          result: fetchResult,
          error: null,
          status: 'success',
        };
      });

      setResults(finalResults);

      // Count successes
      const successCount = finalResults.filter((r) => r.status === 'success').length;
      toast.success(`${successCount} of ${finalResults.length} cases loaded`);

      // Pass successful cases to parent
      const successfulCases = finalResults
        .filter((r) => r.result)
        .map((r) => r.result as CaseDetail);

      if (successfulCases.length > 0) {
        onCasesLoaded(successfulCases);
      }
    } catch (err: any) {
      toast.error(err.message || 'Bulk search failed');
      console.error('Bulk search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const importFromCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string;
        const lines = csv.split('\n').filter((line) => line.trim());
        const newCases: CaseInput[] = [];

        for (const line of lines) {
          const [court_id, case_type, case_number, case_year] = line.split(',').map((s) => s.trim());
          if (court_id && case_type && case_number) {
            newCases.push({
              id: Date.now().toString() + Math.random(),
              court_id,
              case_type,
              case_number,
              case_year: case_year || new Date().getFullYear().toString(),
            });
          }
        }

        if (newCases.length > 0) {
          setCases(newCases);
          toast.success(`Imported ${newCases.length} cases`);
        } else {
          toast.error('No valid cases found in CSV');
        }
      } catch (err: any) {
        toast.error('Failed to parse CSV: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Bulk Case Search</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {results.length === 0 ? (
            <>
              {/* Import Section */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-blue-700 mb-3">
                  <Upload className="w-5 h-5" />
                  <span className="font-medium">Import from CSV</span>
                </div>
                <p className="text-sm text-blue-600 mb-3">
                  Format: court_id, case_type, case_number, case_year (one per line)
                </p>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Choose CSV
                  <input
                    type="file"
                    accept=".csv"
                    onChange={importFromCSV}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Cases Input */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Enter Cases</h3>
                  <button
                    onClick={addCase}
                    className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg"
                  >
                    + Add Case
                  </button>
                </div>

                {cases.map((caseItem, idx) => (
                  <div
                    key={caseItem.id}
                    className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <select
                      value={caseItem.court_id}
                      onChange={(e) => updateCase(caseItem.id, 'court_id', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Court</option>
                      {courts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.court_name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={caseItem.case_type}
                      onChange={(e) => updateCase(caseItem.id, 'case_type', e.target.value)}
                      placeholder="Case Type (WP, CRL, etc)"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />

                    <input
                      type="text"
                      value={caseItem.case_number}
                      onChange={(e) => updateCase(caseItem.id, 'case_number', e.target.value)}
                      placeholder="Case Number"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />

                    <input
                      type="number"
                      value={caseItem.case_year}
                      onChange={(e) => updateCase(caseItem.id, 'case_year', e.target.value)}
                      placeholder="Year"
                      min="1950"
                      max={new Date().getFullYear()}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />

                    <button
                      onClick={() => removeCase(caseItem.id)}
                      disabled={cases.length === 1}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Results Section */}
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Results</h3>
              <div className="space-y-3">
                {results.map((result, idx) => (
                  <div
                    key={idx}
                    className="p-4 border rounded-lg flex items-start justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {result.status === 'loading' && (
                          <Loader className="w-4 h-4 text-blue-600 animate-spin" />
                        )}
                        {result.status === 'success' && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                        {result.status === 'error' && (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className="font-medium text-gray-900">
                          {result.caseInput.case_type} {result.caseInput.case_number}/
                          {result.caseInput.case_year}
                        </span>
                      </div>
                      {result.result && (
                        <div className="text-sm text-gray-600">
                          <p>{result.result.case_title}</p>
                          <p className="text-xs mt-1">Status: {result.result.case_status}</p>
                        </div>
                      )}
                      {result.error && (
                        <p className="text-sm text-red-600">{result.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
          {results.length === 0 && (
            <button
              onClick={handleSearch}
              disabled={isSearching || cases.some((c) => !c.court_id || !c.case_type || !c.case_number)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              <Play className="w-4 h-4" />
              {isSearching ? 'Searching...' : 'Search All Cases'}
            </button>
          )}
          {results.length > 0 && (
            <button
              onClick={() => {
                setResults([]);
                setCases([
                  { id: '1', court_id: '', case_type: '', case_number: '', case_year: new Date().getFullYear().toString() },
                ]);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300"
            >
              Start New Search
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
