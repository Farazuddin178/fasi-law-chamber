# Netlify Build Optimization Guide

## Problem: Build Limit Exceeded

Netlify has a default 30-minute build limit. Firebase SDK adds ~150MB to node_modules, making builds slow.

## Solutions (in order of ease):

### Option 1: Upgrade Netlify Plan ✅ RECOMMENDED
- **Free plan**: 300 build minutes/month (10 min builds)
- **Pro plan**: 10,000 build minutes/month
- Cost: $19/month (or included with GitHub Pro)
- **Action**: Upgrade in Netlify Dashboard → Team overview → Billing

### Option 2: Optimize Build (Free) 🔧
1. **Disable source maps in production**:
   - Create `netlify.toml` in root:
   ```toml
   [build]
     command = "pnpm run build"
     environment = { NODE_ENV = "production" }
   
   [build.environment]
     VITE_SOURCEMAP = "false"
   ```

2. **Use pnpm.lock caching** (Netlify does this automatically)

3. **Build locally first**:
   ```bash
   pnpm build
   ```
   - If this works locally, Netlify will work

### Option 3: Reduce Dependencies
Remove unused Firebase packages:
```bash
pnpm remove firebase  # Remove if not using
# Keep only: pnpm add firebase-app firebase-messaging
```

## Quick Check:

1. **Check your build logs**: Netlify Dashboard → Deploys → click recent build
2. **See build time**: Should be under 10 minutes
3. **If over 15 mins**: Upgrade plan or optimize

## Current Recommendation:
Since you already have Firebase installed and notifications working, **Option 1 (upgrade to Pro)** gives you:
- Unlimited build time
- Better performance
- Support
- Only $19/month

If budget is tight, use **Option 2** (optimize source maps).
