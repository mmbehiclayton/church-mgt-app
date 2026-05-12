# Vercel Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Push your code to GitHub
3. **Neon Database**: Your PostgreSQL database is already set up

## Deployment Steps

### 1. Prepare Your Repository

Ensure your code is pushed to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Import Project to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Vercel will auto-detect Next.js configuration

### 3. Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

**Required Variables:**
- `DATABASE_URL` or `CHURCH_DATABASE_URL`: Your Neon PostgreSQL connection string
  ```
  postgresql://neondb_owner:npg_DtL8y9eohqPY@ep-frosty-rain-ahj6k31v-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=15
  ```

> Recommended: set both `DATABASE_URL` and `CHURCH_DATABASE_URL` to the same Neon connection string to keep local and deployed environments consistent.

- `NEXTAUTH_SECRET`: Generate with:
  ```bash
  openssl rand -base64 32
  ```

- `NEXTAUTH_URL`: Your Vercel deployment URL
  ```
  https://your-app-name.vercel.app
  ```

> **Note**: Add these to all environments (Production, Preview, Development)

### 4. Build Settings

Vercel auto-detects Next.js. Default settings:
- **Framework Preset**: Next.js
- **Build Command**: `next build`
- **Output Directory**: `.next`
- **Install Command**: `pnpm install` (or `npm install`)

### 5. Database Setup

Your Prisma schema is already configured. After first deployment:

1. Run migrations (if needed):
   ```bash
   npx prisma migrate deploy
   ```

2. Seed the database (optional):
   ```bash
   npx prisma db seed
   ```

> You can run these commands locally with your production `DATABASE_URL` or use Vercel CLI.

### 6. Deploy

Click **Deploy** in Vercel. The build process will:
1. Install dependencies
2. Generate Prisma Client
3. Build Next.js app
4. Deploy to edge network

### 7. Post-Deployment

1. **Update NEXTAUTH_URL**: After deployment, update the environment variable with your actual Vercel URL
2. **Test Authentication**: Visit `/auth/signin` and test login
3. **Verify Database**: Check that transactions and categories load correctly

## Continuous Deployment

Once connected, Vercel automatically deploys:
- **Production**: Pushes to `main` branch
- **Preview**: Pull requests and other branches

## Troubleshooting

### Build Failures

**Prisma Client Issues:**
```bash
# Add postinstall script to package.json
"postinstall": "prisma generate"
```

**Environment Variables:**
- Ensure all required variables are set in Vercel
- Check for typos in variable names

### Database Connection

**Connection Pool Exhausted:**
- Neon has connection limits on free tier
- Use connection pooling (already configured in your `DATABASE_URL`)

**Migrations:**
```bash
# Run migrations manually if needed
npx prisma migrate deploy
```

## Security Checklist

- [ ] `NEXTAUTH_SECRET` is a strong, random value
- [ ] `.env` and `.env.local` are in `.gitignore`
- [ ] Database credentials are not committed to Git
- [ ] `NEXTAUTH_URL` matches your production domain

## Useful Commands

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from CLI
vercel

# Deploy to production
vercel --prod

# View logs
vercel logs

# Run Prisma commands with production DB
DATABASE_URL="your-prod-url" npx prisma studio
```

## Additional Resources

- [Vercel Next.js Documentation](https://vercel.com/docs/frameworks/nextjs)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
- [NextAuth.js Deployment](https://next-auth.js.org/deployment)
