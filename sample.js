const { app, BrowserWindow, session, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let commentPopup
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
          label: 'Post Comment',
          click: () => openCommentPopup(),
        },
      ],
    },
    { role: 'quit' }, // Add a Quit option
  ];
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

// Function to create the main window for a specific profile
function createMainWindow(profile) {
  currentProfile = profile;

  // Create a new BrowserWindow with a unique session for the profile
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
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
  mainWindow.loadURL('https://www.youtube.com/'); // Modify as per the profile logic

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
          window.electron.postCommentYoutube(videoUrl, commentText);
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

// Handle posting a comment from the popup
ipcMain.handle('postCommentYoutube', async (event,videoUrl, commentText) => {
  //mainWindow.webContents.openDevTools()
  if (!videoUrl || !commentText) {
    return console.log('No YouTube URL or comment provided!');
  }
  commentPopup.close();
  commentPopup = null;
  

  // Load the video URL
  mainWindow.loadURL(videoUrl);


  // Wait for the page to load and interact with the page
  mainWindow.webContents.once('did-finish-load', () => {

    console.log('Page loaded successfully, ready to comment!');
  
    // Try to find the comment box and submit button
    mainWindow.webContents.executeJavaScript(`
        function waitForElement(selector, timeout = 10000) {
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
          // Wait for the placeholder element to appear and click it
          console.log('innn')
          const placeholder = await waitForElement('#simplebox-placeholder');
          if (!placeholder) {
            throw new Error('Placeholder not found');
          }
          console.log('before cliuck')
          placeholder.click();
          console.log('after click')
          
          // Wait for the contenteditable div to appear (used for typing the comment)
          const inputField = await waitForElement('div#contenteditable-root');
          if (!inputField) {
            throw new Error('Comment input field not found');
          }
          console.log('before comment')
          // Enter the comment text
          inputField.innerText = "${commentText}";
          
          console.log('after comment')
          // Simulate pressing Ctrl + Enter to submit the comment
          const keyboardEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            ctrlKey: true, // Simulate Ctrl key being pressed
            bubbles: true,
          });
          console.log('before press')
          inputField.dispatchEvent(keyboardEvent);
          console.log('after press')
  
          return true;
        } catch (err) {
          console.error('Error while interacting with the comment section:', err);
          return false;
        }
      })();
    `)
    .then(result => {
      if (result) {
        console.log('Comment posted successfully!');
        mainWindow.webContents.openDevTools()
      } else {
        console.log('Failed to post comment.');
        mainWindow.webContents.openDevTools()
      }
    })
    .catch(err => {
      console.error('Error while posting comment:', err);
      mainWindow.webContents.openDevTools()
    });
  });
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
          label: 'Post Comment',
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
