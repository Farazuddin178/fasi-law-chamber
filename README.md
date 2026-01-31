# 🏛️ FASI Law Chamber - Case Management System

A full-stack web application for managing legal cases with live court data integration.

## 🚀 Quick Start

### Frontend (Netlify)
- **Live URL**: https://your-app.netlify.app
- Auto-deploys from `main` branch

### Backend (Render/Railway)
- **API URL**: https://tshc-scraper-backend.onrender.com
- Scrapes live court data

## 📋 Features

✅ Case management system with complete case lifecycle tracking
✅ **Submission & Return Dates tracking** - Track multiple submissions, returns, filing dates, and changes
✅ Live court causelist scraping (TSHC)
✅ Advocate report fetching
✅ Sitting arrangements viewer
✅ Calendar with hearing tracking
✅ IA and USR details management
✅ User authentication (Supabase)
✅ Case disposal order generation

## 🛠️ Tech Stack

**Frontend:**
- React + TypeScript + Vite
- Tailwind CSS
- Supabase (Auth + Database)

**Backend:**
- Python Flask
- Selenium WebDriver
- BeautifulSoup4

## 🌐 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Database Setup

**IMPORTANT**: Before using the Submission & Return Dates feature, you must run the database migration:

1. See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed instructions
2. Run the SQL migration in `supabase_migrations.sql` using Supabase Dashboard
3. Or use Supabase CLI: `supabase migration up`

### Quick Deploy:

1. **Backend to Render:**
   ```bash
   # Push code to GitHub
   git push origin main
   
   # Go to render.com → New Web Service → Connect Repo
   # Build: pip install -r requirements.txt
   # Start: gunicorn tshc_server:app
   ```

2. **Frontend to Netlify:**
   ```bash
   # Already deployed! Just update env vars:
   # Netlify Dashboard → Environment Variables
   VITE_BACKEND_URL=https://your-backend.onrender.com
   ```

## 🔧 Local Development

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
pip install -r requirements.txt

# Run backend
python tshc_server.py

# Run frontend (in another terminal)
npm run dev
```

## 📦 Environment Variables

Create `.env` file:
```
VITE_BACKEND_URL=http://localhost:5000
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-key
```

## 🐛 Troubleshooting

**Backend not working on Render?**
- Check logs in Render dashboard
- Ensure Chrome/Chromium is installed
- Consider switching to Railway for better Selenium support

**CORS errors?**
- Verify `VITE_BACKEND_URL` in Netlify env vars
- Ensure Flask-CORS is enabled in backend

**Slow responses?**
- Free tier servers sleep after 15 mins
- First request takes 30-60 seconds to wake up
- Consider paid tier for production

## 📞 Support

Created by Faraz Uddin
Repository: https://github.com/Farazuddin178/fasi-law-chamber
