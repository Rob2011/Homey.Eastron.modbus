import { RegisterDefinition } from './energymeter';
import { EastronMeter, CapabilityMapping } from './eastron-meter';

/*
## Key features of the SDM72D-M-2 driver:

1. **Three-phase four-wire support** - Full L1, L2, L3 measurements
2. **Import/Export energy tracking** - Bi-directional measurement
3. **Daily energy tracking** - Resets at midnight in local timezone
4. **Neutral current monitoring** - Additional capability for neutral wire
5. **Configurable polling interval** - User can adjust from 5-300 seconds
6. **Net energy calculation** - Import minus export
7. **All phase measurements** - Voltage, current, power, power factor per phase

The SDM72D-M-2 is very similar to the SDM630 but supports direct connection up to 100A and has a built-in LCD display. 
The Modbus registers are mostly compatible with the SDM630 standard.
*/

// Eastron SDM72D-M-2 Three Phase Four Wire Energymeter Device Class
export class Energymeter extends EastronMeter {

  readonly holdingRegistersBase: { [key: string]: RegisterDefinition } = {
    // Holding registers for configuration (if needed)
  };

  // Register definitions for SDM72D-M-2 based on the manual
  registers: { [key: string]: RegisterDefinition } = {
    // Phase voltages (L-N)
    l1_voltage: [0, 2, 'FLOAT32', 'Phase 1 Voltage', 0],
    l2_voltage: [2, 2, 'FLOAT32', 'Phase 2 Voltage', 0],
    l3_voltage: [4, 2, 'FLOAT32', 'Phase 3 Voltage', 0],
    
    // Phase currents
    l1_current: [6, 2, 'FLOAT32', 'Phase 1 Current', 0],
    l2_current: [8, 2, 'FLOAT32', 'Phase 2 Current', 0],
    l3_current: [10, 2, 'FLOAT32', 'Phase 3 Current', 0],
    
    // Active power per phase
    l1_power: [12, 2, 'FLOAT32', 'Phase 1 Active Power', 0],
    l2_power: [14, 2, 'FLOAT32', 'Phase 2 Active Power', 0],
    l3_power: [16, 2, 'FLOAT32', 'Phase 3 Active Power', 0],
    
    // Apparent power per phase
    l1_powerVA: [18, 2, 'FLOAT32', 'Phase 1 Apparent Power', 0],
    l2_powerVA: [20, 2, 'FLOAT32', 'Phase 2 Apparent Power', 0],
    l3_powerVA: [22, 2, 'FLOAT32', 'Phase 3 Apparent Power', 0],
    
    // Reactive power per phase
    l1_powerVAr: [24, 2, 'FLOAT32', 'Phase 1 Reactive Power', 0],
    l2_powerVAr: [26, 2, 'FLOAT32', 'Phase 2 Reactive Power', 0],
    l3_powerVAr: [28, 2, 'FLOAT32', 'Phase 3 Reactive Power', 0],
    
    // Power factor per phase
    l1_powerfact: [30, 2, 'FLOAT32', 'Phase 1 Power Factor', 0],
    l2_powerfact: [32, 2, 'FLOAT32', 'Phase 2 Power Factor', 0],
    l3_powerfact: [34, 2, 'FLOAT32', 'Phase 3 Power Factor', 0],
    
    // Average values
    avglinevolt: [42, 2, 'FLOAT32', 'Average L-N Voltage', 0],
    avglineamp: [46, 2, 'FLOAT32', 'Average Line Current', 0],
    sumlineamp: [48, 2, 'FLOAT32', 'Sum of Line Currents', 0],
    
    // Total system values
    totsyspower: [52, 2, 'FLOAT32', 'Total System Power', 0],
    totsyspowerVA: [56, 2, 'FLOAT32', 'Total System Apparent Power', 0],
    totsyspowerVAr: [60, 2, 'FLOAT32', 'Total System Reactive Power', 0],
    totpowerfact: [62, 2, 'FLOAT32', 'Total Power Factor', 0],
    
    // Frequency
    gridFrequency: [70, 2, 'FLOAT32', 'Frequency', 0],
    
    // Energy
    totalImEnergy: [72, 2, 'FLOAT32', 'Import Active Energy', 0],
    totalExEnergy: [74, 2, 'FLOAT32', 'Export Active Energy', 0],
    
    // Line to line voltages
    line1_2volt: [200, 2, 'FLOAT32', 'Line 1 to Line 2 Voltage', 0],
    line2_3volt: [202, 2, 'FLOAT32', 'Line 2 to Line 3 Voltage', 0],
    line3_1volt: [204, 2, 'FLOAT32', 'Line 3 to Line 1 Voltage', 0],
    avglinel_lvolt: [206, 2, 'FLOAT32', 'Average L-L Voltage', 0],
    
    // Neutral current
    neutralcurrent: [224, 2, 'FLOAT32', 'Neutral Current', 0],
    
    // Additional energy registers
    totalkwh: [342, 2, 'FLOAT32', 'Total Active Energy', 0],
    totalkvarh: [344, 2, 'FLOAT32', 'Total Reactive Energy', 0],
    
    // Resettable energy
    resettable_totalkwh: [384, 2, 'FLOAT32', 'Resettable Total Active Energy', 0],
    resettable_totalkvarh: [386, 2, 'FLOAT32', 'Resettable Total Reactive Energy', 0],
    resettable_importkwh: [388, 2, 'FLOAT32', 'Resettable Import Active Energy', 0],
    resettable_exportkwh: [390, 2, 'FLOAT32', 'Resettable Export Active Energy', 0],
    
    // Net energy
    net_kwh: [396, 2, 'FLOAT32', 'Net kWh', 0],
    
    // Import/Export power
    total_import_power: [1280, 2, 'FLOAT32', 'Total Import Active Power', 0],
    total_export_power: [1282, 2, 'FLOAT32', 'Total Export Active Power', 0],
  };

