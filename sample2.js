const { app, BrowserWindow, session, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let commentPopup;
let videourl = 'https://www.youtube.com/';
let currentProfile = 'default'; // Default profile
const profilesFilePath = path.join(app.getPath('userData'), 'profiles.json');
let profiles = new Set(['default']); // Store all profile names

// Load profiles from the saved file
function loadProfiles() {
  if (fs.existsSync(profilesFilePath)) {
    const data = fs.readFileSync(profilesFilePath);
    const loadedProfiles = JSON.parse(data);
    profiles = new Set(loadedProfiles);
  }
}

// Save profiles to the saved file
function saveProfiles() {
  const profilesArray = Array.from(profiles);
  fs.writeFileSync(profilesFilePath, JSON.stringify(profilesArray, null, 2));
}

// Function to create the app's menu dynamically
function createMenu() {
  const menuTemplate = [
    {
      label: 'Profiles',
      submenu: [
        {
          label: 'Create New Profile',
          click: () => {
            const newProfile = `profile${profiles.size + 1}`;
            profiles.add(newProfile);
            saveProfiles(); // Save profiles to the file
            createMainWindow(newProfile);
            updateMenu(); // Rebuild the menu with the new profile
          },
        },
        ...Array.from(profiles).map((profile) => ({
          label: `Switch to ${profile}`,
          click: () => createMainWindow(profile),
        })),
      ],
    },
    {
      label: 'Comment on YouTube',
      submenu: [
        {
          label: 'Post Comment to All Profiles',
          click: () => openCommentPopup(),
        },
      ],
    },
    { role: 'quit' }, // Add a Quit option
  ];
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}



function createMainWindowMore(profile) {
  const profileWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
      webSecurity: false,
      partition: `persist:${profile}`, // Use a unique partition for each profile
    },
  });

  profileWindow.loadURL(videourl);

  // Set a custom user agent for each profile (optional)
  const customUserAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36';

  profileWindow.webContents.session.setUserAgent(customUserAgent);

  return profileWindow;
}


// Function to create the main window for a specific profile
function createMainWindow(profile) {
  currentProfile = profile;

  // Create a new BrowserWindow with a unique session for the profile
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
      webSecurity: false,
      partition: `persist:${profile}`, // Use a unique partition for each profile
    },
  });

  // Set a standard User-Agent string to avoid 403 errors
  const customUserAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36';

  const mainSession = mainWindow.webContents.session;
  mainSession.setUserAgent(customUserAgent);

  // Load Gmail page or YouTube (as per the profile login status)
  mainWindow.loadURL(videourl); // Modify as per the profile logic

  // Handle navigation errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`Failed to load ${validatedURL}: ${errorDescription} (${errorCode})`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Open a popup to enter the YouTube video URL and comment
function openCommentPopup() {
  commentPopup = new BrowserWindow({
    width: 400,
    height: 300,
    parent: mainWindow,
    modal: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Load the preload script
      contextIsolation: true,
      nodeIntegration: false, // Security best practice
    },
  });

  commentPopup.loadURL(`data:text/html,<html><body>
    <h2>Post Comment on YouTube</h2>
    <label for="videoUrl">YouTube Video URL:</label>
    <input id="videoUrl" type="text" placeholder="Paste YouTube URL here" style="width: 100%" />
    <br/><br/>
    <label for="commentText">Your Comment:</label>
    <textarea id="commentText" placeholder="Write your comment here..." style="width: 100%; height: 100px;"></textarea>
    <br/><br/>
    <button onclick="postComment()">Post Comment</button>
<script>
  function postComment() {
    const videoUrl = document.getElementById('videoUrl').value;
    const commentText = document.getElementById('commentText').value;
    if (videoUrl && commentText) {
      // Call the exposed function
      window.electron.postCommentToAllProfiles(videoUrl, commentText);
    } else {
      alert('Please fill both the YouTube URL and the comment.');
    }
  }
</script>

  </body></html>`);
  commentPopup.webContents.openDevTools();
  commentPopup.once('ready-to-show', () => {
    commentPopup.show();
  });

  commentPopup.on('closed', () => {
    commentPopup = null;
  });
}

