# Church Finance App

A modern, secure web application for managing church financial transactions received via M-Pesa. Built with Next.js, this app provides an intuitive interface for tracking donations, generating reports, and managing financial data.

## Features

- 🔐 **Secure Authentication** - NextAuth.js with bcrypt password hashing
- 📱 **M-Pesa Message Parsing** - Automatically extract transaction details from M-Pesa SMS messages
- 💰 **Transaction Management** - Add, view, filter, and delete transactions
- 📊 **Category Management** - Organize transactions by custom categories
- 📈 **Dashboard Analytics** - Visual charts and statistics for financial insights
- 📄 **Export Functionality** - Export data to Excel, CSV, and PDF formats
- 📥 **Bulk Import** - Import transactions from Excel files
- ⚙️ **Organization Settings** - Customize church information and branding
- 🎨 **Modern UI** - Responsive design with shadcn/ui components
- 🔍 **Advanced Filtering** - Filter by date range and categories

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **UI Library**: [React 19](https://react.dev/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) (via [Neon](https://neon.tech/))
- **ORM**: [Prisma](https://www.prisma.io/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Charts**: [Recharts](https://recharts.org/)
- **Excel/PDF**: ExcelJS, jsPDF, XLSX

## Prerequisites

- Node.js 20+ installed
- pnpm (or npm/yarn)
- PostgreSQL database (Neon recommended)

## Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd church-app
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   
   Update the following variables in `.env`:
   ```env
   # Database - Your PostgreSQL connection string
   DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
   
   # NextAuth - Generate secret with: openssl rand -base64 32
   NEXTAUTH_SECRET="your-secret-key-here"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. **Set up the database**
   
   Run Prisma migrations:
   ```bash
   npx prisma migrate dev
   ```
   
   Seed the database with initial data:
   ```bash
   npx prisma db seed
   ```
   
   This creates:
   - Default admin user: `admin@church.com` / `password123`
   - Sample categories
   - Sample transactions

5. **Start the development server**
   ```bash
   pnpm dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Authentication

1. Navigate to `/auth/signin`
2. Login with default credentials:
   - Email: `admin@church.com`
   - Password: `password123`

> ⚠️ **Important**: Change the default password after first login!

### Adding Transactions

1. Click **"Add Transaction"** on the dashboard
2. Paste M-Pesa message or manually enter details
3. The app automatically parses M-Pesa messages to extract:
   - Amount
   - Reference number
   - Bank name
   - Account details
   - Date and time

### Managing Categories

1. Navigate to **Finance → Categories**
2. Add, edit, or delete categories
3. Categories help organize transactions for reporting

### Generating Reports

1. Use the dashboard filters to select date range and categories
2. View analytics including:
   - Total amount and transaction count
   - Average transaction amount
   - Category breakdown (pie chart)
   - Revenue trend (line chart)
3. Export filtered data to Excel, CSV, or PDF

### Organization Settings

1. Navigate to **Settings**
2. Update church information:
   - Organization name
   - Leader name
   - Contact details
   - Logo (optional)

## Project Structure

```
church-app/
├── app/                      # Next.js App Router
│   ├── actions.ts           # Server actions for data operations
│   ├── api/                 # API routes (NextAuth)
│   ├── dashboard/           # Dashboard pages
│   └── page.tsx             # Login page
├── components/              # React components
│   ├── dashboard/           # Dashboard-specific components
│   ├── finance/             # Finance module components
│   ├── layout/              # Layout components (Navbar, Sidebar)
│   ├── settings/            # Settings components
│   └── ui/                  # shadcn/ui components
├── lib/                     # Utility functions
│   ├── db.ts               # Prisma client instance
│   ├── mpesa-parser.ts     # M-Pesa message parser
│   └── utils.ts            # Helper functions
├── prisma/                  # Database schema and migrations
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Database seeding script
└── public/                  # Static assets
```

## Database Schema

### User
- Authentication and user management
- Fields: id, email, password (hashed), name, role

### Category
- Transaction categorization
- Fields: id, name, createdAt

### Transaction
- Financial transaction records
- Fields: id, categoryId, amount, bank, paybill, account, accountName, reference, transactionDate, transactionTime, rawMessage, createdAt

### Organization
- Church/organization settings
- Fields: id, name, leaderName, email, phone, logoUrl, createdAt, updatedAt

## Available Scripts

```bash
# Development
pnpm dev          # Start dev server

# Production
pnpm build        # Build for production
pnpm start        # Start production server

# Database
npx prisma migrate dev      # Run migrations (development)
npx prisma migrate deploy   # Run migrations (production)
npx prisma db seed          # Seed database
npx prisma studio           # Open Prisma Studio (database GUI)
npx prisma generate         # Regenerate Prisma Client

# Code Quality
pnpm lint         # Run ESLint
```

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions on deploying to Vercel.

Quick steps:
1. Push code to GitHub
2. Import project to Vercel
3. Add environment variables
4. Deploy

## Security Features

- ✅ Password hashing with bcryptjs
- ✅ Session-based authentication via NextAuth.js
- ✅ Server-side validation for all data operations
- ✅ Unique constraint on transaction references (prevents duplicates)
- ✅ Protected API routes and server actions
- ✅ Environment variables for sensitive data

## Future Enhancements

- 🏢 Multi-organization support (multiple churches)
- 📲 SMS automation for automatic transaction capture
- 👥 User roles and permissions (Admin, Treasurer, Viewer)
- 📧 Email notifications for large transactions
- 🌍 Multi-currency support
- 📱 Mobile app (React Native)
- 🔔 Real-time notifications
- 📊 Advanced reporting (yearly comparisons, forecasting)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For issues or questions, please contact the development team.

---

**Built with ❤️ for church financial management**
