import { Energymeter } from '../eastron-sdm630';
import { createMeterDevice } from '../meterdevice';

// Eastron SDM630 device: polling and daily totals come from createMeterDevice
module.exports = class MyDevice extends createMeterDevice(Energymeter, 'SDM630') {};
