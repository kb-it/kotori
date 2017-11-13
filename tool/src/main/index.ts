import { app, dialog, BrowserWindow, ipcMain } from 'electron';
import {FileTags} from '../renderer/store/modules/app'
import * as codegen from './codegen';

const path = require("path");
const child_process = require("child_process");

declare var __static: any;

// Install `electron-debug` with `devtron`
require('electron-debug')({ showDevTools: true })

let mainWindow: Electron.BrowserWindow | null = null

var winURL: string = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`;

// register an asynchronous IPC interface we'll use for communication with renderer
function registerEventHandler() {
  // TODO: ugly
  var dir = path.dirname(process.argv.find((val) => 
      val.endsWith(".js")) || path.join(process.resourcesPath, "app.asar", "strip_me"));

  ipcMain.on("get-track", (event: any, filePath: string) => {
      var forked = child_process.fork(path.join(dir, "index-codegen.js"), [__static, filePath]);
      forked.on("message", (msg: any) => {
          // pass the message along to the renderer
          event.sender.send("get-track-result", filePath, msg);
      });
      forked.on("error", (err: any) => console.error("child err ", err));
  });

  ipcMain.on("write-tags", (event: any, filePath: string, meta: FileTags) => {
      var forked = child_process.fork(path.join(dir, "index-codegen.js"), [__static, "--write", filePath]);
      forked.on("message", (msg: any) => {
          event.sender.send("write-tags-result", filePath, msg);
      });
      forked.on("error", (err: any) => console.error("child err ", err));
      forked.send(meta);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    height: 563,
    useContentSize: true,
    width: 1000,
    titleBarStyle: 'hidden',
    webPreferences: {webSecurity: process.env.NODE_ENV === 'production'},
  });
  mainWindow.setMenu(null);

  // check if ffmpeg exists on startup so the user knows if everything works
  if (!codegen.init(true)) {
    winURL = "about:blank";
    dialog.showErrorBox("Error", "Could not find ffmpeg!");
    process.exit(-1);
  }
  registerEventHandler();

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
