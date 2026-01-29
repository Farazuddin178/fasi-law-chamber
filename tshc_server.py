"""
TSHC Advocate Cause List - FINAL CORRECTED VERSION
Fixed: URL trailing spaces, element finding, Chrome compatibility
"""

from flask import Flask, render_template_string, jsonify, request
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from bs4 import BeautifulSoup
from datetime import datetime
import time

app = Flask(__name__)

class TSHCScraper:
    def __init__(self):
        # STRICTLY NO TRAILING SPACES
        self.base_url = "https://causelist.tshc.gov.in/advocateCodeCauseList"
    
    def fetch_data(self, advocate_code, date_str):
        driver = None
        try:
            print(f"[INFO] Scraping Code: {advocate_code}, Date: {date_str}")
            
            # Chrome setup
            chrome_options = Options()
            chrome_options.add_argument('--headless')
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-gpu')
            chrome_options.add_argument('--window-size=1920,1080')
            chrome_options.add_argument('--disable-blink-features=AutomationControlled')
            chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
            chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
            chrome_options.add_experimental_option('useAutomationExtension', False)
            
            # Initialize driver
            service = Service(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service, options=chrome_options)
            
            # Load page
            print(f"[INFO] Loading: {self.base_url}")
            driver.get(self.base_url)
            time.sleep(3)  # Wait for page to fully load
            
            print(f"[INFO] Page title: {driver.title}")
            print(f"[INFO] Current URL: {driver.current_url}")
            
            # Find advocate input using multiple strategies
            adv_input = self._safe_find_element(driver, [
                (By.NAME, "advocateCode"),
                (By.ID, "advocateCode"),
                (By.CSS_SELECTOR, "input[name='advocateCode']"),
                (By.XPATH, "//input[@placeholder='Enter Advocate Code']"),
                (By.XPATH, "//input[contains(@name, 'advocate')]"),
            ])
            
            if not adv_input:
                return {"error": "Could not find advocate code field. Website may have changed.", "cases": []}
            
            # Fill advocate code
            adv_input.clear()
            adv_input.send_keys(str(advocate_code))
            print(f"[INFO] Entered advocate code: {advocate_code}")
            
            # Find and fill date
            date_input = self._safe_find_element(driver, [
                (By.NAME, "causeListDate"),
                (By.ID, "causeListDate"),
                (By.CSS_SELECTOR, "input[type='date']"),
                (By.XPATH, "//input[@placeholder='Select Date']"),
            ])
            
            if date_input:
                date_input.clear()
                # Try different date formats
                date_input.send_keys(date_str)
                print(f"[INFO] Entered date: {date_str}")
            
            # Find and click submit
            submit_btn = self._safe_find_element(driver, [
                (By.CSS_SELECTOR, "input[type='submit']"),
                (By.CSS_SELECTOR, "button[type='submit']"),
                (By.XPATH, "//input[@value='Search']"),
                (By.XPATH, "//input[@value='Submit']"),
                (By.XPATH, "//button[contains(text(), 'Search')]"),
                (By.XPATH, "//button[contains(text(), 'Submit')]"),
            ])
            
            if not submit_btn:
                # Try pressing Enter on the advocate field instead
                adv_input.submit()
                print("[INFO] Submitted via Enter key")
            else:
                submit_btn.click()
                print("[INFO] Clicked submit button")
            
            # Wait for results to load
            time.sleep(5)  # TSHC is slow
            
            # Check for "no records" or error messages
            page_text = driver.find_element(By.TAG_NAME, "body").text.lower()
            if "no record" in page_text or "not found" in page_text or "no data" in page_text:
                return {"cases": [], "count": 0, "message": "No cases found for this advocate on this date."}
            
            # Parse results
            html = driver.page_source
            return self._parse_html(html)
            
        except Exception as e:
            print(f"[ERROR] {str(e)}")
            # Save screenshot for debugging
            if driver:
                try:
                    driver.save_screenshot("debug_screenshot.png")
                    print("[INFO] Screenshot saved as debug_screenshot.png")
                except:
                    pass
            return {"error": f"Scraping failed: {str(e)}", "cases": []}
            
        finally:
            if driver:
                driver.quit()
    
    def _safe_find_element(self, driver, locator_list):
        """Try multiple locators until one works"""
        for by, value in locator_list:
            try:
                element = WebDriverWait(driver, 5).until(
                    EC.element_to_be_clickable((by, value))
                )
                print(f"[INFO] Found element using: {by}={value}")
                return element
            except:
                continue
        
        # Try without wait as last resort
        for by, value in locator_list:
            try:
                return driver.find_element(by, value)
            except:
                continue
        
        print(f"[WARNING] Could not find element with any strategy")
        return None
    
    def _parse_html(self, html):
        soup = BeautifulSoup(html, 'html.parser')
        cases = []
        
        # Find all tables
        tables = soup.find_all('table')
        print(f"[INFO] Parsing {len(tables)} tables")
        
        for table_idx, table in enumerate(tables):
            rows = table.find_all('tr')
            print(f"[INFO] Table {table_idx}: {len(rows)} rows")
            
            for i, row in enumerate(rows):
                if i == 0:  # Header row
                    continue
                
                cols = row.find_all(['td', 'th'])
                if len(cols) >= 2:
                    texts = [col.get_text(strip=True) for col in cols]
                    case_no = texts[1] if len(texts) > 1 else ''
                    
                    # Validate case number
                    if case_no and ('/' in case_no or case_no.isdigit() or 'case' in case_no.lower()):
                        if not any(x in case_no.lower() for x in ['case number', 's.no']):
                            case = {
                                's_no': texts[0] if len(texts) > 0 else '',
                                'case_no': case_no,
                                'petitioner': texts[2] if len(texts) > 2 else '',
                                'respondent': texts[3] if len(texts) > 3 else '',
                                'court': texts[4] if len(texts) > 4 else '',
                                'judge': texts[5] if len(texts) > 5 else '',
                                'time': texts[6] if len(texts) > 6 else '',
                                'stage': texts[7] if len(texts) > 7 else ''
                            }
                            cases.append(case)
        
        return {"cases": cases, "count": len(cases)}

