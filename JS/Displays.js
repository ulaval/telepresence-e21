import xapi from 'xapi';
import * as RoomConfig from './RoomConfig';

const DEBUG = false;

export class TV {
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
  ready() {

  }
  notReady() {

  }
}
export class Projector {
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
  ready() {

  }
  notReady() {

  }
}
export class Screen {
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
    /*
    if (DEBUG)
      console.log('[SCREEN] -> STOP');
    xapi.Command.Message.Send({
      Text: `SCREEN_STOP`
    });
    this.position = 'stop';
    */
  }
  getStatus() {
    return this.position;
  }
  ready() {

  }
  notReady() {

  }
}