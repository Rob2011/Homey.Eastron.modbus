import { Energymeter } from '../eastron-sdm230';
import { createMeterDevice } from '../meterdevice';

// Eastron SDM230 device: polling and daily totals come from createMeterDevice
module.exports = class MyDevice extends createMeterDevice(Energymeter, 'SDM230') {};
