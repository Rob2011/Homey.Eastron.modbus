'use strict';

import Homey from 'homey';

// State passed with every trigger call; the run listener compares it against each flow's delta
type DeltaTriggerState = { deviceId: string; value: number; triggerId: number };
// Last value a flow (identified by card, device and delta) was triggered at
type DeltaRecord = { value: number; triggerId: number; result: boolean };

module.exports = class MyApp extends Homey.App {

  triggerMeterPowerExportDayChanged!: (device: Homey.Device, energy: number) => void;
  triggerMeterPowerImportDayChanged!: (device: Homey.Device, energy: number) => void;
  triggerPowerChanged!: (device: Homey.Device, power: number, powerDelta: number) => void;

  private readonly deltaRecords = new Map<string, DeltaRecord>();
  private nextTriggerId = 0;

  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    this.log('MyApp has been initialized');

    this.registerFlowListeners();

    this.log('Flow triggers registered');
  }

  // Decide whether a flow runs: only when the value moved at least `delta` since that flow last triggered.
  // The first value seen for a flow only sets its starting point (unless delta is 0).
  deltaReached(cardId: string, args: { delta?: number }, state: DeltaTriggerState): boolean {
    const delta = Math.abs(Number(args.delta) || 0);
    const key = `${cardId}:${state.deviceId}:${delta}`;
    const record = this.deltaRecords.get(key);

    // Flows with the same device and delta share a record; decide once per trigger call
    if (record && record.triggerId === state.triggerId) {
      return record.result;
    }

    const result = delta === 0 || (record !== undefined && Math.abs(state.value - record.value) >= delta);
    this.deltaRecords.set(key, {
      value: result || !record ? state.value : record.value,
      triggerId: state.triggerId,
      result,
    });
    return result;
  }

  registerDeltaTrigger(cardId: string) {
    const card = this.homey.flow.getDeviceTriggerCard(cardId);
    card.registerRunListener(async (args, state: DeltaTriggerState) => this.deltaReached(cardId, args, state));

    return (device: Homey.Device, tokens: Record<string, number>, value: number) => {
      const state: DeltaTriggerState = { deviceId: device.getData().id, value, triggerId: this.nextTriggerId++ };
      card.trigger(device, tokens, state).catch(this.error);
    };
  }

  registerFlowListeners() {
    const exportDayChanged = this.registerDeltaTrigger('meter_power_export_day_changed');
    this.triggerMeterPowerExportDayChanged = (device, energy) => {
      exportDayChanged(device, { meter_power_export_daily: energy }, energy);
    };

    const importDayChanged = this.registerDeltaTrigger('meter_power_import_day_changed');
    this.triggerMeterPowerImportDayChanged = (device, energy) => {
      importDayChanged(device, { meter_power_import_daily: energy }, energy);
    };

    const powerChanged = this.registerDeltaTrigger('measure_power_changed');
    this.triggerPowerChanged = (device, power, powerDelta) => {
      powerChanged(device, { power, power_delta: powerDelta }, power);
    };
  }

}
