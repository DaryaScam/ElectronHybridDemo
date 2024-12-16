/**
 * 
 * Ble wrapper for child noble process
 * 
 * Created by Yuriy Ackermann <ackermann.yuriy@gmail.com> <@yackermann>
 * As a part of DaryaScam Project <https://daryascam.info>
 * 
 */

import { app, MessageChannelMain, utilityProcess } from 'electron';
import path from 'path';

const SERVICE_TYPE_HYBRID = 'hybrid';
const SERVICE_TYPE_HYBRID_ISH = 'hybrid-ish';
interface IPResponse {
    cmd: string;
    data: any;
    error: string;
}

export interface Peripheral {
    type: string;
    id: string;
    advertisement: {
        localName: string;
        serviceUuids: string[];
        serviceData: string;
    };
}

const getLogDate = () => {
    const date = new Date();
    return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}.${date.getMilliseconds()}`;
};

const HYBRID_SERVICE_UUID = '0000fff9-0000-1000-8000-00805f9b34fb';
const HYBRID_ISH_SERVICE_PREFIX = 'f1d0c7a4';

const serviceListIncludesHybridService = (serviceList: string[]): string | undefined => {
    let formattedServiceList = serviceList.map((service) => service.toLowerCase().replace(/-/g, ''));
    let formattedHybridService = HYBRID_SERVICE_UUID.toLowerCase().replace(/-/g, '');
    let formattedIshPrefix = HYBRID_ISH_SERVICE_PREFIX.toLowerCase();

    if(formattedServiceList.length === 0) {
        return
    }

    if(formattedServiceList.includes(formattedHybridService)) {
        return SERVICE_TYPE_HYBRID;
    }

    if(formattedServiceList.length === 3 && formattedServiceList[0].startsWith(formattedIshPrefix)) {
        return SERVICE_TYPE_HYBRID_ISH;
    }    
}


export const extractServiceData = (peripheralResp: Peripheral): Buffer => {
    if(peripheralResp.type === SERVICE_TYPE_HYBRID) {
        return Buffer.from(peripheralResp.advertisement.serviceData, 'hex');
    } else if(peripheralResp.type === SERVICE_TYPE_HYBRID_ISH) {
        const serviceData = peripheralResp.advertisement.serviceUuids.join('')
        
        
        return Buffer.from(serviceData.substring(HYBRID_ISH_SERVICE_PREFIX.length), 'hex');
    } else {
        throw new Error('Unknown service type');
    }
}

export class BleSession {

    childProcess: any;
    callbackRegistry: Map<string, (data: IPResponse) => void> = new Map();
    port1: Electron.MessagePortMain;
    port2: Electron.MessagePortMain;

    constructor() {
        const { port1, port2 } = new MessageChannelMain()
        this.port1 = port1;
        this.port2 = port2;
        
        this.childProcess = utilityProcess.fork(path.join(app.getAppPath(), './dist-electron/', 'noble.child.js'));
        this.childProcess.postMessage('init', [this.port2]);
        
        this.port1.start();
        this.port1.on('message', (e) => {
            let {cmd, error, data } = e.data;

            if(cmd !== 'discovery') {
                console.log(`<----- parent: ${getLogDate()} | ${cmd} | ${error ? 'ERROR: ' : 'OK'}`);
            }

            let callback = this.callbackRegistry.get(cmd);
            if (callback) {
                callback({ cmd, data, error });
            } else if (cmd !== 'discovery') {
                console.log('No callback registered for', cmd);
            }
        })

        this.childProcess.on('spawn', () => {
            console.log(`Spawning... ${this.childProcess.pid}`) // undefined
        })
        
        this.childProcess.on('exit', () => {
            console.log(`Exiting... ${this.childProcess.pid}`) // undefined
        })
    }

    subscribeToEvent(eventName: string, callback: (data: any) => void) {
        this.callbackRegistry.set(eventName, callback);
    }

    deregisterEvent(eventName: string) {
        this.callbackRegistry.delete(eventName);
    }

    async sendAndAwaitResponse(cmd: string, data: any, timeout: number = 1000): Promise<IPResponse> {
        return new Promise((resolve, reject) => {
            let timeouter = setTimeout(() => {
                reject('Timeout');
                this.deregisterEvent(cmd);
            }, timeout);

            this.subscribeToEvent(cmd, (result: IPResponse) => {
                clearTimeout(timeouter);

                if (result?.error) {
                    reject(result.error);
                }
                
                resolve(result);
            });

            this.port1.postMessage({ cmd, data });
        });
    }
    
    async startScanning(timeout: number = 1000): Promise<void> {
        let result = await this.sendAndAwaitResponse('startScanning', {}, timeout)
        if (result.error) {
            throw new Error(result.error);
        }

        return;
    }

    async stopScanning() {
        let result = await this.sendAndAwaitResponse('stopScanning', {})
        if (result.error) {
            throw new Error(result.error);
        }

        return;
    }

    subscribeToDiscovery(callback: (peripheral: Peripheral) => void) {
        this.subscribeToEvent('discovery', (result: IPResponse) => {
            if (result.error) {
                throw new Error(result.error);
            }

            callback(result.data);
        });
    }

    async findHybridPeripheral(timeout: number = 1000): Promise<Peripheral> {
        return new Promise((resolve, reject) => {
            const timeouter = setTimeout(() => {
                reject('Timeout');
                this.unSubscribeToDiscovery();
            }, timeout);

            this.subscribeToDiscovery((peripheral: any) => {
                if(peripheral.rssi > -55){
                    const serviceType = serviceListIncludesHybridService(peripheral.advertisement.serviceUuids);
                    if(serviceType) {
                        peripheral.type = serviceType;
                        this.stopScanning();
                        clearTimeout(timeouter);
                        resolve(peripheral);
                    }
                }
            });

            this.startScanning(timeout)
            .catch((error) => {
                clearTimeout(timeouter);
                reject(error);
            });


            clearTimeout(timeouter);
        });
    }

    unSubscribeToDiscovery() {
        this.deregisterEvent('discovery');
    }
    
    destroy() {
        this.childProcess.kill();
    }
}
