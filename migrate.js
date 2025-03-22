// migrate.js - Script to migrate data from JSON file to Datastore
const fs = require('fs');
const path = require('path');
const { Datastore } = require('@google-cloud/datastore');
const readline = require('readline');

// Initialize Datastore
const datastore = new Datastore();
const PLAYLIST_KIND = 'Playlist';

// Function to read JSON file
function readJsonFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading JSON file:', error);
    throw error;
  }
}

// Function to migrate data to Datastore
async function migrateToDatastore(jsonData, userEmail) {
  try {
    // Create a new entity
    const key = datastore.key(PLAYLIST_KIND);
    
    // Prepare entity data
    const entity = {
      key: key,
      data: {
        userEmail: userEmail,
        playlist: jsonData.playlist || [],
        updatedAt: new Date().toISOString(),
        migratedFrom: 'JSON'
      }
    };
    
    // Save to Datastore
    await datastore.save(entity);
    console.log('Migration successful!');
    return true;
  } catch (error) {
    console.error('Error migrating to Datastore:', error);
    throw error;
  }
}

// Main migration function
async function runMigration() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    // Get the JSON file path and user email
    const filePath = await new Promise(resolve => {
      rl.question('Enter the path to your JSON file: ', resolve);
    });
    
    const userEmail = await new Promise(resolve => {
      rl.question('Enter the email address for this playlist: ', resolve);
    });
    
    // Validate email (simple validation)
    if (!userEmail.includes('@')) {
      throw new Error('Invalid email address');
    }
    
    // Read the JSON data
    const jsonData = readJsonFile(filePath);
    
    // Migrate to Datastore
    await migrateToDatastore(jsonData, userEmail);
    
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error.message);
  } finally {
    rl.close();
  }
}

// Run the migration
if (require.main === module) {
  runMigration();
}

module.exports = {
  readJsonFile,
  migrateToDatastore,
  runMigration
};