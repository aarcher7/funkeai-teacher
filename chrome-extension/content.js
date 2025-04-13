(function () {
    try {
        console.log("funke Extension content script loaded.");

        // Check if user is authenticated
        function checkAuthentication(callback) {
            console.log("Checking authentication status...");
            chrome.runtime.sendMessage({ action: 'checkAuth' }, function(response) {
                console.log("Authentication response:", response);
                callback(response && response.isAuthenticated, response && response.userData);
            });
        }

        // Ensure document.body is available.
        if (!document.body) {
            console.error("document.body is not available.");
            return;
        }

        // Prevent duplicate injection.
        if (document.getElementById("funke-extension-overlay")) {
            console.log("funke extension already injected, exiting.");
            return;
        }

        // Create the overlay image.
        let img = document.createElement("img");
        img.src = chrome.runtime.getURL("funkeext.png");
        img.id = "funke-extension-overlay";
        img.style.position = "fixed";
        img.style.bottom = "20px";
        img.style.right = "20px";
        img.style.width = "100px";
        img.style.cursor = "pointer";
        img.style.zIndex = "10000";

        // Create the talk bubble.
        let bubble = document.createElement("div");
        bubble.id = "funke-extension-bubble";
        bubble.style.position = "fixed";
        bubble.style.bottom = "130px";
        bubble.style.right = "20px";
        bubble.style.background = "#fff";
        bubble.style.padding = "10px";
        bubble.style.borderRadius = "10px";
        bubble.style.boxShadow = "0px 0px 10px rgba(0, 0, 0, 0.1)";
        bubble.style.zIndex = "10001";
        bubble.style.fontFamily = "Arial, sans-serif";
        bubble.style.fontSize = "14px";
        bubble.style.color = "black"; // Ensure text is always black.
        bubble.innerText = "Checking authentication status...";

        // Append the overlay and bubble to the document.
        document.body.appendChild(img);
        document.body.appendChild(bubble);

        // Check authentication first
        checkAuthentication(function(isAuthenticated, userData) {
            console.log("Authentication check complete:", isAuthenticated, userData);
            if (!isAuthenticated) {
                // User is not authenticated, update bubble text
                updateBubbleText("Click to sign in to funke extension");
                
                // When the overlay or bubble is clicked, open the popup
                img.addEventListener("click", function() {
                    chrome.runtime.sendMessage({ action: 'openPopup' });
                });
                
                bubble.addEventListener("click", function() {
                    chrome.runtime.sendMessage({ action: 'openPopup' });
                });
                
                return;
            }
            
            // User is authenticated, proceed normally
            console.log("Authenticated as:", userData.email);
            updateBubbleText("Click me and we can study together!");
            
            // Set up the normal functionality
            img.addEventListener("click", runNextItem);
            bubble.addEventListener("click", runNextItem);
            
            // Load stored playlist and current index from chrome.storage.
            loadPlaylist(function(playlist, currentIndex) {
                console.log("Loaded playlist with", playlist ? playlist.length : 0, "items. Current index:", currentIndex);
            });
        });

        // Helper: update the talk bubble text.
        function updateBubbleText(text) {
            console.log("Updating bubble text:", text);
            bubble.innerText = text;
        }

        // Load stored playlist and current index from chrome.storage.
        function loadPlaylist(callback) {
            console.log("Loading playlist from chrome.storage");
            chrome.storage.local.get(["funkePlaylist", "funkeCurrentIndex"], function (result) {
                callback(result.funkePlaylist || [], result.funkeCurrentIndex || 0);
            });
        }


        // function getCurrentNotebookName() {
        //     const url = window.location.href;
        //     console.log("Current URL:", url);
            
        //     try {
        //         // Parse the URL
        //         const parsedUrl = new URL(url);
        //         console.log("Parsed URL:", parsedUrl);
                
        //         // If we're on the main page (empty path or just "/")
        //         if (parsedUrl.pathname === "/" || parsedUrl.pathname === "") {
        //             console.log("On NotebookLM main page - no specific notebook");
        //             updateBubbleText("Please open a notebook first");
        //             return null;
        //         }
                
        //         const parts = parsedUrl.pathname.split('/');
        //         console.log("URL path parts:", parts);
                
        //         // Pattern 1: /app/[notebookName]
        //         if (parts.length >= 3 && parts[1] === 'app') {
        //             return decodeURIComponent(parts[2]);
        //         }
                
        //         // Pattern 2: /notebooks/[notebookId]/[notebookName]
        //         if (parts.length >= 4 && parts[1] === 'notebooks') {
        //             return decodeURIComponent(parts[3]);
        //         }
                
        //         // Pattern 3: /notebook/[notebookId]
        //         if (parts.length >= 3 && parts[1] === 'notebook') {
        //             // Get notebook ID from URL
        //             const notebookId = parts[2];
        //             console.log("Found notebook ID in URL:", notebookId);
                    
        //             // Return a promise to handle the async storage operation
        //             return new Promise((resolve) => {
        //                 // Try to get notebook name from storage
        //                 chrome.storage.local.get('lastOpenedNotebook', function(data) {
        //                     if (chrome.runtime.lastError) {
        //                         console.error("Error accessing storage:", chrome.runtime.lastError);
        //                     }
                            
        //                     if (data && data.lastOpenedNotebook) {
        //                         const storedNotebook = data.lastOpenedNotebook;
        //                         console.log("Retrieved from storage:", storedNotebook);
                                
        //                         // Check if this is the same notebook (by ID or idFromNotebookLM)
        //                         if (storedNotebook.id === notebookId || 
        //                             (storedNotebook.idFromNotebookLM && storedNotebook.idFromNotebookLM === notebookId)) {
        //                             console.log("Found matching notebook in storage with name:", storedNotebook.name);
        //                             resolve(storedNotebook.name);
        //                             return;
        //                         }
        //                     }
                            
        //                     // Fallback to title if storage lookup failed
        //                     const notebookTitle = document.title.replace(" - NotebookLM", "").trim();
        //                     if (notebookTitle && notebookTitle !== "NotebookLM" && notebookTitle !== "Untitled notebook") {
        //                         console.log("Found notebook name from title:", notebookTitle);
        //                         resolve(notebookTitle);
        //                         return;
        //                     }
                            
        //                     // Default notebook name as last resort
        //                     console.log("Using default notebook name: 'Sample Biology Notebook'");
        //                     resolve("Sample Biology Notebook");
        //                 });
        //             });
        //         }
                
        //         // For development: detect notebook by title
        //         const notebookTitle = document.title.replace(" - NotebookLM", "").trim();
        //         if (notebookTitle && notebookTitle !== "NotebookLM" && notebookTitle !== "Untitled notebook") {
        //             console.log("Found notebook name from title:", notebookTitle);
        //             return notebookTitle;
        //         }
                
        //         // If all else fails, try to get Notebook name from URL search params (for NLM beta versions)
        //         if (parsedUrl.searchParams.has("notebook")) {
        //             const notebookFromParams = parsedUrl.searchParams.get("notebook");
        //             console.log("Found notebook name from search params:", notebookFromParams);
        //             return notebookFromParams;
        //         }
                
        //         // Default notebook name for testing (allow testing on any page)
        //         console.log("Using default notebook name for testing: 'Sample Biology Notebook'");
        //         return "Sample Biology Notebook";
        //     } catch (e) {
        //         console.error("Error parsing URL:", e);
        //         return "Sample Biology Notebook"; // Fallback for testing
        //     }
        // }

        function getCurrentNotebookName() {
            try {
                const url = new URL(window.location.href);
                console.log("Current URL:", url);
                
                const parts = url.pathname.split('/');
                console.log("URL path parts:", parts);
                
                // Pola: /notebook/[notebookId]
                if (parts.length >= 3 && parts[1] === 'notebook') {
                    const notebookId = parts[2];
                    console.log("Found notebook ID in URL:", notebookId);
                    
                    return new Promise((resolve) => {
                        chrome.storage.local.get('lastOpenedNotebook', function(data) {
                            if (chrome.runtime.lastError) {
                                console.error("Error accessing storage:", chrome.runtime.lastError);
                                resolve(null);
                                return;
                            }
                            
                            if (data && data.lastOpenedNotebook) {
                                const storedNotebook = data.lastOpenedNotebook;
                                console.log("Retrieved from storage:", storedNotebook);
                                
                                if (storedNotebook.id === notebookId || 
                                    (storedNotebook.idFromNotebookLM && storedNotebook.idFromNotebookLM === notebookId)) {
                                    console.log("Found matching notebook in storage with name:", storedNotebook.name);
                                    resolve(storedNotebook.name);
                                    return;
                                }
                            }
                            
                            console.log("Notebook name not found in storage.");
                            resolve(null);
                        });
                    });
                }
                
                console.log("Notebook ID not found in URL.");
                return null;
            } catch (e) {
                console.error("Error parsing URL:", e);
                return null;
            }
        }
        

        // Helper to get notebook name from ID using chrome.storage
        function getNotebookNameFromId(notebookId, callback) {
            chrome.storage.local.get(['notebookIdToNameMap'], function(result) {
                const mapping = result.notebookIdToNameMap || {};
                callback(mapping[notebookId]);
            });
        }

        // Merge a freshly fetched playlist with the locally stored one,
        function mergePlaylist(newPlaylist, storedPlaylist) {
            console.log("Merging playlists:", { new: newPlaylist, stored: storedPlaylist });
            
            if (!newPlaylist || !Array.isArray(newPlaylist)) {
                console.error("Invalid newPlaylist:", newPlaylist);
                return storedPlaylist || [];
            }
            
            if (!storedPlaylist || !Array.isArray(storedPlaylist)) {
                console.log("No stored playlist, using new playlist");
                return newPlaylist.map(item => {
                    return { ...item, status: "pending" };
                });
            }
            
            let storedDict = {};
            storedPlaylist.forEach(item => {
                if (item && item.id) {
                    if (item.type) {
                        item.type = item.type.trim().toLowerCase();
                    }
                    storedDict[item.id] = item;
                }
            });
            
            let merged = newPlaylist.map(item => {
                if (!item || !item.id) {
                    console.warn("Invalid playlist item:", item);
                    return null;
                }

                if (item.type) {
                    item.type = item.type.trim().toLowerCase();
                }

                if (storedDict[item.id]) {
                    return { ...item, status: storedDict[item.id].status };
                } else {
                    return { ...item, status: item.status || "pending" };
                }                
            }).filter(item => item !== null);
            
            return merged;
        }

        // Process a static playlist (for testing/fallback)
        function processPlaylist(playlist) {
            console.log("Processing static playlist:", playlist);
            if (!playlist || !Array.isArray(playlist)) {
                console.error("Invalid playlist:", playlist);
                updateBubbleText("Error: Invalid playlist data");
                return;
            }
            
            // Add status to each item
            const processedPlaylist = playlist.map(item => {
                return {
                    ...item,
                    status: "pending"
                };
            });
            
            chrome.storage.local.set({ 
                funkePlaylist: processedPlaylist, 
                funkeCurrentIndex: 0 
            }, function() {
                console.log("Static playlist stored");
                updateBubbleText("Click me to start");
            });
        }

        // Refresh the playlist by fetching from the database API
        function refreshPlaylist(callback) {
            console.log("Refreshing playlist");
            
            // Get the current notebook name - handle both Promise and direct string return
            const notebookNameResult = getCurrentNotebookName();
            
            // Helper function to continue with the notebook name
            function continueWithNotebookName(notebookName) {
                if (!notebookName) {
                    // console.error("Could not determine notebook name from URL");
                    updateBubbleText("Please open a notebook first");
                    callback([], 0);
                    return;
                }
                
                // First check authentication
                checkAuthentication(function(isAuthenticated, userData) {
                    if (!isAuthenticated) {
                        updateBubbleText("Please sign in to use funke");
                        callback([], 0);
                        return;
                    }
                    
                    console.log("Fetching instructions for notebook:", notebookName);
                    // Use the API to fetch the playlist for this notebook
                    chrome.runtime.sendMessage({ 
                        action: "fetchInstructions",
                        notebookName: notebookName
                    }, function (response) {
                        console.log("Instructions fetch response:", response);
                        if (response && response.success && response.data) {
                            let newPlaylist = response.data.playlist || [];
                            if (!newPlaylist || newPlaylist.length === 0) {
                                console.warn("Empty playlist received from API");
                                // Fallback to default playlist for testing
                                newPlaylist = [
                                    { id: "default1", type: "Prompt", command: "What is the subject of this notebook?" },
                                    { id: "default2", type: "Prompt", command: "Please summarize the key concepts." }
                                ];
                            }
                            
                            chrome.storage.local.get(["funkePlaylist", "funkeCurrentIndex"], function (result) {
                                let storedPlaylist = result.funkePlaylist || [];
                                let mergedPlaylist = mergePlaylist(newPlaylist, storedPlaylist);
                                // Determine the first pending task index.
                                let newIndex = mergedPlaylist.findIndex(item => item.status !== "complete");
                                if (newIndex === -1) {
                                    newIndex = mergedPlaylist.length;
                                }
                                
                                // Create mapping of notebook name to ID
                                chrome.storage.local.get(['notebookNameToIdMap'], function(mapResult) {
                                    const nameToIdMap = mapResult.notebookNameToIdMap || {};
                                    
                                    // Store this mapping for future reference
                                    if (response.data.notebookId && !nameToIdMap[notebookName]) {
                                        nameToIdMap[notebookName] = response.data.notebookId;
                                        chrome.storage.local.set({ notebookNameToIdMap: nameToIdMap });
                                    }
                                    
                                    // Update the playlist in storage
                                    chrome.storage.local.set({ 
                                        funkePlaylist: mergedPlaylist, 
                                        funkeCurrentIndex: newIndex 
                                    }, function () {
                                        console.log("Playlist updated in storage, index:", newIndex);
                                        callback(mergedPlaylist, newIndex);
                                    });
                                });
                            });
                        } else {
                            console.error("Error fetching instructions:", response ? response.error : "No response");
                            updateBubbleText("Error loading content. Please try again.");
                            // Fallback to default playlist for testing
                            const defaultPlaylist = [
                                { id: "default1", type: "Prompt", command: "What is the subject of this notebook?" },
                                { id: "default2", type: "Prompt", command: "Please summarize the key concepts." }
                            ];
                            processPlaylist(defaultPlaylist);
                            callback(defaultPlaylist, 0);
                        }
                    });
                });
            }
            
            // Check if notebookNameResult is a Promise
            if (notebookNameResult && typeof notebookNameResult.then === 'function') {
                // Handle Promise
                notebookNameResult
                    .then(notebookName => {
                        continueWithNotebookName(notebookName);
                    })
                    .catch(error => {
                        console.error("Error getting notebook name:", error);
                        updateBubbleText("Error identifying notebook. Please try again.");
                        callback([], 0);
                    });
            } else {
                // Handle direct string return
                continueWithNotebookName(notebookNameResult);
            }
        }

        
        // Helper: Transform a media URL for embeddable players.
        function transformMediaUrl(url) {
            console.log("Transforming media URL:", url);
            // Prepend http:// if missing.
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                url = "http://" + url;
            }
            // YouTube: convert standard watch URL to embed URL.
            if (url.includes("youtube.com/watch")) {
                try {
                    let urlObj = new URL(url);
                    let videoId = urlObj.searchParams.get("v");
                    if (videoId) {
                        return "https://www.youtube.com/embed/" + videoId;
                    }
                } catch (e) {
                    console.error(e);
                }
            } else if (url.includes("youtu.be/")) {
                let parts = url.split("/");
                let videoId = parts[parts.length - 1];
                return "https://www.youtube.com/embed/" + videoId;
            }
            // Vimeo: transform URL into embeddable player URL.
            else if (url.includes("vimeo.com/")) {
                let parts = url.split("/");
                let videoId = parts[parts.length - 1];
                return "https://player.vimeo.com/video/" + videoId;
            }
            // Google Drive: if the URL indicates a .wav file, return a direct download link; otherwise, return the preview link.
            else if (url.includes("drive.google.com")) {
                let parts = url.split("/");
                let fileIdIndex = parts.indexOf("d");
                if (fileIdIndex !== -1 && parts.length > fileIdIndex + 1) {
                    let fileId = parts[fileIdIndex + 1];
                    if (url.toLowerCase().includes(".wav")) {
                        return "https://drive.google.com/uc?export=download&id=" + fileId;
                    } else {
                        return "https://drive.google.com/file/d/" + fileId + "/preview";
                    }
                }
            }
            return url;
        }

        // Helper: Display a media player bubble.
        function showMediaPlayer(url) {
            console.log("Showing media player for URL:", url);
            // Hide the talk bubble when showing media.
            let talkBubble = document.getElementById("funke-extension-bubble");
            if (talkBubble) {
                talkBubble.style.display = "none";
            }

            let mediaBubble = document.getElementById("funke-extension-mediaBubble");
            // Determine if this is an audio file.
            let isAudio = false;
            if (url.toLowerCase().endsWith(".wav") || (url.includes("drive.google.com/uc") && url.toLowerCase().includes("wav"))) {
                isAudio = true;
            }

            if (!mediaBubble) {
                mediaBubble = document.createElement("div");
                mediaBubble.id = "funke-extension-mediaBubble";
                mediaBubble.style.position = "fixed";
                mediaBubble.style.right = "20px";
                mediaBubble.style.background = "#fff";
                // Rounded edges and enhanced drop shadow.
                mediaBubble.style.borderRadius = "15px";
                mediaBubble.style.boxShadow = "0px 0px 15px rgba(0, 0, 0, 0.3)";
                // Set inner padding: 35px top, 15px right, 15px bottom, 15px left.
                mediaBubble.style.padding = "35px 15px 15px 15px";
                mediaBubble.style.zIndex = "10002";

                if (isAudio) {
                    // For audio, set dimensions for a smaller bubble.
                    mediaBubble.style.bottom = "140px";
                    mediaBubble.style.width = "300px";
                    mediaBubble.style.height = "125px";
                } else {
                    // For video, revert to the original default bubble size.
                    mediaBubble.style.bottom = "140px";
                    mediaBubble.style.width = "480px";
                    mediaBubble.style.height = "300px";
                }

                // Add a close button.
                let closeBtn = document.createElement("button");
                closeBtn.innerText = "Close";
                closeBtn.id = "funke-media-close-btn";
                closeBtn.style.position = "absolute";
                closeBtn.style.top = "5px";
                closeBtn.style.right = "5px";
                closeBtn.style.zIndex = "10003";
                closeBtn.addEventListener("click", function () {
                    mediaBubble.remove();
                    // Restore the talk bubble when the media player is closed.
                    let talkBubble = document.getElementById("funke-extension-bubble");
                    if (talkBubble) {
                        talkBubble.style.display = "block";
                    }
                });
                mediaBubble.appendChild(closeBtn);
                document.body.appendChild(mediaBubble);
            } else {
                // Remove previous content (preserve the close button).
                Array.from(mediaBubble.children).forEach(child => {
                    if (child.id !== "funke-media-close-btn") {
                        mediaBubble.removeChild(child);
                    }
                });
            }

            if (isAudio) {
                // Create an audio element.
                let audioElem = document.createElement("audio");
                audioElem.src = url;
                audioElem.controls = true;
                audioElem.style.width = "100%";
                audioElem.playbackRate = 1.0; // default speed
                mediaBubble.appendChild(audioElem);

                // Create a speed toggle button that toggles between 1x and 0.8x.
                let speedBtn = document.createElement("button");
                speedBtn.innerText = "Speed: 1x";
                speedBtn.style.marginTop = "5px";
                speedBtn.addEventListener("click", function () {
                    if (audioElem.playbackRate === 1.0) {
                        audioElem.playbackRate = 0.8;
                        speedBtn.innerText = "Speed: 0.8x";
                    } else {
                        audioElem.playbackRate = 1.0;
                        speedBtn.innerText = "Speed: 1x";
                    }
                });
                mediaBubble.appendChild(speedBtn);
            } else {
                // Create an iframe for video content.
                let iframe = document.createElement("iframe");
                iframe.src = url;
                iframe.style.width = "100%";
                iframe.style.height = "100%";
                iframe.style.border = "none";
                mediaBubble.appendChild(iframe);
            }
        }

        // Executes a single command item.
        function executeCommand(item, callback) {
            console.log("Executing command:", item);
            if (!item || !item.type) {
                console.error("Invalid command item:", item);
                if (callback) callback();
                return;
            }
            
            if (item.type) {
                item.type = item.type.trim().toLowerCase();
            }
            let type = item.type || "";
            console.log("Executing task with type:", type);
            
            try {
                if (type === "prompt") {
                    let textArea = document.querySelector("textarea.query-box-input") || document.querySelector("textarea");
                    if (textArea) {
                        textArea.value = "";
                        textArea.value = item.command;
                        textArea.dispatchEvent(new Event("input", { bubbles: true }));

                        let attempts = 0;
                        let intervalId = setInterval(() => {
                            let submitButton = document.querySelector("button[type=submit]") || 
                                              document.querySelector("button.submit") || 
                                              document.querySelector("button[aria-label='Send message']");
                            
                            if (submitButton && !submitButton.disabled) {
                                submitButton.click();
                                clearInterval(intervalId);
                                setTimeout(callback, 500);
                            } else {
                                attempts++;
                                if (attempts > 50) { // 5 seconds timeout
                                    console.error("Submit button not found or still disabled after timeout");
                                    clearInterval(intervalId);
                                    if (callback) callback();
                                }
                            }
                        }, 100);
                    } else {
                        console.error("Text area not found.");
                        if (callback) callback();
                    }
                } else if (type === "website") {
                    let url = item.command;
                    if (!url.startsWith("http://") && !url.startsWith("https://")) {
                        url = "http://" + url;
                    }
                    chrome.runtime.sendMessage({ action: "openWebsite", url: url }, function (response) {
                        setTimeout(callback, 500);
                    });
                } else if (type === "multimedia" || type.includes("multimedia")) {
                    let embedUrl = transformMediaUrl(item.command);
                    console.log("Embeddable media URL:", embedUrl);
                    showMediaPlayer(embedUrl);
                    setTimeout(callback, 500);
                } else if (type === "quiz") {
                    let textArea = document.querySelector("textarea.query-box-input") || document.querySelector("textarea");
                    if (textArea) {
                        textArea.value = "";
                        textArea.value = item.command;
                        textArea.dispatchEvent(new Event("input", { bubbles: true }));
                        let attempts = 0;
                        let intervalId = setInterval(() => {
                            let submitButton = document.querySelector("button[type=submit]") || 
                                              document.querySelector("button.submit") || 
                                              document.querySelector("button[aria-label='Send message']");
                            
                            if (submitButton && !submitButton.disabled) {
                                submitButton.click();
                                clearInterval(intervalId);
                                setTimeout(callback, 500);
                            } else {
                                attempts++;
                                if (attempts > 50) {
                                    console.error("Submit button not found or still disabled after timeout");
                                    clearInterval(intervalId);
                                    if (callback) callback();
                                }
                            }
                        }, 100);
                    } else {
                        console.error("Text area not found for quiz.");
                        if (callback) callback();
                    }
                } else if (type === "assignment") {
                    console.log("Processing assignment:", item.command);
                    let assignmentBox = document.querySelector(".assignment-box") || document.querySelector("textarea.assignment-input");
        
                    if (assignmentBox) {
                        assignmentBox.value = item.command;
                        assignmentBox.dispatchEvent(new Event("input", { bubbles: true }));
        
                        let submitButton = document.querySelector("button.assignment-submit");
                        if (submitButton && !submitButton.disabled) {
                            submitButton.click();
                            console.log("Assignment submitted successfully.");
                            setTimeout(callback, 500);
                        } else {
                            console.error("Assignment submit button not found or disabled.");
                            if (callback) callback();
                        }
                    } else {
                        console.error("Assignment input box not found.");
                        if (callback) callback();
                    } 
                } else {
                    console.error("Unknown command type:", item.type);
                    if (callback) callback();
                }
            } catch (error) {
                console.error("Error executing command:", error);
                if (callback) callback();
            }
        }

        // Update progress in the database
        async function updateProgress(notebookNamePromise, itemId, completed, callback) {
            try {
                const notebookName = await notebookNamePromise; 
                console.log("Updating progress:", { notebook: notebookName, item: itemId, completed: completed });
        
                if (!notebookName || !itemId) {
                    console.error("Missing notebook name or item ID for progress update");
                    if (callback) callback();
                    return;
                }
        
                // Get notebook ID from storage if possible
                chrome.storage.local.get(['notebookNameToIdMap'], function(result) {
                    const nameToIdMap = result.notebookNameToIdMap || {};
                    const notebookId = nameToIdMap[notebookName];
        
                    // Send the progress update to the background script
                    chrome.runtime.sendMessage({ 
                        action: "updateProgress",
                        progress: {
                            notebookId: notebookId,
                            notebookName: notebookName, // Include name as fallback
                            itemId: itemId,
                            completed: completed
                        }
                    }, function(response) {
                        console.log("Progress update response:", response);
                        if (response && response.success) {
                            console.log("Progress updated successfully");
        
                            // Also notify the student interface if it's open
                            try {
                                chrome.runtime.sendMessage({
                                    action: 'notebookCompleted',
                                    notebookId: notebookId || notebookName,
                                    itemId: itemId
                                });
                            } catch (e) {
                                // Student interface might not be listening, ignore error
                            }
                        } else {
                            console.error("Failed to update progress:", response ? response.error : "No response");
                        }
                        if (callback) callback();
                    });
                });
            } catch (error) {
                console.error("Error resolving notebook name:", error);
                if (callback) callback();
            }
        }
        

        // Runs the next task in the playlist.
        function runNextItem() {
            checkAuthentication(function(isAuthenticated, userData) {
                if (!isAuthenticated) {
                    console.warn("User not authenticated. Aborting runNextItem.");
                    updateBubbleText("Please log in first.");
                    chrome.runtime.sendMessage({ action: 'openPopup' });
                    return;
                }
        
                console.log("Running next item");
        
                const notebookName = getCurrentNotebookName();
                if (!notebookName) {
                    console.error("Could not determine notebook name from URL");
                    updateBubbleText("Please open a notebook first");
                    chrome.runtime.sendMessage({ 
                        action: "fetchInstructions"
                    }, function (response) {
                        console.log("Fallback instructions fetch response:", response);
                        if (response && response.success) {
                            let playlist = response.data.playlist;
                            processPlaylist(playlist);
                        } else {
                            updateBubbleText("Error loading content. Please try again.");
                        }
                    });
                    return;
                }
        
                refreshPlaylist(function (playlist, index) {
                    console.log("Playlist refreshed, index:", index, "length:", playlist ? playlist.length : 0);
                    if (!playlist || playlist.length === 0) {
                        updateBubbleText("No tasks available for this notebook.");
                        return;
                    }
        
                    if (index >= playlist.length) {
                        updateBubbleText("Great job, no tasks left!");
                        return;
                    }
        
                    let item = playlist[index];
                    console.log("Executing item:", item);
                    executeCommand(item, function () {
                        item.status = "complete";
                        updateProgress(notebookName, item.id, true, function () {
                            index++;
                            chrome.storage.local.set({ funkePlaylist: playlist, funkeCurrentIndex: index }, function () {
                                updateBubbleText("Click me for more");
                            });
                        });
                    });
                });
            });
        }
        

        // Listen for direct commands from the student interface
        chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
            if (message.action === "executePlaylistItem") {
                console.log("Received command from student interface:", message);
                const notebookName = message.notebook;
                const item = message.item;
                
                if (!notebookName || !item) {
                    console.error("Missing notebook name or item in command");
                    sendResponse({ success: false, error: "Missing notebook name or item" });
                    return true;
                }
                
                // Check if we're in the correct notebook
                const currentNotebook = getCurrentNotebookName();
                if (currentNotebook !== notebookName) {
                    console.warn("Current notebook doesn't match requested notebook");
                    alert(`Please open the "${notebookName}" notebook in NotebookLM first.`);
                    sendResponse({ success: false, error: "Wrong notebook" });
                    return true;
                }
                
                // Execute the command
                executeCommand(item, function() {
                    // Update progress
                    updateProgress(notebookName, item.id, true, function() {
                        sendResponse({ success: true });
                    });
                });
                
                return true; // Keep the message channel open for async response
            }
        });

        // On load, always refresh the playlist.
        refreshPlaylist(function (mergedPlaylist, newIndex) {
            console.log("Playlist refreshed on load. Pending index:", newIndex);
        });

    } catch (error) {
        console.error("Error in funke Extension content script:", error);
    }
})();