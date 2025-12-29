import * as Homey from 'homey';
import { Powermeter, RegisterDefinition } from './energymeter';

/*
Key features of the SDM120CT driver:

Single-phase measurement - Designed for single-phase installations
CT support - Works with Current Transformers
Bi-directional measurement - Measures both import and export
Daily energy tracking - Resets at midnight in local timezone
Comprehensive measurements - Voltage, current, power, power factor, phase angle, frequency
Apparent and reactive power - Full power analysis capabilities
Configurable polling interval - User can adjust from 5-300 seconds
Net energy calculation - Import minus export

The SDM120CT is ideal for monitoring single-phase circuits with CT clamps, perfect for sub-metering applications 
or monitoring individual circuits in a larger installation.
*/

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

// Eastron SDM120CT Single Phase Energymeter Device Class
export class Energymeter extends Powermeter {

  readonly holdingRegistersBase: { [key: string]: RegisterDefinition } = {
    // Holding registers for configuration (if needed)
  };

  // Register definitions for SDM120CT based on the manual
  registers: { [key: string]: RegisterDefinition } = {
    // Basic measurements
    voltage: [0, 2, 'FLOAT32', 'Voltage', 0],
    current: [6, 2, 'FLOAT32', 'Current', 0],
    activepower: [12, 2, 'FLOAT32', 'Active Power', 0],
    apparentpower: [18, 2, 'FLOAT32', 'Apparent Power', 0],
    reactivepower: [24, 2, 'FLOAT32', 'Reactive Power', 0],
    powerfactor: [30, 2, 'FLOAT32', 'Power Factor', 0],
    phaseangle: [36, 2, 'FLOAT32', 'Phase Angle', 0],
    
    // Frequency
    frequency: [70, 2, 'FLOAT32', 'Frequency', 0],
    
    // Energy
    importactiveenergy: [72, 2, 'FLOAT32', 'Import Active Energy', 0],
    exportactiveenergy: [74, 2, 'FLOAT32', 'Export Active Energy', 0],
    importreactiveenergy: [76, 2, 'FLOAT32', 'Import Reactive Energy', 0],
    exportreactiveenergy: [78, 2, 'FLOAT32', 'Export Reactive Energy', 0],
    
    // Total energy
    totalactiveenergy: [342, 2, 'FLOAT32', 'Total Active Energy', 0],
    totalreactiveenergy: [344, 2, 'FLOAT32', 'Total Reactive Energy', 0],
  };

  // Capability mappings for SDM120CT
  readonly CapabilityMappings: CapabilityMapping[] = [
    {
      resultKey: 'voltage',
      capabilities: ['measure_voltage'],
      valid: Energymeter.createValidator(true),
      transform: Energymeter.createTransform(),
    },
    {
      resultKey: 'current',
      capabilities: ['measure_current'],
      valid: Energymeter.createValidator(true),
      transform: Energymeter.createTransform(),
    },
    {
      resultKey: 'activepower',
      capabilities: ['measure_power'],
      valid: Energymeter.createValidator(),
      transform: Energymeter.createTransform(true),
    },
    {
      resultKey: 'apparentpower',
      capabilities: ['measure_apparent_power'],
      valid: Energymeter.createValidator(),
      transform: Energymeter.createTransform(true),
    },
    {
      resultKey: 'reactivepower',
      capabilities: ['measure_reactive_power'],
      valid: Energymeter.createValidator(),
      transform: Energymeter.createTransform(true),
    },
    {
      resultKey: 'powerfactor',
      capabilities: ['measure_power_factor'],
      valid: Energymeter.createValidator(),
      transform: Energymeter.createTransform(),
    },
    {
      resultKey: 'phaseangle',
      capabilities: ['measure_phase_angle'],
      valid: Energymeter.createValidator(),
      transform: Energymeter.createTransform(),
    },
    {
      resultKey: 'frequency',
      capabilities: ['meter_frequency'],
      valid: Energymeter.createValidator(),
      transform: Energymeter.createTransform(),
    },
    {
      resultKey: 'importactiveenergy',
      capabilities: ['meter_power.imported'],
      valid: Energymeter.createValidator(),
      transform: Energymeter.createTransform(),
    },
    {
      resultKey: 'exportactiveenergy',
      capabilities: ['meter_power.exported'],
      valid: Energymeter.createValidator(),
      transform: Energymeter.createTransform(),
    },
    {
      resultKey: 'totalactiveenergy',
      capabilities: ['meter_power'],
      valid: Energymeter.createValidator(),
      transform: Energymeter.createTransform(),
    },
  ];

  // Constants for daily calculation
  protected static readonly STORE_KEY_LAST_RESET_DATE = 'lastDailyResetDate';
  protected static readonly STORE_KEY_LAST_RESET_DATE_EXPORT = 'lastDailyResetDateExport';
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
    
    // Compare dates at midnight local time to avoid timezone issues
    const lastMidnight = new Date(lastReset.getFullYear(), lastReset.getMonth(), lastReset.getDate());
    const currentMidnight = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    
    return currentMidnight.getTime() > lastMidnight.getTime();
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
      
      // Get current date at midnight in local timezone
      const now = new Date();
      const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Use separate reset date keys for import and export
      const resetDateKey = type === 'import' 
        ? Energymeter.STORE_KEY_LAST_RESET_DATE 
        : Energymeter.STORE_KEY_LAST_RESET_DATE_EXPORT;
      
      const lastResetDate = this.getStoreValue(resetDateKey);
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
        this.setStoreValue(resetDateKey, currentDate.toISOString());
        
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
    if (result['importactiveenergy']?.value !== INVALID_VALUE && result['exportactiveenergy']?.value !== INVALID_VALUE) {
      const totalIm = this.convertMeasurement(result['importactiveenergy']);
      const totalEx = this.convertMeasurement(result['exportactiveenergy']);
      const netPower = Number((totalIm - totalEx).toFixed(2));
      this.addCapability('meter_power').catch(this.error);
      this.setCapabilityValue('meter_power', netPower).catch(this.error);
      this.log(`Net power: ${netPower} (import: ${totalIm}, export: ${totalEx})`);
    }

    // Calculate daily power import: current total import minus value from start of day
    if (result['importactiveenergy']?.value !== INVALID_VALUE) {
      await this.calculateDailyPower(
        result['importactiveenergy'],
        'meter_power_import_daily',
        Energymeter.STORE_KEY_IMPORT_BASELINE,
        'import',
      );
      this.log('Calculated daily power import updated');
    }

    // Calculate daily power export: current total export minus value from start of day
    if (result['exportactiveenergy']?.value !== INVALID_VALUE) {
      await this.calculateDailyPower(
        result['exportactiveenergy'],
        'meter_power_export_daily',
        Energymeter.STORE_KEY_EXPORT_BASELINE,
        'export',
      );
      this.log('Calculated daily power export updated');
    }
  }
}