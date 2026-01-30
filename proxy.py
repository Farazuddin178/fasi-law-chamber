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
    try:
        mtype = request.args.get('mtype')
        mno = request.args.get('mno')
        myear = request.args.get('myear')
        
        if not all([mtype, mno, myear]):
            return jsonify({'error': 'Missing parameters: mtype, mno, myear required'}), 400
        
        url = f'https://csis.tshc.gov.in/getCaseDetails?mtype={mtype}&mno={mno}&myear={myear}'
        # Increased timeout to 30 seconds for slow external APIs
        response = requests.get(url, timeout=30, verify=False)
        
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
        # Increased timeout to 30 seconds for slow external APIs
        response = requests.get(url, timeout=30, verify=False)
        
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
    if path and os.path.exists(os.path.join('dist', path)):
        return send_from_directory('dist', path)
    else:
        return send_from_directory('dist', 'index.html')

if __name__ == '__main__':
    print("=" * 50)
    print("PROXY SERVER - Bypassing CORS")
    print("=" * 50)
    app.run(port=5001, debug=True)
