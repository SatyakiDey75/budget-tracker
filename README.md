# Budgeteer

A full-stack personal finance tracker built with Next.js 14, MongoDB, and Clerk authentication. Track income and expenses, manage categories, link bank accounts, and visualize spending history with charts.

## Features

- **Dashboard** — income/expense overview with date range filtering, animated stat cards, and category breakdowns
- **Transaction history** — sortable, filterable table with CSV export
- **Banks** — link HDFC, PNB, or SBI accounts; balances update automatically on every transaction
- **Categories** — custom income and expense categories with emoji icons
- **History chart** — monthly and yearly bar charts built with Recharts
- **Dark mode** — dark-first UI with system preference support

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Auth | Clerk |
| Database | MongoDB Atlas via Prisma ORM |
| UI | shadcn/ui + Tailwind CSS |
| Data fetching | TanStack React Query |
| Tables | TanStack React Table |
| Charts | Recharts |
| Forms | React Hook Form + Zod |

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Create a `.env` file in the project root:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/wizard

# MongoDB
DATABASE_URL=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<db>?retryWrites=true&w=majority
```

### 3. Push the database schema

```bash
npx prisma db push
```

### 4. Generate the Prisma client

```bash
npx prisma generate
```

### 5. Add bank logos

Place the following images in `public/banks/`:

```
public/banks/hdfc.jpg
public/banks/pnb.jpg
public/banks/sbi.jpg
public/banks/default.jpg   ← fallback
```

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Note:** Steps 3 and 4 must be re-run whenever you modify `prisma/schema.prisma`. Always stop the dev server before running `prisma generate` on Windows, as the running server locks the Prisma engine DLL.

## Project Structure

```
app/
├── (auth)/                  # Sign-in / sign-up pages (Clerk)
├── (dashboard)/
│   ├── _actions/            # Server actions (transactions, categories, banks)
│   ├── _components/         # Shared dashboard components
│   ├── transactions/        # Transaction history page
│   ├── manage/              # Currency, banks, and category management
│   └── page.tsx             # Main dashboard
├── api/                     # Route handlers (read endpoints)
└── wizard/                  # First-time currency onboarding

prisma/
└── schema.prisma            # MongoDB models

public/
└── banks/                   # Bank logo images

schema/                      # Zod validation schemas
lib/                         # Helpers, constants, Prisma client
components/                  # Shared UI components (shadcn/ui)
```

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npx prisma db push` | Sync schema changes to MongoDB |
| `npx prisma generate` | Regenerate the Prisma client |
| `npx prisma studio` | Open Prisma Studio (DB browser) |
