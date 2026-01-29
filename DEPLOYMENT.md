# 🚀 Deployment Guide - Full Stack App

Your app has 2 parts:
1. **Frontend** (React) → Deploy to **Netlify** ✅
2. **Backend** (Python Flask) → Deploy to **Render/Railway** 🔧

---

## 📦 Part 1: Deploy Backend to Render (FREE)

### Step 1: Push Code to GitHub
```bash
git add .
git commit -m "Add deployment files"
git push origin main
```

### Step 2: Create Render Account
1. Go to https://render.com
2. Sign up with your GitHub account

### Step 3: Deploy Backend
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository: `Farazuddin178/fasi-law-chamber`
3. Configure:
   - **Name**: `tshc-scraper-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn tshc_server:app`
   - **Plan**: Free
4. Click **"Create Web Service"**

### Step 4: Wait for Deployment
- Takes 5-10 minutes
- You'll get a URL like: `https://tshc-scraper-backend.onrender.com`

---

## 🌐 Part 2: Update Frontend to Use Backend

### Step 1: Update Environment Variables on Netlify
1. Go to Netlify Dashboard → Your Site
2. Go to **Site Settings** → **Environment Variables**
3. Add:
   ```
   VITE_BACKEND_URL = https://tshc-scraper-backend.onrender.com
   ```

### Step 2: Redeploy Frontend
```bash
# Netlify will auto-deploy when you push
git add .
git commit -m "Update backend URL"
git push origin main
```

---

## 🔧 Alternative: Deploy Backend to Railway (FREE)

### Step 1: Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub

### Step 2: Deploy
1. Click **"New Project"** → **"Deploy from GitHub repo"**
2. Select `Farazuddin178/fasi-law-chamber`
3. Railway auto-detects Python and deploys
4. Get URL: `https://your-app.up.railway.app`

### Step 3: Update Netlify Environment Variable
```
VITE_BACKEND_URL = https://your-app.up.railway.app
```

---

## 🧪 Testing

### Test Backend
```bash
curl https://tshc-scraper-backend.onrender.com/api/search?code=19272&date=29-01-2026
```

### Test Frontend
1. Open your Netlify site
2. Go to advocate report page
3. Enter code 19272
4. Should fetch live data from court website

---

## ⚠️ Important Notes

1. **Selenium on Render**: Free tier might timeout on Chrome. Consider using:
   - Railway (better for Selenium)
   - Render paid tier
   - Or switch to `requests` library without Selenium

2. **Cold Starts**: Free tier apps sleep after 15 mins of inactivity
   - First request will be slow (30-60 seconds)
   - Keep-alive service can help

3. **Proxy Server**: Keep `proxy.py` running locally OR deploy it separately

---

## 🔥 Quick Deploy Commands

```bash
# 1. Commit deployment files
git add requirements.txt Procfile render.yaml
git commit -m "Add deployment configuration"
git push origin main

# 2. Deploy to Render (via dashboard)
# 3. Copy backend URL

# 4. Update .env file locally
echo "VITE_BACKEND_URL=https://your-backend.onrender.com" > .env

# 5. Test locally
npm run dev

# 6. Deploy frontend (auto-deploy on Netlify)
git add .
git commit -m "Update backend URL"
git push origin main
```

---

## 🆘 Troubleshooting

### Backend not responding
- Check Render logs: Dashboard → Your Service → Logs
- Ensure Chrome is installed (add to Dockerfile if needed)

### CORS errors
- Ensure Flask-CORS is enabled in `tshc_server.py`
- Check backend URL is correct in Netlify env vars

### Timeout errors
- Increase timeout in frontend (currently 30s)
- Use Railway instead of Render for better performance
- Consider switching from Selenium to `requests` library
