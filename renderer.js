
const { ipcRenderer } = require('electron');

async function createProfile() {
  const profileName = prompt('Enter Profile Name');
  if (!profileName) return;

  const profileSession = await ipcRenderer.invoke('create-profile', profileName);
  const profileList = document.getElementById('profile-list');
  const profileItem = document.createElement('li');
  profileItem.innerText = profileName;
  profileItem.onclick = () => switchProfile(profileSession, profileName);
  profileList.appendChild(profileItem);
}

function switchProfile(profileSession, profileName) {
  const webview = document.getElementById('webview');
  webview.src = 'https://mail.google.com';
  webview.setAttribute('partition', `persist:${profileName}`);
}

function navigate() {
  const url = document.getElementById('url').value;
  const webview = document.getElementById('webview');
  webview.src = url;
}
