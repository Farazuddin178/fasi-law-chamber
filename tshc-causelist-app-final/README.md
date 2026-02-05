# TSHC Causelist Scraper & Manager

A complete web application for scraping, viewing, and managing Telangana High Court causelist data.

## Features

- **Real-time Scraping**: Fetches causelist data directly from TSHC website using HTTP requests (no Selenium needed)
- **Modern Dashboard**: Clean, responsive UI for searching and viewing cases
- **Save & Manage**: Save causelists locally and view them later
- **Export Options**: Export data as PDF or JSON
- **Court-wise Grouping**: Cases are automatically grouped by court and stage

## Installation

1. Make sure you have Python 3.8+ installed
2. Install the required packages:

```bash
pip install -r requirements.txt
```

## Usage

1. Run the application:

```bash
python app.py
```

2. Open your browser and go to:

```
http://localhost:5000
```

3. Enter the advocate code (e.g., `19272`) and date (format: `DD-MM-YYYY`)

4. Click "Search Cases" to fetch the causelist

5. Use the action buttons to:
   - **Save to History**: Save the data for later viewing
   - **Export PDF**: Download as PDF file
   - **Export JSON**: Download as JSON file

## Pages

- **Dashboard** (`/`): Search and view causelist data in real-time
- **History** (`/history`): View and manage saved causelists

## API Endpoints

- `GET /api/search?code=XXX&date=DD-MM-YYYY` - Search causelist
- `POST /api/save` - Save causelist data
- `GET /api/history` - List saved files
- `GET /api/history/<filename>` - Get specific saved file
- `DELETE /api/delete/<filename>` - Delete saved file
- `POST /api/export/pdf` - Export as PDF
- `POST /api/export/json` - Export as JSON

## Data Structure

The application saves data in JSON format with the following structure:

```json
{
  "cases": [
    {
      "s_no": "1",
      "case_no": "CRLP/1388/2026",
      "connected_cases": ["IA 1/2026"],
      "petitioner": "Name",
      "respondent": "Name",
      "petitioner_advocate": "Advocate Name",
      "respondent_advocate": "Advocate Name",
      "district": "HYDERABAD",
      "remarks": "",
      "court": "COURT NO. 26",
      "judge": "THE HONOURABLE SMT JUSTICE K. SUJANA",
      "stage": "INTERLOCUTORY(FRESH BAIL PETITIONS)"
    }
  ],
  "count": 9,
  "total_cases_header": 9,
  "advocate_code": "19272",
  "date": "05-02-2026",
  "timestamp": "2026-02-05 18:30:00"
}
```

## Troubleshooting

### Connection Issues

If you get connection timeouts, make sure:
1. You have an active internet connection
2. The TSHC website (https://causelist.tshc.gov.in) is accessible
3. No firewall is blocking the connection

### No Data Found

If no cases are found:
1. Verify the advocate code is correct
2. Check that the date format is DD-MM-YYYY
3. Ensure there are cases listed for that advocate on the selected date

## Notes

- The application uses `requests` library instead of Selenium, making it faster and more reliable
- Session cookies are automatically managed
- Data is saved in the `saved_data/` directory
- PDFs are generated using ReportLab

## License

This project is for educational and personal use.
