from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
from requests.exceptions import SSLError, RequestException
from bs4 import BeautifulSoup
from datetime import datetime
import os

app = Flask(__name__, static_folder='dist', static_url_path='')
CORS(app)

# Suppress insecure request warnings for verify=False usage on the HC site
requests.packages.urllib3.disable_warnings()

@app.route('/ping', methods=['GET'])
def ping():
    """Simple echo endpoint to test connectivity"""
    return jsonify({'status': 'ok', 'message': 'Proxy server is running'})

@app.route('/getCaseDetails', methods=['GET'])
def get_case_details():
    mtype = request.args.get('mtype')
    mno = request.args.get('mno')
    myear = request.args.get('myear')
    
    url = f'https://csis.tshc.gov.in/getCaseDetails?mtype={mtype}&mno={mno}&myear={myear}'
    response = requests.get(url)
    return response.json()

@app.route('/getAdvReport', methods=['GET'])
def get_adv_report():
    advcode = request.args.get('advcode')
    year = request.args.get('year')
    
    url = f'https://csis.tshc.gov.in/getAdvReport?advcode={advcode}&year={year}'
    response = requests.get(url)
    return response.json()

@app.route('/getSittingArrangements', methods=['GET'])
def get_sitting_arrangements():
    url = 'https://tshc.gov.in/processBodySetionTypes?id=197'
    try:
        # The HC site occasionally presents an untrusted cert; we skip verification and
        # retry over HTTP if HTTPS still fails.
        response = requests.get(url, verify=False, timeout=20)
        
        # DEBUG: Print response details
        print("\n" + "="*80)
        print("SITTING ARRANGEMENTS DEBUG")
        print("="*80)
        print(f"URL: {url}")
        print(f"Status Code: {response.status_code}")
        print(f"Response Length: {len(response.text)} characters")
        print("\nFirst 2000 characters of HTML:")
        print(response.text[:2000])
        print("="*80 + "\n")
        
    except SSLError:
        try:
            response = requests.get(url.replace('https://', 'http://'), verify=False, timeout=20)
        except RequestException as exc:
            return jsonify({'error': 'Unable to fetch sitting arrangements', 'details': str(exc)}), 502
    except RequestException as exc:
        return jsonify({'error': 'Unable to fetch sitting arrangements', 'details': str(exc)}), 502

    soup = BeautifulSoup(response.text, 'html.parser')

    # Find all sitting arrangement list items
    arrangements = []
    all_lis = soup.find_all('li')
    print(f"Found {len(all_lis)} <li> elements")
    
    for li in all_lis:
        a_tag = li.find('a')
        if a_tag and 'Sitting Arrangement' in a_tag.text:
            arrangements.append({
                'title': a_tag.text.strip(),
                'link': a_tag.get('href', ''),
                'timestamp': datetime.now().isoformat()
            })
            print(f"  Found: {a_tag.text.strip()}")

    print(f"Total arrangements found: {len(arrangements)}\n")

    return jsonify({
        'arrangements': arrangements,
        'lastUpdated': datetime.now().isoformat()
    })

@app.route('/')
def serve_index():
    """Serve the React frontend index"""
    return send_from_directory('dist', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve static files from dist folder, fall back to index.html for SPA routing"""
    full_path = os.path.join('dist', path)
    if os.path.exists(full_path) and os.path.isfile(full_path):
        return send_from_directory('dist', path)
    return send_from_directory('dist', 'index.html')

if __name__ == '__main__':
    print("=" * 50)
    print("PROXY SERVER - Bypassing CORS")
    print("=" * 50)
    app.run(port=5001, debug=True)
