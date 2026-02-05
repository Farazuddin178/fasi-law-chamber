import { useState, useEffect } from 'react'
import { Search, Calendar, Gavel, Building2, User, MapPin, FileText, Clock, AlertCircle, Download, FileJson, Sheet, Save, RotateCcw, Trash2, Eye, FileDown } from 'lucide-react'
import toast from 'react-hot-toast'
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

// Utility function to format date as DD-MM-YYYY
const formatDateToDDMMYYYY = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

// Utility function to parse DD-MM-YYYY to Date
const parseDateFromDDMMYYYY = (dateStr: string): Date | null => {
  const parts = dateStr.split('-')
  if (parts.length !== 3) return null
  const [day, month, year] = parts.map(p => parseInt(p, 10))
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null
  return new Date(year, month - 1, day)
}

// Download as CSV
const downloadAsCSV = (data: CauseListData) => {
  const headers = ['S. No', 'Case Number', 'Court No', 'Judge', 'Date', 'Time', 'List Type', 'Petitioner Advocate', 'Respondent Advocate', 'Party Details', 'District', 'Purpose', 'IA/USR', 'Remarks']
  
  const rows = data.cases.map((c, idx) => [
    idx + 1,
    c.case_number,
    c.court_no,
    c.judge,
    c.date,
    c.time,
    c.list_type,
    c.petitioner_advocate,
    c.respondent_advocate,
    c.party_details,
    c.district,
    c.purpose || '-',
    c.ia || '-',
    c.remarks || '-'
  ])
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `causelist_${data.advocate_code}_${data.date}.csv`)
  link.click()
  URL.revokeObjectURL(url)
  toast.success('Cause list downloaded as CSV')
}

// Download as JSON
const downloadAsJSON = (data: CauseListData) => {
  const jsonData = {
    advocate_code: data.advocate_code,
    date: data.date,
    total_cases: data.total_cases,
    timestamp: new Date().toISOString(),
    cases: data.cases
  }
  
  const jsonString = JSON.stringify(jsonData, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `causelist_${data.advocate_code}_${data.date}.json`)
  link.click()
  URL.revokeObjectURL(url)
  toast.success('Cause list downloaded as JSON')
}

// Save causelist to localStorage
const saveCauseListToStorage = (data: CauseListData) => {
  try {
    const savedData = localStorage.getItem('saved_causelists')
    const existing = savedData ? JSON.parse(savedData) : {}
    
    const key = `${data.advocate_code}_${data.date}`
    existing[key] = {
      ...data,
      saved_at: new Date().toISOString()
    }
    
    localStorage.setItem('saved_causelists', JSON.stringify(existing))
    toast.success(`Cause list saved for ${data.advocate_code} on ${data.date}`)
  } catch (error) {
    console.error('Error saving cause list:', error)
    toast.error('Failed to save cause list')
  }
}

// Get saved causelists from localStorage
const getSavedCauseLists = (): { [key: string]: CauseListData & { saved_at: string } } => {
  try {
    const savedData = localStorage.getItem('saved_causelists')
    return savedData ? JSON.parse(savedData) : {}
  } catch (error) {
    console.error('Error reading saved cause lists:', error)
    return {}
  }
}

// Delete a saved causelist
const deleteSavedCauseList = (key: string) => {
  try {
    const savedData = localStorage.getItem('saved_causelists')
    const existing = savedData ? JSON.parse(savedData) : {}
    delete existing[key]
    localStorage.setItem('saved_causelists', JSON.stringify(existing))
    toast.success('Cause list deleted')
  } catch (error) {
    console.error('Error deleting cause list:', error)
    toast.error('Failed to delete cause list')
  }
}

