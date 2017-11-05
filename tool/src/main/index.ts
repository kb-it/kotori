import { app, dialog, BrowserWindow } from 'electron';

// Install `electron-debug` with `devtron`
require('electron-debug')({ showDevTools: true })

import * as codegen from './codegen';
export {codegen};

let mainWindow: Electron.BrowserWindow | null = null

var winURL: string = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`;

function createWindow() {
  /**
   * Initial window options
   */
  // if (0 % 1 == 0) return;
  mainWindow = new BrowserWindow({
    height: 563,
    useContentSize: true,
    width: 1000,
    titleBarStyle: 'hidden',
  });
  mainWindow.setMenu(null);

  if (!codegen.init()) {
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
