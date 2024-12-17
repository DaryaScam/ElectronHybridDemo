/**
 * 
 * Created by Yuriy Ackermann <ackermann.yuriy@gmail.com> <@yackermann>
 * As a part of DaryaScam Project <https://daryascam.info>
 * 
 */

const electron = require('electron');

interface StartHybridResult {
    status: string;
    qrcode?: string;
    message?: string;
}

interface HybridResult {
    status: string;
    message?: string;
}

electron.contextBridge.exposeInMainWorld('electron', {
    startAuth: (): Promise<string> => {
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

    subscribeToAuthResult: (): Promise<void> => {
        return new Promise((resolve, reject) => {
            electron.ipcRenderer.on('hybrid-result', (event, arg) => {
                let darg = arg as HybridResult;

                if (darg.status === 'ok') {
                    resolve();
                } else {
                    reject(darg.message!);
                }


                // setTimeout(() => {
                //     electron.ipcRenderer.send('listen-stop');
                //     reject({ status: 'error', message: 'Timeout' });
                // }, 5000);
            });
        })
    }
    

    // writeToMessenger: (message: string) => {
    //     // Send CMD to messenger...
    // }

    // subscribeToMessenger: (callback: (message: string) => void) => {
    //     // Receive updates from messenger../
    // }

});