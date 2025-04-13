// popup.js - Fixed with popup window authentication

// Constants
const API_BASE_URL = 'https://getfunke.com/api';
// const API_BASE_URL = 'http://localhost:8080/api';

// Create a centralized authentication handler
const AuthManager = {
    openAuthWindow: function() {
        // Create a centered popup window
        const width = 500;
        const height = 600;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        const authUrl = `${API_BASE_URL}/auth/google`;
        const windowFeatures = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`;
        
        return window.open(authUrl, 'NADU_Auth', windowFeatures);
    },

    handleAuthMessage: function(event) {
        // Verify the message source and content
        if (!event.data || !event.data.token) return;

        // Process authentication
        chrome.runtime.sendMessage({
            action: 'login',
            token: event.data.token,
            userData: event.data.userData
        }, function(response) {
            if (response && response.success) {
                // Update UI and fetch notebooks
                AuthManager.onSuccessfulLogin(event.data.userData);
            } else {
                // Handle login failure
                loginStatus.textContent = 'Authentication failed. Please try again.';
            }
        });
    },

    onSuccessfulLogin: function(userData) {
        // Update UI
        showUserView(userData);
        fetchNotebooks();

        // Activate content script on NotebookLM tabs
        chrome.tabs.query({url: "*://notebooklm.google.com/*"}, function(tabs) {
            tabs.forEach(tab => {
                chrome.scripting.executeScript({
                    target: {tabId: tab.id},
                    files: ['content.js']
                });
            });
        });
    }
};



// DOM Elements
const loginView = document.getElementById('loginView');
const userView = document.getElementById('userView');
const loadingView = document.getElementById('loadingView');
const signInButton = document.getElementById('signInButton');
const signOutButton = document.getElementById('signOutButton');
const activateButton = document.getElementById('activateButton');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const notebookList = document.getElementById('notebookList');
const statusMessage = document.getElementById('statusMessage');
const loginStatus = document.getElementById('loginStatus');
const loginLoader = document.getElementById('loginLoader');

// Initialize popup
document.addEventListener('DOMContentLoaded', function() {
    console.log("NADU popup initialized");
    
    // Hide all views initially
    loginView.style.display = 'none';
    userView.style.display = 'none';
    loadingView.style.display = 'block';
    
    // Set up message listener for auth
    window.addEventListener('message', AuthManager.handleAuthMessage);
    
    // Check if user is authenticated
    chrome.runtime.sendMessage({ action: 'checkAuth' }, function(response) {
        console.log("Auth check response:", response);
        loadingView.style.display = 'none';
        
        if (response && response.isAuthenticated) {
            // User is authenticated, show user view
            showUserView(response.userData);
            fetchNotebooks();
        } else {
            // User is not authenticated, show login view
            showLoginView();
        }
    });
    
    // Add event listeners
    if (signInButton) signInButton.addEventListener('click', () => {
        loginStatus.textContent = '';
        loginLoader.style.display = 'block';
        AuthManager.openAuthWindow();
    });
    if (signOutButton) signOutButton.addEventListener('click', signOut);
    // if (activateButton) activateButton.addEventListener('click', activateOnCurrentPage);
});

function showLoginView() {
    console.log("Showing login view");
    loginView.style.display = 'block';
    userView.style.display = 'none';
    loadingView.style.display = 'none';
}

function showUserView(userData) {
    console.log("Showing user view for:", userData);
    loginView.style.display = 'none';
    userView.style.display = 'block';
    loadingView.style.display = 'none';
    
    // Update user information
    userAvatar.src = userData.picture || 'funkeext.png';
    userName.textContent = userData.name || 'User';
    userEmail.textContent = userData.email || '';
}

// Add message listener before opening window
window.addEventListener('message', function(event) {
    console.log("Received message:", event.data);
    
    // Process authentication data
    if (event.data && event.data.token && event.data.userData) {
      // Process successful authentication
      chrome.runtime.sendMessage({
        action: 'login',
        token: event.data.token,
        userData: event.data.userData
      }, function(response) {
        // Handle login response
      });
    } else if (event.data && event.data.error) {
      // Handle authentication error
      loginStatus.textContent = 'Authentication failed: ' + event.data.error;
    }
  });

// Show the user view
function showUserView(userData) {
    console.log("Showing user view for:", userData);
    loginView.style.display = 'none';
    userView.style.display = 'block';
    loadingView.style.display = 'none';
    
    // Update user information
    userAvatar.src = userData.picture || 'funkeext.png';
    userName.textContent = userData.name || 'User';
    userEmail.textContent = userData.email || '';
}

// Initiate Google Sign In
function initiateGoogleSignIn() {
    console.log("Initiating Google Sign In");
    loginStatus.textContent = '';
    loginLoader.style.display = 'block';
    
    // Open auth in a popup window
    const authUrl = `${API_BASE_URL}/auth/google`;
    const authWindow = window.open(authUrl, 'funke_Auth', 'width=600,height=600');
    
    if (!authWindow) {
      loginStatus.textContent = 'Popup blocked! Please allow popups for this site.';
      loginLoader.style.display = 'none';
      return;
    }
    
    // Check if window closed
    const checkInterval = setInterval(() => {
      if (authWindow.closed) {
        clearInterval(checkInterval);
        
        // Once window is closed, check for auth token
        chrome.runtime.sendMessage({ action: 'checkAuth' }, function(response) {
          loginLoader.style.display = 'none';
          
          if (response && response.isAuthenticated) {
            // Auth succeeded
            showUserView(response.userData);
            fetchNotebooks();
            
            // Activate content script on any open NotebookLM tabs
            chrome.tabs.query({url: "*://notebooklm.google.com/*"}, function(tabs) {
              tabs.forEach(tab => {
                chrome.scripting.executeScript({
                  target: {tabId: tab.id},
                  files: ['content.js']
                });
              });
            });
          } else {
            // Auth failed
            loginStatus.textContent = 'Authentication failed. Please try again.';
          }
        });
      }
    }, 500);
  }

// Sign out
function signOut() {
    console.log("Signing out...");

    // Kirim pesan ke background script untuk logout
    chrome.runtime.sendMessage({ action: "logout" }, function(response) {
        if (response && response.success) {
            console.log("Logout successful");

            // Hapus tampilan UI terkait login
            loginStatus.textContent = "You have been logged out.";
            loginLoader.style.display = "none";

            // Redirect ke halaman login atau refresh
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            showLoginView()
        } else {
            console.error("Logout failed:", response ? response.error : "No response");
        }
    });
}

// Fetch user's notebooks
function fetchNotebooks() {
    console.log("Fetching notebooks");
    chrome.runtime.sendMessage({ action: 'fetchNotebooks' }, function(response) {
        console.log("Fetch notebooks response:", response);
        if (response && response.success && response.data && response.data.notebooks) {
            console.log("Notebooks data:", response.data.notebooks);
            displayNotebooks(response.data.notebooks);
        } else {
            statusMessage.textContent = 'No notebooks found or error fetching notebooks.';
            console.error("Error fetching notebooks:", response ? response.error : "No response");
            notebookList.innerHTML = '';
        }
    });
}

// Display list of notebooks
function displayNotebooks(notebooks) {
    console.log("Displaying notebooks:", notebooks);
    notebookList.innerHTML = '';

    if (notebooks.length === 0) {
        statusMessage.textContent = 'No notebooks assigned to you.';
        return;
    }

    notebooks.forEach(notebook => {
        console.log("Notebook item:", notebook);
        const item = document.createElement('div');
        item.className = 'notebook-item';
        item.textContent = notebook.name;

        // Tambahkan event click untuk redirect ke NotebookLM
        item.addEventListener('click', function() {
            console.log("Notebook clicked:", notebook);
            openNotebook(notebook);
        });

        notebookList.appendChild(item);
    });

    statusMessage.textContent = 'Click on a notebook to activate the funke helper.';
}


//Open a notebook in NotebookLM by name
function openNotebook(notebook) {
    console.log("Notebook clicked:", notebook);
    
    if (!notebook || !notebook.id || !notebook.name) {
        console.error("Invalid notebook data:", notebook);
        return;
    }

    // Simpan ke storage dan log keduanya
    const notebookData = {
        name: notebook.name,
        id: notebook.id,
        idFromNotebookLM: notebook.idFromNotebookLM,
        openTime: Date.now()
    };

    chrome.storage.local.set({ 'lastOpenedNotebook': notebookData }, function() {
        console.log("Saved to storage:", notebookData);
    });

    console.log(`Opening Notebook: Name = ${notebook.name}, ID = ${notebook.id}, idFromNotebookLM = ${notebook.idFromNotebookLM}`);

    // Pilih URL berdasarkan idFromNotebookLM jika tersedia
    let notebookURL;
    if (notebook.idFromNotebookLM) {
        notebookURL = `https://notebooklm.google.com/notebook/${notebook.idFromNotebookLM}`;
        console.log("Generated URL using idFromNotebookLM:", notebookURL);
    }

    // Buka di tab baru
    chrome.tabs.create({ url: notebookURL }, function(newTab) {
        if (chrome.runtime.lastError) {
            console.error("Error creating new tab:", chrome.runtime.lastError);
        } else {
            console.log("Successfully opened notebook tab with ID:", newTab.id);
        }

        // Delay sebelum menutup popup
        setTimeout(function() {
            window.close();
        }, 500);
    });
}


// Activate on current page
function activateOnCurrentPage() {
    console.log("Activating on current page");
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (!tabs[0].url.includes('notebooklm.google.com')) {
            statusMessage.textContent = 'Please navigate to NotebookLM first.';
            return;
        }
        
        chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['content.js']
        });
        
        // Close the popup
        window.close();
    });
}