# HTML UI
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>TSHC Cause List Scraper</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container { max-width: 1000px; margin: 0 auto; }
        .card {
            background: rgba(255,255,255,0.95);
            padding: 30px;
            border-radius: 20px;
            margin-bottom: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        .header { text-align: center; }
        .header h1 { color: #2d3748; margin-bottom: 10px; }
        .form-row { display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; }
        .form-group { flex: 1; min-width: 200px; }
        label { display: block; margin-bottom: 5px; color: #4a5568; font-weight: 600; }
        input {
            width: 100%; padding: 12px; border: 2px solid #e2e8f0;
            border-radius: 8px; font-size: 16px;
        }
        button {
            background: #667eea; color: white; border: none;
            padding: 12px 30px; border-radius: 8px; font-size: 16px;
            cursor: pointer; font-weight: 600;
        }
        button:hover:not(:disabled) { background: #5568d3; }
        button:disabled { opacity: 0.6; cursor: not-allowed; }
        .loading { background: #ebf8ff; padding: 20px; border-radius: 8px; margin-top: 20px; }
        .error { background: #fff5f5; padding: 20px; border-radius: 8px; margin-top: 20px; color: #c53030; }
        .success { background: #f0fff4; padding: 20px; border-radius: 8px; margin-top: 20px; color: #22543d; }
        .case-item { background: #f7fafc; padding: 20px; border-radius: 10px; margin-bottom: 15px; border-left: 4px solid #667eea; }
        .case-title { font-weight: 700; color: #2d3748; margin-bottom: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="card header">
            <h1>🏛️ Telangana High Court</h1>
            <p style="color:#718096;">Advocate Cause List Scraper</p>
        </div>
        
        <div class="card">
            <div class="form-row">
                <div class="form-group">
                    <label>Advocate Code</label>
                    <input type="text" id="code" value="19272">
                </div>
                <div class="form-group">
                    <label>Date (DD-MM-YYYY)</label>
                    <input type="text" id="date" placeholder="28-01-2026">
                </div>
            </div>
            <button onclick="search()" id="btn">🔍 Search Cases</button>
            <div id="status"></div>
        </div>
        
        <div id="results" class="card" style="display:none;">
            <h2 style="margin-bottom:20px; color:#2d3748;">Results</h2>
            <div id="cases"></div>
        </div>
    </div>

    <script>
        document.getElementById('date').value = new Date().toLocaleDateString('en-GB').replace(/\\//g, '-');
        
        async function search() {
            const btn = document.getElementById('btn');
            const status = document.getElementById('status');
            const results = document.getElementById('results');
            const code = document.getElementById('code').value;
            const date = document.getElementById('date').value;
            
            btn.disabled = true;
            status.className = 'loading';
            status.innerHTML = '<strong>⏳ Loading...</strong><br>Initializing Chrome (15-20 seconds)...';
            
            try {
                const res = await fetch(`/api/search?code=${code}&date=${date}`);
                const data = await res.json();
                
                if (data.error) throw new Error(data.error);
                
                status.className = 'success';
                status.innerHTML = `✅ Found ${data.count} cases`;
                
                const container = document.getElementById('cases');
                container.innerHTML = '';
                
                if (data.cases.length === 0) {
                    container.innerHTML = '<p>No cases found for this date.</p>';
                } else {
                    data.cases.forEach(c => {
                        container.innerHTML += `
                            <div class="case-item">
                                <div class="case-title">⚖️ ${c.case_no}</div>
                                <div><strong>Petitioner:</strong> ${c.petitioner || 'N/A'}</div>
                                <div><strong>Respondent:</strong> ${c.respondent || 'N/A'}</div>
                                ${c.court ? `<div><strong>Court:</strong> ${c.court}</div>` : ''}
                                ${c.judge ? `<div><strong>Judge:</strong> ${c.judge}</div>` : ''}
                                ${c.time ? `<div><strong>Time:</strong> ${c.time}</div>` : ''}
                            </div>
                        `;
                    });
                }
                
                results.style.display = 'block';
                
            } catch (err) {
                status.className = 'error';
                status.innerHTML = `<strong>❌ Error:</strong> ${err.message}<br><br>
                    <strong>Try these solutions:</strong><br>
                    1. Ensure <strong>Google Chrome</strong> is installed<br>
                    2. Run: <code>pip install --upgrade webdriver-manager</code><br>
                    3. Check that date format is DD-MM-YYYY (e.g., 28-01-2026)<br>
                    4. If using an old Chrome version, update it`;
            } finally {
                btn.disabled = false;
            }
        }
    </script>
</body>
</html>
"""

@app.route('/')
def index():
    return render_template_string(HTML_TEMPLATE)

@app.route('/api/search')
def search():
    code = request.args.get('code', '19272')
    date = request.args.get('date', datetime.now().strftime("%d-%m-%Y"))
    scraper = TSHCScraper()
    return jsonify(scraper.fetch_data(code, date))

if __name__ == '__main__':
    print("🚀 TSHC Cause List Scraper")
    print("=" * 50)
    print("📍 Open: http://localhost:5000")
    print("⚠️  Google Chrome must be installed")
    print("=" * 50)
    app.run(debug=True, port=5000)