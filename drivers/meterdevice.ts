import { Powermeter } from './energymeter';

// Store keys for the daily import/export calculation (shared with the meter classes)
export const STORE_KEY_LAST_RESET_DATE = 'lastDailyResetDate';
export const STORE_KEY_LAST_RESET_DATE_EXPORT = 'lastDailyResetDateExport';
export const STORE_KEY_EXPORT_BASELINE = 'dailyExportBaseline';
export const STORE_KEY_IMPORT_BASELINE = 'dailyImportBaseline';

const DEFAULT_POLLING_INTERVAL = 20 * 1000;

type DeviceSettings = { [key: string]: boolean | string | number | undefined | null };
type PowermeterClass = new (...args: any[]) => Powermeter;

// Flow trigger helpers registered by app.ts
interface FlowTriggerApp {
  triggerPowerChanged(device: Powermeter, power: number, powerDelta: number): void;
  triggerMeterPowerImportDayChanged(device: Powermeter, energy: number): void;
  triggerMeterPowerExportDayChanged(device: Powermeter, energy: number): void;
}

// Adds the device lifecycle (polling, daily reset, settings handling) shared by all Eastron drivers
// to a meter class. Usage in a driver's device.ts:
//   module.exports = class MyDevice extends createMeterDevice(Energymeter, 'SDM630') {};
export function createMeterDevice<TBase extends PowermeterClass>(Base: TBase, modelName: string) {
  return class MeterDevice extends Base {

    timer?: NodeJS.Timeout;

    // Every capability update from processResult / calculateDailyPower passes through here,
    // so the flow triggers fire for all meter models when their value changes
    async setCapabilityValue(capabilityId: string, value: any): Promise<void> {
      const previous = this.hasCapability(capabilityId) ? this.getCapabilityValue(capabilityId) : null;
      await super.setCapabilityValue(capabilityId, value);
      if (typeof value === 'number' && value !== previous) {
        this.fireFlowTrigger(capabilityId, value, typeof previous === 'number' ? previous : null);
      }
    }

    fireFlowTrigger(capabilityId: string, value: number, previous: number | null) {
      const app = this.homey.app as unknown as FlowTriggerApp;
      switch (capabilityId) {
        case 'measure_power':
          app.triggerPowerChanged(this, value, previous === null ? 0 : value - previous);
          break;
        case 'meter_power_import_daily':
          app.triggerMeterPowerImportDayChanged(this, value);
          break;
        case 'meter_power_export_daily':
          app.triggerMeterPowerExportDayChanged(this, value);
          break;
        default:
          break;
      }
    }

    // Helper method to get polling interval from settings
    getPollingInterval(): number {
      const intervalSeconds = this.getSetting('polling_interval');
      if (!intervalSeconds || typeof intervalSeconds !== 'number') {
        this.log(`Invalid polling interval, using default: ${DEFAULT_POLLING_INTERVAL / 1000} seconds`);
        return DEFAULT_POLLING_INTERVAL;
      }
      return intervalSeconds * 1000;
    }

    // Helper method to restart polling with new interval
    restartPolling() {
      if (this.timer) {
        this.homey.clearInterval(this.timer);
      }

      const interval = this.getPollingInterval();
      this.timer = this.homey.setInterval(() => {
        this.pollPowermeter().catch(this.error);
      }, interval);

      this.log(`Polling timer started with ${interval / 1000} second interval`);
    }

    stopPolling() {
      if (this.timer) {
        this.homey.clearInterval(this.timer);
        this.timer = undefined;
      }
    }

    // Helper method to check if we're on a new day for a specific type
    shouldResetDaily(type: 'import' | 'export'): boolean {
      const resetDateKey = type === 'import' ? STORE_KEY_LAST_RESET_DATE : STORE_KEY_LAST_RESET_DATE_EXPORT;
      const lastResetDate = this.getStoreValue(resetDateKey);

      if (!lastResetDate) {
        return true; // First run, allow reset
      }

      const lastReset = new Date(lastResetDate);
      const now = new Date();

      // Compare dates at midnight local time
      const lastMidnight = new Date(lastReset.getFullYear(), lastReset.getMonth(), lastReset.getDate());
      const currentMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      return currentMidnight.getTime() > lastMidnight.getTime();
    }

    // Reset the daily capability and its baseline when a new day started while the device was offline
    async initDailyCapability(type: 'import' | 'export') {
      const capability = `meter_power_${type}_daily`;
      const baselineKey = type === 'import' ? STORE_KEY_IMPORT_BASELINE : STORE_KEY_EXPORT_BASELINE;
      const resetDateKey = type === 'import' ? STORE_KEY_LAST_RESET_DATE : STORE_KEY_LAST_RESET_DATE_EXPORT;

      try {
        if (!this.hasCapability(capability)) {
          await this.addCapability(capability);
          this.log(`Added ${capability} capability`);
        }

        if (this.shouldResetDaily(type)) {
          await this.setCapabilityValue(capability, 0);
          await this.setStoreValue(baselineKey, null);
          await this.setStoreValue(resetDateKey, null);
          this.log(`New day: Reset ${capability} to 0 and cleared baseline`);
        } else {
          this.log(`Same day: Keeping ${capability} at ${this.getCapabilityValue(capability) || 0}`);
        }
      } catch (error) {
        this.error(`Error initializing ${capability}:`, error);
      }
    }

    // onInit is called when the device is initialized.
    async onInit() {
      this.log(`${modelName} Device has been initialized: ${this.getName()} (${this.getData().id})`);

      await this.setEnergy({
        cumulative: true,
        cumulativeImportedCapability: 'meter_power.imported',
        cumulativeExportedCapability: 'meter_power.exported',
      }).catch(this.error);

      await this.initDailyCapability('import');
      await this.initDailyCapability('export');

      // Start polling with configured interval and read the meter right away
      this.restartPolling();
      this.pollPowermeter().catch(this.error);
    }

    // onAdded is called when the user adds the device, called just after pairing.
    async onAdded() {
      this.log(`${modelName} Device has been added`);
    }

    // onSettings is called when the user updates the device's settings (before they are saved).
    async onSettings({
      oldSettings,
      newSettings,
      changedKeys,
    }: {
      oldSettings: DeviceSettings;
      newSettings: DeviceSettings;
      changedKeys: string[];
    }): Promise<string | void> {
      this.log(`${modelName} Device settings were changed:`, changedKeys);

      const intervalChanged = changedKeys.includes('polling_interval');
      const connectionChanged = ['address', 'port', 'id'].some((key) => changedKeys.includes(key));
      if (intervalChanged) {
        this.log(`Polling interval changed from ${oldSettings.polling_interval} to ${newSettings.polling_interval} seconds`);
      }

      if (intervalChanged || connectionChanged) {
        // Settings are stored after this method returns; apply them shortly afterwards
        this.homey.setTimeout(() => {
          if (intervalChanged) {
            this.restartPolling();
          }
          if (connectionChanged) {
            this.pollPowermeter().catch(this.error);
          }
        }, 100);
      }
    }

    // onRenamed is called when the user updates the device's name.
    async onRenamed(name: string) {
      this.log(`${modelName} Device was renamed to ${name}`);
    }

    // onUninit is called when the app is stopped or restarted.
    async onUninit() {
      this.stopPolling();
    }

    // onDeleted is called when the user deleted the device.
    async onDeleted() {
      this.log(`${modelName} Device has been deleted`);
      this.stopPolling();
    }
  };
}
