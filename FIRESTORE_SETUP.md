# Firestore Setup Instructions

## Required Steps to Make the App Work

Your application is experiencing "Missing or insufficient permissions" errors because Firestore security rules need to be configured.

### Step 1: Create Firestore Database

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click **Firestore Database** in the left sidebar
4. Click **Create database**
5. Select a location (choose one close to your users)
6. Start in **production mode** (we'll add rules in the next step)

### Step 2: Configure Security Rules

1. In Firestore Database, click the **Rules** tab
2. Replace the existing rules with the content from `scripts/firestore.rules` in your project
3. Click **Publish** to apply the rules

### Step 3: Create Required Indexes (Important!)

Firestore requires composite indexes for queries that filter and sort on multiple fields.

**Easiest Method - Use Error Links:**

1. When you see an error like "The query requires an index", it includes a direct link
2. Click the link in the error message
3. Firebase Console will open with the index pre-configured
4. Click **Create Index**
5. Wait 2-5 minutes for the index to build
6. Refresh your application

**Required Indexes:**

- `stacks` collection: `groupId` + `order` (for /learn page)
- `species` collection: `stackId` + `order` (for flashcards/quizzes)
- `groups` collection: `createdBy` + `order` (for editor management)
- `stacks` collection: `groupId` + `createdBy` + `order` (for editor stacks)

See `FIRESTORE_INDEXES.txt` for detailed index specifications if you prefer to create them manually.

### Step 4: Verify Setup

Once the rules are published, the app should work correctly:

- Users can sign in with Google or email/password
- User profiles are automatically created
- Editors can create and manage species, stacks, and groups
- Admins can grant roles to other users

### Security Rules Summary

The rules ensure:

- ✅ Users can read and update their own profile
- ✅ Authenticated users can read all content
- ✅ Only editors and admins can create content
- ✅ Users can only edit/delete their own content (or admins can edit anything)
- ✅ Only admins can change user roles

### Troubleshooting

**"Missing or insufficient permissions" Error:**

- Apply security rules from `scripts/firestore.rules`
- Wait 30-60 seconds for rules to propagate

**"The query requires an index" Error:**

- Click the link in the error message to create the index automatically
- Or create indexes manually following `FIRESTORE_INDEXES.txt`

**"Client is offline" Error:**

- Verify Firebase environment variables are set correctly
- Ensure Firestore database has been created
- Check internet connection

If you still see errors after applying the rules:

1. Wait 30-60 seconds for rules to propagate
2. Refresh your application
3. Check the Firebase Console > Firestore Database > Rules tab to ensure rules were published successfully
4. Verify environment variables are set correctly in your deployment
