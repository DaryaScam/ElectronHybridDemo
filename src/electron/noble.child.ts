import noble from '@abandonware/noble';
import { MessagePortMain } from 'electron';
import { data } from 'react-router-dom';

const id = new Date().getTime().toString().slice(-4);

const getLogDate = () => {
    const date = new Date();
    return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}.${date.getMilliseconds()}`;
};


const sendStatus = (port: MessagePortMain, cmd: string, data: any, log: string, isError: boolean = false) => {
    console.log(`-----> child-${id.slice()}: ${getLogDate()} | ${cmd} | ${isError ? "ERROR: " : ""} ${log}`);
    
    port.postMessage({ cmd, ...data });
};

process.parentPort.once('message', (e) => {
    if(e.data === 'init') {
        let port = e.ports[0];
        console.log(`-----> child-${id}: ${getLogDate()} | init message received from parent`);
        startPort(port);
    }    
})

const startPort = (port: MessagePortMain) => {
    // Child process
    port.start();
    port.on('message', (e) => {
        console.log(`-----> child-${id}: ${getLogDate()} | message received from parent`, e.data);

        const { cmd, data } = e.data;
        switch (cmd) {
            case 'startScanning':
                noble.startScanningAsync()
                .then(() => {
                    sendStatus(port, cmd, { status: 'ok' }, 'BLE scanning started');
                })
                .catch((error) => {
                    sendStatus(port, cmd, { status: 'error', error: error }, 'Error starting BLE scanning', true);
                });
                break;
            case 'stopScanning':
                noble.stopScanningAsync()
                .then(() => {
                    sendStatus(port, cmd, { status: 'ok' }, 'BLE scanning stopped');
                })
                .catch((error) => {
                    sendStatus(port, cmd, { status: 'error', error: error }, 'Error stopping BLE scanning', true);
                });
                break;
            default:
                console.log(`child-${id.slice()}: ${getLogDate()} | Unknown command: ${cmd}`);
                break;
        }


    })

    noble.on('discover', (peripheral) => {
        port.start();
        sendStatus(port, 'discovery', { 
            data: {
                id: peripheral.id,
                rssi: peripheral.rssi,
                advertisement: {
                    localName: peripheral.advertisement.localName,
                    serviceUuids: peripheral.advertisement.serviceUuids || []
                }
            }
        }, 'Found new peripheral', false);
    })
}
