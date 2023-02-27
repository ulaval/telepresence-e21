/*jshint esversion: 6 */
const xapi = require('xapi');
const RoomConfig = require('./RoomConfig');

const DEBUG = false;

module.exports.TV = class TV {
  constructor(controller) {
    this.controller = controller;
    this.tvOffTimer = undefined;
  }
  on() {
    if (DEBUG)
      console.log('[TV] -> ON');
    xapi.Command.Message.Send({
      Text: `TV_POWER_ON`
    });
    this.status = 'on';
    xapi.Command.UserInterface.Extensions.Widget.SetValue({
      WidgetId: 'tvpower',
      Value: 'on'
    }).catch(e => { });
    clearTimeout(this.tvOffTimer);
  }
  off(nodelay) {
    var delay;
    if (DEBUG)
      console.log('[TV] -> OFF');
    xapi.Command.Message.Send({
      Text: `TV_POWER_OFF`
    });
    if (nodelay) {
      delay = 1;
    }
    else {
      delay = RoomConfig.config.room.tvOffDelay;
    }
    clearTimeout(this.tvOffTimer);
    this.tvOffTimer = setTimeout(function () {
      xapi.Command.Message.Send({
        Text: `TV_POWER_OFF`
      });
    }, delay);
    this.status = 'off';
    xapi.Command.UserInterface.Extensions.Widget.SetValue({
      WidgetId: 'tvpower',
      Value: 'off'
    }).catch(e => { });
  }
  getStatus() {
    return this.status;
  }
};
module.exports.Projector = class Projector {
  constructor(controller) {
    this.controller = controller;
    this.projOffTimer = undefined;
  }
  on() {
    if (DEBUG)
      console.log('[PROJ] -> ON');

    xapi.Command.Message.Send({
      Text: `PROJ_POWER_ON`
    });
    this.status = 'on';
    xapi.Command.UserInterface.Extensions.Widget.SetValue({
      WidgetId: 'projpower',
      Value: 'on'
    }).catch(e => { });
    clearTimeout(this.projOffTimer);
  }
  off(nodelay) {
    var delay;
    if (DEBUG)
      console.log('[PROJ] -> OFF');

    if (nodelay) {
      delay = 1;
    }
    else {
      delay = RoomConfig.config.room.projOffDelay;
    }
    clearTimeout(this.projOffTimer);
    this.projOffTimer = setTimeout(function () {
      xapi.Command.Message.Send({
        Text: `PROJ_POWER_OFF`
      });
    }, delay);

    this.status = 'off';
    xapi.Command.UserInterface.Extensions.Widget.SetValue({
      WidgetId: 'projpower',
      Value: 'off'
    }).catch(e => { });
  }
  getStatus() {
    return this.status;
  }
};
module.exports.Screen = class Screen {
  constructor(controller) {
    this.controller = controller;
    this.position = 'up';
  }
  up() {
    if (DEBUG)
      console.log('[SCREEN] -> UP');
    if (this.position != 'up') {
      xapi.Command.Message.Send({
        Text: `SCREEN_UP`
      });
      this.position = 'up';
    }
  }
  down() {
    if (DEBUG)
      console.log('[SCREEN] -> DOWN');
    if (this.position != 'down') {
      xapi.Command.Message.Send({
        Text: `SCREEN_DN`
      });
      this.position = 'down';
    }

  }
  stop() {

  }
  getStatus() {
    return this.position;
  }
};