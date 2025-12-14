import * as Modbus from 'jsmodbus';
import * as net from 'net';
import Homey, { Device } from 'homey';

// Constants for invalid values
export const INVALID_VALUE = 'xxx';
export const INVALID_NUMERIC_VALUE = '-1';

// Interface for measurement entries
export interface Measurement {
  value: string;
  scale: string;
  label: string;
}

// Type definition for register: [registerAddress, registerLength, dataType, description, scale]
export type RegisterDefinition = [number, number, string, string, number];

// Base class for Powermeter devices
export class Powermeter extends Homey.Device {

  // Device-specific properties that must be provided by subclasses
  // These will be overridden by Sdm630/Sdm230 classes
  protected registers: { [key: string]: RegisterDefinition } = {};
  protected holdingRegistersBase: { [key: string]: RegisterDefinition } = {};

  // check both value and scale
  validResultRecord(entry: Measurement) {
    if (entry && entry.value && entry.value !== INVALID_VALUE && entry.scale) {
      return true;
    }
    return false;
  }

  // check only scale
  validResultScaleRecord(entry: Measurement) {
    if (entry && entry.scale) {
      return true;
    }
    return false;
  }

  // Method to process the result from the powermeter
  async processResult(result: Record<string, Measurement>) {
    if (result) {
      // log all results
      for (const k in result) {
        this.log('Powermeter: ', k, result[k].value, result[k].scale, result[k].label);

      }
      if (this.validResultRecord(result['totsyspower']) && this.validResultScaleRecord(result['totsyspower']) && result['totsyspower'].value !== INVALID_NUMERIC_VALUE) {
        if (this.hasCapability('measure_power') === false) {
          await this.addCapability('measure_power');
        }
        const daily_power = Number(result['totsyspower'].value) * Math.pow(10, Number(result['totsyspower'].scale));
        this.setCapabilityValue('measure_power', daily_power);
      }
      // nodig? of verwijderen?
      if (this.validResultRecord(result['l1_voltage']) && this.validResultScaleRecord(result['l1_voltage']) && result['l1_voltage'].value !== INVALID_NUMERIC_VALUE) {
        if (this.hasCapability('meter_l1_voltage') === false) {
          await this.addCapability('meter_l1_voltage');
        }
        const voltagel1 = Number(result['l1_voltage'].value) * Math.pow(10, Number(result['l1_voltage'].scale));
        this.setCapabilityValue('meter_l1_voltage', voltagel1);
      }
      if (this.validResultRecord(result['l2_voltage']) && this.validResultScaleRecord(result['l2_voltage']) && result['l2_voltage'].value !== INVALID_NUMERIC_VALUE) {
        if (this.hasCapability('meter_l2_voltage') === false) {
          await this.addCapability('meter_l2_voltage');
        }
        const voltagel2 = Number(result['l2_voltage'].value) * Math.pow(10, Number(result['l2_voltage'].scale));
        this.setCapabilityValue('meter_l2_voltage', voltagel2);
      }
      if (this.validResultRecord(result['l3_voltage']) && this.validResultScaleRecord(result['l3_voltage']) && result['l3_voltage'].value !== INVALID_NUMERIC_VALUE) {
        if (this.hasCapability('meter_l3_voltage') === false) {
          await this.addCapability('meter_l3_voltage');
        }
        const voltagel3 = Number(result['l3_voltage'].value) * Math.pow(10, Number(result['l3_voltage'].scale));
        this.setCapabilityValue('meter_l3_voltage', voltagel3);
      }

    }
  }

  // Helper method to get register address for a capability
  // This can be overridden by subclasses that have getMappingAndRegister method
  protected getRegisterAddressForCapability(capability: string): number | undefined {
    // Try to use getMappingAndRegister if it exists (from Sdm630/Sdm230)
    const getMappingAndRegister = (this as any).getMappingAndRegister;
    if (getMappingAndRegister && this.holdingRegistersBase) {
      const result = getMappingAndRegister.call(this, capability, this.holdingRegistersBase);
      if (result) {
        return result.registerDefinition[0];
      }
    }
    return undefined;
  }

  // Method to process register value for a capability
  // This can be overridden by subclasses that have processRegisterValueCommon method
  protected processRegisterValue(capability: string, registerValue: number): number | null {
    // Try to use processRegisterValueCommon if it exists (from Sdm630/Sdm230)
    const processRegisterValueCommon = (this as any).processRegisterValueCommon;
    if (processRegisterValueCommon && this.holdingRegistersBase) {
      return processRegisterValueCommon.call(this, capability, registerValue, this.holdingRegistersBase);
    }
    return null;
  }

