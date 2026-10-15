import { Energymeter } from '../eastron-sdm120';
import { createMeterDevice } from '../meterdevice';

// Eastron SDM120CT device: polling and daily totals come from createMeterDevice
module.exports = class MyDevice extends createMeterDevice(Energymeter, 'SDM120CT') {};
