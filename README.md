# Multiplayer Planning Poker App

A real-time multiplayer Planning Poker application for agile estimation sessions. Built with React, TypeScript, Neon PostgreSQL, and deployed on Netlify.

## Features

- 🎴 Create or join planning poker rooms with unique codes
- 👥 Multi-player support (up to 50 players per room)
- 🗳️ Vote using Fibonacci sequence cards (0, 1, 2, 3, 5, 8, 13, 21, ?, ☕)
- 👁️ Reveal votes simultaneously
- 📊 Calculate average of numeric votes
- 🔄 Reset rounds for new estimations
- 📱 Responsive design for mobile and desktop
- ⚡ Real-time updates via polling (every 2 seconds)
- 💾 Persistent sessions via localStorage

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Netlify Serverless Functions
- **Database**: Neon PostgreSQL
- **Deployment**: Netlify

## Quick Start

### Prerequisites

- Node.js 18+ 
- A Neon PostgreSQL database (sign up at [neon.tech](https://neon.tech))
- Netlify account (for deployment)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd "Multiplayer Planning Poker App"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Neon database connection string:
   ```env
   DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

5. In another terminal, start Netlify Functions locally:
   ```bash
   npm run dev:functions
   ```

6. Open [http://localhost:5173](http://localhost:5173) in your browser

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions to Netlify.

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── components/     # React components
│   │   ├── lib/            # API client and types
│   │   └── App.tsx        # Main app component
│   └── styles/            # CSS styles
├── netlify/
│   └── functions/
│       └── api/            # Netlify serverless functions
│           ├── index.ts   # API endpoints
│           └── db.ts      # Database module
├── netlify.toml           # Netlify configuration
└── package.json
```

## Environment Variables

- `DATABASE_URL` - Neon PostgreSQL connection string (required)

## Security

- ✅ Environment variables for sensitive data
- ✅ Input validation on all endpoints
- ✅ SQL injection prevention via parameterized queries
- ✅ CORS headers configured
- ✅ Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- ✅ Rate limiting considerations (50 players per room limit)

See [SECURITY.md](./SECURITY.md) for detailed security information.

## License

See [ATTRIBUTIONS.md](./ATTRIBUTIONS.md) for license information.

## Support

For deployment help, see [DEPLOYMENT.md](./DEPLOYMENT.md).
