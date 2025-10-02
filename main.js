const { app, BrowserWindow, session, Menu, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios'); // CommonJS syntax (for Node.js/Electron)


let missingProfiles = [];
let logoutrangePopup
let currentCount=0
let profiles_adjusted =[]
let profiles_adjusted_ban =[]
let bannedEmails = []
let currentNewProfile
let mainWindow;
let commentPopup;
let videourl = 'https://www.google.com/';
let currentProfile = 'default'; // Default profile
const profilesFilePath = path.join(app.getPath('userData'), 'profiles.json');
const profilesEmailFilePath = path.join(app.getPath('userData'), 'profilesEmail.json');
const bannedEmailFilePath = path.join(app.getPath('userData'), 'bannedEmail.txt')
const default_path = app.getPath('userData')
let profiles = new Set([]);
let profilesEmail = {} // Store all profile names
// License verification removed
console.log(profilesFilePath)
console.log(profilesEmail)

// Load profiles from the saved file

let profileCounterToAdd = 1000;
async function sortProfiles() {
  // Convert Set to Array
  let  profilesArray = Array.from(profiles);


  profilesArray.sort((a, b) => {
      let numA = a.match(/\d+/g) ? parseInt(a.match(/\d+/g)[0]) : 0;
      let numB = b.match(/\d+/g) ? parseInt(b.match(/\d+/g)[0]) : 0;
      return numA - numB;
  });
  
  console.log(profiles);
  

  // Convert Array back to Set (optional, if you want to keep the result as a Set)
  profiles = new Set(profilesArray);
  console.log(profilesArray,'after')

  
}

async function findMissingProfiles() {
  // Step 1: Get the last profile from the set (for example, profile5)
  if (profiles.size>0){
  let lastProfile = Array.from(profiles).pop();
  
  // Step 2: Extract the number from the last profile (e.g., profile5 -> 5)
  let lastProfileNumber = parseInt(lastProfile.replace('profile', ''));

  // Step 3: Loop through profiles from 1 to the last number and check if each profile exists in the set

  for (let i = 1; i <= lastProfileNumber; i++) {
      let profileName = `profile(${i})`;
      if (!profiles.has(profileName)) {
          // If profile is missing, push it into the missingProfiles array
          missingProfiles.push(profileName);
      }
  }
  }
}



async function  loadProfiles() {
  if (fs.existsSync(profilesFilePath)) {
    const data = fs.readFileSync(profilesFilePath);
    const loadedProfiles = JSON.parse(data);
    profiles = new Set(loadedProfiles);
  }
  if (fs.existsSync(profilesEmailFilePath)) {
    const data = fs.readFileSync(profilesEmailFilePath);
    const loadedProfiles = JSON.parse(data);
    profilesEmail = loadedProfiles;
  
  }
}
async function checkAndRemoveProfiles() {
  // Iterate over the profilesSet and check each profile
  profiles.forEach(profile => {
    const profileKey = profile; // Example: 'profile1', 'profile2', etc.
    
    // Check if the profile exists in profileEmail object
    if (!profilesEmail.hasOwnProperty(profileKey)) {
      // If not, delete the profile from profilesSet
      profiles.delete(profile);
      ipcMain.emit('delete-folder', null, profileKey);
      console.log(`Profile '${profileKey}' not found in profileEmail, removing from set.`);
    }
  });

}

// Save profiles to the saved file
function saveProfiles() {
  const profilesArray = Array.from(profiles);
  fs.writeFileSync(profilesFilePath, JSON.stringify(profilesArray, null, 2));
}

// Function to create the app's menu dynamically
let openedWindows = []

function banProfile(profileName) {

  if (profilesEmail[profileName]) {

    const email = profilesEmail[profileName];
    ipcMain.emit('delete-folder', null, profileName)

    bannedEmails.push(email);

    profiles.delete(profileName);
    console.log(profiles)
    saveProfiles()

    delete profilesEmail[profileName];
    console.log('form banee====',profileName,profilesEmail)
    fs.writeFileSync(profilesEmailFilePath, JSON.stringify(profilesEmail, null, 2))


    console.log(`Profile ${profileName} banned successfully.`);
  } else {
    console.log(`Profile ${profileName} not found.`);
  }
}

function logout_from(profileName) {
  ipcMain.emit('delete-folder', null, profileName);
  if (profilesEmail[profileName]) {


 

    profiles.delete(profileName);
    console.log(profiles)
    saveProfiles()

    delete profilesEmail[profileName];
   
    fs.writeFileSync(profilesEmailFilePath, JSON.stringify(profilesEmail, null, 2))
    updateMenu();


    console.log(`Profile ${profileName} logout successfully.`);
  } else {
    console.log(`Profile ${profileName} not found.`);
  }
}

function logout_from_all() {
  const allProfileNames = Array.from(profiles.keys()); // Get all profile names from the profiles map or object

  allProfileNames.forEach((profileName) => {
    logout_from(profileName); // Call logout_from for each profile
  });

  console.log("All profiles logged out successfully.");
}

function createMainWindowMore(profile, x, z) {
  const profileWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    x: x, // Set the x-coordinate
    y: z, // Set the y-coordinate
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      zoomFactor: 0.4,
      contextIsolation: true,
      enableRemoteModule: false,
      nodeIntegration: false,
      webSecurity: false,
      partition: `persist:${profile}`, // Use a unique partition for each profile
    },
  });
  //profileWindow.webContents.openDevTools()
  profileWindow.loadURL(videourl);
  profileWindow.webContents.on('did-navigate', (event, url) => {
    if (url.includes('https://accounts.google.com/')){
    console.log(`Full navigation to: ${url}`);
      banProfile(profile)
     
      profileWindow.close()

      profiles_adjusted_ban.filter(item => item !== profile);
      
      if (currentCount < profiles_adjusted_ban.length -1 )
        currentCount=currentCount+1
      else currentCount=0


      profiles_adjusted.push(profiles_adjusted_ban[currentCount])
    }
  });




  // Set a custom user agent for each profile (optional)
  const customUserAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36';

  profileWindow.webContents.session.setUserAgent(customUserAgent);
  openedWindows.push(profileWindow)
  profileWindow.on('closed', () => {
    newmainWindow1 = null;
  });
  return profileWindow;
}

