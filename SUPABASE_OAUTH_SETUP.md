# Supabase OAuth Integration Setup Guide

This guide explains how the "Enable Supabase" button works and how to set it up for your deployment.

## Overview

The Supabase integration allows you to:
- Connect your Supabase project with one click
- Enable AI-powered database schema generation
- Create real-time applications with automatic subscriptions
- Manage your database through a unified interface

## How It Works

### 1. Enable Supabase Button Flow

When you click **"Enable Supabase"** in the Thinksoft Cloud panel:

1. The app redirects to `/api/supabase/oauth/start` with your project ID
2. This generates OAuth credentials (PKCE flow for security)
3. You're redirected to Supabase to authorize the connection
4. Supabase redirects back to `/api/supabase/oauth/callback`
5. Your connection is saved and you can start using Supabase features

### 2. Authentication Method

We use **OAuth 2.0 with PKCE** (Proof Key for Code Exchange) for security:
- No sensitive credentials are stored in the browser
- Code verifier is encrypted in server-side cookies
- State validation prevents CSRF attacks

## Prerequisites

To enable the Supabase integration, you need:

1. **Supabase Account** - Sign up at https://supabase.com
2. **OAuth App Created** in Supabase with:
   - Client ID
   - Client Secret
   - Configured Redirect URIs

## Environment Variables

Set these environment variables in your deployment:

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_OAUTH_CLIENT_ID=your-client-id-here
SUPABASE_OAUTH_CLIENT_SECRET=your-client-secret-here

# Optional (will default to NEXT_PUBLIC_APP_URL + callback path)
SUPABASE_OAUTH_REDIRECT_URL=https://your-domain.com/api/supabase/oauth/callback

# Optional (used as fallback for redirect URL)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Development Environment

For local development, ensure:
- `NEXT_PUBLIC_APP_URL` is set to `http://localhost:3000` or your dev server URL
- Supabase OAuth app has `http://localhost:3000/api/supabase/oauth/callback` registered

### Production Environment

For production deployment:
- Use your full domain: `https://yourdomain.com`
- Register `https://yourdomain.com/api/supabase/oauth/callback` in Supabase

## Creating a Supabase OAuth Application

### Step 1: Go to Supabase Settings

1. Log in to https://app.supabase.com
2. Select your project
3. Go to **Settings** → **Authentication** → **Providers**
4. Look for **Third Party Logins** section

### Step 2: Create OAuth App

If you're using Supabase's OAuth provider:

1. Go to **Settings** → **API** section
2. Look for or create an OAuth application
3. Note your `Client ID` and `Client Secret`

### Step 3: Configure Redirect URI

Add your redirect URL in Supabase:
- For development: `http://localhost:3000/api/supabase/oauth/callback`
- For production: `https://yourdomain.com/api/supabase/oauth/callback`

### Step 4: Set Environment Variables

Copy your credentials and set them:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_OAUTH_CLIENT_ID=your-client-id
SUPABASE_OAUTH_CLIENT_SECRET=your-client-secret
```

## Troubleshooting

### "Enable Supabase" Button Not Working

If clicking the button doesn't work, check:

1. **Are you seeing an error toast message?**
   - **"Supabase connection is not configured"** → Check `SUPABASE_OAUTH_CLIENT_ID` and `SUPABASE_URL` environment variables
   - **"Failed to exchange authorization code"** → Check `SUPABASE_OAUTH_CLIENT_SECRET` is correct
   - **"Supabase sign-in validation failed"** → Clear browser cookies and try again

2. **Did you register the redirect URI in Supabase?**
   - Supabase will reject the callback if the URL isn't registered
   - Include the full URL with protocol (`https://` or `http://`)

3. **Are you in the correct environment?**
   - Make sure environment variables are set for your deployment (local dev or production)
   - Verify `SUPABASE_URL` points to your correct Supabase project

4. **Browser/Network Issues:**
   - Clear cookies and browser cache
   - Try in an incognito window
   - Check browser console for network errors

### Connection Saved But No Data Appears

1. Refresh the page or navigate to another tab and back
2. The Supabase Cloud panel auto-refreshes every 3 seconds
3. Check that your Supabase project actually contains data

### How to Disconnect

To disconnect your Supabase project:

1. Go to the **Thinksoft Cloud** tab in the workspace
2. Click the **Disconnect** button
3. Your connection will be removed (you won't be able to use AI database generation)

## What Happens After Connection

### You Can Now:

1. **Use AI for Database Operations**
   - AI can create tables based on your project description
   - AI can add functions and enable real-time subscriptions
   - AI can execute SQL queries in your Supabase database

2. **Access Supabase Dashboard**
   - **Manage Users** - View and manage authentication users
   - **SQL Editor** - Write and execute SQL queries
   - **Edge Functions** - Create and deploy serverless functions
   - **Manage Secrets** - Store sensitive configuration values

3. **View Project Information**
   - Your Supabase project name and reference ID
   - Quick links to common Supabase operations
   - Organization management

## API Endpoints

The following endpoints handle the Supabase integration:

- `GET /api/supabase/oauth/start?projectId=xxx` - Start OAuth flow
- `GET /api/supabase/oauth/callback` - OAuth callback handler
- `GET /api/projects/[id]/supabase-connection` - Check connection status
- `POST /api/projects/[id]/supabase-disconnect` - Disconnect from Supabase
- `POST /api/projects/[id]/supabase-schema` - Manage database schema

## Security Notes

1. **No Credentials Stored in Browser** - All sensitive data stays server-side
2. **PKCE Flow** - Protects against authorization code interception
3. **State Validation** - Prevents CSRF attacks
4. **Secure Cookies** - OAuth state is stored in secure, httpOnly cookies
5. **Token Encryption** - Access tokens are stored securely in the database

## Advanced Configuration

### Custom Redirect URL

If you need a custom redirect URL (e.g., subdomain-specific):

```bash
SUPABASE_OAUTH_REDIRECT_URL=https://custom-domain.com/api/supabase/oauth/callback
```

### Token Refresh

Access tokens expire after a certain period. The system automatically:
1. Stores the refresh token
2. Uses the refresh token to get new access tokens when needed
3. Maintains seamless connection status

## Additional Resources

- [Supabase Authentication Docs](https://supabase.com/docs/guides/auth)
- [OAuth 2.0 PKCE Flow](https://tools.ietf.org/html/rfc7636)
- [Thinksoft Cloud Guide](./THINKSOFT_CLOUD_GUIDE.md)
