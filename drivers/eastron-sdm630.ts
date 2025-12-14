import * as Homey from 'homey';
import { Powermeter, RegisterDefinition } from './energymeter';

export interface Measurement {
  value: string;
  scale: string;
  label: string;
}

interface EnergymeterData {
  value: string;
  scale?: string;
}

interface CapabilityMapping {
  resultKey: string;
  capabilities: string[];
  valid?: (data: EnergymeterData) => boolean;
  transform?: (data: EnergymeterData) => string | number | null;
  requireCapabilityCheck?: boolean;
}

// Constants for invalid values
export const INVALID_VALUE = 'xxx';
export const INVALID_NUMERIC_VALUE = '-1';

// Eastron Energymeter Device Class
export class Energymeter extends Powermeter {

  readonly holdingRegistersBase: { [key: string]: RegisterDefinition } = {
    // meter_serial: [256, 4, 'UINT32', 'Serial number', 0],
    /*
    464513 32257 Serial number FC 00 Serial number Length: 4 byte Data Format: unsigned int32 Note: Only read
    464515 32258 Meter code FC 02 Meter code = 00 70 Length: 2 bytes Data Format: Hex
    */
  };

  // Register definitions
  registers: { [key: string]: RegisterDefinition } = {
    l1_current: [6, 2, 'FLOAT32', 'Phase 1 Current', 0],
    l2_current: [8, 2, 'FLOAT32', 'Phase 2 Current', 0],
    l3_current: [10, 2, 'FLOAT32', 'Phase 3 Current', 0],

    l1_voltage: [0, 2, 'FLOAT32', 'Phase 1 Voltage', 0],
    l2_voltage: [2, 2, 'FLOAT32', 'Phase 2 Voltage', 0],
    l3_voltage: [4, 2, 'FLOAT32', 'Phase 3 Voltage', 0],

    l1_power: [12, 2, 'FLOAT32', 'Phase 1 Power', 0],
    l2_power: [14, 2, 'FLOAT32', 'Phase 2 Power', 0],
    l3_power: [16, 2, 'FLOAT32', 'Phase 3 Power', 0],

   // l1_powerVA: [18, 2, 'FLOAT32', 'Phase 1 Apparent Power', 0],
   // l2_powerVA: [20, 2, 'FLOAT32', 'Phase 2 Apparent Power', 0],
   // l3_powerVA: [22, 2, 'FLOAT32', 'Phase 3 Apparent Power', 0],

   // l1_powerVAr: [24, 2, 'FLOAT32', 'Phase 1 Reactive Power', 0],
   // l2_powerVAr: [26, 2, 'FLOAT32', 'Phase 2 Reactive Power', 0],
   // l3_powerVAr: [28, 2, 'FLOAT32', 'Phase 3 Reactive Power', 0],

   // l1_powerfact: [30, 2, 'FLOAT32', 'Phase 1 Power Factor', 0],
   // l2_powerfact: [32, 2, 'FLOAT32', 'Phase 2 Power Factor', 0],
   // l3_powerfact: [34, 2, 'FLOAT32', 'Phase 3 Power Factor', 0],

   // l1_angle: [36, 2, 'FLOAT32', 'Phase 1 Phase Angle', 0],
   // l2_angle: [38, 2, 'FLOAT32', 'Phase 2 Phase Angle', 0],
   // l3_angle: [40, 2, 'FLOAT32', 'Phase 3 Phase Angle', 0],

   // avglinevolt: [42, 2, 'FLOAT32', 'Average L-N Voltage', 0],
   // avglineamp: [46, 2, 'FLOAT32', 'Average Line Current', 0],
    sumlineamp: [48, 2, 'FLOAT32', 'Sum of Line Currents', 0],

    totsyspower: [52, 2, 'FLOAT32', 'Total System Power', 0],
    totsyspowerVA: [56, 2, 'FLOAT32', 'System Apparent Power', 0],
    totsyspowerVAr: [60, 2, 'FLOAT32', 'Total System Reactive Power', 0],
    totpowerfact: [62, 2, 'FLOAT32', 'Total Power Factor', 0],
    totangle: [66, 2, 'FLOAT32', 'Total Phase Angle', 0],

    gridFrequency: [70, 2, 'FLOAT32', 'Frequency of supply voltages', 0],

    totalImEnergy: [72, 2, 'FLOAT32', 'Total Import Energy', 0],
    totalExEnergy: [74, 2, 'FLOAT32', 'Total Export Energy', 0],

    /*. below registers not implemented yet
    totalImEnergyVAr: [76, 2, 'FLOAT32', 'Total Import Reactive Energy', 0],
    totalExEnergyVAr: [78, 2, 'FLOAT32', 'Total Import Reactive Energy', 0],
    totalVAh: [80, 2, 'FLOAT32', 'Total Apparent Energy', 0],
    totalAh: [82, 2, 'FLOAT32', 'Total Current', 0],
    totalsysdemand: [84, 2, 'FLOAT32', 'Total System Power Demand', 0],
    maxsysdemand: [86, 2, 'FLOAT32', 'Maximum Total System Power Demand', 0],
    totalsysVAdemand: [100, 2, 'FLOAT32', 'Total System VA Demand', 0],
    maxsysVAdemand: [102, 2, 'FLOAT32', 'Maximum Total System VA Demand', 0],
    neutraldemandA: [104, 2, 'FLOAT32', 'Neutral Current demand', 0],
    maxneutraldemandA: [106, 2, 'FLOAT32', 'Maximum Neutral Current demand', 0],
    line1_2volt: [200, 2, 'FLOAT32', 'Line 1 to Line 2 Voltage', 0],
    line2_3volt: [202, 2, 'FLOAT32', 'Line 2 to Line 3 Voltage', 0],
    line3_1volt: [204, 2, 'FLOAT32', 'Line 3 to Line 1 Voltage', 0],
    avglinel_lvolt: [206, 2, 'FLOAT32', 'Average L-L Voltage', 0],
    neutralcurrent: [224, 2, 'FLOAT32', 'Neutral Current', 0],
    totalkwh: [342, 2, 'FLOAT32', 'Total kwh(3)', 0],
    totalkvar: [344, 2, 'FLOAT32', 'Total kvarh(3)', 0],
    l1_importkwh: [346, 2, 'FLOAT32', 'L1 import kwh', 0],
    l2_importkwh: [348, 2, 'FLOAT32', 'L2 import kwh', 0],
    l3_importkwh: [350, 2, 'FLOAT32', 'L3 import kwh', 0],
    l1_exportkwh: [352, 2, 'FLOAT32', 'L1 export kWh', 0],
    l2_exportkwh: [354, 2, 'FLOAT32', 'L2 export kWh', 0],
    l3_exportkwh: [356, 2, 'FLOAT32', 'L3 export kWh', 0],
    total_l1_kwh: [358, 2, 'FLOAT32', 'L1 total kwh(3)', 0],
    total_l2_kwh: [360, 2, 'FLOAT32', 'L2 total kwh(3)', 0],
    total_l3_kwh: [362, 2, 'FLOAT32', 'L3 total kwh(3)', 0],
    net_kwh: [396, 2, 'FLOAT32', 'Net kWh kWh', 0],
    */

  };