function activateWindowsSequentially() {
  openedWindows.forEach((win, index) => {
    setTimeout(() => {
      if (!win.isDestroyed()) {
        win.focus(); // Bring the window to the foreground
        console.log(`Activated window ${index + 1}`);
      }
    }, index * 2000); // Delay for each window activation
  });
}

setInterval(()=>{
  activateWindowsSequentially()
},[5000])


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

function createMainWindowProfile(profile) {
  console.log(missingProfiles)
  console.log('at right place')
  currentProfile = profile;
  let cutttttt=profile

  // Create a new BrowserWindow with a unique session for the profile
  let newmainWindow = new BrowserWindow({
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

  const mainSession = newmainWindow.webContents.session;
  mainSession.setUserAgent(customUserAgent);
 console.log('hellllloooooooo')
  // Listen for requests from the profile window
  newmainWindow.webContents.session.webRequest.onBeforeRequest((details, callback) => {
  
    if (details.url.includes('https://accounts.google.com/v3/signin/identifier')) {

      if (details.uploadData) {
        const params = new URLSearchParams(details.uploadData[0].bytes.toString('utf-8'));
        currentNewProfile = params.get('identifier');
        console.log(currentNewProfile,'from up')
       
      }
    }
    callback({});
  });


  const filter = { urls: ["*://accounts.google.com/*"] };

  newmainWindow.webContents.session.webRequest.onHeadersReceived(filter, (details, callback) => {
    console.log("onHeadersReceived:", details.url, "Status Code:", details.statusCode);
    if (details.statusCode === 302 && details.url.includes('https://accounts.google.com/v3/signin/challenge')) {
      console.log("302 Redirect detected");
      console.log(currentNewProfile,'down')
      profilesEmail[profile] = currentNewProfile
      fs.writeFileSync(profilesEmailFilePath, JSON.stringify(profilesEmail, null, 2))


   
           
    }
    callback({});
  });
  


  
  // Load Gmail page or YouTube (as per the profile login status)
  newmainWindow.loadURL(videourl); // Modify as per the profile logic

  // Handle navigation errors
  newmainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error(`Failed to load ${validatedURL}: ${errorDescription} (${errorCode})`);
  });

  newmainWindow.on('closed', () => {
    newmainWindow = null;
  });
}

