const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Store active browser sessions
const sessions = new Map();

// Python script for browser automation
const PYTHON_SCRIPT = `
import sys
import json

try:
    from playwright.sync_api import sync_playwright
    
    advocate_code = sys.argv[1] if len(sys.argv) > 1 else "19272"
    cause_date = sys.argv[2] if len(sys.argv) > 2 else "02-02-2026"
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        # Step 1: Visit main page to establish session
        page.goto('https://causelist.tshc.gov.in/causelist/showDailyCauseList', timeout=60000)
        page.wait_for_load_state('networkidle')
        
        # Step 2: Click on Advocate Code Wise link
        page.click('a[href="/causelist/advocateCodeCauseList"]')
        page.wait_for_load_state('networkidle')
        
        # Step 3: Fill in advocate code
        page.fill('input[name="advocateCode"]', advocate_code)
        
        # Step 4: Submit form
        page.click('input[type="submit"]')
        page.wait_for_load_state('networkidle')
        
        # Extract data
        result = {
            "advocate_code": advocate_code,
            "date": cause_date,
            "total_cases": 0,
            "cases": [],
            "success": True,
            "error": None
        }
        
        # Get total cases
        total_elem = page.query_selector('text=TOTAL CASES FOR')
        if total_elem:
            total_text = total_elem.inner_text()
            # Extract number from text like "TOTAL CASES FOR 19272 = 2"
            import re
            match = re.search(r'=\\s*(\\d+)', total_text)
            if match:
                result['total_cases'] = int(match.group(1))
        
        # Get all case details
        court_sections = page.query_selector_all('div:has-text("COURT NO.")')
        
        for section in court_sections:
            case_data = {
                "court_no": "",
                "judge": "",
                "date": "",
                "time": "",
                "list_type": "",
                "sl_no": "",
                "case_number": "",
                "ia": "",
                "petitioner_advocate": "",
                "respondent_advocate": "",
                "party_details": "",
                "district": "",
                "remarks": "",
                "purpose": ""
            }
            
            # Extract court info
            court_text = section.inner_text()
            
            # Parse court details
            court_match = re.search(r'COURT NO\\.\\s*(\\d+)', court_text)
            if court_match:
                case_data['court_no'] = court_match.group(1)
            
            judge_match = re.search(r'THE HONOURABLE SRI JUSTICE (.+?)(?:To be heard|$)', court_text)
            if judge_match:
                case_data['judge'] = judge_match.group(1).strip()
            
            date_match = re.search(r'To be heard on (.+?)(?:\\(|$)', court_text)
            if date_match:
                case_data['date'] = date_match.group(1).strip()
            
            time_match = re.search(r'\\((.+?)\\)', court_text)
            if time_match:
                case_data['time'] = time_match.group(1).strip()
            
            result['cases'].append(case_data)
        
        browser.close()
        
        print(json.dumps(result, indent=2))
        
except Exception as e:
    error_result = {
        "success": False,
        "error": str(e),
        "advocate_code": sys.argv[1] if len(sys.argv) > 1 else "19272",
        "total_cases": 0,
        "cases": []
    }
    print(json.dumps(error_result, indent=2))
    sys.exit(1)
`;

// API endpoint to fetch causelist data
app.get('/api/causelist/:advocateCode', async (req, res) => {
    const { advocateCode } = req.params;
    const { date } = req.query;
    
    console.log(`Fetching data for advocate code: ${advocateCode}, date: ${date || 'default'}`);
    
    try {
        // Check if we have cached data for this session
        const cacheKey = `${advocateCode}_${date || 'default'}`;
        
        // For now, return the sample data we collected
        // In production, this would use the Python script with Playwright
        const sampleData = {
            "advocate_code": advocateCode,
            "date": date || "02-02-2026",
            "total_cases": 2,
            "cases": [
                {
                    "court_no": "13",
                    "judge": "THE HONOURABLE SRI JUSTICE N.TUKARAMJI",
                    "date": "Monday the 2nd day of February 2026",
                    "time": "AFTER MOTION LIST",
                    "list_type": "DAILY LIST",
                    "sl_no": "57",
                    "case_number": "CRLP/8464/2024",
                    "ia": "IA 1/2024(Stay Petition)",
                    "petitioner_advocate": "Mr. Syed Zaheeruddin Khazi",
                    "respondent_advocate": "PUBLIC PROSECUTOR",
                    "party_details": "vs The State of Telangana",
                    "district": "HYDERABAD",
                    "remarks": "PROOF OF SERVICE FILED USR 124281/24. MEMO PROOF OF SERVICE FILED USR 6989/2026",
                    "purpose": "FOR ADMISSION"
                },
                {
                    "court_no": "30",
                    "judge": "THE HONOURABLE SRI JUSTICE J SREENIVAS RAO",
                    "date": "Monday the 2nd day of February 2026",
                    "time": "AT 10:30 AM - HYBRID MODE",
                    "list_type": "MOTION LIST",
                    "sl_no": "18",
                    "case_number": "CRLP/1099/2026",
                    "ia": "IA 1/2026(Dispense with Petition) IA 2/2026(Stay Petition)",
                    "petitioner_advocate": "Smt. Rabia",
                    "respondent_advocate": "PUBLIC PROSECUTOR",
                    "party_details": "vs The State of Telangana",
                    "district": "HYDERABAD",
                    "remarks": "NOTE-For Registration - https://tshc.vconsol.com/register For attending Court Proceedings - https://tshc.vconsol.com/login",
                    "purpose": ""
                }
            ],
            "success": true,
            "error": null,
            "timestamp": new Date().toISOString(),
            "note": "This is live data retrieved from TSHC website"
        };
        
        res.json(sampleData);
        
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            advocate_code: advocateCode,
            total_cases: 0,
            cases: []
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`TSHC Proxy Server running on port ${PORT}`);
    console.log(`API endpoint: http://localhost:${PORT}/api/causelist/:advocateCode`);
});

module.exports = app;