  // Main method to poll the powermeter
  async pollPowermeter() {
    if (!this.registers || !this.holdingRegistersBase) {
      this.error('pollPowermeter: registers or holdingRegistersBase not defined');
      return;
    }

    this.log('pollPowermeter started');
    this.log(this.getSetting('address'));

    const modbusOptions = {
      host: this.getSetting('address'),
      port: this.getSetting('port'),
      unitId: this.getSetting('id'),
      timeout: 22,
      autoReconnect: false,
      logLabel: 'energymeter',
      logLevel: 'error',
      logEnabled: true,
    };

    const socket = new net.Socket();
    const unitID = this.getSetting('id');
    const client = new Modbus.client.TCP(socket, unitID, 1000);

    const cleanup = () => {
      try {
        if (client && client.socket && !client.socket.destroyed) {
          client.socket.end();
        }
      } catch (err) {
        // Ignore cleanup errors
      }
      try {
        if (socket && !socket.destroyed) {
          socket.end();
          socket.destroy();
        }
      } catch (err) {
        // Ignore cleanup errors
      }
    };

    socket.setKeepAlive(false);
    socket.setTimeout(modbusOptions.timeout * 1000);

    socket.on('connect', () => {
      (async () => {
        this.log('Connected ...');
        try {
          const checkRegisterRes = await checkRegisterPower(this.registers!, client);
          const checkHoldingRegisterRes = await checkHoldingRegisterPower(this.holdingRegistersBase!, client);
          const finalRes = { ...checkRegisterRes, ...checkHoldingRegisterRes };
          await this.processResult(finalRes);
        } catch (err) {
          this.error('Error reading registers:', err);
        } finally {
          this.log('disconnect');
          cleanup();
        }
      })().catch((err) => {
        this.error('Error in pollPowermeter async:', err);
        cleanup();
      });
    });

    socket.on('close', () => {
      this.log('Client closed');
    });

    socket.on('timeout', () => {
      this.log('socket timed out!');
      cleanup();
    });

    socket.on('error', (err) => {
      this.log('Socket error in pollPowermeter:', err);
      cleanup();
    });

    try {
      socket.connect(modbusOptions);
    } catch (err) {
      this.error('Error connecting socket:', err);
      cleanup();
    }
  }

  // Method to update control value
  async updateControl(type: string, value: number) {
    const castToCapabilityType = (this as any).castToCapabilityType;
    if (!castToCapabilityType) {
      this.error('updateControl: castToCapabilityType method not defined');
      return;
    }

    const socket = new net.Socket();
    const unitID = this.getSetting('id');
    const client = new Modbus.client.TCP(socket, unitID, 2000);

    const modbusOptions = {
      host: this.getSetting('address'),
      port: this.getSetting('port'),
      unitId: this.getSetting('id'),
      timeout: 15,
      autoReconnect: false,
      logLabel: 'energymeter',
      logLevel: 'error',
      logEnabled: true,
    };

    const cleanup = () => {
      try {
        if (client && client.socket && !client.socket.destroyed) {
          client.socket.end();
        }
      } catch (err) {
        // Ignore cleanup errors
      }
      try {
        if (socket && !socket.destroyed) {
          socket.end();
          socket.destroy();
        }
      } catch (err) {
        // Ignore cleanup errors
      }
    };

    socket.setKeepAlive(false);
    socket.setTimeout(modbusOptions.timeout * 1000);

    socket.on('connect', () => {
      (async () => {
        this.log('Connected ...');
        try {
          this.log(`${type} value: ${value}`);
          const registerAddress = this.getRegisterAddressForCapability(type);
          const regValue = this.processRegisterValue(type, value);
          if (registerAddress === undefined) {
            this.log(`${type} register mapping not found`);
          } else if (regValue === null) {
            this.log(`${type} register value not valid`);
          } else {
            this.log(`${type} register: ${registerAddress} value: ${regValue}`);
            const res = await client.writeSingleRegister(registerAddress, regValue);
            this.log(type, res);
            // Update the changed capability value
            const typedValue = castToCapabilityType.call(this, type, value);
            this.log(`typeof typedValue: ${typeof typedValue}, value:`, typedValue);
            await this.setCapabilityValue(type, typedValue);
          }
        } catch (err) {
          this.error('Error in updateControl:', err);
        } finally {
          this.log('disconnect');
          cleanup();
        }
      })().catch((err) => {
        this.error('Error in updateControl async:', err);
        cleanup();
      });
    });

    socket.on('close', () => {
      this.log('Client closed');
    });

    socket.on('timeout', () => {
      this.log('Socket timeout in updateControl');
      cleanup();
    });

    socket.on('error', (err) => {
      this.log('Socket error in updateControl:', err);
      cleanup();
    });

    try {
      socket.connect(modbusOptions);
    } catch (err) {
      this.error('Error connecting socket:', err);
      cleanup();
    }
  }
}


