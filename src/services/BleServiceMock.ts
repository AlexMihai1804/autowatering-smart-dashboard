import { BleFragmentationManager } from './BleFragmentationManager';

export class BleServiceMock {
    connected: boolean = false;

    async initialize() {
        console.log('Mock BLE Service Initialized');
    }

    async scan() {
        console.log('Mock Scanning...');
        return [
            { deviceId: 'MOCK_DEVICE_01', name: 'AutoWatering', rssi: -50 }
        ];
    }

    async connect(deviceId: string) {
        console.log(`Mock Connecting to ${deviceId}...`);
        this.connected = true;
        return Promise.resolve();
    }

    async disconnect(deviceId: string) {
        console.log(`Mock Disconnecting from ${deviceId}...`);
        this.connected = false;
        return Promise.resolve();
    }

    async write(serviceUuid: string, characteristicUuid: string, value: DataView) {
        console.log(`Mock Write to ${characteristicUuid}:`, value);
        return Promise.resolve();
    }

    async read(serviceUuid: string, characteristicUuid: string) {
        console.log(`Mock Read from ${characteristicUuid}`);
        // Return dummy data based on UUID
        return new DataView(new ArrayBuffer(4));
    }

    async startNotifications(serviceUuid: string, characteristicUuid: string, callback: (value: DataView) => void) {
        console.log(`Mock Start Notifications on ${characteristicUuid}`);
        // Simulate notifications
        setInterval(() => {
            if (this.connected) {
                // Send dummy data
                callback(new DataView(new ArrayBuffer(4)));
            }
        }, 1000);
    }
}
