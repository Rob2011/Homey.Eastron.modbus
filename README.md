# Eastron – Modbus for Homey Pro

Bring accurate, real-time energy monitoring from Eastron Modbus energy meters into Homey Pro so you can visualize consumption, build smart flows and optimize energy usage.

This Homey app reads measurements from Eastron energy meters using Modbus TCP and exposes live values (power, voltage, current, energy, etc.) inside Homey.

Links
- Homey App: https://homey.app/nl-nl/app/eastron.modbus/Eastron/
- Community & Support: https://community.homey.app/t/app-pro-eastron-app-to-support-eastron-sdm-energy-meters-in-homey-pro/147339
- Modbus TCP gateway project (ESP32): https://github.com/Rob2011/ESP32.Modbus-TCP-gateway

Requirements
- Homey Pro
- Energy meter with Modbus RTU or Modbus TCP support
- Modbus TCP gateway (if your meter only supports RS-485/RTU)
- Homey and meter/gateway on the same local network (or routable between Homey and gateway)

Supported devices
- Eastron SDM72D-M
- Eastron SDM120CT
- Eastron SDM230
- Eastron SDM630 V3

Quick Install
1. Install the "Eastron – Modbus" app from the Homey App Store: https://homey.app/nl-nl/app/eastron.modbus/Eastron/
2. Ensure your Modbus TCP gateway and meter are powered and connected to the network.
3. Open the app in Homey and add a new device. Provide the gateway IP address, port and unit id (see Configuration below).

Configuration (common Modbus TCP settings)
- IP address: the IP of your Modbus TCP gateway or meter (e.g., 192.168.1.50)
- Port: usually 502 (default Modbus TCP port)
- Unit ID / Slave ID: the Modbus unit/slave id set on the meter (often 1)
- Polling interval: how often the app reads registers (adjust to balance responsiveness and network/load)

Example settings:
```text
IP: 192.168.1.50
Port: 502
Unit ID: 1
Polling interval: 5s
```

Notes
- If your meter uses RS-485 (Modbus RTU), use a Modbus TCP gateway (e.g., the ESP32 gateway linked above).

What the app provides
- Live sensor values exposed in Homey (e.g., total power, per-phase power, voltage, current, energy totals)
- Ability to use energy data in Homey Flows for automation
- Integration with the Homey Energy dashboard where supported

Troubleshooting
- No data / connection error:
  - Verify gateway and Homey are on the same network and IP/port are correct.
  - Check the meter's Unit ID matches the configured ID.
  - Ensure the gateway is configured to forward Modbus TCP to the meter (for RTU-over-TCP setups).
  - Use a Modbus tester (e.g., QModMaster) from a PC on the same network to confirm register responses.
- Wrong values:
  - Confirm meter model and register map (scaling/byte order differences may affect values).
  - Try different polling intervals if values appear stale.

Development & Contributions
- The Modbus TCP gateway firmware is available at: https://github.com/Rob2011/ESP32.Modbus-TCP-gateway
- Contributions, bug reports and feature requests are welcome — please open an issue in this repository or post to the Homey Community thread linked above.

License
- See the repository LICENSE file for license details.

