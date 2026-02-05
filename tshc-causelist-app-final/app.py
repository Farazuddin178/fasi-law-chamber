"""
TSHC Causelist Scraper & Manager
A complete web application for scraping, viewing, and managing Telangana High Court causelist data.
"""

from flask import Flask, render_template, jsonify, request, send_file
import requests
from requests.packages.urllib3.exceptions import InsecureRequestWarning
from bs4 import BeautifulSoup
from datetime import datetime
import json
import os
import re

# Disable SSL warnings
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from io import BytesIO

app = Flask(__name__)

# Configuration
SAVED_DATA_DIR = "saved_data"
BASE_URL = "https://causelist.tshc.gov.in"
FORM_URL = f"{BASE_URL}/advocateCodeCauseList"
RESULT_URL = f"{BASE_URL}/advocateCodeWiseView"

# Ensure saved data directory exists
os.makedirs(SAVED_DATA_DIR, exist_ok=True)


class TSHCScraper:
    """Scraper for TSHC Causelist using requests (no Selenium needed)"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        })
    
    def fetch_data(self, advocate_code: str, date_str: str) -> dict:
        """
        Fetch causelist data for given advocate code and date.
        
        Args:
            advocate_code: The advocate code (e.g., "19272")
            date_str: Date in DD-MM-YYYY format
        
        Returns:
            dict: Parsed case data with metadata
        """
        try:
            print(f"[INFO] Starting scrape for Code: {advocate_code}, Date: {date_str}")
            
            # Step 1: Get the form page to establish session
            print(f"[INFO] Loading form page: {FORM_URL}")
            form_response = self.session.get(FORM_URL, timeout=30, verify=False)
            form_response.raise_for_status()
            print(f"[INFO] Form page loaded, status: {form_response.status_code}")
            
            # Step 2: Submit the form with POST request
            # The form sends advocateCode and listDate
            payload = {
                'advocateCode': advocate_code,
                'listDate': date_str
            }
            
            print(f"[INFO] Submitting form with payload: {payload}")
            result_response = self.session.post(
                RESULT_URL,
                data=payload,
                headers={
                    'Referer': FORM_URL,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout=30,
                verify=False
            )
            result_response.raise_for_status()
            print(f"[INFO] Result page loaded, status: {result_response.status_code}")
            
            # Step 3: Parse the HTML response
            return self._parse_html(result_response.text, advocate_code, date_str)
            
        except requests.RequestException as e:
            print(f"[ERROR] Request failed: {str(e)}")
            return {
                "error": f"Network error: {str(e)}",
                "cases": [],
                "count": 0
            }
        except Exception as e:
            print(f"[ERROR] Unexpected error: {str(e)}")
            import traceback
            traceback.print_exc()
            return {
                "error": str(e),
                "cases": [],
                "count": 0
            }
    
    def _parse_html(self, html: str, code: str, date: str) -> dict:
        """Parse the results HTML based on actual TSHC structure"""
        soup = BeautifulSoup(html, 'html.parser')
        cases = []
        
        # Extract total cases count from header
        total_cases = 0
        page_text = soup.get_text()
        match = re.search(r'TOTAL CASES FOR\s+\d+\s*=\s*(\d+)', page_text)
        if match:
            total_cases = int(match.group(1))
            print(f"[INFO] Total cases from header: {total_cases}")
        
        # Find all case tables
        tables = soup.find_all('table', {'id': 'dataTable'})
        print(f"[INFO] Found {len(tables)} case tables")
        
        current_court = None
        current_judge = None
        current_stage = None
        
        for table in tables:
            # Extract court info from table header
            court_header = table.find_previous('thead')
            if court_header:
                court_div = court_header.find('div', string=re.compile(r'COURT NO\.'))
                if court_div:
                    current_court = court_div.get_text(strip=True)
                
                judge_div = court_header.find('div', string=re.compile(r'THE HONOURABLE'))
                if judge_div:
                    current_judge = judge_div.get_text(strip=True)
                
                list_type_div = court_header.find('div', style=re.compile(r'color:#c90d1f'))
                if list_type_div:
                    current_stage = list_type_div.get_text(strip=True)
            
            # Find all tbody elements in the table
            tbodies = table.find_all('tbody')
            
            for tbody in tbodies:
                rows = tbody.find_all('tr')
                
                for row in rows:
                    # Check if this is a stage header row
                    stage_span = row.find('span', class_='stage-name')
                    if stage_span:
                        current_stage = stage_span.get_text(strip=True)
                        continue
                    
                    # Check if this is a case row (has 6 columns)
                    cols = row.find_all('td')
                    if len(cols) >= 6:
                        # Extract case data
                        s_no = cols[0].get_text(strip=True)
                        
                        # Case number is in column 1 with a link
                        case_col = cols[1]
                        case_link = case_col.find('a', id='caseNumber')
                        case_no = case_link.get_text(strip=True) if case_link else case_col.get_text(strip=True)
                        
                        # Get connected cases (IAs)
                        connected_cases = []
                        for div in case_col.find_all('div', {'data-case-id': True}):
                            connected_cases.append(div.get_text(strip=True))
                        
                        # Party details
                        party_col = cols[2]
                        party_text = party_col.get_text(separator='\n', strip=True)
                        party_lines = [line.strip() for line in party_text.split('\n') if line.strip()]
                        
                        petitioner = ''
                        respondent = ''
                        
                        for i, line in enumerate(party_lines):
                            if 'vs' in line.lower():
                                petitioner = ' '.join(party_lines[:i])
                                respondent = ' '.join(party_lines[i+1:])
                                break
                        
                        # Petitioner advocate
                        pet_adv = cols[3].get_text(strip=True)
                        
                        # Respondent advocate
                        res_adv = cols[4].get_text(strip=True)
                        
                        # District/Remarks
                        district_col = cols[5]
                        district = district_col.find('div', style=re.compile(r'color:#1e74cf'))
                        district = district.get_text(strip=True) if district else district_col.get_text(strip=True)
                        
                        remarks_div = district_col.find('div', style=lambda x: x and 'color:#1e74cf' not in x)
                        remarks = remarks_div.get_text(strip=True) if remarks_div else ''
                        
                        # Only add if we have valid case number
                        if case_no and '/' in case_no:
                            cases.append({
                                's_no': s_no,
                                'case_no': case_no,
                                'connected_cases': connected_cases,
                                'petitioner': petitioner,
                                'respondent': respondent,
                                'petitioner_advocate': pet_adv,
                                'respondent_advocate': res_adv,
                                'district': district,
                                'remarks': remarks,
                                'court': current_court,
                                'judge': current_judge,
                                'stage': current_stage
                            })
        
        return {
            'cases': cases,
            'count': len(cases),
            'total_cases_header': total_cases,
            'advocate_code': code,
            'date': date,
            'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            'method': 'requests-session'
        }


def generate_pdf(data: dict) -> BytesIO:
    """Generate PDF from causelist data"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.HexColor('#1e3a8a'),
        spaceAfter=20,
        alignment=1  # Center
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#64748b'),
        spaceAfter=20,
        alignment=1
    )
    
    # Title
    elements.append(Paragraph("Telangana High Court - Causelist", title_style))
    elements.append(Paragraph(f"Advocate Code: {data['advocate_code']} | Date: {data['date']} | Cases: {data['count']}", subtitle_style))
    elements.append(Spacer(1, 20))
    
    # Table data
    table_data = [['S.No', 'Case No', 'Petitioner', 'Respondent', 'Petitioner Advocate', 'Respondent Advocate', 'District']]
    
    for case in data['cases']:
        table_data.append([
            case['s_no'],
            case['case_no'],
            Paragraph(case['petitioner'][:50], styles['Small']),
            Paragraph(case['respondent'][:50], styles['Small']),
            Paragraph(case['petitioner_advocate'][:30], styles['Small']),
            Paragraph(case['respondent_advocate'][:30], styles['Small']),
            case['district']
        ])
    
    # Create table
    table = Table(table_data, repeatRows=1)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a8a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f8fafc')),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    
    elements.append(table)
    doc.build(elements)
    buffer.seek(0)
    return buffer


