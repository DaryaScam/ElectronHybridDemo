import {app, BrowserWindow, dialog, net, protocol} from 'electron';
import path from 'path';
import QRCode from 'qrcode';

import { isDev } from './util.js';
import { getPreloadPath } from './pathResolver.js';
import { ipcMain } from 'electron';
import { generateQRCodeVal, generateSessionIK } from './hybrid/hybrid.js';
import { BleSession, extractServiceData, Peripheral } from './ble/ble.js';
import { EIK_KEY_PURPOSE, hybridHKDFDerive, tryDecryptPayload } from './hybrid/crypto.js';
import { calculateHybridTunnelDomain, HybridTunnel } from './hybrid/tunnel.js';
import { CaBLEv2 } from './hybrid/cablev2.js';

const listenForHybridAdvertisement = async (): Promise<Peripheral> => {
    return new Promise((resolve, reject) => {
        let resultPeripheral: any = undefined;
        let bleman: BleSession | undefined;

        let searcher = setInterval(async () => {
            try {
                // Be a tidy person. Clean up after yourself.
                bleman?.destroy();

                bleman = new BleSession();

                await bleman.startScanning();
                resultPeripheral = await bleman.findHybridPeripheral(3000);
                
                clearInterval(searcher);
                bleman?.destroy();
                resolve(resultPeripheral);
            } catch (error: any) {
                console.error('Error searching for hybrid', error);
            }
        }, 5000);
    })
}

app.on('ready', async () => {
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

    let sik = generateSessionIK();
    let qrcode: string | undefined = await QRCode.toDataURL(generateQRCodeVal(sik));
    let hybridStarted = false;
    ipcMain.on('hybrid-start', async (event) => {
        try {
            // React fix from double instantiating the hybrid
            event.reply('hybrid-start-ack', {status: 'ok', qrcode});
           
            if (hybridStarted) {
                return;
            }

            hybridStarted = true;
            let result = await listenForHybridAdvertisement();
            let serviceData = extractServiceData(result);
            let decrypted = tryDecryptPayload(serviceData, sik);

            let tunnel = new HybridTunnel(decrypted, sik);
            await tunnel.waitConnected(10000)

            // Establish encrypted tunnel
            let psk = hybridHKDFDerive(sik.qrSecret, EIK_KEY_PURPOSE.PSK, 32);

            const caBLEv2 = new CaBLEv2();
            const initMsg = await caBLEv2.initialConnectMessage(psk, sik.identityKey);
            console.log('initMsg', initMsg.msg.toString('hex'));
            tunnel.sendMessage(initMsg.msg);
            const phoneHandshakeAck = await tunnel.awaitMessage()
            let responseProcess = await caBLEv2.processHandshakeResponse(phoneHandshakeAck, initMsg.ephermeralKey);
            console.log('responseProcess', responseProcess.trafficKeys.o1.toString('hex'));
            
        } catch (error: any) {
            console.error('Error starting hybrid', error);
            event.reply('hybrid-start-ack', {status: 'error', message: error.message});
        }
    })

    ipcMain.on('some-channel', (event, arg) => {
        console.log(arg); // prints the message from renderer process
        event.reply('some-channel-reply', 'pong');

    });
})

