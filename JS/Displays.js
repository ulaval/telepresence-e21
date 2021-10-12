/************************************************************

Système: Salles comodales 2021
Script: Displays
Version: ->2.0
Description: Gère le statut, les messages et les états des
             affichages

Auteur: Zacharie Gignac
Date: Août 2021
Organisation: Université Laval


MIT License

Copyright (c) 2021 ul-sse

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

CHANGELOG

Version 4
  - CHANGELOG MOVED TO GITHUB

Version 2:
  - Arrangé un bug pour empêcher le module Crestron d'executer 2 fois la commande
    "SCREEN_DN" ou "SCREEN_UP" qui apparemment stop la toile

Version 1:
  - Version initiale

*************************************************************/

import xapi from 'xapi';
import * as RoomConfig from './RoomConfig';

const DEBUG = true;

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