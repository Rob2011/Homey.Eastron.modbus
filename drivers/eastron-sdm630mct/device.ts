import { Energymeter } from '../eastron-sdm630mct';
import { createMeterDevice } from '../meterdevice';

// Eastron SDM630MCT device: polling and daily totals come from createMeterDevice
module.exports = class MyDevice extends createMeterDevice(Energymeter, 'SDM630MCT') {};
