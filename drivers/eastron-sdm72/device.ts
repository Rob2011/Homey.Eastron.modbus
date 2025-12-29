import { Energymeter } from '../eastron-sdm72';

const DEFAULT_RETRY_INTERVAL = 20 * 1000; // Default 28 seconds

// SDM72D-M-2 Device class extending Energymeter
module.exports = class MyDevice extends Energymeter {

  timer!: NodeJS.Timeout;

  // Helper method to get polling interval from settings
  private getPollingInterval(): number {
    const intervalSeconds = this.getSetting('polling_interval');
    this.log(`Getting polling interval from settings: ${intervalSeconds}`);
    
    if (!intervalSeconds || typeof intervalSeconds !== 'number') {
      this.log(`Invalid polling interval, using default: 28 seconds`);
      return 20 * 1000;
    }
    
    const intervalMs = intervalSeconds * 1000;
    this.log(`Polling interval: ${intervalSeconds} seconds = ${intervalMs}ms`);
    return intervalMs;
  }

  // Helper method to restart polling with new interval
  private restartPolling() {
    // Clear existing timer
    if (this.timer) {
      this.log('Clearing existing polling timer');
      this.homey.clearInterval(this.timer);
    }

    // Get interval from settings
    const intervalSeconds = this.getSetting('polling_interval');
    const interval = this.getPollingInterval();
    this.log(`Restarting polling - Setting value: ${intervalSeconds} seconds, Calculated interval: ${interval}ms`);

    // Set new interval
    this.timer = this.homey.setInterval(() => {
      const now = new Date();
      this.log(`[${now.toISOString()}] Polling triggered by interval (every ${interval / 1000}s)`);
      this.pollPowermeter().catch(this.error);
    }, interval);
    
    this.log(`Polling timer restarted with ${interval / 1000} second interval`);
  }

  // Helper method to check if we're on a new day for a specific type
  private shouldResetDaily(type: 'import' | 'export'): boolean {
    const resetDateKey = type === 'import' 
      ? Energymeter.STORE_KEY_LAST_RESET_DATE 
      : Energymeter.STORE_KEY_LAST_RESET_DATE_EXPORT;
      
    const lastResetDate = this.getStoreValue(resetDateKey);
    
    if (!lastResetDate) {
      return true;
    }
    
    const lastReset = new Date(lastResetDate);
    const now = new Date();
    
    const lastMidnight = new Date(lastReset.getFullYear(), lastReset.getMonth(), lastReset.getDate());
    const currentMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return currentMidnight.getTime() > lastMidnight.getTime();
  }

  // onInit is called when the device is initialized.
  async onInit() {
    this.log('SDM72D-M-2 Device has been initialized');

      this.setEnergy({
        cumulative: true,
        cumulativeExportedCapability: "meter_power.exported",
        cumulativeImportedCapability: "meter_power.imported"
      }).catch(this.error);

    // log device info
    const name = this.getData().id;
    this.log(`device name id ${name}`);
    this.log(`device name ${this.getName()}`);

    // Check if we should reset daily values for import
    const shouldResetImport = this.shouldResetDaily('import');
    this.log(`Should reset import daily values: ${shouldResetImport}`);

    // Initialize meter_power_import_daily
    try {
      if (!this.hasCapability('meter_power_import_daily')) {
        await this.addCapability('meter_power_import_daily');
        this.log('Added meter_power_import_daily capability');
      }
      
      if (shouldResetImport) {
        await this.setCapabilityValue('meter_power_import_daily', 0);
        this.setStoreValue(Energymeter.STORE_KEY_IMPORT_BASELINE, null);
        this.setStoreValue(Energymeter.STORE_KEY_LAST_RESET_DATE, null);
        this.log('New day: Reset meter_power_import_daily to 0 and cleared baseline');
      } else {
        const currentValue = this.getCapabilityValue('meter_power_import_daily') || 0;
        this.log(`Same day: Keeping meter_power_import_daily at ${currentValue}`);
      }
    } catch (error) {
      this.error('Error initializing meter_power_import_daily:', error);
    }

    // Check if we should reset daily values for export
    const shouldResetExport = this.shouldResetDaily('export');
    this.log(`Should reset export daily values: ${shouldResetExport}`);

    // Initialize meter_power_export_daily
    try {
      if (!this.hasCapability('meter_power_export_daily')) {
        await this.addCapability('meter_power_export_daily');
        this.log('Added meter_power_export_daily capability');
      }
      
      if (shouldResetExport) {
        await this.setCapabilityValue('meter_power_export_daily', 0);
        this.setStoreValue(Energymeter.STORE_KEY_EXPORT_BASELINE, null);
        this.setStoreValue(Energymeter.STORE_KEY_LAST_RESET_DATE_EXPORT, null);
        this.log('New day: Reset meter_power_export_daily to 0 and cleared baseline');
      } else {
        const currentValue = this.getCapabilityValue('meter_power_export_daily') || 0;
        this.log(`Same day: Keeping meter_power_export_daily at ${currentValue}`);
      }
    } catch (error) {
      this.error('Error initializing meter_power_export_daily:', error);
    }

    // Start polling with configured interval
    this.restartPolling();
    this.log(`[${new Date().toISOString()}] Polling triggered by interval`);
      
    // log energy config
    const energyConfig = this.getEnergy();
    this.log(`energyConfig ${JSON.stringify(energyConfig)}`);

    // availability
    this.setAvailable().catch(this.error);
  }

  // onAdded is called when the user adds the device, called just after pairing.
  async onAdded() {
    this.log('SDM72D-M-2 Device has been added');
  }

  // onSettings is called when the user updates the device's settings.
  async onSettings({
    oldSettings,
    newSettings,
    changedKeys,
  }: {
    oldSettings: { [key: string]: boolean | string | number | undefined | null };
    newSettings: { [key: string]: boolean | string | number | undefined | null };
    changedKeys: string[];
  }): Promise<string | void> {
    this.log("SDM72D-M-2 Device settings were changed");
    this.log("Changed keys:", changedKeys);
    this.log("Old settings:", oldSettings);
    this.log("New settings:", newSettings);
    
    // If polling interval was changed, restart polling with new interval
    if (changedKeys.includes('polling_interval')) {
      this.log(`Polling interval changed from ${oldSettings.polling_interval} to ${newSettings.polling_interval} seconds`);
      
      // Wait a bit to ensure settings are saved
      await this.homey.setTimeout(async () => {
        this.restartPolling();
      }, 100);
    }
    
    // If connection settings changed, you might want to poll immediately
    if (changedKeys.includes('address') || changedKeys.includes('port') || changedKeys.includes('id')) {
      this.log("Connection settings changed, will use new settings on next poll");
    }
  }

  // onRenamed is called when the user updates the device's name.
  async onRenamed(name: string) {
    this.log('SDM72D-M-2 Device was renamed');
  }

  // onDeleted is called when the user deleted the device.
  async onDeleted() {
    this.log('SDM72D-M-2 Device has been deleted');
    this.homey.clearInterval(this.timer);
  }

}
