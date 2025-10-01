const { contextBridge, ipcRenderer } = require('electron');




contextBridge.exposeInMainWorld('electron', {

  postCommentToAllProfiles: (videoUrl, commentText,openWindow,commentPerId,totalComment,startProfile,endProfile,wait_time) =>
    ipcRenderer.invoke('postCommentToAllProfiles', videoUrl, commentText,openWindow,commentPerId,totalComment,startProfile,endProfile,wait_time),
 

  delete_range: (dstartProfile,dendProfile) =>
    ipcRenderer.invoke('delete_range', dstartProfile,dendProfile),
  onProgressUpdate: (callback) => {
    ipcRenderer.on('progress-update', (event, postedCount) => callback(postedCount));
},

readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
deleteFolder: (folderPath) => ipcRenderer.send('delete-folder', folderPath),
onFolderDeletionStatus: (callback) => ipcRenderer.on('folder-deletion-status', (event, data) => callback(data)),
validateLicence: (licenceKey) => ipcRenderer.invoke('validate-licence', licenceKey),
searchProfiles: (query) => ipcRenderer.invoke('search-profiles', query),
});