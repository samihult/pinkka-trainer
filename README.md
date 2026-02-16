# Pinkka Species Learning Application

A comprehensive biology education platform for learning animal, plant, algae, microbe, and other species through interactive cards and tests.

## Features

### For Students (Viewer Role)

- Browse species organized in stacks and groups
- Study with interactive cards featuring multiple images
- Test knowledge with randomized tests
- Track learning progress

### For Educators (Editor Role)

- Create and organize custom species collections
- Upload multiple images per species with reordering
- Organize species into stacks (pinkka in Finnish)
- Group stacks into categories
- Full content management with drag-and-drop reordering

### For Administrators (Admin Role)

- Manage user roles and permissions
- Grant editor or admin access to users
- Oversee all content in the system

## Tech Stack

- **Framework:** Next.js 16 with App Router
- **Language:** TypeScript
- **UI Components:** shadcn/ui
- **Styling:** Tailwind CSS v4
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth (Email/Password & Google)
- **Storage:** Firebase Storage (for images)
- **Hosting:** Vercel

## Quick Setup

### Prerequisites

1. A Firebase project ([create one here](https://console.firebase.google.com/))
2. Environment variables configured in Vercel

### Setup Steps

1. **Create Firestore Database**
   - Go to Firebase Console > Firestore Database
   - Click "Create database"
   - Choose a location
   - Start in production mode

2. **Apply Security Rules**
   - Copy rules from `scripts/firestore.rules`
   - Paste in Firestore > Rules tab
   - Click "Publish"

3. **Enable Authentication**
   - Go to Authentication > Sign-in method
   - Enable Email/Password and Google

4. **Create Firebase Storage**
   - Go to Storage
   - Click "Get started"
   - Use default rules

5. **Set Environment Variables**
   - Add Firebase config to Vercel project (see below)

6. **Create Indexes as Needed**
   - When you see "index required" errors, click the provided link
   - Firebase will auto-configure the index
   - Click "Create Index" and wait for it to build

### Environment Variables

Add these to your Vercel project (Vars section in sidebar):

\`\`\`
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
\`\`\`

### Creating Your First Admin User

1. Sign up with an account
2. Go to Firebase Console > Firestore Database
3. Find your user in the `users` collection
4. Edit the document and set `role: "admin"`
5. Refresh the application

## Usage

### Learning Mode

- Navigate to **Learn** page
- Choose a group and stack
  - Select **Learning Mode** or **Take Test**
- Use arrow keys or buttons to navigate

### Content Management (Editors)

- Navigate to **Manage** page
- Create groups, stacks, and species
- Upload images and organize content
- Drag and drop to reorder

### Role Management (Admins)

- Navigate to **Admin** page
- View all users and change their roles

## Troubleshooting

See `FIRESTORE_SETUP.md` for detailed troubleshooting:

- Missing permissions → Apply security rules
- Index required → Click the error link to create index
- Client offline → Check environment variables

## Data Structure

- **Groups:** Top-level categories for organizing content
- **Stacks (Pinkka):** Collections of related species
- **Species:** Individual organisms with images and metadata
- **Users:** Account holders with role-based permissions

## License

Created for educational purposes.
