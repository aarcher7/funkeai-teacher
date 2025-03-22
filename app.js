// app.js - Main Express application for Google App Engine
const express = require('express');
const { Datastore } = require('@google-cloud/datastore');
const { OAuth2Client } = require('google-auth-library');
const cors = require('cors');
const path = require('path');

// Initialize Express
const app = express();
app.use(express.json());
app.use(cors());
// Add proper CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    return res.status(200).json({});
  }
  next();
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Google Datastore
const datastore = new Datastore();
const NOTEBOOK_KIND = 'Notebook';
const PROGRESS_KIND = 'Progress';
const USER_KIND = 'User';

// Initialize Google OAuth client
const CLIENT_ID = '294376282666-lllnj1ro4d5qu3iq21nmmasr16tjije5.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);

const userRoleCache = new Map(); // Simple in-memory cache
const CACHE_TTL = 300000; // 5 minutes in milliseconds

// Authentication middleware
// Add this to your authenticate middleware in app.js
async function authenticate(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
      }
  
      const token = authHeader.split(' ')[1];
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: CLIENT_ID
      });
  
      const payload = ticket.getPayload();
      
      // Add token expiration check
      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp < currentTime) {
        return res.status(401).json({ error: 'Unauthorized: Token expired' });
      }
  
      req.user = {
        email: payload.email,
        userId: payload.sub,
        name: payload.name,
        picture: payload.picture
      };
  
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  }

// Add this to your app.js
async function isAdmin(email) {
  try {
    const query = datastore
      .createQuery(USER_KIND)
      .filter('email', '=', email);
    
    const [users] = await datastore.runQuery(query);
    
    return users.length > 0 && users[0].role === 'admin';
  } catch (error) {
    console.error('Error checking admin role:', error);
    return false;
  }
}

// Create a middleware for admin-only routes
function requireAdmin(req, res, next) {
  const userEmail = req.user.email;
  
  isAdmin(userEmail).then(isUserAdmin => {
    if (isUserAdmin) {
      next(); // User is an admin, proceed
    } else {
      res.status(403).json({ error: 'Admin access required' });
    }
  }).catch(error => {
    console.error('Error in admin check:', error);
    res.status(500).json({ error: 'Internal server error' });
  });
}

// Helper to determine if the user is an admin/teacher
async function isTeacher(email) {
    try {
      // Check cache first
      const cachedData = userRoleCache.get(email);
      if (cachedData && (Date.now() - cachedData.timestamp < CACHE_TTL)) {
        return cachedData.isTeacher;
      }
      
      // If not in cache or expired, query the database
      const query = datastore
        .createQuery(USER_KIND)
        .filter('email', '=', email);
      
      const [users] = await datastore.runQuery(query);
      
      const isTeacherResult = users.length > 0 && users[0].role === 'teacher';
      
      // Update cache
      userRoleCache.set(email, {
        isTeacher: isTeacherResult,
        timestamp: Date.now()
      });
      
      return isTeacherResult;
    } catch (error) {
      console.error('Error checking teacher role:', error);
      return false;
    }
  }

