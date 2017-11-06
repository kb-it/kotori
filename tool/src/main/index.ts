import { app, dialog, BrowserWindow } from 'electron';
import * as codegen from './codegen';

// Install `electron-debug` with `devtron`
require('electron-debug')({ showDevTools: true })

let mainWindow: Electron.BrowserWindow | null = null

var winURL: string = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`;

function createWindow() {
  mainWindow = new BrowserWindow({
    height: 563,
    useContentSize: true,
    width: 1000,
    titleBarStyle: 'hidden',
  });
  mainWindow.setMenu(null);

  // check if ffmpeg exists on startup so the user knows if everything works
  if (!codegen.init(true)) {
    winURL = "about:blank";
    dialog.showErrorBox("Error", "Could not find ffmpeg!");
    process.exit(-1);
  }

  mainWindow.loadURL(winURL)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', () => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