ipcMain.handle('postCommentToAllProfiles', async (event, videoUrl, commentText) => {
  if (!videoUrl || !commentText) {
    return console.log('No YouTube URL or comment provided!');

  }
  videourl=videoUrl

  // Track promises to ensure each profile gets the comment
  const commentPromises = [];

  // Iterate through all profiles and post the comment
  for (let profile of profiles) {
    console.log(`Posting comment to profile: ${profile}`);

    // Create the profile's window, even if it already exists, to interact with it.
    const profileWindow = createMainWindowMore(profile);

    // Wait until the page is fully loaded for each profile's window
    const commentPromise = new Promise((resolve, reject) => {
      profileWindow.webContents.once('did-finish-load', () => {
        console.log('Page loaded successfully, ready to comment!');
        
        // Post the comment on the loaded profile's page
        profileWindow.webContents.executeJavaScript(`
          async function waitForElement(selector, timeout = 10000) {
            return new Promise((resolve, reject) => {
              const interval = 100;
              const endTime = Date.now() + timeout;

              function check() {
                const element = document.querySelector(selector);
                if (element) {
                  resolve(element);
                } else if (Date.now() > endTime) {
                  reject(new Error('Element not found: ' + selector));
                } else {
                  setTimeout(check, interval);
                }
              }

              check();
            });
          }

          (async () => {
            try {
              const placeholder = await waitForElement('#simplebox-placeholder');
              if (!placeholder) throw new Error('Placeholder not found');
              placeholder.click();

              const inputField = await waitForElement('div#contenteditable-root');
              if (!inputField) throw new Error('Comment input field not found');
              inputField.innerText = "${commentText}";

              const keyboardEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                ctrlKey: true,
                bubbles: true,
              });
              inputField.dispatchEvent(keyboardEvent);

              return true;
            } catch (err) {
              console.error('Error while interacting with the comment section:', err);
              return false;
            }
          })();
        `)
        .then(result => {
          if (result) {
            console.log(`Comment posted successfully on profile: ${profile}`);
            resolve();
          } else {
            console.log(`Failed to post comment on profile: ${profile}`);
            reject();
          }
        })
        .catch(err => {
          console.error('Error while posting comment:', err);
          reject();
        });
      });
    });

    commentPromises.push(commentPromise);
  }

  // Wait for all comment promises to finish
  try {
    await Promise.all(commentPromises);
    console.log('Comment posted on all profiles!');
  } catch (err) {
    console.error('Error posting comments on some profiles:', err);
  }

  // Close the popup after posting comments to all profiles
  commentPopup.close();
  commentPopup = null;
});


// Ensure the menu is updated whenever profiles change
function updateMenu() {
  const menuTemplate = [
    {
      label: 'Profiles',
      submenu: [
        {
          label: 'Create New Profile',
          click: () => {
            const newProfile = `profile${profiles.size + 1}`;
            profiles.add(newProfile);
            saveProfiles(); // Save profiles to the file
            createMainWindow(newProfile);
            updateMenu(); // Rebuild the menu with the new profile
          },
        },
        ...Array.from(profiles).map((profile) => ({
          label: `Switch to ${profile}`,
          click: () => createMainWindow(profile),
        })),
      ],
    },
    {
      label: 'Comment on YouTube',
      submenu: [
        {
          label: 'Post Comment to All Profiles',
          click: () => openCommentPopup(),
        },
      ],
    },
    { role: 'quit' }, // Add a Quit option
  ];
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

app.on('ready', () => {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [''], // Override CSP
      },
    });
  })
  loadProfiles(); // Load saved profiles on startup
  createMainWindow('default'); // Open the default profile initially
  updateMenu(); // Initialize the menu with the default profile
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (!mainWindow) {
    createMainWindow(currentProfile);
  }
});
F3wxlc
h9d3hd