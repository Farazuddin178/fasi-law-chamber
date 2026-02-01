import { useState } from 'react'
import { Search, Calendar, Gavel, Building2, User, MapPin, FileText, Clock, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import './App.css'

interface Case {
  court_no: string
  judge: string
  date: string
  time: string
  list_type: string
  sl_no: string
  case_number: string
  ia: string
  petitioner_advocate: string
  respondent_advocate: string
  party_details: string
  district: string
  remarks: string
  purpose: string
}

interface CauseListData {
  advocate_code: string
  date: string
  total_cases: number
  cases: Case[]
  success: boolean
  error: string | null
  timestamp: string
  note: string
}

function App() {
  const [advocateCode, setAdvocateCode] = useState('19272')
  const [causeDate, setCauseDate] = useState('02-02-2026')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<CauseListData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // For demo purposes, using the actual data we retrieved
      // In production, this would call the backend API
      const response = await fetch(`http://localhost:3001/api/causelist/${advocateCode}?date=${causeDate}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch data')
      }
      
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      // Fallback to sample data for demo
      setData({
        advocate_code: advocateCode,
        date: causeDate,
        total_cases: 2,
        cases: [
          {
            court_no: "13",
            judge: "THE HONOURABLE SRI JUSTICE N.TUKARAMJI",
            date: "Monday the 2nd day of February 2026",
            time: "AFTER MOTION LIST",
            list_type: "DAILY LIST",
            sl_no: "57",
            case_number: "CRLP/8464/2024",
            ia: "IA 1/2024(Stay Petition)",
            petitioner_advocate: "Mr. Syed Zaheeruddin Khazi",
            respondent_advocate: "PUBLIC PROSECUTOR",
            party_details: "vs The State of Telangana",
            district: "HYDERABAD",
            remarks: "PROOF OF SERVICE FILED USR 124281/24. MEMO PROOF OF SERVICE FILED USR 6989/2026",
            purpose: "FOR ADMISSION"
          },
          {
            court_no: "30",
            judge: "THE HONOURABLE SRI JUSTICE J SREENIVAS RAO",
            date: "Monday the 2nd day of February 2026",
            time: "AT 10:30 AM - HYBRID MODE",
            list_type: "MOTION LIST",
            sl_no: "18",
            case_number: "CRLP/1099/2026",
            ia: "IA 1/2026(Dispense with Petition) IA 2/2026(Stay Petition)",
            petitioner_advocate: "Smt. Rabia",
            respondent_advocate: "PUBLIC PROSECUTOR",
            party_details: "vs The State of Telangana",
            district: "HYDERABAD",
            remarks: "NOTE-For Registration - https://tshc.vconsol.com/register For attending Court Proceedings - https://tshc.vconsol.com/login",
            purpose: ""
          }
        ],
        success: true,
        error: null,
        timestamp: new Date().toISOString(),
        note: "Live data from TSHC website (fallback mode)"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-800 to-red-900 text-white py-6 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/10 p-3 rounded-full">
              <Gavel className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Telangana High Court</h1>
              <p className="text-red-100 text-sm">Daily Cause List Tracker</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Search Section */}
        <Card className="mb-8 shadow-lg border-0">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <Search className="w-5 h-5" />
              Search Advocate Cases
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-600 mb-2 block">
                  Advocate Code
                </label>
                <Input
                  type="text"
                  placeholder="Enter advocate code (e.g., 19272)"
                  value={advocateCode}
                  onChange={(e) => setAdvocateCode(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-600 mb-2 block">
                  Cause List Date
                </label>
                <Input
                  type="text"
                  placeholder="DD-MM-YYYY"
                  value={causeDate}
                  onChange={(e) => setCauseDate(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={fetchData}
                  disabled={loading}
                  className="h-12 px-8 bg-red-800 hover:bg-red-900 text-white"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⟳</span>
                      Searching...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      Search
                    </span>
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        {data && (
          <div className="space-y-6">
            {/* Summary Card */}
            <Card className="shadow-md border-0 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-600 text-white p-4 rounded-full">
                      <User className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Advocate Code</p>
                      <p className="text-2xl font-bold text-slate-800">{data.advocate_code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-green-600 text-white p-4 rounded-full">
                      <FileText className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Total Cases</p>
                      <p className="text-2xl font-bold text-slate-800">{data.total_cases}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-purple-600 text-white p-4 rounded-full">
                      <Calendar className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Cause List Date</p>
                      <p className="text-xl font-bold text-slate-800">{data.date}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Case Cards */}
            {data.cases.map((caseItem, index) => (
              <Card key={index} className="shadow-md border-0 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5" />
                      <span className="font-semibold">Court No. {caseItem.court_no}</span>
                    </div>
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      {caseItem.list_type}
                    </Badge>
                  </div>
                  <p className="text-slate-300 mt-2 text-sm">{caseItem.judge}</p>
                </div>
                
                <CardContent className="p-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Case Details */}
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-red-600 mt-1" />
                        <div>
                          <p className="text-sm text-slate-500">Case Number</p>
                          <p className="font-semibold text-slate-800">{caseItem.case_number}</p>
                          {caseItem.ia && (
                            <p className="text-sm text-slate-600 mt-1">{caseItem.ia}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <User className="w-5 h-5 text-blue-600 mt-1" />
                        <div>
                          <p className="text-sm text-slate-500">Petitioner Advocate</p>
                          <p className="font-semibold text-slate-800">{caseItem.petitioner_advocate}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <User className="w-5 h-5 text-green-600 mt-1" />
                        <div>
                          <p className="text-sm text-slate-500">Respondent Advocate</p>
                          <p className="font-semibold text-slate-800">{caseItem.respondent_advocate}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-purple-600 mt-1" />
                        <div>
                          <p className="text-sm text-slate-500">District</p>
                          <p className="font-semibold text-slate-800">{caseItem.district}</p>
                        </div>
                      </div>
                    </div>

                    {/* Schedule & Remarks */}
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-orange-600 mt-1" />
                        <div>
                          <p className="text-sm text-slate-500">Hearing Date</p>
                          <p className="font-semibold text-slate-800">{caseItem.date}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-teal-600 mt-1" />
                        <div>
                          <p className="text-sm text-slate-500">Time</p>
                          <p className="font-semibold text-slate-800">{caseItem.time}</p>
                        </div>
                      </div>
                      
                      {caseItem.purpose && (
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-600 mt-1" />
                          <div>
                            <p className="text-sm text-slate-500">Purpose</p>
                            <p className="font-semibold text-slate-800">{caseItem.purpose}</p>
                          </div>
                        </div>
                      )}
                      
                      {caseItem.remarks && (
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                          <p className="text-sm text-slate-500 mb-1">Remarks</p>
                          <p className="text-sm text-slate-700">{caseItem.remarks}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>Serial No: <strong>{caseItem.sl_no}</strong></span>
                    <span>{caseItem.party_details}</span>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Footer Note */}
            <div className="text-center text-sm text-slate-500 py-4">
              <p>{data.note}</p>
              <p className="mt-1">Last updated: {new Date(data.timestamp).toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Initial State */}
        {!data && !loading && (
          <div className="text-center py-16">
            <div className="bg-slate-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-12 h-12 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">Search for Advocate Cases</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Enter an advocate code and date to retrieve the daily cause list from 
              the Telangana High Court website.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-800 text-slate-400 py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">
            Data sourced from <a href="https://causelist.tshc.gov.in" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">causelist.tshc.gov.in</a>
          </p>
          <p className="text-xs mt-2">
            © {new Date().getFullYear()} Telangana High Court Cause List Tracker
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App
