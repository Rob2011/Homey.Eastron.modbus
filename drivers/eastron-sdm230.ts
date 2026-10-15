import { RegisterDefinition } from './energymeter';
import { EastronMeter, CapabilityMapping } from './eastron-meter';

// Eastron SDM230 Single Phase Energymeter Device Class
export class Energymeter extends EastronMeter {

  readonly holdingRegistersBase: { [key: string]: RegisterDefinition } = {
    // SDM230 holding registers can be added here if needed
  };

  // Register definitions for SDM230 (single phase meter)
  registers: { [key: string]: RegisterDefinition } = {
    // Voltage
    voltage: [0, 2, 'FLOAT32', 'Voltage', 0],
    
    // Current
    current: [6, 2, 'FLOAT32', 'Current', 0],
    
    // Power
    activepower: [12, 2, 'FLOAT32', 'Active Power', 0],
    apparentpower: [18, 2, 'FLOAT32', 'Apparent Power', 0],
    reactivepower: [24, 2, 'FLOAT32', 'Reactive Power', 0],
    
    // Power Factor
    powerfactor: [30, 2, 'FLOAT32', 'Power Factor', 0],
    
    // Phase Angle
    phaseangle: [36, 2, 'FLOAT32', 'Phase Angle', 0],
    
    // Frequency
    frequency: [70, 2, 'FLOAT32', 'Frequency', 0],
    
    // Energy
    importactiveenergy: [72, 2, 'FLOAT32', 'Import Active Energy', 0],
    exportactiveenergy: [74, 2, 'FLOAT32', 'Export Active Energy', 0],
    importreactiveenergy: [76, 2, 'FLOAT32', 'Import Reactive Energy', 0],
    exportreactiveenergy: [78, 2, 'FLOAT32', 'Export Reactive Energy', 0],
    
    // Total Energy
    totalactiveenergy: [342, 2, 'FLOAT32', 'Total Active Energy', 0],
    totalreactiveenergy: [344, 2, 'FLOAT32', 'Total Reactive Energy', 0],
  };

  // Capability mappings for SDM230
  readonly CapabilityMappings: CapabilityMapping[] = [
    {
      resultKey: 'voltage',
      capabilities: ['measure_voltage'],
      valid: EastronMeter.createValidator(true),
      transform: EastronMeter.createTransform(),
    },
    {
      resultKey: 'current',
      capabilities: ['measure_current'],
      valid: EastronMeter.createValidator(true),
      transform: EastronMeter.createTransform(),
    },
    {
      resultKey: 'activepower',
      capabilities: ['measure_power'],
      valid: EastronMeter.createValidator(),
      transform: EastronMeter.createTransform(true),
    },
    {
      resultKey: 'apparentpower',
      capabilities: ['measure_apparent_power'],
      valid: EastronMeter.createValidator(),
      transform: EastronMeter.createTransform(true),
    },
    {
      resultKey: 'reactivepower',
      capabilities: ['measure_reactive_power'],
      valid: EastronMeter.createValidator(),
      transform: EastronMeter.createTransform(true),
    },
    {
      resultKey: 'powerfactor',
      capabilities: ['measure_power_factor'],
      valid: EastronMeter.createValidator(),
      transform: EastronMeter.createTransform(),
    },
    {
      resultKey: 'phaseangle',
      capabilities: ['measure_phase_angle'],
      valid: EastronMeter.createValidator(),
      transform: EastronMeter.createTransform(),
    },
    {
      resultKey: 'frequency',
      capabilities: ['meter_frequency'],
      valid: EastronMeter.createValidator(),
      transform: EastronMeter.createTransform(),
    },
    {
      resultKey: 'importactiveenergy',
      capabilities: ['meter_power.imported'],
      valid: EastronMeter.createValidator(),
      transform: EastronMeter.createTransform(),
    },
    {
      resultKey: 'exportactiveenergy',
      capabilities: ['meter_power.exported'],
      valid: EastronMeter.createValidator(),
      transform: EastronMeter.createTransform(),
    },
  ];

  protected readonly importEnergyKey = 'importactiveenergy';
  protected readonly exportEnergyKey = 'exportactiveenergy';
}
