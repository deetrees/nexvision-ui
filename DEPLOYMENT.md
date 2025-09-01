# NexVision Deployment Guide

## Development vs Production Features

### Development Mode (Current)
- ✅ Credits system: **DISABLED**
- ✅ Email signup: **DISABLED** 
- ✅ AI transformations: **ENABLED**
- ✅ Image downloads: **ENABLED**
- ✅ Training data collection: **ENABLED**
- ✅ Admin dashboard: **ENABLED**

### Production Mode
- ✅ Credits system: **ENABLED**
- ✅ Email signup: **ENABLED**
- ✅ AI transformations: **ENABLED**
- ✅ Image downloads: **ENABLED**
- ✅ Training data collection: **ENABLED**
- ✅ Admin dashboard: **ENABLED**

## Quick Development Setup

The app is currently configured for development with credits disabled. Just run:

```bash
npm run dev
```

Users can use the AI transformation tool unlimited times without any credit restrictions.

## Production Deployment

### 1. Environment Configuration

Copy the production template:
```bash
cp .env.production.template .env.production.local
```

Edit `.env.production.local`:
```env
REPLICATE_API_TOKEN=your_actual_token
NEXTAUTH_URL=https://your-domain.com
NODE_ENV=production
# Remove or comment out DISABLE_CREDITS to enable credits
```

### 2. Feature Flags

The app uses feature flags in `src/app/config/features.ts`:

```typescript
export const featureFlags = {
  enableCredits: process.env.NODE_ENV === 'production' && process.env.DISABLE_CREDITS !== 'true',
  enableEmailSignup: process.env.NODE_ENV === 'production' && process.env.DISABLE_CREDITS !== 'true',
  // ... other flags
};
```

### 3. Deployment Platforms

#### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# REPLICATE_API_TOKEN=your_token
# NEXTAUTH_URL=https://your-app.vercel.app
# NODE_ENV=production
```

#### Netlify
```bash
# Build command: npm run build
# Publish directory: .next

# Environment variables:
# REPLICATE_API_TOKEN=your_token
# NEXTAUTH_URL=https://your-app.netlify.app
# NODE_ENV=production
```

#### AWS/DigitalOcean/Other
```bash
# Build the app
npm run build

# Start production server
npm start

# Or use PM2 for process management
pm2 start npm --name "nexvision" -- start
```

### 4. Database Setup (Optional)

For production credits system, you may want to add a database:

```bash
# Install database dependencies
npm install prisma @prisma/client

# Initialize Prisma
npx prisma init
```

### 5. Monitoring

Access the admin dashboard at `/admin/training-data` to monitor:
- Training data collection
- User activity
- System health

## Environment Variables Reference

### Required
- `REPLICATE_API_TOKEN`: Your Replicate API token
- `NEXTAUTH_URL`: Your app's URL

### Optional
- `DISABLE_CREDITS`: Set to "true" to disable credits system
- `NODE_ENV`: "development" or "production"

## Feature Toggle Commands

### Enable Credits in Production
Remove or comment out in your production environment:
```env
# DISABLE_CREDITS=true
```

### Disable Credits Temporarily
Add to your environment:
```env
DISABLE_CREDITS=true
```

## Testing Production Build Locally

```bash
# Build for production
npm run build

# Start production server
npm start

# Test with production environment
NODE_ENV=production npm start
```

## Rollback Strategy

If you need to quickly disable credits in production:

1. **Quick Fix**: Set environment variable `DISABLE_CREDITS=true`
2. **Redeploy**: The app will automatically disable credits
3. **No downtime**: Feature flags allow instant toggling

## Security Checklist

- ✅ API keys in environment variables (not code)
- ✅ Rate limiting enabled
- ✅ Input validation on all endpoints
- ✅ Error handling doesn't leak sensitive info
- ✅ HTTPS enforced in production
- ✅ Environment files in .gitignore

## Performance Optimization

- ✅ Dynamic imports for client components
- ✅ Image optimization with Next.js Image
- ✅ API route caching where appropriate
- ✅ Progressive loading states

## Monitoring & Analytics

Consider adding:
- Error tracking (Sentry)
- Analytics (Google Analytics, Mixpanel)
- Performance monitoring (Vercel Analytics)
- Uptime monitoring (Pingdom, UptimeRobot)

## Support

For deployment issues:
1. Check the console for errors
2. Verify environment variables
3. Test API endpoints individually
4. Check the admin dashboard for system health
