import { Energymeter } from '../eastron-sdm72';
import { createMeterDevice } from '../meterdevice';

// Eastron SDM72D-M-2 device: polling and daily totals come from createMeterDevice
module.exports = class MyDevice extends createMeterDevice(Energymeter, 'SDM72D-M-2') {};
