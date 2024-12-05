import {app, BrowserWindow} from 'electron';
import path from 'path';
import { isDev } from './util.js';

app.on('ready', () => {
    const mainWindows = new BrowserWindow({});

    if(isDev) {
        mainWindows.loadURL('http://localhost:5123');
    } else {
        mainWindows.loadFile(path.join(app.getAppPath(), '/dist-react/index.html'));
    }
})