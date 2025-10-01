const { app, BrowserWindow, session, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let commentPopup;
let videourl = 'https://www.youtube.com/';
let currentProfile = 'default'; // Default profile
const profilesFilePath = path.join(app.getPath('userData'), 'profiles.json');
let profiles = new Set(['default']); // Store all profile names
const emailProfilesMap = {}; // Store emails associated with profiles

// Load profiles and email associations from the saved file
function loadProfiles() {
  if (fs.existsSync(profilesFilePath)) {
    const data = fs.readFileSync(profilesFilePath);
    const { savedProfiles, savedEmails } = JSON.parse(data);
    profiles = new Set(savedProfiles);
    Object.assign(emailProfilesMap, savedEmails);
  }
}

// Save profiles and email associations to the file
function saveProfiles() {
  const profilesArray = Array.from(profiles);
  const data = {
    savedProfiles: profilesArray,
    savedEmails: emailProfilesMap,
  };
  fs.writeFileSync(profilesFilePath, JSON.stringify(data, null, 2));
}

// Function to create the app's menu dynamically
function createMenu() {
  const menuTemplate = [
    {
      label: 'Profiles',
      submenu: [
        {
          label: 'Create New Profile',
          click: () => createNewProfile(),
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

// Function to validate login
async function validateLogin(profileWindow) {
  return new Promise((resolve) => {
    profileWindow.webContents.once('did-finish-load', async () => {
      const isLoggedIn = await profileWindow.webContents.executeJavaScript(`
        (async () => {
          try {
            const emailElement = document.querySelector('div#email'); // Example selector for logged-in email
            return emailElement ? emailElement.innerText : null;
          } catch (err) {
            console.error('Error during login validation:', err);
            return null;
          }
        })();
      `);
      resolve(isLoggedIn);
    });
  });
}

// Create a new profile after successful login
function createNewProfile() {
  const newProfile = `profile${profiles.size + 1}`;
  const profileWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
      webSecurity: false,
      partition: `persist:${newProfile}`,
    },
  });

  profileWindow.loadURL(videourl);

  profileWindow.webContents.once('did-finish-load', async () => {
    const email = await validateLogin(profileWindow);
    if (email) {
      if (Object.values(emailProfilesMap).includes(email)) {
        console.log('Profile not created: Email already in use.');
        profileWindow.close();
      } else {
        profiles.add(newProfile);
        emailProfilesMap[newProfile] = email;
        saveProfiles();
        updateMenu();
        console.log(`Profile created successfully with email: ${email}`);
        profileWindow.close();
      }
    } else {
      console.log('Profile not created: Login failed.');
      profileWindow.close();
    }
  });
}

// Function to create the main window for a specific profile
function createMainWindow(profile) {
  currentProfile = profile;

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

  const customUserAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36';

  mainWindow.webContents.session.setUserAgent(customUserAgent);
  mainWindow.loadURL(videourl);

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
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
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
      window.electron.postCommentToAllProfiles(videoUrl, commentText);
    } else {
      alert('Please fill both the YouTube URL and the comment.');
    }
  }
</script>
  </body></html>`);
  commentPopup.once('ready-to-show', () => {
    commentPopup.show();
  });
}

// Update menu dynamically whenever profiles change
function updateMenu() {
  createMenu();
}

// Application lifecycle
app.on('ready', () => {
  loadProfiles();
  createMainWindow('default');
  updateMenu();
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
