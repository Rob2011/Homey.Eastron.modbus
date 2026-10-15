import { RegisterDefinition } from './energymeter';
import { CapabilityMapping } from './eastron-meter';
import { Energymeter as Sdm630Energymeter } from './eastron-sdm630';

/*
Eastron SDM630MCT family (CT-operated three phase meters):
- SDM630MCT (1A/5A CT), SDM630MCT-40mA (split core CTs, e.g. for hybrid inverters)
- SDM630MCT-RC (Rogowski coil, 1A - 5000A), sometimes sold as SDM630NCT-RC

These meters use the same input register map as the SDM630-Modbus, so the SDM630 registers
are reused and extended with values that matter for CT installations: line-to-line voltages
(also valid in 3P3W systems), neutral current and total apparent/reactive power.
Current and power values are already scaled by the CT/coil setting configured on the meter.
*/

// Eastron SDM630MCT / SDM630MCT-RC Energymeter Device Class
export class Energymeter extends Sdm630Energymeter {

  registers: { [key: string]: RegisterDefinition } = {
    ...this.registers,

    // Line to line voltages
    line1_2volt: [200, 2, 'FLOAT32', 'Line 1 to Line 2 Voltage', 0],
    line2_3volt: [202, 2, 'FLOAT32', 'Line 2 to Line 3 Voltage', 0],
    line3_1volt: [204, 2, 'FLOAT32', 'Line 3 to Line 1 Voltage', 0],

    // Neutral current
    neutralcurrent: [224, 2, 'FLOAT32', 'Neutral Current', 0],
  };

  readonly CapabilityMappings: CapabilityMapping[] = [
    ...this.CapabilityMappings,
    {
      resultKey: 'totsyspowerVA',
      capabilities: ['measure_apparent_power'],
      valid: Energymeter.createValidator(),
      transform: Energymeter.createTransform(true),
    },
    {
      resultKey: 'totsyspowerVAr',
      capabilities: ['measure_reactive_power'],
      valid: Energymeter.createValidator(),
      transform: Energymeter.createTransform(true),
    },
    {
      resultKey: 'line1_2volt',
      capabilities: ['meter_l12_voltage'],
      valid: Energymeter.createValidator(true),
      transform: Energymeter.createTransform(),
    },
    {
      resultKey: 'line2_3volt',
      capabilities: ['meter_l23_voltage'],
      valid: Energymeter.createValidator(true),
      transform: Energymeter.createTransform(),
    },
    {
      resultKey: 'line3_1volt',
      capabilities: ['meter_l31_voltage'],
      valid: Energymeter.createValidator(true),
      transform: Energymeter.createTransform(),
    },
    {
      resultKey: 'neutralcurrent',
      capabilities: ['meter_neutral_current'],
      valid: Energymeter.createValidator(true),
      transform: Energymeter.createTransform(),
    },
  ];
}
