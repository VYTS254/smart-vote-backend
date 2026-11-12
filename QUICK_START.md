# 🚀 Quick Start Guide - 5 Minutes to Running Backend

## Prerequisites
- Node.js 20+ installed
- PostgreSQL 16+ installed and running
- Git Bash or PowerShell

## Step-by-Step Setup

### 1. Install Dependencies (2 minutes)
```bash
cd backend
npm install
```

### 2. Create Database (30 seconds)
```bash
# Open PostgreSQL command line
psql -U postgres

# Create database
CREATE DATABASE smart_vote_db;

# Exit
\q
```

### 3. Configure Environment (1 minute)
```bash
# Copy example environment file
cp .env.example .env

# Edit .env and update DATABASE_URL
# DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/smart_vote_db?schema=public"
```

### 4. Initialize Database (1 minute)
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed with sample data
npm run seed
```

### 5. Start Server (30 seconds)
```bash
npm run dev
```

## ✅ Verification

Open http://localhost:3000/health in your browser.

Should see:
```json
{
  "success": true,
  "message": "Server is healthy",
  "timestamp": "..."
}
```

## 🎉 You're Done!

### Test Login
```bash
# Using curl or Postman
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"studentRegistrationNumber":"ADMIN001","password":"Admin@123456"}'
```

### Default Credentials
- **Admin**: ADMIN001 / Admin@123456
- **Student**: STU0001 / Student@123
- **Student**: student1@university.edu / Student@123

## 🛠️ Useful Commands

```bash
# View database in browser
npm run studio

# Reset database
npx prisma migrate reset

# Rebuild TypeScript
npm run build

# Run tests (once created)
npm test
```

## ❓ Problems?

### Can't connect to database
- Check PostgreSQL is running
- Verify DATABASE_URL in .env
- Ensure database exists

### Port 3000 in use
- Change PORT in .env
- Or kill the process: `taskkill /F /IM node.exe` (Windows)

### Prisma errors
```bash
npx prisma generate
npx prisma migrate reset
npm run seed
```

## 📚 Next Steps
See [Backend Installation & Testing Guide](./README.md) for complete documentation.
