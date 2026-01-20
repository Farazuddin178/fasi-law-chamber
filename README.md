# Legal Case Management System

A comprehensive web application for managing legal cases, tasks, documents, expenses, and team communication. Built with React, TypeScript, TailwindCSS, and Supabase.

## 🌐 Live Application

**Production URL:** https://x33h4pm2quh4.space.minimax.io

## 🚀 Features

### Core Functionality
- **Case Management**: Create, edit, view, and track legal cases with 35+ fields
- **Task Management**: Assign tasks, track progress, set priorities, and enable real-time commenting
- **Document Management**: Upload, download, and organize case-related documents
- **User Management**: Role-based access control (Admin, Restricted Admin, Viewer)
- **Analytics Dashboard**: Visualize case statistics with interactive charts (Recharts)
- **Expense Tracker**: Submit and approve expenses with admin workflow
- **Login Logs**: Track user activity and session history
- **Email System**: Internal messaging between users with priority levels and templates

### Recent Enhancements (2025-11-03)
- **Storage Monitoring**: Admin dashboard for tracking storage usage and alerts
- **GitHub Integration**: Backup and restore case data to GitHub repositories
- **Bulk Export**: Download all case data as JSON
- **Email Communication**: Complete messaging system with inbox/outbox, templates, and role-based messaging
- **Responsive Design**: Optimized for desktop (1024px+), tablet (768px-1024px), and mobile devices
- **Database Fixes**: Resolved task_comments schema issues

## 🏗️ Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS + Radix UI Components
- **Backend**: Supabase (PostgreSQL + Edge Functions + Storage)
- **Charts**: Recharts + Chart.js
- **Icons**: Lucide React
- **Routing**: React Router DOM
- **Forms**: React Hook Form + Zod validation
- **Notifications**: React Hot Toast

## 📋 Prerequisites

- Node.js 18+ or Bun
- pnpm (recommended) or npm
- Supabase account

## 🔧 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd legal-case-management
```

### 2. Install Dependencies
```bash
pnpm install
# or
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Database Setup

The application requires the following Supabase tables:

#### Tables Schema:
- **users**: User authentication and role management
- **cases**: Legal case data (35+ fields including dates, parties, courts, etc.)
- **tasks**: Task tracking with case linkage
- **task_comments**: Real-time commenting system for tasks
- **case_documents**: Document metadata linked to Supabase Storage
- **expenses**: Expense tracking with approval workflow
- **login_logs**: User activity and session tracking
- **admin_log**: Admin role transfer history
- **storage_stats**: Storage monitoring and usage statistics
- **github_settings**: GitHub integration configuration
- **email_communications**: Internal email messaging system

#### Storage Bucket:
- **case-documents**: Public bucket for document storage

#### Edge Functions:
Deploy the following edge functions from `/supabase/functions/`:
- `auth-login`: User authentication with session tracking
- `auth-logout`: Session management and logout
- `document-upload`: File upload handling
- `admin-transfer`: Admin role transfer logic
- `expense-approval`: Expense approval workflow
- `database-reset`: System reset functionality

### 5. Build and Run

#### Development Mode:
```bash
pnpm run dev
```

#### Production Build:
```bash
pnpm run build
```

#### Preview Production Build:
```bash
pnpm run preview
```

## 👤 Default Credentials

### Admin Account:
- **Email**: mohammedfarazuddin01@gmail.com
- **Password**: Set during first deployment (contact system administrator)

### Test Account (if available):
- **Email**: admin@legalcms.com
- **Password**: admin123

## 📱 User Roles

### Admin (Full Access)
- All system features
- User management
- Storage monitoring
- GitHub integration
- Database reset
- Expense approval
- System settings

### Restricted Admin
- Case CRUD operations
- Task management
- Document upload/download
- Expense submission
- View analytics

### Viewer
- Read-only access to cases
- View documents
- View analytics
- Submit messages to admin

## 🔒 Security Features

- Row-Level Security (RLS) policies on all tables
- Role-based access control
- Secure password hashing (SHA-256)
- Session tracking and management
- Audit logging for admin actions

## 📊 Key Pages

1. **Dashboard** (`/`): Overview with statistics and recent activity
2. **Cases** (`/cases`): List and manage all legal cases
3. **Case Details** (`/cases/:id`): View and edit individual cases
4. **Tasks** (`/tasks`): Task board with filtering and real-time updates
5. **Documents** (`/documents`): Document library with upload/download
6. **Users** (`/users`): User management (Admin only)
7. **Analytics** (`/analytics`): Charts and statistics
8. **Expenses** (`/expenses`): Expense tracking and approval
9. **Messages** (`/messages`): Email communication system
10. **Login Logs** (`/login-logs`): Activity tracking
11. **Storage** (`/storage`): Storage monitoring (Admin only)
12. **GitHub** (`/github`): Backup/restore integration (Admin only)
13. **Settings** (`/settings`): System settings and database reset (Admin only)

## 🎨 Responsive Design

The application is fully responsive with breakpoints:
- **Desktop**: 1024px and above
- **Tablet**: 768px - 1023px
- **Mobile**: Below 768px

All components adapt seamlessly across devices.

## 📧 Email System

The internal messaging system supports:
- Compose emails with rich text
- Priority levels (High, Medium, Low)
- Email templates for common messages
- Role-based recipient selection
- Inbox/Outbox organization
- Unread message notifications
- Real-time message delivery

## 💾 Storage Monitoring

Admin users can:
- View total storage usage
- Track document counts
- Monitor case data growth
- Receive storage alerts
- Access optimization guidance

## 🔄 GitHub Integration

Backup and restore capabilities:
- Export case data to GitHub
- Import case data from GitHub
- Encrypted token storage
- Sync tracking and history
- JSON format for portability

## 🐛 Troubleshooting

### Build Issues
```bash
# Clear cache and rebuild
rm -rf node_modules .pnpm-store pnpm-lock.yaml
pnpm install
pnpm run build
```

### Database Connection Issues
- Verify `.env` file has correct Supabase credentials
- Check Supabase project status
- Ensure RLS policies are configured

### Edge Function Errors
- Check edge function logs in Supabase dashboard
- Verify environment variables are set
- Test endpoints using the Supabase API explorer

## 📝 Development Notes

### Code Structure
```
legal-case-management/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Page components
│   ├── lib/            # Utilities and Supabase client
│   └── App.tsx         # Main application with routing
├── public/             # Static assets
├── supabase/           # Database migrations and edge functions
└── dist/               # Production build output
```

### Adding New Features
1. Create necessary database tables/migrations
2. Add edge functions if needed
3. Create page components in `src/pages/`
4. Add routes in `App.tsx`
5. Update navigation in `DashboardLayout.tsx`
6. Test thoroughly before deployment

## 📞 Support

For issues or questions, contact the system administrator at mohammedfarazuddin01@gmail.com

## 📄 License

Proprietary - All rights reserved

---

**Last Updated**: 2025-11-10
**Version**: 2.1.0 (Admin Features Edition)
