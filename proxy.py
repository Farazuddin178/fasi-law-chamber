from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
from requests.exceptions import SSLError, RequestException
from bs4 import BeautifulSoup
from datetime import datetime
import os
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

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

# Suppress insecure request warnings for verify=False usage on the HC site
requests.packages.urllib3.disable_warnings()

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
        
        if not all([mtype, mno, myear]):
            return jsonify({'error': 'Missing parameters: mtype, mno, myear required'}), 400
        
        url = f'https://csis.tshc.gov.in/getCaseDetails?mtype={mtype}&mno={mno}&myear={myear}'
        # Increased timeout to 60 seconds for slow external APIs
        response = requests.get(url, timeout=60, verify=False)
        
        if response.status_code != 200:
            return jsonify({'error': f'External API returned {response.status_code}'}), 502
        
        data = response.json()
        return jsonify(data)
    except requests.exceptions.Timeout:
        return jsonify({'error': 'External API is slow - please try again'}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({'error': 'Unable to fetch case details', 'details': str(e)}), 502
    except ValueError as e:
        return jsonify({'error': 'Invalid JSON response from external API', 'details': str(e)}), 502
    except Exception as e:
        return jsonify({'error': 'Unexpected error', 'details': str(e)}), 500

@app.route('/getAdvReport', methods=['GET'])
def get_adv_report():
    try:
        advcode = request.args.get('advcode')
        year = request.args.get('year')
        
        if not advcode or not year:
            return jsonify({'error': 'Missing parameters: advcode and year required'}), 400
        
        url = f'https://csis.tshc.gov.in/getAdvReport?advcode={advcode}&year={year}'
        # Increased timeout to 60 seconds for slow external APIs
        response = requests.get(url, timeout=60, verify=False)
        
        if response.status_code != 200:
            return jsonify({'error': f'External API returned {response.status_code}'}), 502
        
        data = response.json()
        return jsonify(data)
    except requests.exceptions.Timeout:
        return jsonify({'error': 'External API is slow - please try again'}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({'error': 'Unable to fetch advocate report', 'details': str(e)}), 502
    except ValueError as e:
        return jsonify({'error': 'Invalid JSON response from external API', 'details': str(e)}), 502
    except Exception as e:
        return jsonify({'error': 'Unexpected error', 'details': str(e)}), 500

import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

# ==========================================
# TSHC SCRAPER - Undetected Chrome Version
# ==========================================

class TSHCScraper:
    """Scrapes TSHC using undetected-chromedriver (bypasses all protections)"""
    
    def __init__(self):
        self.base_url = "https://causelist.tshc.gov.in/advocateCodeCauseList"
    
    def fetch_data(self, advocate_code, date_str):
        """
        Fetch causelist data using undetected Chrome
        Args:
            advocate_code: e.g., "19272"
            date_str: Format "DD-MM-YYYY"
        """
        driver = None
        try:
            logging.info(f"[TSHC] Starting undetected Chrome for code: {advocate_code}, date: {date_str}")
            
            # Configure undetected Chrome
            options = uc.ChromeOptions()
            options.add_argument('--headless')
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument('--disable-gpu')
            options.add_argument('--window-size=1920,1080')
            
            # Try to initialize with auto-detection
            try:
                driver = uc.Chrome(options=options)
            except Exception as chrome_init_error:
                if "version" in str(chrome_init_error).lower() or "session not created" in str(chrome_init_error).lower():
                    logging.info("[TSHC] ChromeDriver version mismatch, trying with version 143...")
                    
                    # MUST create NEW options object - cannot reuse
                    options2 = uc.ChromeOptions()
                    options2.add_argument('--headless')
                    options2.add_argument('--no-sandbox')
                    options2.add_argument('--disable-dev-shm-usage')
                    options2.add_argument('--disable-gpu')
                    options2.add_argument('--window-size=1920,1080')
                    
                    driver = uc.Chrome(options=options2, version_main=143)
                else:
                    raise chrome_init_error
            
            logging.info("[TSHC] Browser initialized, loading page...")
            driver.get(self.base_url)
            time.sleep(5)  # Increased wait for slow TSHC servers
            
            logging.info(f"[TSHC] Page title: {driver.title}")
            logging.info(f"[TSHC] Current URL: {driver.current_url}")
            
            # DEBUG: Save page source to see what's loaded
            try:
                with open('debug_page.html', 'w', encoding='utf-8') as f:
                    f.write(driver.page_source)
                logging.info("[TSHC] Saved page source to debug_page.html")
            except:
                pass
            
            # Take screenshot to see what's on page
            try:
                driver.save_screenshot('debug_screenshot.png')
                logging.info("[TSHC] Saved screenshot to debug_screenshot.png")
            except:
                pass
            
            # Find all input elements to understand page structure
            all_inputs = driver.find_elements(By.TAG_NAME, "input")
            logging.info(f"[TSHC] Found {len(all_inputs)} input elements on page")
            for i, inp in enumerate(all_inputs[:5]):  # Log first 5
                name = inp.get_attribute('name') or 'N/A'
                input_id = inp.get_attribute('id') or 'N/A'
                input_type = inp.get_attribute('type') or 'N/A'
                logging.info(f"[TSHC]   Input {i}: name={name}, id={input_id}, type={input_type}")
            
            # Try multiple strategies to find advocate input
            adv_input = None
            
            # Strategy 1: By NAME
            try:
                adv_input = WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.NAME, "advocateCode"))
                )
                logging.info("[TSHC] Found advocate input by NAME")
            except:
                pass
            
            # Strategy 2: By ID
            if not adv_input:
                try:
                    adv_input = driver.find_element(By.ID, "advocateCode")
                    logging.info("[TSHC] Found advocate input by ID")
                except:
                    pass
            
            # Strategy 3: By CSS selector
            if not adv_input:
                try:
                    adv_input = driver.find_element(By.CSS_SELECTOR, "input[name='advocateCode']")
                    logging.info("[TSHC] Found advocate input by CSS selector")
                except:
                    pass
            
            # Strategy 4: By placeholder text
            if not adv_input:
                try:
                    inputs = driver.find_elements(By.TAG_NAME, "input")
                    for inp in inputs:
                        placeholder = inp.get_attribute('placeholder') or ''
                        if 'advocate' in placeholder.lower() or 'code' in placeholder.lower():
                            adv_input = inp
                            logging.info(f"[TSHC] Found advocate input by placeholder: {placeholder}")
                            break
                except:
                    pass
            
            # Strategy 5: First text input (last resort)
            if not adv_input:
                try:
                    inputs = driver.find_elements(By.CSS_SELECTOR, "input[type='text']")
                    if inputs:
                        adv_input = inputs[0]
                        logging.info("[TSHC] Using first text input as advocate input")
                except:
                    pass
            
            if not adv_input:
                return {
                    "error": "Could not find advocate code input field. Check debug_screenshot.png to see what loaded.",
                    "cases": [],
                    "count": 0,
                    "debug_info": f"Page title: {driver.title}, URL: {driver.current_url}",
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
            
            # Fill advocate code
            adv_input.clear()
            adv_input.send_keys(str(advocate_code))
            logging.info(f"[TSHC] Entered advocate code: {advocate_code}")
            
            # Find date input - try multiple strategies
            date_input = None
            
            try:
                date_input = driver.find_element(By.NAME, "causeListDate")
                logging.info("[TSHC] Found date input by NAME")
            except:
                try:
                    date_input = driver.find_element(By.ID, "causeListDate")
                    logging.info("[TSHC] Found date input by ID")
                except:
                    # Look for date type input
                    inputs = driver.find_elements(By.TAG_NAME, "input")
                    for inp in inputs:
                        if inp.get_attribute('type') == 'date':
                            date_input = inp
                            logging.info("[TSHC] Found date input by type='date'")
                            break
            
            if date_input:
                date_input.clear()
                date_input.send_keys(date_str)
                logging.info(f"[TSHC] Entered date: {date_str}")
            else:
                logging.warning("[TSHC] Could not find date input, proceeding without date")
            
            # Find and click submit
            submit_clicked = False
            
            # Try input type submit
            try:
                submit_btn = driver.find_element(By.CSS_SELECTOR, "input[type='submit']")
                submit_btn.click()
                submit_clicked = True
                logging.info("[TSHC] Clicked submit button (input)")
            except:
                pass
            
            # Try button type submit
            if not submit_clicked:
                try:
                    submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
                    submit_btn.click()
                    submit_clicked = True
                    logging.info("[TSHC] Clicked submit button (button)")
                except:
                    pass
            
            # Try by value/text
            if not submit_clicked:
                try:
                    submit_btn = driver.find_element(By.XPATH, "//input[@value='Search' or @value='Submit' or @value='Go']")
                    submit_btn.click()
                    submit_clicked = True
                    logging.info("[TSHC] Clicked submit by value")
                except:
                    pass
            
            # JavaScript fallback
            if not submit_clicked:
                try:
                    driver.execute_script("""
                        var forms = document.forms;
                        if (forms.length > 0) forms[0].submit();
                    """)
                    logging.info("[TSHC] Submitted via JavaScript")
                except Exception as e:
                    logging.warning(f"[TSHC] JavaScript submit failed: {e}")
            
            logging.info("[TSHC] Waiting for results...")
            time.sleep(6)  # Wait for results
            
            # Save result page for debugging
            try:
                with open('debug_result.html', 'w', encoding='utf-8') as f:
                    f.write(driver.page_source)
                driver.save_screenshot('debug_result.png')
                logging.info("[TSHC] Saved result page for debugging")
            except:
                pass
            
            # Check for no records
            try:
                page_text = driver.find_element(By.TAG_NAME, "body").text.lower()
                if any(phrase in page_text for phrase in ["no record", "not found", "no data", "no cases"]):
                    logging.info("[TSHC] No records found")
                    return {
                        "cases": [],
                        "count": 0,
                        "message": "No cases found for this advocate on this date.",
                        "method": "undetected-chromedriver",
                        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    }
            except:
                pass
            
            # Parse results
            html = driver.page_source
            result = self._parse_html(html)
            result['method'] = 'undetected-chromedriver'
            result['timestamp'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            logging.info(f"[TSHC] Success: Found {result['count']} cases")
            return result
            
        except Exception as e:
            logging.error(f"[TSHC] Error: {str(e)}")
            # Save error state
            if driver:
                try:
                    driver.save_screenshot('error_screenshot.png')
                    with open('error_page.html', 'w', encoding='utf-8') as f:
                        f.write(driver.page_source)
                    logging.info("[TSHC] Saved error screenshots")
                except:
                    pass
            return {
                "error": str(e),
                "cases": [],
                "count": 0,
                "message": "Scraping failed. Check debug screenshots.",
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
        finally:
            if driver:
                try:
                    driver.quit()
                except:
                    pass
    
    def _parse_html(self, html):
        """Parse HTML to extract case data"""
        soup = BeautifulSoup(html, 'html.parser')
        cases = []
        
        tables = soup.find_all('table')
        logging.info(f"[TSHC Parser] Found {len(tables)} tables")
        
        for table_idx, table in enumerate(tables):
            rows = table.find_all('tr')[1:]  # Skip header
            
            for row in rows:
                cols = row.find_all(['td', 'th'])
                if len(cols) >= 3:
                    texts = [col.get_text(strip=True) for col in cols]
                    case_no = texts[1] if len(texts) > 1 else ''
                    
                    # Validate case number
                    if case_no and ('/' in case_no or any(c.isdigit() for c in case_no)):
                        # Skip if header
                        if any(x in case_no.lower() for x in ['case number', 's.no', 'sno']):
                            continue
                        
                        cases.append({
                            's_no': texts[0] if len(texts) > 0 else '',
                            'case_number': case_no,
                            'petitioner_advocate': texts[2] if len(texts) > 2 else '',
                            'respondent_advocate': texts[3] if len(texts) > 3 else '',
                            'court_no': texts[4] if len(texts) > 4 else '',
                            'judge': texts[5] if len(texts) > 5 else '',
                            'time': texts[6] if len(texts) > 6 else '',
                            'list_type': texts[7] if len(texts) > 7 else ''
                        })
        
        logging.info(f"[TSHC Parser] Extracted {len(cases)} cases")
        return {"cases": cases, "count": len(cases)}


@app.route('/getDailyCauselist', methods=['GET'])
def get_daily_causelist():
    """
    Fetch daily causelist using undetected Chrome automation
    
    Query Parameters:
        advocateCode: Required. Advocate code (e.g., "19272")
        listDate: Optional. Date in DD-MM-YYYY format (defaults to today)
    
    Returns:
        JSON with cases array or error message
    """
    try:
        advocate_code = request.args.get('advocateCode', '').strip()
        list_date = request.args.get('listDate', '')
        
        logging.info(f"[API] /getDailyCauselist request - code={advocate_code}, date={list_date}")
        
        # Validate advocate code
        if not advocate_code:
            logging.warning("[API] Missing advocateCode parameter")
            return jsonify({
                'error': 'Missing parameter: advocateCode required',
                'example': '/getDailyCauselist?advocateCode=19272&listDate=05-02-2026'
            }), 400
        
        # Use provided date or default to today
        if not list_date:
            today = datetime.now()
            list_date = today.strftime("%d-%m-%Y")
            logging.info(f"[API] No date provided, using today: {list_date}")
        
        # Validate date format
        try:
            datetime.strptime(list_date, "%d-%m-%Y")
        except ValueError:
            logging.warning(f"[API] Invalid date format: {list_date}")
            return jsonify({
                'error': 'Invalid date format. Use DD-MM-YYYY',
                'example': '05-02-2026'
            }), 400
        
        logging.info(f"[API] Starting scrape: code={advocate_code}, date={list_date}")
        
        # Fetch data using TSHC scraper
        scraper = TSHCScraper()
        result = scraper.fetch_data(advocate_code, list_date)
        
        # Ensure proper response format
        if not isinstance(result, dict):
            logging.error(f"[API] Scraper returned invalid type: {type(result)}")
            return jsonify({
                'error': 'Invalid response from scraper',
                'cases': [],
                'count': 0
            }), 500
        
        # Check for errors from scraper
        if result.get('error'):
            logging.error(f"[API] Scraper error: {result['error']}")
            # Return error but with cases array for compatibility
            return jsonify({
                'error': result['error'],
                'cases': result.get('cases', []),
                'count': result.get('count', 0),
                'timestamp': result.get('timestamp', datetime.now().isoformat()),
                'advocate_code': advocate_code,
                'date': list_date
            }), 502
        
        # Success response
        response = {
            'cases': result.get('cases', []),
            'count': len(result.get('cases', [])),
            'advocate_code': advocate_code,
            'date': list_date,
            'timestamp': result.get('timestamp', datetime.now().isoformat()),
            'method': result.get('method', 'unknown')
        }
        
        logging.info(f"[API] Success: {response['count']} cases found")
        return jsonify(response), 200
        
    except Exception as e:
        logging.error(f"[API] Unexpected error: {str(e)}", exc_info=True)
        return jsonify({
            'error': 'Unexpected error',
            'details': str(e),
            'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            'cases': [],
            'count': 0
        }), 500


@app.route('/getSittingArrangements', methods=['GET'])
def get_sitting_arrangements():
    try:
        url = 'https://tshc.gov.in/processBodySetionTypes?id=197'
        response = requests.get(url, verify=False, timeout=20)
        
        if response.status_code != 200:
            return jsonify({'error': f'External API returned {response.status_code}'}), 502
        
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
        return jsonify({'error': 'Request timeout - try again'}), 504
    except requests.exceptions.RequestException as e:
        return jsonify({'error': 'Unable to fetch sitting arrangements', 'details': str(e)}), 502
    except Exception as e:
        return jsonify({'error': 'Unexpected error', 'details': str(e)}), 500

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
