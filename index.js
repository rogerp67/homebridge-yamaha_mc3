const fetch = require('node-fetch');

let Service, Characteristic;

module.exports = (homebridge) => {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory("homebridge-yamaha_mc3", YamahaMC3);
};

class YamahaMC3 {
  constructor(log, config) {
    this.currentState = false;
    this.log = log;
    this.name = config["name"];
    this.host = config["host"];
    this.zone = config["zone"];
    this.maxVol = config["maxvol"] || 100;

    // Voor caching van services
    this.informationService = null;
    this.fanv2Service = null;
  }

  getServices() {
    this.informationService = new Service.AccessoryInformation();
    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, "Cambit")
      .setCharacteristic(Characteristic.Model, "Yamaha MC3")
      .setCharacteristic(Characteristic.SerialNumber, "6710160350");

    this.fanv2Service = new Service.Fanv2(this.name || "Amplifier");
    this.fanv2Service
      .getCharacteristic(Characteristic.Active)
      .on('get', this.getFanv2ActiveCharacteristic.bind(this))
      .on('set', this.setFanv2ActiveCharacteristic.bind(this));
    this.fanv2Service
      .getCharacteristic(Characteristic.RotationSpeed)
      .on('get', this.getFanv2RotationSpeedCharacteristic.bind(this))
      .on('set', this.setFanv2RotationSpeedCharacteristic.bind(this));

    return [this.informationService, this.fanv2Service];
  }

  async getFanv2ActiveCharacteristic(next) {
    try {
      const resp = await fetch(
        `http://${this.host}/YamahaExtendedControl/v1/${this.zone}/getStatus`,
        {
          method: 'GET',
          headers: {
            'X-AppName': 'MusicCast/1.0',
            'X-AppPort': '41100'
          }
        }
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const att = await resp.json();
      if (!att || typeof att.power === "undefined") {
        this.log("Status object mist power!", att);
        return next(new Error("Status object mist power"));
      }
      this.log("HTTP GetStatus result:", att.power === "on" ? "On" : "Off");
      return next(null, att.power === "on");
    } catch (e) {
      this.log("Ophalen power-fout:", e.message);
      next(e);
    }
  }

  async setFanv2ActiveCharacteristic(on, next) {
    const url = `http://${this.host}/YamahaExtendedControl/v1/${this.zone}/setPower?power=${on ? "on" : "standby"}`;
    try {
      const resp = await fetch(url, { method: 'GET' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      next();
    } catch (e) {
      this.log("Power-set-fout:", e.message);
      next(e);
    }
  }

  async getFanv2RotationSpeedCharacteristic(next) {
    try {
      const resp = await fetch(
        `http://${this.host}/YamahaExtendedControl/v1/${this.zone}/getStatus`,
        {
          method: 'GET',
          headers: {
            'X-AppName': 'MusicCast/1.0',
            'X-AppPort': '41100'
          }
        }
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const att = await resp.json();
      if (!att || typeof att.volume === "undefined") {
        this.log("Status object mist volume!", att);
        return next(new Error("Status object mist volume"));
      }
      const res = Math.floor(att.volume / this.maxVol * 100);
      this.log("HTTP GetStatus result volume:", res);
      next(null, res);
    } catch (e) {
      this.log("Volume-get-fout:", e.message);
      next(e);
    }
  }

  async setFanv2RotationSpeedCharacteristic(volume, next) {
    const setVolume = Math.floor(volume / 100 * this.maxVol);
    const url = `http://${this.host}/YamahaExtendedControl/v1/${this.zone}/setVolume?volume=${setVolume}`;
    try {
      const resp = await fetch(url, { method: 'GET' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      next();
    } catch (e) {
      this.log("Volume-set-fout:", e.message);
      next(e);
    }
  }
}

