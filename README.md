# Smart Vote Backend API

Node.js + Express + TypeScript backend for the Electronic Campus Voting System.

## Prerequisites

- Node.js 20+ LTS
- PostgreSQL 16+
- npm or yarn

## Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and configure your database and other settings.

3. **Set up the database**
   ```bash
   # Initialize Prisma
   npx prisma generate

   # Run migrations
   npm run migrate

   # Seed initial data
   npm run seed
   ```

## Development

Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed database with initial data
- `npm run studio` - Open Prisma Studio (database GUI)
- `npm test` - Run tests
- `npm run lint` - Lint code

## API Documentation

See `docs/api.md` for complete API documentation.

### Base URL
```
http://localhost:3000/api
```

### Authentication
Most endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Database Management

### Run migrations
```bash
npm run migrate
```

### Reset database
```bash
npx prisma migrate reset
```

### Open Prisma Studio
```bash
npm run studio
```

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

## Production Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Set environment variables**
   Ensure all production environment variables are set, especially:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `NODE_ENV=production`

3. **Run migrations**
   ```bash
   npm run migrate:prod
   ```

4. **Start the server**
   ```bash
   npm start
   ```

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma     # Database schema
│   ├── migrations/       # Migration files
│   └── seed.ts          # Database seeder
├── src/
│   ├── config/          # Configuration files
│   ├── middleware/      # Express middleware
│   ├── modules/         # Feature modules
│   │   ├── auth/
│   │   ├── users/
│   │   ├── departments/
│   │   ├── elections/
│   │   ├── candidates/
│   │   ├── ballots/
│   │   ├── delegates/
│   │   └── results/
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript types
│   ├── app.ts           # Express app setup
│   └── server.ts        # Server entry point
├── tests/               # Test files
├── .env.example         # Environment variables template
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies and scripts
```

## Security Notes

- Always use HTTPS in production
- Change default JWT secret
- Use strong passwords
- Enable rate limiting
- Keep dependencies updated
- Regularly backup the database

## Troubleshooting

### Database Connection Error
- Verify PostgreSQL is running
- Check DATABASE_URL in .env
- Ensure database exists

### Port Already in Use
- Change PORT in .env
- Kill process using the port

### Migration Errors
- Reset database: `npx prisma migrate reset`
- Check schema syntax
- Ensure database is accessible

## Support

For issues and questions, please open an issue on GitHub.