  // Capability mappings
  readonly CapabilityMappings: CapabilityMapping[] = [
    {
      resultKey: 'totsyspower',
      capabilities: ['measure_power'],
      valid: Energymeter.createValidator(),
      transform: Energymeter.createTransform(true),
    },
    {
      resultKey: 'l1_power',
      capabilities: ['meter_l1_power'],
      valid: Energymeter.createValidator(),
      transform: Energymeter.createTransform(true),
    },
    {
      resultKey: 'l2_power',
      capabilities: ['meter_l2_power'],
      valid: Energymeter.createValidator(),
      transform: Energymeter.createTransform(true),
    },
    {
      resultKey: 'l3_power',
      capabilities: ['meter_l3_power'],
      valid: Energymeter.createValidator(),
      transform: Energymeter.createTransform(true),
    },
    {
      resultKey: 'l1_current',
      capabilities: ['meter_l1_current'],
      valid: Energymeter.createValidator(true),
      transform: Energymeter.createTransform(),
    },
    {
      resultKey: 'l2_current',
      capabilities: ['meter_l2_current'],
      valid: Energymeter.createValidator(true),
      transform: Energymeter.createTransform(),
    },
    {
      resultKey: 'l3_current',
      capabilities: ['meter_l3_current'],
      valid: Energymeter.createValidator(true),
      transform: Energymeter.createTransform(),
    },
    {
      resultKey: 'sumlineamp',
      capabilities: ['meter_current'],
      valid: Energymeter.createValidator(true),
      transform: Energymeter.createTransform(),
    },
    {
      resultKey: 'l1_voltage',
      capabilities: ['meter_l1_voltage'],
      valid: Energymeter.createValidator(true),
      transform: Energymeter.createTransform(),
    },
    {
      resultKey: 'l2_voltage',
      capabilities: ['meter_l2_voltage'],
      valid: Energymeter.createValidator(true),
      transform: Energymeter.createTransform(),
    },
    {
      resultKey: 'l3_voltage',
      capabilities: ['meter_l3_voltage'],
      valid: Energymeter.createValidator(true),
      transform: Energymeter.createTransform(),
    },
    {
      resultKey: 'totpowerfact',
      capabilities: ['measure_tot_power_factor'],
      valid: Energymeter.createValidator(),
      transform: Energymeter.createTransform(),
    },
    // Note: totalEnergy register doesn't exist - this mapping will be skipped
    // If you need measure_power, consider using totsyspower or another existing register
    {
      resultKey: 'totalEnergy',
      capabilities: ['measure_power'],
      valid: Energymeter.createValidator(),
      transform: Energymeter.createTransform(),
    },
    {
      resultKey: 'totangle',
      capabilities: ['measure_tot_phase_angle'],
      valid: Energymeter.createValidator(),
      transform: Energymeter.createTransform(),
    },
    {
      resultKey: 'totalImEnergy',
      capabilities: ['meter_power.imported'],
      valid: Energymeter.createValidator(),
      transform: Energymeter.createTransform(),
    },
    {
      resultKey: 'totalExEnergy',
      capabilities: ['meter_power.exported'],
      valid: Energymeter.createValidator(),
      transform: Energymeter.createTransform(),
    },
    {
      resultKey: 'gridFrequency',
      capabilities: ['meter_frequency'],
      valid: Energymeter.createValidator(),
      transform: Energymeter.createTransform(),
    },
  ];

