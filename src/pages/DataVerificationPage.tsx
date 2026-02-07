import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import DashboardLayout from '@/components/DashboardLayout';

interface CaseMatch {
  caseNumber: string;
  inDatabase: boolean;
  inTSHC: boolean;
  databaseStatus?: string;
  tshcStatus?: string;
  notes: string;
}

export default function DataVerificationPage() {
  const [advocateCode, setAdvocateCode] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<CaseMatch[]>([]);
  const [summary, setSummary] = useState<{
    totalDatabase: number;
    totalTSHC: number;
    matched: number;
    onlyInDB: number;
    onlyInTSHC: number;
  } | null>(null);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (!advocateCode || !date) {
      setError('Please enter advocate code and date');
      return;
    }

    setLoading(true);
    setError('');
    const newMatches: CaseMatch[] = [];

    try {
      // 1. Fetch cases from TSHC website
      const dateFormatted = new Date(date).toLocaleDateString('en-GB').replace(/\//g, '-');
      const tshcResponse = await fetch(
        `/getDailyCauselist?advocateCode=${advocateCode}&listDate=${dateFormatted}`
      );
      const tshcData = await tshcResponse.json();

      if (tshcData.error) {
        setError(`TSHC Error: ${tshcData.error}`);
        setLoading(false);
        return;
      }

      const tshcCases = tshcData.cases || [];

      // 2. Fetch cases from database for this advocate
      const { data: dbCases, error: dbError } = await supabase
        .from('cases')
        .select('case_number, status')
        .eq('advocate_code', advocateCode);

      if (dbError) {
        setError(`Database Error: ${dbError.message}`);
        setLoading(false);
        return;
      }

      const dbCaseNumbers = new Set(dbCases?.map(c => c.case_number) || []);
      const tshcCaseNumbers = new Set(tshcCases.map((c: any) => c.case_no));

      // 3. Create comparison
      const allCaseNumbers = new Set([...dbCaseNumbers, ...tshcCaseNumbers]);

      allCaseNumbers.forEach(caseNum => {
        const inDB = dbCaseNumbers.has(caseNum);
        const inTSHC = tshcCaseNumbers.has(caseNum);

        let notes = '';
        if (inDB && inTSHC) {
          notes = '✓ Matched - In both database and TSHC';
        } else if (inDB && !inTSHC) {
          notes = '⚠ In database but NOT in TSHC (outdated?)';
        } else if (!inDB && inTSHC) {
          notes = '✗ In TSHC but NOT in database (missing save)';
        }

        const dbCase = (dbCases || []).find(c => c.case_number === caseNum);

        newMatches.push({
          caseNumber: caseNum || 'Unknown',
          inDatabase: inDB,
          inTSHC: inTSHC,
          databaseStatus: dbCase?.status || '-',
          tshcStatus: inTSHC ? 'Active' : '-',
          notes,
        });
      });

      // Sort: matched first, then only in DB, then only in TSHC
      newMatches.sort((a, b) => {
        const aScore = (a.inDatabase && a.inTSHC) ? 0 : (a.inDatabase ? 1 : 2);
        const bScore = (b.inDatabase && b.inTSHC) ? 0 : (b.inDatabase ? 1 : 2);
        return aScore - bScore;
      });

      const matched = newMatches.filter(m => m.inDatabase && m.inTSHC).length;
      const onlyInDB = newMatches.filter(m => m.inDatabase && !m.inTSHC).length;
      const onlyInTSHC = newMatches.filter(m => !m.inDatabase && m.inTSHC).length;

      setSummary({
        totalDatabase: dbCases?.length || 0,
        totalTSHC: tshcCases.length,
        matched,
        onlyInDB,
        onlyInTSHC,
      });

      setMatches(newMatches);
    } catch (err: any) {
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Data Verification</h1>
        <p className="text-gray-600 mb-6">
          Compare database entries with TSHC website data to verify all cases are saved correctly.
        </p>

        {/* Input Section */}
        <Card className="p-6 mb-6">
          <div className="grid md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-2">Advocate Code</label>
              <Input
                type="text"
                placeholder="e.g., 19272"
                value={advocateCode}
                onChange={(e) => setAdvocateCode(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Date</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <Button
              onClick={handleVerify}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Verifying...' : 'Verify Data'}
            </Button>
          </div>
        </Card>

        {error && (
          <Card className="p-4 mb-6 bg-red-50 border-red-200">
            <p className="text-red-700">{error}</p>
          </Card>
        )}

        {/* Summary Section */}
        {summary && (
          <div className="grid md:grid-cols-5 gap-4 mb-6">
            <Card className="p-4 bg-blue-50">
              <p className="text-sm text-gray-600">Database Cases</p>
              <p className="text-2xl font-bold text-blue-600">{summary.totalDatabase}</p>
            </Card>
            <Card className="p-4 bg-purple-50">
              <p className="text-sm text-gray-600">TSHC Cases</p>
              <p className="text-2xl font-bold text-purple-600">{summary.totalTSHC}</p>
            </Card>
            <Card className="p-4 bg-green-50">
              <p className="text-sm text-gray-600">Matched</p>
              <p className="text-2xl font-bold text-green-600">{summary.matched}</p>
            </Card>
            <Card className="p-4 bg-yellow-50">
              <p className="text-sm text-gray-600">Only in DB</p>
              <p className="text-2xl font-bold text-yellow-600">{summary.onlyInDB}</p>
            </Card>
            <Card className="p-4 bg-red-50">
              <p className="text-sm text-gray-600">Only in TSHC</p>
              <p className="text-2xl font-bold text-red-600">{summary.onlyInTSHC}</p>
            </Card>
          </div>
        )}

        {/* Results Table */}
        {matches.length > 0 && (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Case Number</th>
                    <th className="px-4 py-3 text-center font-semibold">In Database</th>
                    <th className="px-4 py-3 text-center font-semibold">In TSHC</th>
                    <th className="px-4 py-3 text-left font-semibold">DB Status</th>
                    <th className="px-4 py-3 text-left font-semibold">TSHC Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((match, idx) => (
                    <tr
                      key={idx}
                      className={`border-b ${
                        match.inDatabase && match.inTSHC
                          ? 'bg-green-50'
                          : match.inDatabase
                          ? 'bg-yellow-50'
                          : 'bg-red-50'
                      }`}
                    >
                      <td className="px-4 py-3 font-medium">{match.caseNumber}</td>
                      <td className="px-4 py-3 text-center">
                        {match.inDatabase ? '✓' : '✗'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {match.inTSHC ? '✓' : '✗'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{match.databaseStatus}</td>
                      <td className="px-4 py-3 text-gray-600">{match.tshcStatus}</td>
                      <td className="px-4 py-3 text-gray-700">{match.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
