# NISU Teacher App

A web application for creating and managing educational content, with Google Authentication and database storage. The app allows teachers to create notebooks containing various types of educational content (prompts, quizzes, multimedia, etc.) that can be accessed by students through a Chrome extension.

## Project Overview

This application consists of two main components:

1. **Teacher Web Application**: A web app hosted on Google App Engine where teachers can create and manage educational content organized into notebooks.
2. **Student Chrome Extension**: A Chrome extension that students use to access the content created by teachers.

### Key Features

- **Google Authentication**: Secure login for teachers and students
- **Database Storage**: Content stored in Google Datastore (replacing the previous JSON file storage)
- **Multiple Notebooks**: Organize content by subject or topic
- **Progress Tracking**: Track student completion of activities
- **Various Content Types**: Support for prompts, multimedia, quizzes, assignments, and websites

## File Structure

- `app.js` - Main Express application backend with API endpoints
- `app.yaml` - Google App Engine configuration
- `package.json` - Node.js project dependencies
- `index.html` - Frontend UI for teachers
- `migrate.js` - Script to migrate existing JSON data to the database
- `chrome-extension-guide.md` - Guide for updating the Chrome extension
- `README.md` - This file

## Setup Instructions

### Prerequisites

- Google Cloud Platform account
- Node.js and npm installed
- Google Cloud SDK installed

### Step 1: Configure Google Cloud Project

1. Create or select a Google Cloud Project
2. Enable required APIs:
   - Google App Engine
   - Cloud Datastore (or Firestore in Datastore mode)
   - Identity and Access Management (IAM)

3. Configure OAuth consent screen:
   - Go to API & Services > OAuth consent screen
   - Fill in required information
   - Add necessary scopes (email, profile)

4. Create OAuth credentials:
   - Go to API & Services > Credentials
   - Create an OAuth 2.0 Client ID (Web application)
   - Add authorized JavaScript origins and redirect URIs

### Step 2: Update Configuration

1. In `app.yaml`, update the environment variables:
   ```yaml
   env_variables:
     GOOGLE_CLIENT_ID: "YOUR_GOOGLE_CLIENT_ID"
   ```

2. In `index.html`, update the Google client ID and API base URL:
   ```javascript
   const API_BASE_URL = 'https://your-project-id.appspot.com/api';
   ```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Migrate Existing Data (Optional)

If you have existing JSON data:

```bash
node migrate.js
```

When prompted, enter:
- The path to your JSON file (e.g., `instructions.json`)
- The email address for the teacher account

### Step 5: Deploy to Google App Engine

```bash
gcloud app deploy
```

### Step 6: Update Chrome Extension

Follow the instructions in `chrome-extension-guide.md` to update your Chrome extension to work with the new backend.

## API Endpoints

| Endpoint | Method | Description | Authentication Required |
|----------|--------|-------------|------------------------|
| `/api/notebooks` | GET | Get all notebooks for the teacher | Yes |
| `/api/notebooks` | POST | Create or update a notebook | Yes |
| `/api/notebooks/:notebookId` | GET | Get a specific notebook | Yes |
| `/api/notebooks/byName/:name` | GET | Get a notebook by name | Yes |
| `/api/progress/:notebookId` | GET | Get student progress | Yes |
| `/api/progress/:notebookId` | POST | Update student progress | Yes |
| `/api/users/register` | POST | Register a new teacher | Yes (admin only) |
| `/api/migrate` | POST | Migrate data to database | Yes |

## Development

### Local Testing

To run the app locally:

```bash
npm start
```

The app will be available at http://localhost:8080

### Database Structure

- **Notebooks**: Each notebook contains a name, a playlist of items, and metadata
- **Users**: Stores user roles (teacher/student)
- **Progress**: Tracks student completion status for items in notebooks

## Chrome Extension Integration

The Chrome extension needs to be updated to:

1. Implement Google Sign-In
2. Fetch notebooks and playlists from the database API
3. Track and update student progress

Detailed instructions are provided in `chrome-extension-guide.md`.

## Troubleshooting

- **Authentication Issues**: Verify your Google client ID and redirect URIs
- **Deployment Failures**: Check App Engine logs with `gcloud app logs tail`
- **Database Errors**: Ensure Datastore API is enabled and properly configured
- **CORS Errors**: Verify your app has proper CORS headers for Chrome extension access

## Future Enhancements

- Real-time synchronization between teacher and student
- Advanced analytics on student progress
- Integration with Google Classroom
- Support for more interactive content types