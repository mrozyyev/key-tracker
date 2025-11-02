# Dorm Key Tracker

A modern web application for tracking dorm key access with queue management, authentication, and history tracking.

## Features

- 🔐 **Phone-based Authentication** - Secure login using phone numbers
- 🔑 **Key Status Tracking** - Real-time key availability status
- 📋 **Queue System** - Join a queue when key is taken
- 📜 **History Logging** - Complete audit trail of all key operations
- 🔔 **Visual Notifications** - Toast notifications for user feedback
- 🎨 **Modern UI** - Beautiful gradient design with responsive layout
- 🔄 **Auto-refresh** - Automatically updates every 30 seconds

## Quick Start (Fixes CORS Issues)

**Important**: Due to browser CORS restrictions, you cannot open `index.html` directly as a file. You must use a local web server:

### Option 1: Python Server (Recommended)
```bash
python3 server.py
# Then open: http://localhost:8000/index.html
```

### Option 2: Simple HTTP Server
```bash
bash serve.sh
# Or: python3 -m http.server 8000
# Then open: http://localhost:8000/index.html
```

### Option 3: VS Code Live Server
- Install "Live Server" extension in VS Code
- Right-click `index.html` → "Open with Live Server"

## Setup Instructions

### 1. Google Apps Script Setup

