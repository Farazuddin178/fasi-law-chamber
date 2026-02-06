from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import re
from bs4 import BeautifulSoup
from datetime import datetime
import os
import logging
import urllib3

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Suppress SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

app = Flask(__name__, static_folder=None)
CORS(app)

# Import notification routes and cron service
try:
    from notification_routes import notifications_bp
    from cron_service import cron_service
    
    # Register notification routes
    app.register_blueprint(notifications_bp)
    
    # Start cron jobs
    cron_service.start_all_jobs()
    logging.info("Notification system initialized successfully")
except ImportError as e:
    logging.warning(f"Notification system not available - missing dependencies: {e}")
    logging.info("Run: pip install twilio supabase apscheduler python-dotenv")
except Exception as e:
    logging.error(f"Failed to initialize notification system: {e}")



@app.route('/ping', methods=['GET'])
def ping():
    """Simple echo endpoint to test connectivity"""
    return jsonify({'status': 'ok', 'message': 'Proxy server is running'})

@app.route('/getCaseDetails', methods=['GET'])
def get_case_details():
    try:
        mtype = request.args.get('mtype')
        mno = request.args.get('mno')
        myear = request.args.get('myear')
        
        url = f'https://csis.tshc.gov.in/getCaseDetails?mtype={mtype}&mno={mno}&myear={myear}'
        response = requests.get(url, timeout=60, verify=False)
        data = response.json()
        return jsonify(data)
    except Exception as e:
        logging.error(f"Error fetching case details: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/getAdvReport', methods=['GET'])
def get_adv_report():
    try:
        advcode = request.args.get('advcode')
        year = request.args.get('year')
        
        url = f'https://csis.tshc.gov.in/getAdvReport?advcode={advcode}&year={year}'
        response = requests.get(url, timeout=60, verify=False)
        data = response.json()
        return jsonify(data)
    except Exception as e:
        logging.error(f"Error fetching advocate report: {str(e)}")
        return jsonify({'error': str(e)}), 500

# ==========================================
# TSHC SCRAPER - Requests Session Version
# ==========================================

class TSHCScraper:
    """Scrapes TSHC using requests session (no Selenium needed)"""

    def __init__(self):
        self.base_url = "https://causelist.tshc.gov.in"
        self.form_url = f"{self.base_url}/advocateCodeCauseList"
        self.result_url = f"{self.base_url}/advocateCodeWiseView"
        self.session = requests.Session()
        retry = Retry(
            total=3,
            backoff_factor=0.8,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=frozenset(["GET", "POST"]),
            raise_on_status=False
        )
        adapter = HTTPAdapter(max_retries=retry)
        self.session.mount("https://", adapter)
        self.session.mount("http://", adapter)
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        })
    
    def fetch_data(self, advocate_code, date_str):
        """Fetch causelist data using requests session"""
        try:
            logging.info(f"[TSHC] Starting scrape for code: {advocate_code}, date: {date_str}")

            form_response = self.session.get(self.form_url, timeout=30, verify=False)

            payload = {
                'advocateCode': advocate_code,
                'listDate': date_str
            }
            result_response = self.session.post(
                self.result_url,
                data=payload,
                headers={
                    'Referer': self.form_url,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                timeout=30,
                verify=False
            )

            result = self._parse_html(result_response.text, advocate_code, date_str)
            result['method'] = 'requests-session'
            result['timestamp'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            logging.info(f"[TSHC] Success: Found {result['count']} cases")
            return result

        except Exception as e:
            logging.error(f"[TSHC] Error: {str(e)}")
            return {
                "error": str(e),
                "cases": [],
                "count": 0,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }

    def _parse_html(self, html, code, date_str):
        """Parse the results HTML based on TSHC structure"""
        soup = BeautifulSoup(html, 'html.parser')
        cases = []

        total_cases = 0
        page_text = soup.get_text()
        match = re.search(r'TOTAL CASES FOR\s+\d+\s*=\s*(\d+)', page_text)
        if match:
            total_cases = int(match.group(1))
            logging.info(f"[TSHC] Total cases from header: {total_cases}")

        tables = soup.find_all('table', {'id': 'dataTable'})
        logging.info(f"[TSHC] Found {len(tables)} case tables")

        current_court = None
        current_judge = None
        current_stage = None

        for table in tables:
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

            tbodies = table.find_all('tbody')
            for tbody in tbodies:
                rows = tbody.find_all('tr')
                for row in rows:
                    stage_span = row.find('span', class_='stage-name')
                    if stage_span:
                        current_stage = stage_span.get_text(strip=True)
                        continue

                    cols = row.find_all('td')
                    if len(cols) >= 6:
                        s_no = cols[0].get_text(strip=True)

                        case_col = cols[1]
                        case_link = case_col.find('a', id='caseNumber')
                        case_no = case_link.get_text(strip=True) if case_link else case_col.get_text(strip=True)

                        connected_cases = []
                        for div in case_col.find_all('div', {'data-case-id': True}):
                            connected_cases.append(div.get_text(strip=True))

                        party_col = cols[2]
                        party_text = party_col.get_text(separator='\n', strip=True)
                        party_lines = [line.strip() for line in party_text.split('\n') if line.strip()]

                        petitioner = ''
                        respondent = ''
                        for i, line in enumerate(party_lines):
                            if 'vs' in line.lower():
                                petitioner = ' '.join(party_lines[:i])
                                respondent = ' '.join(party_lines[i + 1:])
                                break

                        pet_adv = cols[3].get_text(strip=True)
                        res_adv = cols[4].get_text(strip=True)

                        district_col = cols[5]
                        district_div = district_col.find('div', style=re.compile(r'color:#1e74cf'))
                        district = district_div.get_text(strip=True) if district_div else district_col.get_text(strip=True)

                        remarks_div = district_col.find('div', style=lambda x: x and 'color:#1e74cf' not in x)
                        remarks = remarks_div.get_text(strip=True) if remarks_div else ''

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
            'date': date_str
        }


@app.route('/getDailyCauselist', methods=['GET'])
def get_daily_causelist():
    try:
        advocate_code = request.args.get('advocateCode')
        list_date = request.args.get('listDate')
        
        logging.info(f"[API] /getDailyCauselist request - code={advocate_code}, date={list_date}")
        
        if not list_date:
            today = datetime.now()
            list_date = today.strftime("%d-%m-%Y")
        
        logging.info(f"[API] Starting scrape: code={advocate_code}, date={list_date}")
        
        scraper = TSHCScraper()
        result = scraper.fetch_data(advocate_code, list_date)
        
        logging.info(f"[API] Success: {result.get('count', 0)} cases found")
        return jsonify(result), 200
        
    except Exception as e:
        logging.error(f"[API] Error: {str(e)}")
        return jsonify({'error': str(e), 'cases': [], 'count': 0}), 500


@app.route('/getSittingArrangements', methods=['GET'])
def get_sitting_arrangements():
    try:
        url = 'https://tshc.gov.in/processBodySetionTypes?id=197'
        response = requests.get(url, verify=False, timeout=20)
        
        if response.status_code != 200:
            logging.error(f"Sitting arrangements API error: {response.status_code}")
            return jsonify({'error': 'Unable to fetch sitting arrangements from court website'}), 502
        
        soup = BeautifulSoup(response.text, 'html.parser')

        # Find all sitting arrangement list items
        arrangements = []
        all_lis = soup.find_all('li')
        
        for li in all_lis:
            a_tag = li.find('a')
            if a_tag and 'Sitting Arrangement' in a_tag.text:
                arrangements.append({
                    'title': a_tag.text.strip(),
                    'link': a_tag.get('href', ''),
                    'timestamp': datetime.now().isoformat()
                })

        return jsonify({
            'arrangements': arrangements,
            'lastUpdated': datetime.now().isoformat()
        })
    except requests.exceptions.Timeout:
        logging.warning("Sitting arrangements request timeout")
        return jsonify({'error': 'Court website is taking too long. Please try again'}), 504
    except requests.exceptions.RequestException as e:
        logging.error(f"Request error: {str(e)}")
        return jsonify({'error': 'Unable to connect to court website'}), 502
    except Exception as e:
        logging.error(f"Unexpected error: {str(e)}", exc_info=True)
        return jsonify({'error': 'An error occurred. Please try again later'}), 500

# Catch-all route for React app (must be last)
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react_app(path):
    """Serve static files or fall back to index.html for client-side routing"""
    dist_dir = os.path.join(app.root_path, 'dist')
    if path:
        file_path = os.path.join(dist_dir, path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return send_from_directory(dist_dir, path)
    return send_from_directory(dist_dir, 'index.html')

if __name__ == '__main__':
    print("=" * 50)
    print("PROXY SERVER - Bypassing CORS")
    print("=" * 50)
    app.run(port=5001, debug=True)
