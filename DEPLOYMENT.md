# Cloudflare Pages Deployment Guide

## Quick Deployment Steps

### 1. Push Your Code to GitHub (if not already pushed)
```bash
git add .
git commit -m "Ready for Cloudflare Pages deployment"
git push origin main
```

### 2. Go to Cloudflare Dashboard
- Visit: https://dash.cloudflare.com/
- Log in to your Cloudflare account

### 3. Connect Cloudflare Pages to Your Repository
1. Navigate to **Workers & Pages** (left sidebar)
2. Click **Create** → **Pages**
3. Click **Connect to Git**
4. Select **GitHub** (or your Git provider)
5. Authorize Cloudflare to access your GitHub account
6. Select your repository: `mrozyyev/key-tracker`

### 4. Configure Build Settings

**Important Settings:**
- **Framework preset**: `None` (or "Static HTML")
- **Build command**: (leave empty - no build needed)
- **Build output directory**: `/` (root directory)
- **Root directory**: `/` (leave as root)

**Environment Variables**: (None needed for this project)

### 5. Deploy
1. Click **Save and Deploy**
2. Wait for deployment to complete (usually 1-2 minutes)
3. Your site will be live at: `https://your-project-name.pages.dev`

### 6. After Deployment - Important Checklist

✅ **Verify Frontend Works:**
- Open your Cloudflare Pages URL
- Test the login functionality
- Verify the app loads correctly

✅ **Verify Backend Connection:**
- Make sure your Google Apps Script is deployed
- Verify the `baseURL` in `index.html` points to your Google Apps Script URL
- Check that CORS is enabled in your Google Apps Script deployment

✅ **Test Full Flow:**
- Test taking the key
- Test marking as available
- Test queue functionality

### 7. Optional: Custom Domain
1. In Cloudflare Pages, go to your project
2. Click **Custom domains**
3. Click **Set up a custom domain**
4. Enter your domain name
5. Follow DNS setup instructions (Cloudflare will auto-configure if domain is managed by Cloudflare)

## Troubleshooting

### Build Fails
- **Issue**: Build command needed
- **Solution**: Set Framework preset to "None" and leave Build command empty

### CORS Errors
- **Issue**: Frontend can't connect to Google Apps Script
- **Solution**: Make sure Google Apps Script deployment has "Who has access" set to "Anyone"

### 404 Errors
- **Issue**: Pages not found
- **Solution**: Make sure `index.html` is in the root directory

### App Not Loading
- **Issue**: JavaScript errors
- **Solution**: Check browser console for errors, verify `baseURL` is correct

## Benefits of Cloudflare Pages

- ✅ **Free** - No cost for hosting
- ✅ **Fast** - Global CDN for fast loading
- ✅ **HTTPS** - Automatic SSL certificates
- ✅ **Auto-deploy** - Deploys on every push to main branch
- ✅ **Preview deployments** - Get preview URLs for pull requests

## Repository Information

- **GitHub Repository**: `mrozyyev/key-tracker`
- **Main Branch**: `main`
- **Entry Point**: `index.html`
- **Deployment Type**: Static HTML (no build step needed)