function openCommentPopup() {
  commentPopup = new BrowserWindow({
    width: 800,
    height: 800,
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

    <pre id="fileContent" ></pre>
         <label for="startProfile">Start of Profile:</label>
    <input type="number" id="startProfile" value=${profiles.size>0 ? 1:0}  style="width: 100%">

    <label for="endProfile">End of Profile:</label>
    <input type="number" id="endProfile" value=${profiles.size}  style="width: 100%">

    <label for="wait_time">Time to Wait :</label>
    <input id="wait_time" type="number" style="width: 100%" value="1" />


    <label for="openWindow">Open window:</label>
    <input id="openWindow" type="number" style="width: 100%" value="1" />
    <br/><br/>
    <label for="commentPerId">Comment Per Id:</label>
    <input id="commentPerId" type="number" style="width: 100%" value="3" />
    <br/><br/>
    <label for="totalComment">Total Comment:</label>
    <input id="totalComment" type="number" style="width: 100%" value="3" />
    <br/><br/>

    <label for="videoUrl">YouTube Video URL:</label>
    <input id="videoUrl" type="text" placeholder="Paste YouTube URL here" style="width: 100%" />
    <br/><br/>
    <label for="commentText">Your Comment:</label>
    <textarea id="commentText" placeholder="Write your comment here..." style="width: 100%; height: 100px;"></textarea>

    <br/><br/>
    <button onclick="postComment()">Post Comment</button>

      <br/><br/>
    <!-- Progress bar and count -->
    <label for="progress">Progress:</label>
    <progress id="progress" value="0" max="100" style="width: 100%;"></progress>
    <span id="progressCount">0</span> / <span id="totalCount">0</span>

      <script>


        // Post comments function
        function postComment() {
            const videoUrl = document.getElementById('videoUrl').value;
            const commentText = document.getElementById('commentText').value;
            const openWindow = parseInt(document.getElementById('openWindow').value, 10);
            const commentPerId = parseInt(document.getElementById('commentPerId').value, 10);
            const totalComment = parseInt(document.getElementById('totalComment').value, 10);
            const startProfile = parseInt(document.getElementById('startProfile').value, 10);
            const endProfile = parseInt(document.getElementById('endProfile').value, 10);
            const wait_time = parseInt(document.getElementById('wait_time').value, 10);
            if (endProfile<startProfile || startProfile<1 || endProfile>${profiles.size} ||  endProfile-startProfile >${profiles.size}){
            alert('Please provide a valid range');
                return;
            }
            if (!videoUrl) {
                alert('Please provide a YouTube video URL.');
                return;
            }


  document.getElementById('totalCount').textContent = totalComment;


            // Example: Electron function to handle posting
            window.electron.postCommentToAllProfiles(videoUrl, commentText, openWindow, commentPerId, totalComment,startProfile,endProfile,wait_time);
        }

         window.electron.onProgressUpdate((postedCount) => {
            const totalCount = parseInt(document.getElementById('totalCount').textContent, 10);

            // Calculate and update progress
            const progress = (postedCount / totalCount) * 100;
            document.getElementById('progress').value = progress;
            document.getElementById('progressCount').textContent = postedCount;
        });

        
    </script>
</body>
</html>`);
//  commentPopup.webContents.openDevTools();
  commentPopup.once('ready-to-show', () => {
    commentPopup.show();
  });

  commentPopup.on('closed', () => {
    commentPopup = null;
  });
}
async function adjustProfiles(profiles_temp_inside, commentPerId, totalComment,startProfile,endProfile) {
  return new Promise((resolve) => {
    let profiles_temp  = Array.from(profiles_temp_inside).slice(startProfile-1,endProfile)
    console.log(profiles_temp,profiles_temp.length, commentPerId, totalComment);

    let currentCommentCapacity = profiles_temp.length * commentPerId;
    console.log('currentCommentCapacity:', currentCommentCapacity);

    if (currentCommentCapacity > totalComment) {
      // Reduce the number of profiles
      const requiredProfiles = Math.ceil(totalComment / commentPerId);
      profiles_temp = profiles_temp.slice(0, requiredProfiles);
      console.log("Profiles reduced to:", profiles_temp);
    } else if (currentCommentCapacity < totalComment) {
      // Increase the number of profiles
      const requiredProfiles = Math.ceil(totalComment / commentPerId);
      const profilesToAdd = requiredProfiles - profiles_temp.length;

      for (let i = 0; i < profilesToAdd; i++) {
        profiles_temp.push(profiles_temp[i]);
      }
      console.log("Profiles increased to:", profiles_temp);
    } else {
      console.log("No changes to profiles:", profiles_temp);
    }

    for (let i = profiles_temp.length - 1; i > 0; i--) {

      const j = Math.floor(Math.random() * (i + 1));

      [profiles_temp[i], profiles_temp[j]] = [profiles_temp[j], profiles_temp[i]];
  }


    resolve(profiles_temp);
  });
}

function groupComments(commentsString, groupSize) {
  if (!commentsString || groupSize <= 0) {
      throw new Error("Invalid input");
  }

  // Split the comments string into an array
  const commentsArray = commentsString.split(',').map(comment => comment.trim());

  // Create groups of the specified size
  const groupedComments = [];
  for (let i = 0; i < commentsArray.length; i += groupSize) {
      groupedComments.push(commentsArray.slice(i, i + groupSize));
  }

  return groupedComments;
}


function writeBannedEmailsToFile() {
  // Ensure the path is valid and the file can be written to
  
  try {
    const bannedEmailsString = bannedEmails.join(','); // Join emails with newlines
    fs.appendFileSync(bannedEmailFilePath, bannedEmailsString, 'utf8');; // Write to file synchronously
    console.log(`Banned emails have been written to `);
    bannedEmails=[]
  } catch (error) {
    console.error(`Error writing banned emails to file: ${error.message}`);
  }
}

ipcMain.handle('postCommentToAllProfiles', async (event, videoUrl, commentText,openWindow,commentPerId,totalComment,startProfile,endProfile, wait_time) => {
  console.log('asljkhasjdnsa,mdnsadmnsd.msad.,')
  if (!videoUrl || !commentText) {
    return console.log('No YouTube URL or comment provided!');

  }
  console.log(commentText)
  let wait_per_process =(wait_time>25? wait_time+2:25)*1000

  videourl=videoUrl
  const commentgroup = groupComments(commentText,commentPerId)
   profiles_adjusted = await adjustProfiles(profiles, commentPerId, totalComment,startProfile,endProfile,wait_time)
   profiles_adjusted_ban = [...profiles_adjusted]

 
 


    let processedProfiles = 0;
    let comment_count =0
    commentPopup.webContents.send('progress-update', comment_count);
    let x=0;
    let z=0;
    const commentPromises = [];
    const commentgrouplength = commentgroup.length
    for (let i=0; i < profiles_adjusted.length;i++) {
      profile = profiles_adjusted[i]

      const eachcommentgroup = commentgroup[processedProfiles % commentgrouplength]
      console.log(`Posting comment to profile: ${profile}`);
  
      x=Math.floor(Math.random() * 1200) + 1;
        z=Math.floor(Math.random() * 1200) + 1;
      
      


      const profileWindow = createMainWindowMore(profile,x,z);
  
      const commentPromise = new Promise((resolve, reject) => {
        profileWindow.webContents.once('did-finish-load', async () => {
          console.log('Page loaded successfully, ready to comment!');
//           const randomNum1 = Math.floor(Math.random() * (47 - 33 + 1)) + 33;

// console.log('random number ', randomNum1)
//           await new Promise(resolve => setTimeout(resolve, randomNum1 * 1000))


          profileWindow.webContents.executeJavaScript(`
         

            async function waitForElement(selector, timeout = 100000) {
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
            async function postCommentsLoop(commentTexts) {
                  
                }
  
            (async () => {
              try {

  const randomNum1 =  ${wait_time}

 await new Promise(resolve => setTimeout(resolve, randomNum1 * 1000))
                            

                            for (let commentText of ${JSON.stringify(eachcommentgroup)}) {
                      
                 const placeholder = await waitForElement('#simplebox-placeholder');
      if (!placeholder) throw new Error('Placeholder not found');
      placeholder.click();

      const inputField = await waitForElement('div#contenteditable-root');
   if (!inputField) throw new Error('Comment input field not found');

inputField.innerText = commentText; // Use the dynamic comment text

const keyboardEvent = new KeyboardEvent('keydown', {
  key: 'Enter',
  ctrlKey: true,
  bubbles: true,
});
inputField.dispatchEvent(keyboardEvent); 

const randomNum = Math.floor(Math.random() * (4 - 2 + 1)) + 3;

 await new Promise(resolve => setTimeout(resolve, randomNum * 1000))

                  }
  
             
  
                return true;
              } catch (err) {
                console.error('Error while interacting with the comment section:', err);
                return false;
              }
            })();
          `)
          .then(result => {
            if (result) {
              setTimeout(() => {
                console.log(`Comment posted successfully on profile: ${profile}`);
                comment_count = comment_count + commentPerId;
                commentPopup.webContents.send('progress-update', comment_count);
                profileWindow.close();
                const newArr = openedWindows.filter(item => item !== profileWindow);
                openedWindows = newArr;
                resolve();
            }, 0);
            } else {
              console.log(`Failed to post comment on profile: ${profile}`);
              profileWindow.close();
            
              if (currentCount < profiles_adjusted_ban.length)
                currentCount=currentCount+1
              else currentCount=0
                profiles_adjusted.push(profiles_adjusted_ban[currentCount])


              const newArr = openedWindows.filter(item => item !== profileWindow);
              openedWindows = newArr;

              reject();
            }
          })
          .catch(err => {
            console.error('Error while posting comment:', err);
            profileWindow.close();

            if (currentCount < profiles_adjusted_ban.length)
              currentCount=currentCount+1
            else currentCount=0
              profiles_adjusted.push(profiles_adjusted_ban[currentCount])
            const newArr = openedWindows.filter(item => item !== profileWindow);
            openedWindows = newArr;

            reject();
          });
        });
      });
  

      processedProfiles++;
     // await new Promise(resolve => setTimeout(resolve, 20000));
      commentPromises.push(commentPromise);
  
    //  Throttle requests if necessary (every 5 profiles)
      if (processedProfiles % openWindow == 0) {
        if (bannedEmails)
        {writeBannedEmailsToFile()}
        console.log(`Processed ${processedProfiles} profiles. Waiting for 20 seconds...`);
        await new Promise(resolve => setTimeout(resolve, wait_per_process));
      }
    }
  
    if (bannedEmails)
      {writeBannedEmailsToFile()}
    try {
      await Promise.all(commentPromises);
      console.log('Comments posted on all profiles!');
    } catch (err) {
      console.error('Some profiles failed to post comments:', err);
    }
  
    
});

 

  ipcMain.on('delete-folder', (event, profile) => {
    let path = default_path + "\\Partitions\\" + profile;
    // Call the Python script to delete the folder
    const pythonProcess = spawn('python', ['delete_folder.py',path]);

    pythonProcess.stdout.on('data', (data) => {
      console.log(`Python output: ${data}`);
     
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python error: ${data}`);
      event.reply('folder-deletion-status', `Error: ${data}`);
    });

    pythonProcess.on('close', (code) => {
      console.log(`Python process exited with code ${code}`);
    });
  });