const buildHTMLContent = (data: CauseListData) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>causelist_${data.advocate_code}_${data.date.replace(/-/g, '')}</title>
      <style>
        * { margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 1400px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #dc2626; padding-bottom: 20px; }
        .header h1 { color: #1f2937; font-size: 28px; margin-bottom: 5px; }
        .header p { color: #6b7280; font-size: 14px; }
        .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .summary-card .label { font-size: 12px; font-weight: bold; opacity: 0.9; }
        .summary-card .value { font-size: 24px; font-weight: bold; margin-top: 8px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background-color: #1f2937; color: white; padding: 12px; text-align: left; font-size: 13px; font-weight: bold; }
        td { padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
        tr:nth-child(even) { background-color: #f9fafb; }
        tr:hover { background-color: #f3f4f6; }
        .case-number { color: #dc2626; font-weight: bold; }
        .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px; }
        .print-date { color: #9ca3af; font-size: 12px; }
        @media print {
          body { background-color: white; }
          .container { box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 Telangana High Court - Daily Cause List</h1>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="summary">
          <div class="summary-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <div class="label">ADVOCATE CODE</div>
            <div class="value">${data.advocate_code}</div>
          </div>
          <div class="summary-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
            <div class="label">CAUSE LIST DATE</div>
            <div class="value">${data.date}</div>
          </div>
          <div class="summary-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
            <div class="label">TOTAL CASES</div>
            <div class="value">${data.total_cases}</div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>S. No</th>
              <th>Case Number</th>
              <th>Court No</th>
              <th>Judge</th>
              <th>Date</th>
              <th>Time</th>
              <th>List Type</th>
              <th>Petitioner Adv.</th>
              <th>Respondent Adv.</th>
              <th>District</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>
            ${data.cases.map((c, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td class="case-number">${c.case_number}</td>
                <td>${c.court_no}</td>
                <td>${c.judge ? `${c.judge.substring(0, 50)}${c.judge.length > 50 ? '...' : ''}` : '-'}</td>
                <td>${c.date ? c.date.substring(0, 30) : data.date}</td>
                <td>${c.time}</td>
                <td><strong>${c.list_type}</strong></td>
                <td>${c.petitioner_advocate}</td>
                <td>${c.respondent_advocate}</td>
                <td>${c.district}</td>
                <td>${c.purpose || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>This is an electronically generated document. For official use only.</p>
          <p class="print-date">Printed: ${new Date().toLocaleString()}</p>
        </div>
      </div>
    </body>
    </html>
  `

const openPrintWindow = (htmlContent: string): boolean => {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer')
  if (!printWindow) {
    toast.error('Popup blocked. Please allow popups to export PDF.')
    return false
  }

  printWindow.document.open()
  printWindow.document.write(htmlContent)
  printWindow.document.close()

  printWindow.onload = () => {
    printWindow.focus()
    printWindow.print()
  }

  return true
}

// Download as HTML Table
const downloadAsHTML = (data: CauseListData) => {
  const htmlContent = buildHTMLContent(data)
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `causelist_${data.advocate_code}_${data.date}.html`)
  link.click()
  URL.revokeObjectURL(url)
  toast.success('Cause list downloaded as HTML')
}

// Export as PDF using print dialog
const downloadAsPDF = (data: CauseListData) => {
  const htmlContent = buildHTMLContent(data)
  if (openPrintWindow(htmlContent)) {
    toast.success('Print dialog opened for PDF export')
  }
}

export default function DailyCauselistPage() {
  const [advocateCode, setAdvocateCode] = useState('19272')
  const [causeDate, setCauseDate] = useState(formatDateToDDMMYYYY(new Date()))
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<CauseListData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedCauseLists, setSavedCauseLists] = useState<{ [key: string]: CauseListData & { saved_at: string } }>({})
  const [showSaved, setShowSaved] = useState(false)
  
  // Auto-fetch on mount
  useEffect(() => {
    setSavedCauseLists(getSavedCauseLists())

    // Load initial data if we have advocate code
    if (advocateCode.trim()) {
      const debounceTimer = setTimeout(() => {
        fetchData()
      }, 300)
      return () => clearTimeout(debounceTimer)
    }
  }, []) // Only on mount

  const fetchData = async () => {
    if (!advocateCode.trim()) {
      toast.error('Please enter advocate code')
      return
    }

    if (!causeDate) {
      toast.error('Please select a date')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      // Determine backend URL based on environment
      let backendURL = ''
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Local development
        backendURL = 'http://localhost:5001'
      } else if (window.location.hostname.includes('render.com') || window.location.hostname.includes('herokuapp.com')) {
        // Deployment environment - use relative URL (same domain)
        backendURL = ''
      } else {
        // Production - use relative URL
        backendURL = ''
      }

      const apiURL = `${backendURL}/getDailyCauselist?advocateCode=${encodeURIComponent(advocateCode)}&listDate=${encodeURIComponent(causeDate)}`
      console.debug('[fetchData] Requesting from:', apiURL, 'Backend URL:', backendURL || 'relative')
      
      const response = await fetch(apiURL, { 
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      })
      
      if (!response.ok) {
        console.error('[fetchData] API error response:', response.status, response.statusText)
        throw new Error(`Server error: ${response.status} ${response.statusText}`)
      }
      
      const result = await response.json()
      console.debug('[fetchData] API response received, case count:', Array.isArray(result?.cases) ? result.cases.length : 'unknown')
      
      const casesArray = Array.isArray(result) ? result : (Array.isArray(result?.cases) ? result.cases : [])
      if (!Array.isArray(casesArray)) {
        throw new Error('Invalid response format')
      }

      const mappedCases: Case[] = casesArray.map((item: any) => {
        const petitioner = item.petitioner || ''
        const respondent = item.respondent || ''
        const partyDetails = item.party_details || (petitioner || respondent ? `${petitioner}${petitioner && respondent ? ' vs ' : ''}${respondent}` : '')

        return {
          court_no: item.court_no || item.court || '',
          judge: item.judge || '',
          date: item.date || causeDate,
          time: item.time || '',
          list_type: item.list_type || item.stage || '',
          sl_no: item.sl_no || item.s_no || '',
          case_number: item.case_number || item.case_no || '',
          ia: item.ia || (Array.isArray(item.connected_cases) ? item.connected_cases.join(', ') : ''),
          petitioner_advocate: item.petitioner_advocate || '',
          respondent_advocate: item.respondent_advocate || '',
          party_details: partyDetails,
          district: item.district || '',
          remarks: item.remarks || '',
          purpose: item.purpose || ''
        }
      })

      // Transform API response
      const transformedData: CauseListData = {
        advocate_code: result?.advocate_code || advocateCode,
        date: result?.date || causeDate,
        total_cases: result?.count || mappedCases.length,
        cases: mappedCases,
        success: true,
        error: null,
        timestamp: new Date().toISOString(),
        note: 'Real-time data from Telangana High Court'
      }
      
      setData(transformedData)
      toast.success(`Found ${mappedCases.length} case(s)`)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch cause list'
      setError(errorMsg)
      setData(null)
      toast.error(errorMsg)
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-700 via-blue-800 to-blue-900 text-white py-8 shadow-lg">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
              <Gavel className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Daily Cause List</h1>
              <p className="text-blue-100 text-sm mt-1">Telangana High Court - Real-time Case Tracking</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Section */}
        <Card className="mb-8 border-0 shadow-md">
          <CardHeader className="border-b border-gray-200 pb-4 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center gap-2 text-2xl text-gray-900">
              <Search className="w-6 h-6 text-blue-600" />
              Search Advocate Cases
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Advocate Code <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Enter advocate code (e.g., 19272)"
                  value={advocateCode}
                  onChange={(e) => setAdvocateCode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && fetchData()}
                  className="w-full"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Cause List Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={parseDateFromDDMMYYYY(causeDate)?.toISOString().split('T')[0] || ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      const selectedDate = new Date(e.target.value)
                      setCauseDate(formatDateToDDMMYYYY(selectedDate))
                    }
                  }}
                  className="w-full"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={fetchData}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 font-semibold"
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-600 text-white p-3 rounded-lg">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-semibold uppercase">Advocate Code</p>
                      <p className="text-2xl font-bold text-gray-900">{data.advocate_code}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50 to-emerald-100">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-emerald-600 text-white p-3 rounded-lg">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-semibold uppercase">Total Cases</p>
                      <p className="text-2xl font-bold text-gray-900">{data.total_cases}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-purple-600 text-white p-3 rounded-lg">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-semibold uppercase">Date</p>
                      <p className="text-2xl font-bold text-gray-900">{data.date}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Download & Save Options */}
            {data.cases && data.cases.length > 0 && (
              <Card className="border-0 shadow-md bg-gradient-to-r from-amber-50 to-orange-50">
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Download className="w-5 h-5 text-amber-600" />
                        <span className="font-semibold text-gray-900">Download Cause List:</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          onClick={() => downloadAsPDF(data)}
                          variant="outline"
                          className="border-amber-300 text-amber-700 hover:bg-amber-100"
                        >
                          <FileDown className="w-4 h-4 mr-2" />
                          PDF
                        </Button>
                        <Button
                          onClick={() => downloadAsHTML(data)}
                          variant="outline"
                          className="border-amber-300 text-amber-700 hover:bg-amber-100"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          HTML
                        </Button>
                        <Button
                          onClick={() => downloadAsCSV(data)}
                          variant="outline"
                          className="border-amber-300 text-amber-700 hover:bg-amber-100"
                        >
                          <Sheet className="w-4 h-4 mr-2" />
                          CSV
                        </Button>
                        <Button
                          onClick={() => downloadAsJSON(data)}
                          variant="outline"
                          className="border-amber-300 text-amber-700 hover:bg-amber-100"
                        >
                          <FileJson className="w-4 h-4 mr-2" />
                          JSON
                        </Button>
                      </div>
                    </div>
                    
                    <div className="border-t border-amber-200 pt-4 flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Save className="w-5 h-5 text-green-600" />
                        <span className="font-semibold text-gray-900">Save for Later:</span>
                      </div>
                      <Button
                        onClick={() => {
                          saveCauseListToStorage(data)
                          setSavedCauseLists(getSavedCauseLists())
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save Cause List
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Case Cards */}
            {data.cases && data.cases.length > 0 ? (
              <div className="space-y-4">
                {data.cases.map((caseItem, index) => (
                  <Card key={index} className="border-0 shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Building2 className="w-5 h-5" />
                          <span className="font-semibold text-lg">Court No. {caseItem.court_no}</span>
                        </div>
                        <Badge className="bg-white text-blue-700 border-0 font-semibold">
                          {caseItem.list_type}
                        </Badge>
                      </div>
                      <p className="text-blue-100 mt-2 text-sm">{caseItem.judge}</p>
                    </div>
                    
                    <CardContent className="pt-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-4">
                          {/* Case Number */}
                          <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-lg">
                            <FileText className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-gray-600 font-bold uppercase">Case Number</p>
                              <p className="font-bold text-lg text-blue-700">{caseItem.case_number}</p>
                              {caseItem.ia && (
                                <p className="text-sm text-gray-700 mt-1 bg-white p-2 rounded">{caseItem.ia}</p>
                              )}
                            </div>
                          </div>
                          
                          {/* Petitioner Advocate */}
                          <div className="flex items-start gap-3">
                            <User className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs text-gray-600 font-bold uppercase">Petitioner Advocate</p>
                              <p className="font-semibold text-gray-900">{caseItem.petitioner_advocate}</p>
                            </div>
                          </div>
                          
                          {/* Respondent Advocate */}
                          <div className="flex items-start gap-3">
                            <User className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs text-gray-600 font-bold uppercase">Respondent Advocate</p>
                              <p className="font-semibold text-gray-900">{caseItem.respondent_advocate}</p>
                            </div>
                          </div>
                          
                          {/* District */}
                          <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs text-gray-600 font-bold uppercase">District</p>
                              <p className="font-semibold text-gray-900">{caseItem.district}</p>
                            </div>
                          </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4">
                          {/* Date */}
                          <div className="flex items-start gap-3 bg-purple-50 p-3 rounded-lg">
                            <Calendar className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs text-gray-600 font-bold uppercase">Hearing Date</p>
                              <p className="font-semibold text-gray-900">{caseItem.date}</p>
                            </div>
                          </div>
                          
                          {/* Time */}
                          <div className="flex items-start gap-3 bg-orange-50 p-3 rounded-lg">
                            <Clock className="w-5 h-5 text-orange-600 mt-1 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs text-gray-600 font-bold uppercase">Hearing Time</p>
                              <p className="font-semibold text-gray-900">{caseItem.time}</p>
                            </div>
                          </div>
                          
                          {/* Purpose */}
                          {caseItem.purpose && (
                            <div className="flex items-start gap-3">
                              <AlertCircle className="w-5 h-5 text-red-600 mt-1 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-xs text-gray-600 font-bold uppercase">Purpose</p>
                                <p className="font-semibold text-gray-900">{caseItem.purpose}</p>
                              </div>
                            </div>
                          )}
                          
                          {/* Party Details */}
                          {caseItem.party_details && (
                            <div className="text-sm text-gray-700 bg-gray-100 p-3 rounded">
                              <span className="font-semibold">Party Details:</span> {caseItem.party_details}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Remarks */}
                      {caseItem.remarks && (
                        <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                          <div className="flex gap-2">
                            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs text-gray-600 font-bold uppercase mb-1">Remarks</p>
                              <p className="text-sm text-gray-700 leading-relaxed">{caseItem.remarks}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Footer Info */}
                      <div className="border-t border-gray-200 mt-4 pt-4 flex items-center justify-between text-xs text-gray-600">
                        <span>Serial No: <strong className="text-gray-900">{caseItem.sl_no}</strong></span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-0 shadow-md p-12 text-center bg-gray-50">
                <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Cases Found</h3>
                <p className="text-gray-600">No cases found for advocate code <strong>{data.advocate_code}</strong> on <strong>{data.date}</strong></p>
              </Card>
            )}

            {/* Footer Note */}
            <div className="text-center text-sm text-gray-600 py-4 border-t border-gray-200">
              <p className="font-semibold">{data.note}</p>
              <p className="mt-1">Last updated: {new Date(data.timestamp).toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Saved Cause Lists Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              Saved Cause Lists
            </h2>
            <Button
              onClick={() => setShowSaved(!showSaved)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Eye className="w-4 h-4 mr-2" />
              {showSaved ? 'Hide' : 'Show'} Saved ({Object.keys(savedCauseLists).length})
            </Button>
          </div>

          {showSaved && (
            <>
              {Object.keys(savedCauseLists).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(savedCauseLists).map(([key, savedData]) => (
                    <Card key={key} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 font-semibold uppercase">Advocate Code</p>
                            <p className="text-lg font-bold text-gray-900">{savedData.advocate_code}</p>
                          </div>
                          <Badge className="bg-blue-100 text-blue-700 border-0">
                            {savedData.total_cases} Cases
                          </Badge>
                        </div>
                        
                        <div className="space-y-2 mb-4 pb-4 border-b border-gray-200">
                          <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase">Date</p>
                            <p className="font-semibold text-gray-900">{savedData.date}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-semibold uppercase">Saved On</p>
                            <p className="text-sm text-gray-600">{new Date(savedData.saved_at).toLocaleString()}</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            onClick={() => {
                              setAdvocateCode(savedData.advocate_code)
                              setCauseDate(savedData.date)
                              setData(savedData)
                              setShowSaved(false)
                            }}
                            size="sm"
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          <Button
                            onClick={() => {
                              downloadAsPDF(savedData)
                            }}
                            size="sm"
                            variant="outline"
                            className="flex-1"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            PDF
                          </Button>
                          <Button
                            onClick={() => {
                              deleteSavedCauseList(key)
                              setSavedCauseLists(getSavedCauseLists())
                            }}
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 border-red-200"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-0 shadow-md p-8 text-center bg-gray-50">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No saved cause lists yet. Search and save a cause list to access it here anytime.</p>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Initial State */}
        {!data && !loading && !error && (
          <div className="text-center py-16">
            <div className="bg-blue-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-12 h-12 text-blue-600" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">Search Advocate Cases</h3>
            <p className="text-gray-600 max-w-md mx-auto mb-8">
              Enter an advocate code and date to retrieve the daily cause list 
              from the Telangana High Court in real-time.
            </p>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 max-w-2xl mx-auto text-left">
              <h4 className="font-bold text-blue-900 mb-3 text-lg">📝 How to use:</h4>
              <ul className="text-sm text-blue-800 space-y-2.5">
                <li className="flex items-center gap-2"><span className="text-lg">✓</span>Enter your advocate code</li>
                <li className="flex items-center gap-2"><span className="text-lg">✓</span>Select the date using the date picker</li>
                <li className="flex items-center gap-2"><span className="text-lg">✓</span>Click "Search" to fetch live data</li>
                <li className="flex items-center gap-2"><span className="text-lg">✓</span>View all cases and download in multiple formats</li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="font-bold text-white mb-3">About</h4>
              <p className="text-sm">Real-time Daily Cause List tracking for Telangana High Court advocates.</p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-3">Download Formats</h4>
              <p className="text-sm">Export your cause list as HTML, CSV, or JSON for easy sharing and record-keeping.</p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-3">Data Source</h4>
              <p className="text-sm">Data sourced from <a href="https://causelist.tshc.gov.in" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">causelist.tshc.gov.in</a></p>
            </div>
          </div>
          <div className="border-t border-gray-700 pt-6 text-center">
            <p className="text-xs">
              © {new Date().getFullYear()} Telangana High Court Daily Cause List. All Rights Reserved.
            </p>
          </div>
        </div>
        </footer>
      </div>
    )
  }
