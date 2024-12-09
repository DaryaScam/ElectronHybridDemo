import {app, BrowserWindow, dialog, net, protocol} from 'electron';
import path from 'path';
import QRCode from 'qrcode';

import { isDev } from './util.js';
import { getPreloadPath } from './pathResolver.js';
import { ipcMain } from 'electron';
import { generateQRCodeVal, generateSessionIK } from './hybrid/hybrid.js';
import { digitEncodeQRBytes } from './hybrid/utils.js';
import { BleSession } from './ble/ble.js';

app.on('ready', () => {
    app.whenReady().then(() => {
        const mainWindow = new BrowserWindow({
            width: 800,
            height: 600,
            webPreferences: {
                preload: getPreloadPath(),
            },
        });

        mainWindow.webContents.openDevTools();

        if(isDev) {
            mainWindow.loadURL('http://localhost:5123');
        } else {
            mainWindow.loadFile(path.join(app.getAppPath(), '/dist-react/index.html'));
        }
        protocol.registerSchemesAsPrivileged([
            { scheme: 'http', privileges: { standard: true, secure: true } },
        ]);
      
    })

    let sik = undefined;
    let qrcode: string | undefined = undefined;
    let hybridStarted = false;
    ipcMain.on('hybrid-start', async (event) => {
        try {
            // React fix from double instantiating the hybrid
            if (!hybridStarted) {
                hybridStarted = true;

                sik = generateSessionIK();
                qrcode = await QRCode.toDataURL(generateQRCodeVal(sik))

                event.reply('hybrid-start-ack', {status: 'ok', qrcode});
            } else {
                event.reply('hybrid-start-ack', {status: 'ok', qrcode});
                return
            }

            let resultPeripheral: any = undefined;
            let bleman: BleSession | undefined;
            let searcher = setInterval(async () => {
                bleman?.destroy();
                
                bleman = new BleSession();
                await bleman.startScanning();
                resultPeripheral = await bleman.findHybridPeripheral(2500);

                bleman?.destroy();
                console.log('resultPeripheral', resultPeripheral);

                clearInterval(searcher);
            }, 5000);
        } catch (error: any) {
            console.error('Error starting hybrid', error);
            // searcher?.destroy();
            event.reply('hybrid-start-ack', {status: 'error', message: error.message});
        }
    })

    ipcMain.on('some-channel', (event, arg) => {
        console.log(arg); // prints the message from renderer process
        event.reply('some-channel-reply', 'pong');

    });
})

