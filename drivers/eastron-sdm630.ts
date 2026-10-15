import { RegisterDefinition } from './energymeter';
import { EastronMeter, CapabilityMapping } from './eastron-meter';

// Eastron Energymeter Device Class
export class Energymeter extends EastronMeter {

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
      resultKey: 'totangle',
      capabilities: ['measure_tot_phase_angle'],
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
  ];

  protected readonly importEnergyKey = 'totalImEnergy';
  protected readonly exportEnergyKey = 'totalExEnergy';
}
