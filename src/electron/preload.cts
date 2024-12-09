import { subscribe } from "diagnostics_channel";

const electron = require('electron');

interface StartHybridResult {
    status: string;
    qrcode?: string;
    message?: string;
}

interface HybridResult {
    status: string;
    message: string;
}

electron.contextBridge.exposeInMainWorld('electron', {
    startHybrid: (): Promise<string> => {
        return new Promise((resolve, reject) => {
            electron.ipcRenderer.send('hybrid-start');
            electron.ipcRenderer.on('hybrid-start-ack', (event, arg) => {
                let darg = arg as StartHybridResult;

                if (darg.status === 'ok') {
                    resolve(darg.qrcode!);
                } else {
                    reject(darg.message!);
                }

                // setTimeout(() => {
                //     electron.ipcRenderer.send('listen-stop');
                //     reject({ status: 'error', message: 'Timeout' });
                // }, 5000);
            });
        })
    },

    subscribeHybridResulrt: (callback: (result: HybridResult) => void) => {
        electron.ipcRenderer.on('hybrid-result', (event, arg) => {
            callback(arg);
        });
    },
    
    ping(): Promise<string> {
        return new Promise((resolve) => {
            electron.ipcRenderer.send('some-channel', 'ping');
            electron.ipcRenderer.on('some-channel-reply', (event, arg) => {
                console.log(arg); // prints "pong"
            });
        })
    }

});