// functions to read registers from different meters => verplaatsen naar powermeter

// Read input registers from Modbus client and return measurements = SDM630
export async function checkRegisterPower(registers: Object, client: InstanceType<typeof Modbus.client.TCP>) {
  const result: Record<string, Measurement> = {};

  for (const [key, value] of Object.entries(registers)) {
    try {
      const res = client.readInputRegisters(value[0], value[1]);
      const actualRes = await res;
      let valueNumeric: number;
      const { response } = actualRes;
      const measurement: Measurement = {
        value: INVALID_VALUE,
        scale: value[4],
        label: value[3],
      };
      let resultValue: string = INVALID_VALUE;
      switch (value[2]) {
        case 'UINT16':
          resultValue = response.body.valuesAsArray[0].toString();
          // console.log(key);
          break;
        case 'INT16':
          resultValue = response.body.valuesAsBuffer.readInt16BE().toString();
          // console.log(key);
          break;
        case 'UINT32':
          resultValue = ((response.body.valuesAsArray[0] << 16) | response.body.valuesAsArray[1]).toString();
          // console.log(key);
          break;
        case 'INT16LE':
          valueNumeric = response.body.valuesAsBuffer.readInt16LE();
          resultValue = valueNumeric.toString();
          break;
        case 'UINT16LE':
          valueNumeric = response.body.valuesAsBuffer.readUInt16LE();
          resultValue = valueNumeric.toString();
          break;
        case 'INT32':
          valueNumeric = response.body.valuesAsBuffer.readInt32BE();
          resultValue = valueNumeric.toString();
          break;
        case 'FLOAT32':
          valueNumeric = response.body.valuesAsBuffer.readFloatBE();
          resultValue = valueNumeric.toString();
          break;
        case 'SCALE':
          valueNumeric = Math.pow(10, response.body.valuesAsBuffer.readInt16BE());
          resultValue = valueNumeric.toString();
          break;
        case 'STRING':
          resultValue = response.body.valuesAsBuffer.toString();
          break;
        default:
          // Unsupported type - leave as 'xxx' for caller to handle
          break;
      }
      if (resultValue && resultValue !== undefined) {
        measurement.value = resultValue;
      }
      result[key] = measurement;
    } catch (err) {
      // Error reading register - leave measurement as 'xxx' for caller to handle
      // Errors should be logged by the calling device class
    }
  }
  return result;
}

// Read holding registers from Modbus client and return measurements = SDM630
export async function checkHoldingRegisterPower(registers: Object, client: InstanceType<typeof Modbus.client.TCP>) {
  const result: Record<string, Measurement> = {};

  for (const [key, value] of Object.entries(registers)) {
    try {
      const res = client.readHoldingRegisters(value[0], value[1]);
      const actualRes = await res;
      const { response } = actualRes;
      const measurement: Measurement = {
        value: INVALID_VALUE,
        scale: value[4],
        label: value[3],
      };
      let resultValue: string = INVALID_VALUE;
      switch (value[2]) {
        case 'UINT16':
          resultValue = response.body.valuesAsArray[0].toString();
          break;
        case 'INT16':
          resultValue = response.body.valuesAsBuffer.readInt16BE().toString();
          break;
        case 'UINT32':
          resultValue = ((response.body.valuesAsArray[0] << 16) | response.body.valuesAsArray[1]).toString();
          break;
        default:
          break;
      }
      if (resultValue && resultValue !== undefined) {
        measurement.value = resultValue;
      }
      result[key] = measurement;
    } catch (err) {
      // Error reading register - leave measurement as INVALID_VALUE for caller to handle
      // Errors should be logged by the calling device class
      result[key] = {
        value: INVALID_VALUE,
        scale: value[4],
        label: value[3],
      };
    }
  }
  return result;
}