  // Capability mappings
  readonly CapabilityMappings: CapabilityMapping[] = [
    {
      resultKey: 'totsyspower',
      capabilities: ['measure_power'],
      valid: EastronMeter.createValidator(),
      transform: EastronMeter.createTransform(true),
    },
    {
      resultKey: 'l1_power',
      capabilities: ['meter_l1_power'],
      valid: EastronMeter.createValidator(),
      transform: EastronMeter.createTransform(true),
    },
    {
      resultKey: 'l2_power',
      capabilities: ['meter_l2_power'],
      valid: EastronMeter.createValidator(),
      transform: EastronMeter.createTransform(true),
    },
    {
      resultKey: 'l3_power',
      capabilities: ['meter_l3_power'],
      valid: EastronMeter.createValidator(),
      transform: EastronMeter.createTransform(true),
    },
    {
      resultKey: 'l1_current',
      capabilities: ['meter_l1_current'],
      valid: EastronMeter.createValidator(true),
      transform: EastronMeter.createTransform(),
    },
    {
      resultKey: 'l2_current',
      capabilities: ['meter_l2_current'],
      valid: EastronMeter.createValidator(true),
      transform: EastronMeter.createTransform(),
    },
    {
      resultKey: 'l3_current',
      capabilities: ['meter_l3_current'],
      valid: EastronMeter.createValidator(true),
      transform: EastronMeter.createTransform(),
    },
    {
      resultKey: 'sumlineamp',
      capabilities: ['meter_current'],
      valid: EastronMeter.createValidator(true),
      transform: EastronMeter.createTransform(),
    },
    {
      resultKey: 'l1_voltage',
      capabilities: ['meter_l1_voltage'],
      valid: EastronMeter.createValidator(true),
      transform: EastronMeter.createTransform(),
    },
    {
      resultKey: 'l2_voltage',
      capabilities: ['meter_l2_voltage'],
      valid: EastronMeter.createValidator(true),
      transform: EastronMeter.createTransform(),
    },
    {
      resultKey: 'l3_voltage',
      capabilities: ['meter_l3_voltage'],
      valid: EastronMeter.createValidator(true),
      transform: EastronMeter.createTransform(),
    },
    {
      resultKey: 'totpowerfact',
      capabilities: ['measure_tot_power_factor'],
      valid: EastronMeter.createValidator(),
      transform: EastronMeter.createTransform(),
    },
    {
      resultKey: 'totalImEnergy',
      capabilities: ['meter_power.imported'],
      valid: EastronMeter.createValidator(),
      transform: EastronMeter.createTransform(),
    },
    {
      resultKey: 'totalExEnergy',
      capabilities: ['meter_power.exported'],
      valid: EastronMeter.createValidator(),
      transform: EastronMeter.createTransform(),
    },
    {
      resultKey: 'gridFrequency',
      capabilities: ['meter_frequency'],
      valid: EastronMeter.createValidator(),
      transform: EastronMeter.createTransform(),
    },
    {
      resultKey: 'neutralcurrent',
      capabilities: ['meter_neutral_current'],
      valid: EastronMeter.createValidator(true),
      transform: EastronMeter.createTransform(),
    },
  ];

  protected readonly importEnergyKey = 'totalImEnergy';
  protected readonly exportEnergyKey = 'totalExEnergy';
}
