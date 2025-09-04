# FitFlow - Comprehensive Fitness Tracking Platform

## 🚀 Overview

FitFlow is a mobile-first fitness application that unifies workouts, nutrition, progress monitoring, and AI-powered coaching into one intelligent platform. Built with React Native and TypeScript, following Test-Driven Development principles.

## 🎯 Features

### Core Features (Sprint 1 - Completed ✅)
- **Enhanced Authentication System**
  - Email/password registration and login
  - JWT tokens with refresh token rotation
  - Biometric authentication (Face ID/Touch ID)
  - Social authentication (Google/Apple) ready
  - Rate limiting and session management
  - Password reset functionality

### Upcoming Features
- **Dashboard & Navigation** (Sprint 2)
- **Workout Tracking** with exercise database
- **Nutrition Logging** with macro tracking
- **Progress Monitoring** with photos and measurements
- **AI-Powered Coaching** with personalized recommendations
- **Social Features** and community challenges

## 🛠️ Tech Stack

- **Frontend**: React Native, Expo, TypeScript
- **Backend**: Node.js, Express (planned)
- **Database**: PostgreSQL with Prisma ORM (migrating to Supabase)
- **Authentication**: JWT, Expo SecureStore, Expo LocalAuthentication
- **Testing**: Jest, React Native Testing Library
- **State Management**: React Context (planned: Redux Toolkit)

## 📊 Current Status

- **Test Coverage**: 93.95% statements, 100% functions
- **Tests**: 37 tests, all passing
- **Sprint 1**: ✅ Complete
- **TDD Approach**: Tests written before implementation

## 🚦 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- PostgreSQL (local) or Supabase account (cloud)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/fitflow-app.git
cd fitflow-app
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Generate Prisma client:
```bash
npm run db:generate
```

5. Run database migrations (if using local PostgreSQL):
```bash
npm run db:migrate
```

### Running the App

```bash
# Start the Expo development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web
npm run web
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📁 Project Structure

```
fitflow-app/
├── __tests__/              # Test files
│   └── unit/
│       └── services/       # Service unit tests
├── src/                    # Source code
│   ├── components/         # React Native components
│   ├── screens/           # Screen components
│   ├── services/          # Business logic services
│   ├── types/             # TypeScript type definitions
│   └── context/           # React Context providers
├── prisma/                # Database schema and migrations
│   └── schema.prisma      # Prisma schema definition
├── .expo/                 # Expo configuration
└── docs/                  # Documentation
```

## 🗄️ Database Schema

The application uses Prisma ORM with the following main models:
- **User**: Authentication and profile
- **Session**: JWT refresh tokens and device management
- **Workout**: Exercise tracking
- **Meal**: Nutrition logging
- **Progress**: Body metrics and photos
- **Goal**: Fitness goals and targets

## 🔐 Security Features

- Password hashing (bcrypt - to be implemented)
- JWT with short-lived access tokens (15 min)
- Refresh token rotation
- Rate limiting (5 attempts per 15 minutes)
- Secure token storage with Expo SecureStore
- Biometric authentication support
- Timing attack prevention

## 📈 Development Methodology

This project follows Test-Driven Development (TDD) with the RED-GREEN-REFACTOR cycle:

1. **RED**: Write failing tests first
2. **GREEN**: Implement code to pass tests
3. **REFACTOR**: Improve code while maintaining test coverage

Target coverage: 80% minimum, 95% for critical paths (authentication)

## 🚀 Deployment

### Supabase Migration (In Progress)

The project is being migrated to Supabase for:
- Managed PostgreSQL database
- Built-in authentication
- Real-time subscriptions
- Edge functions
- Storage for images

### Environment Setup for Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Update `.env` with Supabase credentials:
```env
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
DATABASE_URL=your-database-url
```

## 📝 Sprint Progress

- **Sprint 1** (Weeks 1-2): ✅ Project Setup & Authentication
- **Sprint 2** (Weeks 3-4): Dashboard & Navigation
- **Sprint 3** (Weeks 5-6): Workout Tracking
- **Sprint 4** (Weeks 7-8): Nutrition Logging
- **Sprint 5-16**: Advanced features and AI integration

## 🤝 Contributing

This is currently a private project. Contribution guidelines will be added when the project is open-sourced.

## 📄 License

This project is currently proprietary. License information will be updated.

## 👨‍💻 Author

Your Name - [GitHub Profile](https://github.com/yourusername)

## 🙏 Acknowledgments

- Built with TDD principles
- Expo and React Native communities
- Prisma and Supabase teams

---

**Project Status**: 🟢 Active Development

**Last Updated**: September 4, 2025