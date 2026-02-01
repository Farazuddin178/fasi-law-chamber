import { useState } from 'react'
import { Search, Calendar, Gavel, Building2, User, MapPin, FileText, Clock, AlertCircle } from 'lucide-react'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Alert, 
  AlertDescription 
} from '@/components/ui/alert'

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

export default function DailyCauselistPage() {
  const [advocateCode, setAdvocateCode] = useState('19272')
  const [causeDate, setCauseDate] = useState('02-02-2026')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<CauseListData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const backendURL = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001'
        : ''
      
      const response = await fetch(
        `${backendURL}/api/causelist/${advocateCode}?date=${causeDate}`
      )
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }
      
      setData(result)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMsg)
      console.error('Fetch error:', err)
      
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
        note: "Sample data (using fallback mode - API not available)"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-700 to-red-900 text-white py-8 shadow-lg">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <Gavel className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Telangana High Court</h1>
              <p className="text-red-100 text-sm mt-1">Daily Cause List Tracker</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Section */}
        <Card className="mb-8 border-0 shadow-lg">
          <CardHeader className="border-b pb-4">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Search className="w-5 h-5" />
              Search Advocate Cases
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Advocate Code
                </label>
                <Input
                  type="text"
                  placeholder="Enter advocate code (e.g., 19272)"
                  value={advocateCode}
                  onChange={(e) => setAdvocateCode(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Cause List Date (DD-MM-YYYY)
                </label>
                <Input
                  type="text"
                  placeholder="02-02-2026"
                  value={causeDate}
                  onChange={(e) => setCauseDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={fetchData}
                  disabled={loading}
                  className="w-full bg-red-700 hover:bg-red-800 text-white px-6 py-2"
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
            <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-600 text-white p-4 rounded-lg">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Advocate Code</p>
                      <p className="text-2xl font-bold text-gray-900">{data.advocate_code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-green-600 text-white p-4 rounded-lg">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Total Cases</p>
                      <p className="text-2xl font-bold text-gray-900">{data.total_cases}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-purple-600 text-white p-4 rounded-lg">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Cause List Date</p>
                      <p className="text-xl font-bold text-gray-900">{data.date}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Case Cards */}
            {data.cases && data.cases.length > 0 ? (
              data.cases.map((caseItem, index) => (
                <Card key={index} className="border-0 shadow-md overflow-hidden">
                  <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5" />
                        <span className="font-semibold">Court No. {caseItem.court_no}</span>
                      </div>
                      <Badge className="bg-white/20 text-white border-0">
                        {caseItem.list_type}
                      </Badge>
                    </div>
                    <p className="text-gray-300 mt-3 text-sm">{caseItem.judge}</p>
                  </div>
                  
                  <CardContent className="pt-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Case Details */}
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <FileText className="w-5 h-5 text-red-600 mt-1 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase">Case Number</p>
                            <p className="font-semibold text-gray-900">{caseItem.case_number}</p>
                            {caseItem.ia && (
                              <p className="text-sm text-gray-600 mt-1">{caseItem.ia}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <User className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase">Petitioner Advocate</p>
                            <p className="font-semibold text-gray-900">{caseItem.petitioner_advocate}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <User className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase">Respondent Advocate</p>
                            <p className="font-semibold text-gray-900">{caseItem.respondent_advocate}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase">District</p>
                            <p className="font-semibold text-gray-900">{caseItem.district}</p>
                          </div>
                        </div>
                      </div>

                      {/* Schedule & Remarks */}
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <Calendar className="w-5 h-5 text-orange-600 mt-1 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase">Hearing Date</p>
                            <p className="font-semibold text-gray-900">{caseItem.date}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <Clock className="w-5 h-5 text-teal-600 mt-1 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase">Time</p>
                            <p className="font-semibold text-gray-900">{caseItem.time}</p>
                          </div>
                        </div>
                        
                        {caseItem.purpose && (
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 mt-1 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-gray-500 font-semibold uppercase">Purpose</p>
                              <p className="font-semibold text-gray-900">{caseItem.purpose}</p>
                            </div>
                          </div>
                        )}
                        
                        {caseItem.remarks && (
                          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                            <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Remarks</p>
                            <p className="text-sm text-gray-700">{caseItem.remarks}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="border-t border-gray-200 my-4"></div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>Serial No: <strong className="text-gray-900">{caseItem.sl_no}</strong></span>
                      <span>{caseItem.party_details}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="border-0 shadow-md p-12 text-center">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Cases Found</h3>
                <p className="text-gray-600">No cases found for this advocate code and date.</p>
              </Card>
            )}

            {/* Footer Note */}
            <div className="text-center text-sm text-gray-600 py-4">
              <p>{data.note}</p>
              <p className="mt-1">Last updated: {new Date(data.timestamp).toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Initial State */}
        {!data && !loading && (
          <div className="text-center py-16">
            <div className="bg-gray-200 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-2">Search for Advocate Cases</h3>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              Enter an advocate code and date to retrieve the daily cause list from 
              the Telangana High Court website.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl mx-auto text-left">
              <h4 className="font-semibold text-blue-900 mb-3">How to use:</h4>
              <ul className="text-sm text-blue-700 space-y-2">
                <li>• Enter your advocate code (e.g., 19272)</li>
                <li>• Enter the date in DD-MM-YYYY format</li>
                <li>• Click "Search" to fetch the cause list</li>
                <li>• View all your scheduled hearings and case details</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm">
            Data sourced from <a href="https://causelist.tshc.gov.in" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">causelist.tshc.gov.in</a>
          </p>
          <p className="text-xs mt-2">
            © {new Date().getFullYear()} Telangana High Court Cause List Tracker. All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