function showFileContentInModal() {
  let filePath = bannedEmailFilePath
  // Create a modal container
  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.top = '50%';
  modal.style.left = '50%';
  modal.style.transform = 'translate(-50%, -50%)';
  modal.style.backgroundColor = '#fff';
  modal.style.padding = '20px';
  modal.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
  modal.style.zIndex = '1000';
  modal.style.maxHeight = '80%';
  modal.style.overflowY = 'auto';

  // Add a close button
  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.style.marginBottom = '10px';
  closeButton.onclick = () => {
      document.body.removeChild(modal);
  };

  modal.appendChild(closeButton);

  // Fetch and display file content line by line
  fetch(filePath)
      .then((response) => {
          if (!response.ok) {
              throw new Error(`Failed to load file: ${response.statusText}`);
          }
          return response.text();
      })
      .then((text) => {
          const lines = text.split('\n'); // Split file content by lines
          lines.forEach((line) => {
              const lineElement = document.createElement('p');
              lineElement.textContent = line;
              modal.appendChild(lineElement);
          });
      })
      .catch((error) => {
          const errorElement = document.createElement('p');
          errorElement.textContent = `Error: ${error.message}`;
          errorElement.style.color = 'red';
          modal.appendChild(errorElement);
      });

  // Append modal to the body
  document.body.appendChild(modal);
}

