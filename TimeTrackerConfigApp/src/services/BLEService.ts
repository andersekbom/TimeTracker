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
  private static instance: TimeTrackerBLEService | null = null;
  private manager: BleManager;
  private device: Device | null = null;
  private connectionStateCallbacks: ((connected: boolean, deviceName?: string) => void)[] = [];
  private isDestroyed = false;

  private constructor() {
    this.manager = new BleManager();
  }

  // Singleton pattern to prevent multiple BLE managers
  static getInstance(): TimeTrackerBLEService {
    if (!TimeTrackerBLEService.instance) {
      TimeTrackerBLEService.instance = new TimeTrackerBLEService();
    }
    return TimeTrackerBLEService.instance;
  }

  // Connection state management
  onConnectionStateChange(callback: (connected: boolean, deviceName?: string) => void): void {
    this.connectionStateCallbacks.push(callback);
  }

  // Remove a specific callback (for cleanup)
  removeConnectionStateCallback(callback: (connected: boolean, deviceName?: string) => void): void {
    const index = this.connectionStateCallbacks.indexOf(callback);
    if (index > -1) {
      this.connectionStateCallbacks.splice(index, 1);
    }
  }

  private notifyConnectionStateChange(connected: boolean, deviceName?: string): void {
    this.connectionStateCallbacks.forEach(callback => callback(connected, deviceName));
  }

  // Check if currently connected to a device
  isConnected(): boolean {
    return this.device !== null;
  }

  // Get connected device info
  getConnectedDevice(): { id: string; name: string } | null {
    if (!this.device) return null;
    return {
      id: this.device.id,
      name: this.device.name || 'Unknown Device'
    };
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
      // Stop scanning first
      this.stopScan();
      
      // Connect to device
      this.device = await this.manager.connectToDevice(deviceId);
      
      // Set up disconnect monitoring
      this.device.onDisconnected((error, device) => {
        console.log(`Device ${device?.name} disconnected:`, error);
        this.device = null;
        this.notifyConnectionStateChange(false);
      });
      
      // Discover services and characteristics
      await this.device.discoverAllServicesAndCharacteristics();
      console.log(`Connected to device: ${this.device.name}`);
      
      // Notify connection state change
      this.notifyConnectionStateChange(true, this.device.name || undefined);
      
    } catch (error) {
      this.device = null;
      this.notifyConnectionStateChange(false);
      throw new Error(`Failed to connect to device: ${error}`);
    }
  }

  // Disconnect from device
  async disconnect(): Promise<void> {
    if (this.device) {
      try {
        await this.device.cancelConnection();
      } catch (error) {
        console.warn('Error during disconnect:', error);
      } finally {
        this.device = null;
        this.notifyConnectionStateChange(false);
      }
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

  // Cleanup (but don't actually destroy singleton)
  destroy(): void {
    // Don't destroy the singleton or disconnect active connections
    // Only stop scanning to save battery
    this.stopScan();
    // Don't disconnect - let connections persist across screens
    // Don't clear callbacks - they need to persist too
  }

  // Force destroy the singleton (use carefully)
  static destroyInstance(): void {
    if (TimeTrackerBLEService.instance) {
      TimeTrackerBLEService.instance.stopScan();
      TimeTrackerBLEService.instance.disconnect();
      TimeTrackerBLEService.instance.manager.destroy();
      TimeTrackerBLEService.instance.isDestroyed = true;
      TimeTrackerBLEService.instance = null;
    }
  }
}