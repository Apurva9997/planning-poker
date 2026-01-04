# Deployment Guide - Planning Poker App

This guide covers deploying the Planning Poker app to Netlify with Neon PostgreSQL.

## Prerequisites

1. **Neon Database Account**
   - Sign up at [neon.tech](https://neon.tech)
   - Create a new project
   - Copy your connection string from the dashboard

2. **Netlify Account**
   - Sign up at [netlify.com](https://netlify.com)

## Setup Steps

### 1. Database Setup

1. Log in to your Neon dashboard
2. Create a new project (or use an existing one)
3. Copy the connection string (it looks like: `postgresql://user:password@host.neon.tech/dbname?sslmode=require`)
4. The `kv_store` table will be created automatically on first function execution

### 2. Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
   VITE_ABLY_API_KEY=your-ably-api-key-here
   ABLY_API_KEY=your-ably-api-key-here
   ```
   
   **Getting Ably API Key:**
   - Sign up at [ably.com](https://ably.com) (free tier available)
   - Create a new app
   - Copy your API key from the dashboard
   - Use the same key for both `VITE_ABLY_API_KEY` (client) and `ABLY_API_KEY` (server)

4. Run the development server:
   ```bash
   npm run dev
   ```

5. In another terminal, run Netlify Functions locally:
   ```bash
   npm run dev:functions
   ```

### 3. Netlify Deployment

#### Option A: Deploy via Netlify Dashboard

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect your Git repository (GitHub, GitLab, or Bitbucket)
4. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Add environment variables:
   - Go to Site settings → Environment variables
   - Add `DATABASE_URL` with your Neon connection string
   - Add `VITE_ABLY_API_KEY` with your Ably API key (for client-side)
   - Add `ABLY_API_KEY` with your Ably API key (for server-side)
6. Click "Deploy site"

#### Option B: Deploy via Netlify CLI

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Login to Netlify:
   ```bash
   netlify login
   ```

3. Initialize and deploy:
   ```bash
   netlify init
   netlify env:set DATABASE_URL "your-neon-connection-string"
   netlify deploy --prod
   ```

## Environment Variables

Required environment variables:

- `DATABASE_URL` - Your Neon PostgreSQL connection string
- `VITE_ABLY_API_KEY` - Ably API key for client-side real-time subscriptions
- `ABLY_API_KEY` - Ably API key for server-side publishing (Netlify Functions)

**Note**: Ably is optional. If not configured, the app will fall back to polling. However, for production use, Ably is recommended for true real-time updates.

Set these in:
- **Local development**: `.env` file (not committed to git)
- **Netlify**: Site settings → Environment variables

## Security Considerations

✅ **Implemented:**
- Environment variables for sensitive data
- Input validation on all endpoints
- SQL injection prevention via parameterized queries
- CORS headers configured
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- Rate limiting considerations (50 players per room limit)

⚠️ **Production Recommendations:**
- Enable Netlify's DDoS protection
- Consider adding rate limiting middleware
- Monitor function execution times and errors
- Set up database connection pooling if needed
- Enable Neon's connection pooling for better performance

## Realtime Features

The app uses **polling** (not WebSockets) for realtime updates:
- Polls every 2 seconds when in a room
- This works perfectly with Neon PostgreSQL
- No additional configuration needed

## Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` is set correctly in Netlify environment variables
- Check that your Neon project allows connections from Netlify's IP ranges
- Ensure SSL mode is enabled (`sslmode=require`)

### Function Timeouts

- Default Netlify function timeout is 10 seconds
- If you experience timeouts, consider:
  - Optimizing database queries
  - Enabling Neon connection pooling
  - Increasing function timeout in `netlify.toml` (if needed)

### Build Failures

- Ensure all dependencies are in `package.json`
- Check that Node version matches (18.x recommended)
- Review build logs in Netlify dashboard

## Monitoring

- **Netlify**: Check function logs in the Netlify dashboard
- **Neon**: Monitor database usage and connections in Neon dashboard
- **Application**: Check browser console for client-side errors

## Support

For issues or questions:
1. Check the application logs in Netlify dashboard
2. Review Neon database logs
3. Check browser console for client errors