let searchResults = [];
let logoutProfiles = new Set();

function searchProfiles(query) {
  searchResults = Array.from(profiles).filter(profile => 
    profile.toLowerCase().includes(query.toLowerCase()) || 
    (profilesEmail[profile] && profilesEmail[profile].toLowerCase().includes(query.toLowerCase()))
  );
  updateMenu();
}

function toggleLogoutProfile(profile) {
  if (logoutProfiles.has(profile)) {
    logoutProfiles.delete(profile);
  } else {
    logoutProfiles.add(profile);
  }
  updateMenu();
}

function logoutSelectedProfiles() {
  logoutProfiles.forEach(profile => {
    logout_from(profile);
  });
  logoutProfiles.clear();
  updateMenu();
}

// Ensure the menu is updated whenever profiles change
function updateMenu() {
  const menuTemplate = [
    {
      label: `Profiles(${profiles.size})`,
      submenu: [
        {
          label: 'Create New Profile',
          click: async () => {
            console.log('heloo from 2',profiles.size)
            if (missingProfiles.length>0 == "aasf"){
              const newProfile = missingProfiles[0];
              missingProfiles.shift()
              profiles.add(newProfile);
              await sortProfiles()
              saveProfiles();
              createMainWindowProfile(newProfile);
              updateMenu();
            }
            else{
const profileCounterToAdd = `${Date.now()}${Math.floor(Math.random() * 1000)}`; // timestamp + random number
const newProfile = `profile${profileCounterToAdd}`;
              profiles.add(newProfile);
              saveProfiles();
              createMainWindowProfile(newProfile);
              updateMenu();
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Search Profiles',
          submenu: [
            {
              label: 'Search',
              click: () => {
                const BrowserWindow = require('electron').BrowserWindow;
                const searchWindow = new BrowserWindow({
                  width: 400,
                  height: 200,
                  parent: BrowserWindow.getFocusedWindow(),
                  modal: true,
                  show: false,
                  webPreferences: {
                    preload: path.join(__dirname, 'preload.js'),
                    contextIsolation: true,
                    nodeIntegration: false,
                  }
                });
                
                searchWindow.loadURL(`data:text/html,
                  <html>
                  <head>
                    <style>
                      body { font-family: Arial, sans-serif; padding: 20px; }
                      input { width: 100%; padding: 8px; margin: 10px 0; }
                      button { padding: 8px 15px; margin-right: 10px; }
                    </style>
                  </head>
                  <body>
                    <h3>Search Profiles</h3>
                    <p>Search by profile name or email:</p>
                    <input type="text" id="searchInput" autofocus>
                    <div style="text-align: right; margin-top: 15px;">
                      <button id="cancelBtn">Cancel / Reset</button>
                      <button id="searchBtn">Search</button>
                    </div>
                    <script>
                      const searchBtn = document.getElementById('searchBtn');
                      const cancelBtn = document.getElementById('cancelBtn');
                      const searchInput = document.getElementById('searchInput');
                      
                      searchBtn.addEventListener('click', () => {
                        if (searchInput.value.trim() !== '') {
                          window.electron.searchProfiles(searchInput.value);
                          window.close();
                        }
                      });
                      
                      cancelBtn.addEventListener('click', () => {
                        window.electron.searchProfiles(searchInput.value);
                        window.close();
                      });
                      
                      searchInput.addEventListener('keyup', (e) => {
                        if (e.key === 'Enter' && searchInput.value.trim() !== '') {
                          window.electron.searchProfiles(searchInput.value);
                          window.close();
                        }
                      });
                    </script>
                  </body>
                  </html>
                `);
                
                searchWindow.once('ready-to-show', () => {
                  searchWindow.show();
                });
              }
            }
          ]
        },
        { type: 'separator' },
        ...(searchResults.length > 0 ? searchResults.map((profile, index) => ({
          label: `[Search Result] Profile - ${index+1} Switch to - ${profilesEmail[profile]}`,
          click: () => createMainWindowProfile(profile),
        })) : Array.from(profiles).map((profile, index) => ({
          label: `Profile - ${index+1} Switch to - ${profilesEmail[profile]}`,
          click: () => createMainWindowProfile(profile),
        }))),
      ],
    },
    {
      label: 'Logout Profiles',
      submenu: [
        ...Array.from(profiles).map((profile, index) => ({
          label: `${logoutProfiles.has(profile) ? '[✓] ' : ''}Profile ${index+1} - Logout - ${profilesEmail[profile]}`,
          click: () => toggleLogoutProfile(profile),
        })),
        { type: 'separator' },
        {
          label: `Logout Selected (${logoutProfiles.size})`,
          enabled: logoutProfiles.size > 0,
          click: () => logoutSelectedProfiles(),
        },
        { type: 'separator' },
        {
          label: 'Logout In Range',
          click: () => LogoutrangePopup_yo(),
        },
        {
          label: 'Logout from all',
          click: () => logout_from_all(),
        }
      ],
    },
    {
      label: 'Comment on YouTube',
      submenu: [
        {
          label: 'Post Comment to All Profiles',
          click: () => openCommentPopup(),
        }
      ],
    },
    {
      label: 'Banned Email',

         
     
      submenu:[
{        label: 'Show',
        click: () =>    {     ipcMain.handle('read-file', (event, bannedEmailFile) => {
          return new Promise((resolve, reject) => {
            fs.readFile(bannedEmailFilePath, 'utf8', (err, data) => {
              if (err) {
                reject('Error reading file: ' + err.message);
              } else {
                resolve(data);
              }
            });
          })})
        createWindowforbannedemail()
      
      }},
      {
        label:'Delete',
        click:()=>{
          fs.writeFileSync(bannedEmailFilePath, '', 'utf8');
        }
      }
    
    ]


    },
    { role: 'quit' }, // Add a Quit option
  ];
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}


function createWindowforbannedemail() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false, // Ensure security
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js') // If you use a preload script
    }
  });
 
  mainWindow.loadFile('bannedemail.html');
 // mainWindow.webContents.openDevTools()
 mainWindow.on('closed', () => {
  mainWindow = null;
});
}
ipcMain.handle('delete_range', async (event,dstartProfile,dendProfile) => {
  const allProfileNames = Array.from(profiles.keys()).slice(dstartProfile-1,dendProfile); // Get all profile names from the profiles map or object
try{ 
  
  allProfileNames.forEach((profileName) => {
  logout_from(profileName); // Call logout_from for each profile
});
logoutrangePopup.close()

console.log("All profiles logged out successfully.");}
catch{
  console.log('Something went wrong in delete_range')
}


})
function LogoutrangePopup_yo() {
   logoutrangePopup = new BrowserWindow({
    width: 400,
    height: 200,
    parent: mainWindow,
    modal: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Load the preload script
      contextIsolation: true,
      nodeIntegration: false, // Security best practice
    },
  });
  //logoutrangePopup.webContents.openDevTools()
  logoutrangePopup.loadURL(`data:text/html,<html><body>
    <h2>Post Comment on YouTube</h2>

    <pre id="fileContent" ></pre>
         <label for="dstartProfile">Start of Profile:</label>
    <input type="number" id="dstartProfile" value=${profiles.size>0 ? 1:0} min="1"  max=${profiles.size}>

    <label for="dendProfile">End of Profile:</label>
    <input type="number" id="dendProfile" value=${profiles.size} min="1" max=${profiles.size}>

  
    <button onclick="logout_range()">Logout</button>

   

      <script>


        // Post comments function
        function logout_range() {

            const dstartProfile = parseInt(document.getElementById('dstartProfile').value, 10);
            const dendProfile = parseInt(document.getElementById('dendProfile').value, 10);
            if (dendProfile<dstartProfile || dstartProfile<1 || dendProfile>${profiles.size} ||  dendProfile-dstartProfile >${profiles.size}){
            alert('Please provide a valid range');
                return;
            }
           
            // Example: Electron function to handle posting
            window.electron.delete_range(dstartProfile,dendProfile);
        }



        
    </script>
</body>
</html>`);
//  commentPopup.webContents.openDevTools();
logoutrangePopup.once('ready-to-show', () => {
  logoutrangePopup.show();
  });

  logoutrangePopup.on('closed', () => {
    logoutrangePopup = null;
  });
}


// License verification completely removed
// License validation function removed

// License validation IPC handler removed

app.on('ready', async  () => {
  console.log("Starting YouTube Commenter...")
  console.log("Profiles file path:", profilesFilePath)

  await  loadProfiles();
  await checkAndRemoveProfiles();
  saveProfiles();
  await  findMissingProfiles();
  await sortProfiles()
  
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [''], // Override CSP
      },
    });
  })
 
  openCommentPopup(); 
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

// Add IPC handler for search profiles
ipcMain.handle('search-profiles', (event, query) => {
  searchProfiles(query);
  return true;
});

