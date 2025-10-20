# Meen Ma3ana - Setup Guide

This guide will help you set up the Meen Ma3ana charity platform project.

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Access to the Supabase project

## Quick Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   npm run setup
   ```
   This will create a `.env` file with the necessary configuration.

3. **Configure your environment variables:**
   Edit the `.env` file and update the following values:
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Get this from your Supabase project settings
   - `NEXTAUTH_SECRET`: Generate a random string (use: `openssl rand -base64 32`)
   - Optional: `ANTHROPIC_API_KEY` and `PERPLEXITY_API_KEY` for task management features

4. **Run database migrations:**
   ```bash
   npm run db:migrate
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

## Environment Variables

### Required Variables

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Random string for session security

### Optional Variables

- `ANTHROPIC_API_KEY`: For AI-powered task management
- `PERPLEXITY_API_KEY`: For research-backed task generation
- `NODE_ENV`: Environment (development/production)

## Getting Your Supabase Keys

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/pmqqjfwpwmdcasheygsw)
2. Navigate to Settings > API
3. Copy the `anon` public key
4. Update your `.env` file with the key

## Database Setup

The project uses Drizzle ORM with PostgreSQL. The database schema is defined in `drizzle/schema.ts`.

### Available Database Commands

- `npm run db:generate`: Generate new migrations
- `npm run db:migrate`: Apply migrations to database
- `npm run db:studio`: Open Drizzle Studio for database management

## Troubleshooting

### SASL Signature Mismatch Error

This error occurs when the Supabase anon key is missing or incorrect. To fix:

1. Verify your `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
2. Check that your Supabase project is active
3. Ensure the database connection string is valid

### Missing Translation Errors

If you see "MISSING_MESSAGE" errors, the translation files may be incomplete. The project includes both English and Arabic translations in the `messages/` directory.

### Module Not Found Errors

If you see module resolution errors, try:

```bash
npm install
npm run dev
```

## Development Workflow

The project includes a task management system. To use it:

1. Set up your API keys in `.env`
2. Use the task management commands:
   - `npm run setup` - Initial setup
   - `node scripts/dev.js list` - List tasks
   - `node scripts/dev.js next` - Get next task to work on

## Project Structure

- `src/app/` - Next.js app router pages
- `src/components/` - React components
- `src/lib/` - Utility functions and configurations
- `drizzle/` - Database schema and migrations
- `messages/` - Internationalization files
- `scripts/` - Development and setup scripts

## Support

If you encounter issues:

1. Check the console for error messages
2. Verify your environment variables are set correctly
3. Ensure your Supabase project is properly configured
4. Check the database connection and migrations

## Links

- [Supabase Dashboard](https://supabase.com/dashboard/project/pmqqjfwpwmdcasheygsw)
- [Project Documentation](README.md)
- [Business Requirements Document](Meen-Ma3ana_BRD.md) 