  // Constants for daily calculation
  protected static readonly STORE_KEY_LAST_RESET_DATE = 'lastDailyResetDate';
  protected static readonly STORE_KEY_EXPORT_BASELINE = 'dailyExportBaseline';
  protected static readonly STORE_KEY_IMPORT_BASELINE = 'dailyImportBaseline';

  // Helper function to create a standard transform function
  private static createTransform(round: boolean = false): (data: EnergymeterData) => number {
    return (data: EnergymeterData) => {
      const value = Number(data.value) * Math.pow(10, Number(data.scale || 0));
      return round ? Math.round(value) : value;
    };
  }

  // Helper function to create a standard validation function
  private static createValidator(includeNumericCheck: boolean = false): (data: EnergymeterData) => boolean {
    return (data: EnergymeterData) => {
      const isValid = data.value !== INVALID_VALUE;
      if (!isValid) return false;
      if (includeNumericCheck) {
        return data.value !== INVALID_NUMERIC_VALUE;
      }
      return true;
    };
  }

  // Converts a measurement value to its base unit (applies scale conversion)
  private convertMeasurement(measurement: Measurement): number {
    return Number(measurement.value) * Math.pow(10, Number(measurement.scale));
  }

  // Checks if the current date is different from the last reset date
  private isNewDay(lastResetDate: string | null, currentDate: Date): boolean {
    if (lastResetDate == null) {
      return true;
    }
    const lastReset = new Date(lastResetDate);
    return (
      currentDate.getFullYear() !== lastReset.getFullYear() ||
      currentDate.getMonth() !== lastReset.getMonth() ||
      currentDate.getDate() !== lastReset.getDate()
    );
  }