1. Go to [Google Apps Script](https://script.google.com)
2. Click "New Project"
3. Replace the default code with the contents of `Code.gs`
4. Update `CONFIG.SPREADSHEET_ID` in `Code.gs`:
   - Run the `setup()` function once (Run > setup)
   - Copy the Spreadsheet ID from the execution log
   - Paste it into `CONFIG.SPREADSHEET_ID` in `Code.gs`
5. Save the project

### 2. Deploy as Web App

1. Click "Deploy" > "New deployment"
2. Select type: "Web app"
3. Execute as: "Me"
4. **Who has access: "Anyone"** (IMPORTANT: This allows CORS from any origin)
5. Click "Deploy"
6. Copy the Web App URL
7. **If you update the script, redeploy with "New version"**

### 3. Update Frontend

1. Open `index.html`
2. Find `baseURL` in the script section
3. Replace it with your Web App URL from step 2

### 4. Configure Users

1. Open the Google Sheet created by the setup function
2. Go to the "Users" sheet
3. Add users with columns:
   - Phone: User's phone number
   - Name: User's full name
   - RoomNumber: Room number

### 5. Test

1. Open `index.html` in a browser
2. Enter a phone number that exists in the Users sheet
3. Test taking and returning the key
4. Test the queue functionality

## API Endpoints

### GET Requests

- `?action=users` - Get all registered users
- `?action=status` - Get current key status
- `?action=history` - Get key operation history
- `?action=queue` - Get current queue

### POST Requests

All POST requests require authentication (phone and name).

- `action=take` - Take the key (requires: phone, name, note)
- `action=return` - Return the key (requires: phone, name, note)
- `action=queue` with `operation=join` - Join the queue (requires: phone, name, note)
- `action=queue` with `operation=leave` - Leave the queue (requires: phone, name)

## Queue System

The queue system automatically processes when a key is returned:
- First person in queue automatically gets the key
- Queue position is based on join time (FIFO)
- Users can leave the queue anytime

## History Tracking

All actions are logged:
- Take key
- Return key
- Join queue
- Leave queue

History is stored with timestamps and notes for complete audit trail.

## Security

- Phone-based authentication required for all operations
- Only current key holder can return the key
- User verification on all actions
- History logging for accountability

## Customization

### Styling
- Modify Tailwind CSS classes in `index.html`
- Adjust colors, spacing, and layout as needed

### Auto-refresh Interval
- Change the interval in `index.html` (currently 30000ms = 30 seconds)

### History Limit
- Adjust `maxRows` in `Code.gs` (currently 100 entries)
- See [History Limit Explanation](#history-limit-100-entries-explained) below for details

## Troubleshooting

### "Spreadsheet not found" error
- Make sure `CONFIG.SPREADSHEET_ID` is correct
- Run `setup()` function to create a new spreadsheet

### "Authentication failed" error
- Verify phone number exists in Users sheet
- Ensure name matches exactly

### Queue not working
- Check that the Queue sheet exists
- Verify queue endpoint is accessible

## Hosting on Cloudflare Pages

Cloudflare Pages is a free hosting platform perfect for static websites like this one. Here's how to deploy:

### Step 1: Prepare Your Repository

1. Push your code to GitHub (or GitLab/Bitbucket)
2. Make sure `index.html` is in the root directory

### Step 2: Connect to Cloudflare Pages

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) and log in
2. Navigate to **Workers & Pages** → **Create** → **Pages**
3. Connect your Git provider (GitHub/GitLab/Bitbucket)
4. Select your repository

### Step 3: Configure Build Settings

- **Framework preset**: None (or Static HTML)
- **Build command**: (leave empty - no build needed)
- **Build output directory**: `/` (root directory)
- **Root directory**: `/` (if your HTML is in root)

### Step 4: Deploy

1. Click **Save and Deploy**
2. Cloudflare will deploy your site automatically
3. You'll get a URL like `your-project.pages.dev`
4. Future commits will trigger automatic deployments

### Step 5: Custom Domain (Optional)

1. In Cloudflare Pages, go to **Custom domains**
2. Add your domain
3. Follow the DNS setup instructions

### Important Notes for Cloudflare Pages

- **No server needed**: Cloudflare Pages hosts static files, which is perfect for this app
- **Free HTTPS**: Automatic SSL certificates
- **Fast CDN**: Global content delivery network
- **Auto-deployments**: Deploys automatically on every push to your main branch
- **Branch previews**: Get preview URLs for pull requests

The frontend will work perfectly on Cloudflare Pages. Just make sure:
- Your Google Apps Script backend is deployed and accessible
- The `baseURL` in `index.html` points to your deployed Google Apps Script URL
- CORS is enabled in your Google Apps Script deployment

## History Limit: 100 Entries Explained

The app stores a maximum of **100 history entries** for performance and storage optimization. Here's what this means:

- **App Functionality**: The app will continue working perfectly even after 100 entries. This limit is purely for **UI performance and storage efficiency**.
- **How It Works**: 
  - The system stores up to 100 entries in the History sheet
  - When the 101st entry is added, the oldest entry is automatically deleted
  - Only the last 50 entries are displayed in the UI (for faster loading)
- **This is a UI/Performance Feature**: The 100-entry limit doesn't affect core functionality like taking keys, returning keys, or managing the queue. It only affects how much history is stored.
- **Can Be Adjusted**: If you need more history entries, you can increase the `maxRows` value in `Code.gs` (line 407). However, keeping it low ensures better performance.

## Contributing

This project is open for improvements and contributions! We encourage:

- **Next Generation IT Students** to use this as a learning project
- **Pull Requests** for bug fixes, features, and improvements
- **Issues** for reporting bugs or suggesting enhancements
- **Documentation** improvements
- **UI/UX** enhancements
- **Feature** suggestions and implementations

Feel free to fork this project, make your changes, and submit a PR. This is a great project for learning:
- Frontend development (HTML, JavaScript, Tailwind CSS, Alpine.js)
- Backend development (Google Apps Script)
- API integration
- Web app deployment
- Version control with Git

**Contributions are welcome from all skill levels!** Whether you're just starting your IT journey or have experience, your improvements make this project better for everyone.

## User Guidelines

For detailed user instructions on how to use the app, see **[USER_GUIDELINES.md](USER_GUIDELINES.md)**.

Essential rules:
- Check the queue before taking the key
- Mark as available when done using the key
- Call the next person immediately when marked as available
- Wait for the call when you're next in queue

## License

Free to use and modify for your needs. Feel free to contribute improvements for the next generation of IT students!
