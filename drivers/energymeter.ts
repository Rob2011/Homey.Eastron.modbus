import * as Modbus from 'jsmodbus';
import * as net from 'net';
import Homey, { Device } from 'homey';

// Constants for invalid values
export const INVALID_VALUE = 'xxx';
export const INVALID_NUMERIC_VALUE = '-1';

// Number of consecutive failed polls before the device is marked unavailable
const MAX_FAILED_POLLS = 3;

// Eastron meters accept at most 40 parameters (80 registers) per request; stay well below
const MAX_BLOCK_REGISTERS = 40;
// Merge registers into one request when the unused gap between them is at most this many registers
const MAX_BLOCK_GAP = 10;

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

  // Poll state: prevents overlapping polls and tracks connection health
  private pollInProgress = false;
  private consecutiveFailures = 0;
  // Register blocks the meter refused to read in one request (read individually instead)
  private readonly unsupportedBlocks = new Set<string>();

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

    }
  }

  // Helper method to get register address for a capability
  protected getRegisterAddressForCapability(capability: string): number | undefined {
    // Try to use getMappingAndRegister if it exists
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
  protected processRegisterValue(capability: string, registerValue: number): number | null {
    // Try to use processRegisterValueCommon if it exists
    const processRegisterValueCommon = (this as any).processRegisterValueCommon;
    if (processRegisterValueCommon && this.holdingRegistersBase) {
      return processRegisterValueCommon.call(this, capability, registerValue, this.holdingRegistersBase);
    }
    return null;
  }

  // Mark the device unavailable after several failed polls, available again on the first good one
  private async updateAvailability(success: boolean) {
    if (success) {
      this.consecutiveFailures = 0;
      if (!this.getAvailable()) {
        await this.setAvailable();
      }
      return;
    }
    this.consecutiveFailures += 1;
    if (this.consecutiveFailures >= MAX_FAILED_POLLS && this.getAvailable()) {
      await this.setUnavailable(this.homey.__('Device_unavailable'));
    }
  }

  // Main method to poll the powermeter
  async pollPowermeter() {
    if (!this.registers || !this.holdingRegistersBase) {
      this.error('pollPowermeter: registers or holdingRegistersBase not defined');
      return;
    }

    if (this.pollInProgress) {
      this.log('pollPowermeter: previous poll still running, skipping');
      return;
    }
    this.pollInProgress = true;

    this.log(`[${new Date().toISOString()}] pollPowermeter started`);
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

    let pollSucceeded = false;
    let pollFinished = false;
    const cleanup = () => {
      if (!pollFinished) {
        pollFinished = true;
        this.pollInProgress = false;
        this.updateAvailability(pollSucceeded).catch(this.error);
      }
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
          const checkRegisterRes = await checkRegisterPower(this.registers!, client, this.unsupportedBlocks);
          const checkHoldingRegisterRes = await checkHoldingRegisterPower(this.holdingRegistersBase!, client);
          const finalRes = { ...checkRegisterRes, ...checkHoldingRegisterRes };
          pollSucceeded = Object.values(finalRes).some((m) => m.value !== INVALID_VALUE);
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


// ### functions to read registers from different meters ###

// Decode a single register value from a buffer holding exactly that register's words
function decodeRegisterValue(dataType: string, buffer: Buffer): string {
  switch (dataType) {
    case 'UINT16':
      return buffer.readUInt16BE().toString();
    case 'INT16':
      return buffer.readInt16BE().toString();
    case 'UINT32':
      return buffer.readUInt32BE().toString();
    case 'INT16LE':
      return buffer.readInt16LE().toString();
    case 'UINT16LE':
      return buffer.readUInt16LE().toString();
    case 'INT32':
      return buffer.readInt32BE().toString();
    case 'FLOAT32': {
      const value = buffer.readFloatBE();
      // NaN / Infinity means the meter does not supply this value
      return Number.isFinite(value) ? value.toString() : INVALID_VALUE;
    }
    case 'SCALE':
      return Math.pow(10, buffer.readInt16BE()).toString();
    case 'STRING':
      return buffer.toString();
    default:
      // Unsupported type - leave as 'xxx' for caller to handle
      return INVALID_VALUE;
  }
}

// Group register definitions into blocks that can be read with one Modbus request
function groupRegistersIntoBlocks(registers: { [key: string]: RegisterDefinition }) {
  const sorted = Object.entries(registers).sort((a, b) => a[1][0] - b[1][0]);
  const blocks: { start: number; length: number; entries: [string, RegisterDefinition][] }[] = [];

  for (const entry of sorted) {
    const [address, length] = entry[1];
    const current = blocks[blocks.length - 1];
    const end = address + length;
    if (
      current
      && address - (current.start + current.length) <= MAX_BLOCK_GAP
      && end - current.start <= MAX_BLOCK_REGISTERS
    ) {
      current.length = Math.max(current.length, end - current.start);
      current.entries.push(entry);
    } else {
      blocks.push({ start: address, length, entries: [entry] });
    }
  }
  return blocks;
}

// Read input registers from Modbus client and return measurements.
// Registers are read in blocks to limit the number of requests; when a meter (or gateway)
// rejects a block, its registers are read one by one and the block is remembered.
export async function checkRegisterPower(
  registers: { [key: string]: RegisterDefinition },
  client: InstanceType<typeof Modbus.client.TCP>,
  unsupportedBlocks: Set<string> = new Set(),
) {
  const result: Record<string, Measurement> = {};

  const readSingle = async (key: string, value: RegisterDefinition) => {
    const measurement: Measurement = {
      value: INVALID_VALUE,
      scale: value[4].toString(),
      label: value[3],
    };
    try {
      const { response } = await client.readInputRegisters(value[0], value[1]);
      measurement.value = decodeRegisterValue(value[2], response.body.valuesAsBuffer);
    } catch (err) {
      // Error reading register - leave measurement as 'xxx' for caller to handle
    }
    result[key] = measurement;
  };

  for (const block of groupRegistersIntoBlocks(registers)) {
    const blockId = `${block.start}:${block.length}`;
    if (block.entries.length > 1 && !unsupportedBlocks.has(blockId)) {
      try {
        const { response } = await client.readInputRegisters(block.start, block.length);
        const buffer = response.body.valuesAsBuffer;
        for (const [key, value] of block.entries) {
          const offset = (value[0] - block.start) * 2;
          result[key] = {
            value: decodeRegisterValue(value[2], buffer.subarray(offset, offset + value[1] * 2)),
            scale: value[4].toString(),
            label: value[3],
          };
        }
        continue;
      } catch (err) {
        unsupportedBlocks.add(blockId);
      }
    }
    for (const [key, value] of block.entries) {
      await readSingle(key, value);
    }
  }
  return result;
}

// Read holding registers from Modbus client and return measurements = SDM630
export async function checkHoldingRegisterPower(registers: { [key: string]: RegisterDefinition }, client: InstanceType<typeof Modbus.client.TCP>) {
  const result: Record<string, Measurement> = {};

  for (const [key, value] of Object.entries(registers)) {
    try {
      const res = client.readHoldingRegisters(value[0], value[1]);
      const actualRes = await res;
      const { response } = actualRes;
      const measurement: Measurement = {
        value: INVALID_VALUE,
        scale: value[4].toString(),
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
        scale: value[4].toString(),
        label: value[3],
      };
    }
  }
  return result;
}

