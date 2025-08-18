import { BleManager, Device, State } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform } from 'react-native';
import { Buffer } from 'buffer';
import { 
  TIMETRACKER_SERVICE_UUID, 
  BLE_CHARACTERISTICS,
  TimeTrackerDevice,
  TimeTrackerConfiguration,
  DeviceStatus 
} from '../types/TimeTrackerBLE';

export class TimeTrackerBLEService {
  private manager: BleManager;
  private device: Device | null = null;

  constructor() {
    this.manager = new BleManager();
  }

  // Request BLE permissions (Android)
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        
        return Object.values(granted).every(permission => 
          permission === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (error) {
        console.error('Permission request failed:', error);
        return false;
      }
    }
    return true;
  }

  // Check if Bluetooth is enabled
  async isBluetoothEnabled(): Promise<boolean> {
    const state = await this.manager.state();
    return state === State.PoweredOn;
  }

  // Scan for TimeTracker devices
  async scanForDevices(
    onDeviceFound: (device: TimeTrackerDevice) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    const hasPermissions = await this.requestPermissions();
    if (!hasPermissions) {
      throw new Error('Bluetooth permissions not granted');
    }

    const isEnabled = await this.isBluetoothEnabled();
    if (!isEnabled) {
      throw new Error('Bluetooth is not enabled');
    }

    this.manager.startDeviceScan(
      [TIMETRACKER_SERVICE_UUID],
      { allowDuplicates: false },
      (error, device) => {
        if (error) {
          onError?.(error);
          return;
        }

        if (device && device.name?.startsWith('TimeTracker-')) {
          const timeTrackerDevice: TimeTrackerDevice = {
            id: device.id,
            name: device.name,
            rssi: device.rssi || undefined,
            isConnectable: device.isConnectable || false,
          };
          onDeviceFound(timeTrackerDevice);
        }
      }
    );
  }

  // Stop scanning
  stopScan(): void {
    this.manager.stopDeviceScan();
  }

  // Connect to a device
  async connectToDevice(deviceId: string): Promise<void> {
    try {
      this.device = await this.manager.connectToDevice(deviceId);
      await this.device.discoverAllServicesAndCharacteristics();
      console.log(`Connected to device: ${this.device.name}`);
    } catch (error) {
      throw new Error(`Failed to connect to device: ${error}`);
    }
  }

  // Disconnect from device
  async disconnect(): Promise<void> {
    if (this.device) {
      await this.device.cancelConnection();
      this.device = null;
    }
  }

  // Send configuration to device
  async sendConfiguration(config: TimeTrackerConfiguration): Promise<void> {
    if (!this.device) {
      throw new Error('No device connected');
    }

    try {
      // Send WiFi SSID
      await this.device.writeCharacteristicWithResponseForService(
        TIMETRACKER_SERVICE_UUID,
        BLE_CHARACTERISTICS.WIFI_SSID,
        this.stringToBase64(config.wifi.ssid)
      );

      // Send WiFi Password
      await this.device.writeCharacteristicWithResponseForService(
        TIMETRACKER_SERVICE_UUID,
        BLE_CHARACTERISTICS.WIFI_PASSWORD,
        this.stringToBase64(config.wifi.password)
      );

      // Send Toggl Token
      await this.device.writeCharacteristicWithResponseForService(
        TIMETRACKER_SERVICE_UUID,
        BLE_CHARACTERISTICS.TOGGL_TOKEN,
        this.stringToBase64(config.toggl.apiToken)
      );

      // Send Workspace ID
      await this.device.writeCharacteristicWithResponseForService(
        TIMETRACKER_SERVICE_UUID,
        BLE_CHARACTERISTICS.WORKSPACE_ID,
        this.stringToBase64(config.toggl.workspaceId)
      );

      // Send Project IDs (6 integers as 24-byte array)
      const projectIds = [
        0, // FACE_UP (break time)
        config.projects.faceDown,
        config.projects.leftSide,
        config.projects.rightSide,
        config.projects.frontEdge,
        config.projects.backEdge,
      ];
      
      await this.device.writeCharacteristicWithResponseForService(
        TIMETRACKER_SERVICE_UUID,
        BLE_CHARACTERISTICS.PROJECT_IDS,
        this.projectIdsToBase64(projectIds)
      );

    } catch (error) {
      throw new Error(`Failed to send configuration: ${error}`);
    }
  }

  // Subscribe to status updates
  async subscribeToStatus(
    onStatusUpdate: (status: DeviceStatus) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    if (!this.device) {
      throw new Error('No device connected');
    }

    this.device.monitorCharacteristicForService(
      TIMETRACKER_SERVICE_UUID,
      BLE_CHARACTERISTICS.STATUS,
      (error, characteristic) => {
        if (error) {
          onError?.(error);
          return;
        }

        if (characteristic?.value) {
          const status = this.base64ToString(characteristic.value) as DeviceStatus;
          onStatusUpdate(status);
        }
      }
    );
  }

  // Utility methods
  private stringToBase64(str: string): string {
    return Buffer.from(str, 'utf8').toString('base64');
  }

  private base64ToString(base64: string): string {
    return Buffer.from(base64, 'base64').toString('utf8');
  }

  private projectIdsToBase64(projectIds: number[]): string {
    const buffer = Buffer.alloc(24); // 6 integers * 4 bytes each
    for (let i = 0; i < 6; i++) {
      buffer.writeInt32LE(projectIds[i] || 0, i * 4);
    }
    return buffer.toString('base64');
  }

  // Cleanup
  destroy(): void {
    this.stopScan();
    this.disconnect();
    this.manager.destroy();
  }
}