  // Calculates and updates daily power (export or import)
  private async calculateDailyPower(
    measurement: Measurement,
    capabilityName: string,
    baselineStoreKey: string,
    type: 'export' | 'import',
  ): Promise<void> {
    try {
      const total = this.convertMeasurement(measurement);
      const currentDate = new Date();
      const lastResetDate = this.getStoreValue(Energymeter.STORE_KEY_LAST_RESET_DATE);
      const dailyBaseline = this.getStoreValue(baselineStoreKey);

      // Ensure capability exists
      if (!this.hasCapability(capabilityName)) {
        await this.addCapability(capabilityName);
      }

      // Check if we need to reset (new day detected)
      const shouldReset = this.isNewDay(lastResetDate, currentDate);

      if (shouldReset) {
        this.log(`Daily reset: new day detected, setting ${type} baseline to`, total);
        this.setStoreValue(baselineStoreKey, total);
        this.setStoreValue(Energymeter.STORE_KEY_LAST_RESET_DATE, currentDate.toISOString());
        // On new day, daily value starts at 0
        await this.setCapabilityValue(capabilityName, 0);
      } else if (dailyBaseline != null) {
        // Calculate daily value: current total minus baseline from start of day
        const dailyPower = Number((total - dailyBaseline).toFixed(2));
        this.log(`Daily ${type}: ${dailyPower} (total: ${total}, baseline: ${dailyBaseline})`);

        // Only update if value changed (to avoid unnecessary updates)
        const currentDailyValue = this.getCapabilityValue(capabilityName);
        if (currentDailyValue !== dailyPower) {
          // Ensure value is not negative (shouldn't happen, but safety check)
          const finalValue = dailyPower > 0 ? dailyPower : 0;
          await this.setCapabilityValue(capabilityName, finalValue);
        }
      }
    } catch (error) {
      this.error(`Error calculating daily power ${type}:`, error);
    }
  }

  // Helper method to get mapping and register definition
  getMappingAndRegister(
    capability: string,
    holdingRegisters: { [key: string]: RegisterDefinition },
  ): { mapping: CapabilityMapping; registerDefinition: RegisterDefinition } | null {
    const mapping = this.CapabilityMappings.find((m) => m.capabilities.includes(capability));
    if (!mapping) {
      this.log(`Mapping not found for capability: ${capability}`);
      return null;
    }
    const registerDefinition = holdingRegisters[mapping.resultKey];
    if (!registerDefinition) {
      this.log(`Register definition not found for resultKey: ${mapping.resultKey}`);
      return null;
    }
    return { mapping, registerDefinition };
  }

  // Method to process register value with inverted scale
  processRegisterValueCommon(capability: string, registerValue: number, holdingRegisters: { [key: string]: RegisterDefinition }): number | null {
    const result = this.getMappingAndRegister(capability, holdingRegisters);
    if (!result) return null;
    const { mapping, registerDefinition } = result;
    // Use registerDefinition[4] as scale and invert its sign
    const invertedScale = (-1 * registerDefinition[4]).toString();
    // Convert the numeric registerValue to a string for processing, if needed.
    const data: EnergymeterData = { value: registerValue.toString(), scale: invertedScale };
    const transformedValue = mapping.transform ? mapping.transform(data) : data.value;
    if (transformedValue === null) {
      this.log(`Transformed value is null for capability: ${capability}`);
      return null;
    }
    if (mapping.valid && !mapping.valid({ value: transformedValue.toString(), scale: data.scale })) {
      this.log(`Validation failed for capability: ${capability}`);
      return null;
    }
    return typeof transformedValue === 'number' ? transformedValue : Number(transformedValue);
  }