# Routes
@app.route('/')
def index():
    """Main dashboard page"""
    return render_template('index.html')


@app.route('/history')
def history():
    """View saved causelist history"""
    return render_template('history.html')


@app.route('/api/search')
def search():
    """API endpoint to search causelist"""
    code = request.args.get('code', '').strip()
    date = request.args.get('date', '').strip()
    
    if not code:
        return jsonify({'error': 'Advocate code is required', 'cases': [], 'count': 0}), 400
    
    if not date:
        date = datetime.now().strftime("%d-%m-%Y")
    
    scraper = TSHCScraper()
    result = scraper.fetch_data(code, date)
    
    return jsonify(result)


@app.route('/api/save', methods=['POST'])
def save_data():
    """Save causelist data to file"""
    try:
        data = request.json
        filename = f"causelist_{data['advocate_code']}_{data['date'].replace('-', '')}_{datetime.now().strftime('%H%M%S')}.json"
        filepath = os.path.join(SAVED_DATA_DIR, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        return jsonify({'success': True, 'filename': filename, 'message': 'Data saved successfully'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/history')
def get_history():
    """Get list of saved causelists"""
    try:
        files = []
        for filename in os.listdir(SAVED_DATA_DIR):
            if filename.endswith('.json'):
                filepath = os.path.join(SAVED_DATA_DIR, filename)
                with open(filepath, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                files.append({
                    'filename': filename,
                    'advocate_code': data.get('advocate_code', ''),
                    'date': data.get('date', ''),
                    'count': data.get('count', 0),
                    'timestamp': data.get('timestamp', ''),
                    'filepath': filepath
                })
        
        # Sort by timestamp (newest first)
        files.sort(key=lambda x: x['timestamp'], reverse=True)
        return jsonify({'files': files})
    except Exception as e:
        return jsonify({'error': str(e), 'files': []}), 500


@app.route('/api/history/<filename>')
def get_saved_file(filename):
    """Get specific saved causelist data"""
    try:
        filepath = os.path.join(SAVED_DATA_DIR, filename)
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return jsonify(data)
        else:
            return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/delete/<filename>', methods=['DELETE'])
def delete_file(filename):
    """Delete a saved causelist"""
    try:
        filepath = os.path.join(SAVED_DATA_DIR, filename)
        if os.path.exists(filepath):
            os.remove(filepath)
            return jsonify({'success': True, 'message': 'File deleted successfully'})
        else:
            return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/export/pdf', methods=['POST'])
def export_pdf():
    """Export causelist data as PDF"""
    try:
        data = request.json
        pdf_buffer = generate_pdf(data)
        
        filename = f"causelist_{data['advocate_code']}_{data['date'].replace('-', '')}.pdf"
        
        return send_file(
            pdf_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/export/json', methods=['POST'])
def export_json():
    """Export causelist data as JSON file"""
    try:
        data = request.json
        json_str = json.dumps(data, indent=2, ensure_ascii=False)
        buffer = BytesIO(json_str.encode('utf-8'))
        
        filename = f"causelist_{data['advocate_code']}_{data['date'].replace('-', '')}.json"
        
        return send_file(
            buffer,
            mimetype='application/json',
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("=" * 70)
    print("🏛️  TSHC Causelist Scraper & Manager")
    print("=" * 70)
    print("📍 Open: http://localhost:5000")
    print("📁 Saved data directory:", os.path.abspath(SAVED_DATA_DIR))
    print("=" * 70)
    app.run(debug=True, host='0.0.0.0', port=5000)
