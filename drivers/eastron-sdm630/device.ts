import { Energymeter } from '../eastron-sdm630';

const RETRY_INTERVAL = 28 * 1000;

// MyDevice class extending Energymeter
module.exports = class MyDevice extends Energymeter {

  timer!: NodeJS.Timeout;

  // onInit is called when the device is initialized.
  async onInit() {
    this.log('MyDevice has been initialized');

    // set energy capability
    this.setEnergy({
      cumulative: true,
      cumulativeImportedCapability: "meter_power.imported"
    }).catch(this.error);

    this.setEnergy({
      cumulative: true,
      cumulativeExportedCapability: "meter_power.exported"
    }).catch(this.error);

    // this.setEnergy({ homeBattery: true });

    // log device info
    const name = this.getData().id;
    this.log(`device name id ${name}`);
    this.log(`device name ${this.getName()}`);

    // Initialize meter_power_import_daily to 0 on app startup
    try {
      if (this.hasCapability('meter_power_import_daily')) {
        await this.setCapabilityValue('meter_power_import_daily', 0);
        this.log('Initialized meter_power_import_daily to 0');
      } else {
        await this.addCapability('meter_power_import_daily');
        await this.setCapabilityValue('meter_power_import_daily', 0);
        this.log('Added and initialized meter_power_import_daily to 0');
      }
      // Clear the baseline and last reset date so they get set correctly when first reading comes in
      this.setStoreValue(Energymeter.STORE_KEY_IMPORT_BASELINE, null);
      this.setStoreValue(Energymeter.STORE_KEY_LAST_RESET_DATE, null);
      this.log('Cleared dailyImportBaseline and lastDailyResetDate to be set from next reading');
    } catch (error) {
      this.error('Error initializing meter_power_import_daily:', error);
    }

    // Initialize meter_power_export_daily to 0 on app startup
    try {
      if (this.hasCapability('meter_power_export_daily')) {
        await this.setCapabilityValue('meter_power_export_daily', 0);
        this.log('Initialized meter_power_export_daily to 0');
      } else {
        await this.addCapability('meter_power_export_daily');
        await this.setCapabilityValue('meter_power_export_daily', 0);
        this.log('Added and initialized meter_power_export_daily to 0');
      }
      // Clear the baseline and last reset date so they get set correctly when first reading comes in
      this.setStoreValue(Energymeter.STORE_KEY_EXPORT_BASELINE, null);
      this.setStoreValue(Energymeter.STORE_KEY_LAST_RESET_DATE, null);
      this.log('Cleared dailyExportBaseline and lastDailyResetDateExport to be set from next reading');
    } catch (error) {
      this.error('Error initializing meter_power_export_daily:', error);
    }


    // set interval to poll device state and poll device
    this.timer = this.homey.setInterval(() => {
      this.pollPowermeter().catch(this.error);
    }, RETRY_INTERVAL);

    // log energy config
    const energyConfig = this.getEnergy();
    this.log(`energyConfig ${JSON.stringify(energyConfig)}`);

    // availability
    //this.setUnavailable(this.homey.__('Device_unavailable')).catch(this.error);
    this.setAvailable().catch(this.error);
  }

  // onAdded is called when the user adds the device, called just after pairing.
  async onAdded() {
    this.log('MyDevice has been added');
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
    this.log("MyDevice settings where changed");
  }

  // onRenamed is called when the user updates the device's name.
  async onRenamed(name: string) {
    this.log('MyDevice was renamed');
  }

  // onDeleted is called when the user deleted the device.
  async onDeleted() {
    this.log('MyDevice has been deleted');
    this.homey.clearInterval(this.timer);
  }

}