  /**
   * Method to cast value to the expected capability type
   * @throws Error if capability type cannot be determined
   */
  castToCapabilityType(capability: string, value: unknown): string | number | boolean {
    // Try to get current value to determine type, but handle case where capability doesn't exist yet
    let expectedType: string;
    try {
      const currentValue = this.getCapabilityValue(capability);
      expectedType = typeof currentValue;
      // If currentValue is undefined, we can't determine type from it
      if (expectedType === 'undefined') {
        // Default to number for most capabilities
        expectedType = 'number';
      }
    } catch {
      // Capability might not exist yet, default to number
      expectedType = 'number';
    }

    this.log(`Casting '${capability}' to capability: ${expectedType}, raw value:`, value);

    switch (expectedType) {
      case 'number':
        return Number(value);
      case 'string':
        return String(value);
      case 'boolean':
        return value === true || value === 'true' || value === 1;
      default:
        // Fallback to number for unknown types
        return Number(value);
    }
  }

  // Main method to process results from the meter
  async processResult(result: Record<string, Measurement>) {
    if (!result) {
      return;
    }

    // Log all results for debugging
    for (const [key, { value, scale, label }] of Object.entries(result)) {
      this.log(key, value, scale, label);
    }

    // Process capability mappings
    for (const mapping of this.CapabilityMappings) {
      const data = result[mapping.resultKey];

      if (!data) {
        continue;
      }

      try {
        if (mapping.valid && !mapping.valid(data)) {
          continue;
        }

        if (mapping.requireCapabilityCheck && !this.hasCapability(mapping.capabilities[0])) {
          continue;
        }

        const transformedValue = mapping.transform?.(data);
        if (transformedValue === null || transformedValue === undefined) {
          continue;
        }

        for (const cap of mapping.capabilities) {
          this.addCapability(cap).catch(this.error);
          this.setCapabilityValue(cap, transformedValue).catch(this.error);
        }
      } catch (error) {
        this.error(`Error processing capability mapping for ${mapping.resultKey}:`, error);
      }
    }

       // Calculate NET power usage: total import minus total export
    if (result['totalImEnergy']?.value !== INVALID_VALUE && result['totalExEnergy']?.value !== INVALID_VALUE) {
      const totalIm = this.convertMeasurement(result['totalImEnergy']);
      const totalEx = this.convertMeasurement(result['totalExEnergy']);
      const netPower = Number((totalIm - totalEx).toFixed(2));
      this.addCapability('meter_power').catch(this.error);
      this.setCapabilityValue('meter_power', netPower).catch(this.error);
      this.log(`Net power: ${netPower} (import: ${totalIm}, export: ${totalEx})`);
    }
  
     // Calculate daily power import: current total import minus value from start of day
    if (result['totalImEnergy']?.value !== INVALID_VALUE) {
      await this.calculateDailyPower(
        result['totalImEnergy'],
        'meter_power_import_daily',
        Energymeter.STORE_KEY_IMPORT_BASELINE,
        'import',
      );
      this.log('Calculated daily power import updated');
    }

    // Calculate daily power export: current total export minus value from start of day
    if (result['totalExEnergy']?.value !== INVALID_VALUE) {
      await this.calculateDailyPower(
        result['totalExEnergy'],
        'meter_power_export_daily',
        Energymeter.STORE_KEY_EXPORT_BASELINE,
        'export',
      );
      this.log('Calculated daily power export updated');
    }
   
  }
}