// Root endpoint serves the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// This handles the first login by creating a teacher user
app.post('/api/first-user', authenticate, async (req, res) => {
  try {
    const userEmail = req.user.email;
    
    // Check if any users exist
    const query = datastore.createQuery(USER_KIND);
    const [users] = await datastore.runQuery(query);
    
    if (users.length === 0) {
      // This is the first user, make them a teacher
      const key = datastore.key(USER_KIND);
      const userEntity = {
        key: key,
        data: {
          email: userEmail,
          role: 'teacher',
          createdAt: new Date().toISOString()
        }
      };
      
      await datastore.save(userEntity);
      res.json({ success: true, message: 'First user created as teacher' });
    } else {
      // Check if this user exists
      const userQuery = datastore
        .createQuery(USER_KIND)
        .filter('email', '=', userEmail);
      
      const [existingUsers] = await datastore.runQuery(userQuery);
      
      if (existingUsers.length === 0) {
        res.status(403).json({ error: 'Not authorized. Contact an administrator.' });
      } else {
        res.json({ success: true, message: 'User already exists' });
      }
    }
  } catch (error) {
    console.error('Error creating first user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// API endpoint to get all notebooks for a teacher
app.get('/api/notebooks', authenticate, async (req, res) => {
  try {
    const userEmail = req.user.email;
    
    // Check if user is a teacher
    if (!(await isTeacher(userEmail))) {
      console.log(`User ${userEmail} attempted to access notebooks but is not a teacher`);
      return res.status(403).json({ error: 'Not authorized to access notebooks' });
    }
    
    console.log(`Fetching notebooks for user: ${userEmail}`);
    
    // Query for notebooks created by this teacher
    const query = datastore
      .createQuery(NOTEBOOK_KIND)
      .filter('createdBy', '=', userEmail);
    
    const [notebooks] = await datastore.runQuery(query);
    console.log(`Found ${notebooks.length} notebooks for user ${userEmail}`);
    
    res.json({ notebooks });
  } catch (error) {
    console.error(`Database error fetching notebooks: ${error.message}`);
    console.error(error.stack);
    res.status(500).json({ error: 'Failed to fetch notebooks' });
  }
});

// API endpoint to create or update a notebook
app.post('/api/notebooks', authenticate, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const { name, playlist } = req.body;
    
    // Check if user is a teacher
    if (!(await isTeacher(userEmail))) {
      return res.status(403).json({ error: 'Not authorized to create notebooks' });
    }
    
    if (!name || !Array.isArray(playlist)) {
      return res.status(400).json({ error: 'Invalid notebook data' });
    }
    
    // Check if notebook with this name already exists for this teacher
    const query = datastore
      .createQuery(NOTEBOOK_KIND)
      .filter('name', '=', name)
      .filter('createdBy', '=', userEmail);
    
    const [existingNotebooks] = await datastore.runQuery(query);
    
    let key;
    if (existingNotebooks.length === 0) {
      // Create a new notebook if none exists
      key = datastore.key(NOTEBOOK_KIND);
    } else {
      // Update existing notebook
      key = existingNotebooks[0][datastore.KEY];
    }
    
    // Prepare the entity data
    const notebookEntity = {
      key: key,
      data: {
        name: name,
        playlist: playlist,
        createdBy: userEmail,
        updatedAt: new Date().toISOString()
      }
    };
    
    // Save to Datastore
    await datastore.save(notebookEntity);
    
    res.json({ 
      success: true, 
      message: 'Notebook saved successfully',
      notebookId: key.id || key.name
    });
  } catch (error) {
    console.error('Error saving notebook:', error);
    res.status(500).json({ error: 'Failed to save notebook' });
  }
});

// API endpoint to get a specific notebook
app.get('/api/notebooks/:notebookId', authenticate, async (req, res) => {
  try {
    const { notebookId } = req.params;
    const key = datastore.key([NOTEBOOK_KIND, datastore.int(notebookId)]);
    
    const [notebook] = await datastore.get(key);
    
    if (!notebook) {
      return res.status(404).json({ error: 'Notebook not found' });
    }
    
    res.json({ notebook });
  } catch (error) {
    console.error('Error fetching notebook:', error);
    res.status(500).json({ error: 'Failed to fetch notebook' });
  }
});

// API endpoint to get a notebook by name
app.get('/api/notebooks/byName/:name', authenticate, async (req, res) => {
  try {
    const { name } = req.params;
    
    const query = datastore
      .createQuery(NOTEBOOK_KIND)
      .filter('name', '=', name);
    
    const [notebooks] = await datastore.runQuery(query);
    
    if (notebooks.length === 0) {
      return res.status(404).json({ error: 'Notebook not found' });
    }
    
    res.json({ notebook: notebooks[0] });
  } catch (error) {
    console.error('Error fetching notebook by name:', error);
    res.status(500).json({ error: 'Failed to fetch notebook' });
  }
});

// API endpoint for students to get their progress on a notebook
app.get('/api/progress/:notebookId', authenticate, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const { notebookId } = req.params;
    
    // Construct composite key (notebookId + userEmail)
    const progressKey = `${notebookId}_${userEmail}`;
    
    const query = datastore
      .createQuery(PROGRESS_KIND)
      .filter('progressKey', '=', progressKey);
    
    const [progressRecords] = await datastore.runQuery(query);
    
    if (progressRecords.length === 0) {
      // No progress record yet, create an empty one
      return res.json({ completedItems: [] });
    }
    
    res.json({ completedItems: progressRecords[0].completedItems || [] });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// API endpoint for students to update their progress
app.post('/api/progress/:notebookId', authenticate, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const { notebookId } = req.params;
    const { itemId, completed } = req.body;
    
    if (!itemId) {
      return res.status(400).json({ error: 'Item ID is required' });
    }
    
    // Construct composite key (notebookId + userEmail)
    const progressKey = `${notebookId}_${userEmail}`;
    
    const query = datastore
      .createQuery(PROGRESS_KIND)
      .filter('progressKey', '=', progressKey);
    
    const [progressRecords] = await datastore.runQuery(query);
    
    let key;
    let completedItems = [];
    
    if (progressRecords.length === 0) {
      // Create a new progress record
      key = datastore.key(PROGRESS_KIND);
    } else {
      // Update existing progress
      key = progressRecords[0][datastore.KEY];
      completedItems = progressRecords[0].completedItems || [];
    }
    
    // Update the completed items list
    if (completed && !completedItems.includes(itemId)) {
      completedItems.push(itemId);
    } else if (!completed && completedItems.includes(itemId)) {
      completedItems = completedItems.filter(id => id !== itemId);
    }
    
    // Prepare the progress entity
    const progressEntity = {
      key: key,
      data: {
        progressKey: progressKey,
        notebookId: notebookId,
        userEmail: userEmail,
        completedItems: completedItems,
        updatedAt: new Date().toISOString()
      }
    };
    
    // Save to Datastore
    await datastore.save(progressEntity);
    
    res.json({ 
      success: true, 
      message: 'Progress updated successfully',
      completedItems: completedItems
    });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// API endpoint to register a teacher
app.post('/api/users/register', authenticate, async (req, res) => {
  try {
    const adminEmail = req.user.email;
    const { email } = req.body;
    
    // Check if the current user is already registered
    if (!(await isTeacher(adminEmail))) {
      return res.status(403).json({ error: 'Not authorized to register teachers' });
    }
    
    // Create a new teacher user
    const key = datastore.key(USER_KIND);
    const userEntity = {
      key: key,
      data: {
        email: email,
        role: 'teacher',
        registeredBy: adminEmail,
        createdAt: new Date().toISOString()
      }
    };
    
    // Save to Datastore
    await datastore.save(userEntity);
    
    res.json({ 
      success: true, 
      message: 'Teacher registered successfully'
    });
  } catch (error) {
    console.error('Error registering teacher:', error);
    res.status(500).json({ error: 'Failed to register teacher' });
  }
});

// Add this endpoint to your app.js file
app.delete('/api/notebooks/:notebookId', authenticate, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const { notebookId } = req.params;
    
    // Check if user is a teacher
    if (!(await isTeacher(userEmail))) {
      return res.status(403).json({ error: 'Not authorized to delete notebooks' });
    }
    
    // Get the notebook
    let key;
    
    // Check if notebookId is a number (ID) or string (name)
    if (!isNaN(notebookId)) {
      key = datastore.key([NOTEBOOK_KIND, datastore.int(notebookId)]);
    } else {
      // Find the notebook by name
      const query = datastore
        .createQuery(NOTEBOOK_KIND)
        .filter('name', '=', notebookId)
        .filter('createdBy', '=', userEmail);
      
      const [notebooks] = await datastore.runQuery(query);
      
      if (notebooks.length === 0) {
        return res.status(404).json({ error: 'Notebook not found' });
      }
      
      key = notebooks[0][datastore.KEY];
    }
    
    // Delete the notebook
    await datastore.delete(key);
    
    res.json({ success: true, message: 'Notebook deleted successfully' });
  } catch (error) {
    console.error('Error deleting notebook:', error);
    res.status(500).json({ error: 'Failed to delete notebook' });
  }
});

// Initialize migration endpoint to import existing JSON data
app.post('/api/migrate', authenticate, async (req, res) => {
  try {
    const userEmail = req.user.email;
    const { notebooks } = req.body;
    
    // Check if user should be allowed to migrate data
    if (!(await isTeacher(userEmail))) {
      // Register this first user as a teacher (useful for initial setup)
      const userKey = datastore.key(USER_KIND);
      const userEntity = {
        key: userKey,
        data: {
          email: userEmail,
          role: 'teacher',
          createdAt: new Date().toISOString()
        }
      };
      await datastore.save(userEntity);
    }
    
    if (!notebooks || !Array.isArray(notebooks)) {
      // Try to convert a single playlist to a notebook
      const { playlist, name } = req.body;
      if (playlist && Array.isArray(playlist)) {
        // Create a notebook from the playlist
        const key = datastore.key(NOTEBOOK_KIND);
        const notebookEntity = {
          key: key,
          data: {
            name: name || 'Default Notebook',
            playlist: playlist,
            createdBy: userEmail,
            updatedAt: new Date().toISOString()
          }
        };
        await datastore.save(notebookEntity);
        return res.json({ 
          success: true, 
          message: 'Single playlist migrated successfully'
        });
      }
      return res.status(400).json({ error: 'Invalid migration data format' });
    }
    
    // Handle multiple notebooks migration
    for (const notebook of notebooks) {
      if (!notebook.name || !notebook.playlist) continue;
      
      const key = datastore.key(NOTEBOOK_KIND);
      const notebookEntity = {
        key: key,
        data: {
          name: notebook.name,
          playlist: notebook.playlist,
          createdBy: userEmail,
          updatedAt: new Date().toISOString()
        }
      };
      await datastore.save(notebookEntity);
    }
    
    res.json({ 
      success: true, 
      message: 'Migration completed successfully'
    });
  } catch (error) {
    console.error('Error during migration:', error);
    res.status(500).json({ error: 'Failed to migrate data' });
  }
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;