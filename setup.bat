@echo off
REM ============================================================================
REM Case Management System - Notification Features Setup Script (Windows)
REM ============================================================================

echo ==================================================
echo Case Management System - Notification Setup
echo ==================================================
echo.

REM Check Python installation
echo Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed. Please install Python 3.8+
    exit /b 1
)
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo [OK] Python %PYTHON_VERSION% found
echo.

REM Check if virtual environment exists
if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
    echo [OK] Virtual environment created
) else (
    echo [OK] Virtual environment exists
)
echo.

REM Activate virtual environment
echo Activating virtual environment...
call .venv\Scripts\activate.bat
echo [OK] Virtual environment activated
echo.

REM Upgrade pip
echo Upgrading pip...
python -m pip install --upgrade pip -q
echo [OK] pip upgraded
echo.

REM Install Python dependencies
echo Installing Python dependencies...
echo This may take a few minutes...
echo.

pip install flask==3.0.0 -q
echo   [OK] Flask

pip install flask-cors==4.0.0 -q
echo   [OK] Flask-CORS

pip install requests==2.32.3 -q
echo   [OK] Requests

pip install beautifulsoup4==4.12.3 -q
echo   [OK] BeautifulSoup4

pip install lxml==5.1.0 -q
echo   [OK] lxml

pip install twilio==8.10.0 -q
echo   [OK] Twilio

pip install supabase==2.3.0 -q
echo   [OK] Supabase

pip install apscheduler==3.10.4 -q
echo   [OK] APScheduler

pip install python-dotenv==1.0.0 -q
echo   [OK] python-dotenv

pip install gunicorn==21.2.0 -q
echo   [OK] Gunicorn

echo [OK] All Python dependencies installed
echo.

REM Check for .env file
echo Checking environment configuration...
if not exist ".env" (
    echo WARNING: .env file not found
    if exist ".env.example" (
        copy .env.example .env
        echo [OK] .env file created from template
        echo.
        echo IMPORTANT: Edit .env file with your credentials!
        echo Required:
        echo   - TWILIO_ACCOUNT_SID
        echo   - TWILIO_AUTH_TOKEN
        echo   - SMTP_USER
        echo   - SMTP_PASSWORD
        echo   - ADMIN_EMAIL
    ) else (
        echo ERROR: .env.example not found
    )
) else (
    echo [OK] .env file exists
)
echo.

REM Check Node.js and pnpm
echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed
    echo Please install Node.js from https://nodejs.org/
) else (
    for /f "tokens=1" %%i in ('node --version') do set NODE_VERSION=%%i
    echo [OK] Node.js %NODE_VERSION% found
)

pnpm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: pnpm not found. Installing...
    npm install -g pnpm
    echo [OK] pnpm installed
) else (
    for /f "tokens=1" %%i in ('pnpm --version') do set PNPM_VERSION=%%i
    echo [OK] pnpm %PNPM_VERSION% found
)
echo.

REM Install frontend dependencies
echo Installing frontend dependencies...
pnpm install --prefer-offline
echo [OK] Frontend dependencies installed
echo.

REM Display next steps
echo ==================================================
echo Setup Complete!
echo ==================================================
echo.
echo Next Steps:
echo.
echo 1. Configure Environment Variables:
echo    notepad .env
echo    Fill in your Twilio and SMTP credentials
echo.
echo 2. Run Database Migration:
echo    - Open Supabase Dashboard
echo    - Go to SQL Editor
echo    - Copy contents of database_migration.sql
echo    - Run the script
echo.
echo 3. Update User Phone Numbers:
echo    Run this SQL in Supabase:
echo    UPDATE users SET phone = '+919876543210' WHERE email = 'your@email.com';
echo.
echo 4. Start the Application:
echo.
echo    Terminal 1 (Backend):
echo    .venv\Scripts\activate
echo    python proxy.py
echo.
echo    Terminal 2 (Frontend):
echo    pnpm run dev
echo.
echo 5. Test Notifications:
echo    - Create a task and assign to a user
echo    - Check WhatsApp and Email
echo    - View audit logs in case details
echo.
echo ==================================================
echo Documentation:
echo   - QUICK_START.md (Fast setup guide)
echo   - IMPLEMENTATION_GUIDE.md (Complete guide)
echo   - FEATURES_SUMMARY.md (Overview)
echo ==================================================
echo.
echo Happy coding!
echo.
pause
