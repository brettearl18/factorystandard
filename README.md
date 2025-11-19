# Factory Standards - Perth Guitar Runs

A Next.js 16 application for tracking guitar builds through production at the Perth factory.

## Tech Stack

- **Framework**: Next.js 16 with App Router + React 19, using Turbopack
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS
- **State Management**: Zustand (client-side), React Context (auth/settings)
- **Backend**: Firebase (Firestore, Storage, Cloud Functions, Hosting)
- **Auth**: Firebase Authentication with role-based access control

## Quick Start

1. **Install dependencies:**
```bash
npm install
cd functions && npm install && cd ..
```

2. **Set up Firebase:**
   - See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for detailed instructions
   - Quick setup:
     ```bash
     firebase login
     firebase init
     # Select: Firestore, Functions, Hosting
     ```

3. **Configure environment:**
   - Create `.env.local` with your Firebase config (see `.env.example`)
   - Get config from Firebase Console → Project Settings → General

4. **Deploy Firestore rules:**
```bash
firebase deploy --only firestore:rules
```

5. **Set up authentication:**
   - Enable Email/Password in Firebase Console
   - Create test users and set roles (see FIREBASE_SETUP.md)

6. **Run development server:**
```bash
npm run dev
```

For detailed Firebase setup instructions, see [FIREBASE_SETUP.md](./FIREBASE_SETUP.md).

## Deployment

```bash
./deploy.sh
```

This will build the Next.js app and deploy to Firebase Hosting.

## Project Structure

- `src/app/` - Next.js App Router pages
- `src/components/` - React components
- `src/lib/` - Firebase and utility functions
- `src/hooks/` - Custom React hooks
- `src/store/` - Zustand stores
- `src/contexts/` - React contexts (AuthContext)
- `src/types/` - TypeScript type definitions
- `functions/` - Firebase Cloud Functions
- `firestore.rules` - Firestore security rules

## Features

### Staff/Admin Features
- **Run Board** (`/runs/[runId]/board`): Kanban-style board for tracking guitars through production stages
- Drag-and-drop guitars between stages
- Add notes and photos when moving guitars
- Full access to all runs, stages, and guitars

### Client Features
- **My Guitars** (`/my-guitars`): View all guitars assigned to the logged-in client
- **Guitar Detail** (`/my-guitars/[guitarId]`): View detailed information about a specific guitar
- See simplified status updates (not internal stage names)
- View client-visible notes and photos

## Data Model

- **Runs**: Production flows (Perth factory only)
- **Stages**: Pipeline stages within a run (can be run-specific)
- **Guitars**: Individual guitar builds belonging to a run and client
- **Notes**: Updates/notes attached to guitars, can be marked as visible to clients

## Security

Firestore rules enforce:
- Staff/Admin: Full read/write access
- Clients: Read-only access to their own guitars and client-visible notes
