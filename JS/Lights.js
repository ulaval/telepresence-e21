/************************************************************

Système: Salles comodales 2021
Script: Lights
Version: ->2.0
Description: Gère le statut, les messages et les états de
             l'éclairage

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

Version 4:
  

Version 2:
  - Enlevé les commandes ON et OFF, remplacés par "DIM 100" et "DIM 0"
  - Arrangé un bug qui dans certaines circonstances ne remet pas le niveau de "DIM" au niveau antérieur après une commande "ON" manuelle


*************************************************************/


import xapi from 'xapi';
import * as RoomConfig from './RoomConfig';

const DEBUG = false;

export class Lights {
  constructor(controller) {
    this.controller = controller;
    this.uiListener = undefined;
    this.ready = false;
    this._lightsConfig = RoomConfig.config.lights;
    this.lastScene = undefined;
    const that = this;

    if (that.uiListener != undefined) {
      that.uiListener();
    }
    that.uiListener = xapi.Event.UserInterface.Extensions.Widget.Action.on(action => {
      if (action.WidgetId == 'tgl_autolightsmode' && action.Type == 'changed' && action.Value == 'off') {
        that.updateZoneWidgets();
      }

      that._lightsConfig.scenes.forEach(scene => {
        if (action.WidgetId == scene.id && action.Type == 'clicked') {
          that.executeScene(scene.id);
        }
      });

      this._lightsConfig.zones.forEach(function (element, index) {
        if (action.Type == 'changed') {
          if (action.WidgetId == element.id + '_onoff') {
            that.zoneOnOff(that._lightsConfig.zones[index], action.Value);
            if (action.Value == 'on') {
              that.zoneDim(that._lightsConfig.zones[index], that._lightsConfig.zones[index].level);
            }
          }
        }
        if (action.Type == 'clicked') {
          if (action.WidgetId == element.id + '_dim' && action.Value == 'increment') {
            that.zoneDimIncDec(that._lightsConfig.zones[index], element.steps);
          }
          else if (action.WidgetId == element.id + '_dim' && action.Value == 'decrement') {
            that.zoneDimIncDec(that._lightsConfig.zones[index], -element.steps);
          }
        }
      });
    });

  }


  sendMessage(text) {
    text = text.toUpperCase();
    if (DEBUG)
      console.log(`Lights -> ${text}`)
    xapi.Command.Message.Send({
      Text: text
    });
  }

  executeScene(sceneId) {
    var delaycount = 0;
    const that = this;
    var zone = undefined;
    if (this.lastScene != sceneId) {
      this.lastScene = sceneId;
      if (DEBUG)
        console.log('Execute lights scene: ' + sceneId);

      this._lightsConfig.scenes.forEach(s => {
        if (s.id == sceneId) {
          s.presets.forEach(p => {
            let tempzone = {}
            tempzone.id = p.zone;
            setTimeout(function () {
              that.zoneOnOff(tempzone, p.state,true);
              setTimeout(function () {
                that.zoneDim(tempzone, p.level);
              }, delaycount);
            }, delaycount);
            delaycount += 1000;
          });
        }
      });
    }
  }

  zoneOnOff(zone, onoff, executescene) {
    const that = this;
    that._lightsConfig.zones.forEach(function (element, index) {

      if (element.id == zone.id) {

        that._lightsConfig.zones[index].state = onoff;
        //that.sendMessage(`${zone.id}_${onoff}`);

        that._lightsConfig.zones[index].state = onoff;
        if (onoff == 'on') {
          if (!executescene) {
            that.zoneDim(zone, that._lightsConfig.zones[index].lastDimLevel);
          }
        }
        else {
          that._lightsConfig.zones[index].lastDimLevel = that._lightsConfig.zones[index].level;
          that.zoneDim(zone, 0);
        }
        that.widgetSetValue(zone.id + '_onoff', onoff);
        that.updateZoneWidgets();
      }
    });
  }

  zoneDimIncDec(zone, amount) {
    var level = zone.level + amount;
    if (level < 0) level = 0;
    if (level > 100) level = 100;
    this.zoneDim(zone, level);
  }

  zoneDim(zone, level) {
    const that = this;
    that._lightsConfig.zones.forEach(function (element, index) {
      if (element.id == zone.id) {

        that._lightsConfig.zones[index].level = level;
        that.sendMessage(`${zone.id}_dim ${level}`);
        that.widgetSetValue(zone.id + '_dim', level + '%');
        that.updateZoneWidgets();

      }
    });
  }

  updateZoneWidgets() {
    const that = this;
    setTimeout(function () { //gros fix innocent parce que l'interface est un peu lente
      that._lightsConfig.zones.forEach(zone => {
        that.widgetSetValue(zone.id + '_onoff', zone.state);
        if (zone.type == 'dim') {
          that.widgetSetValue(zone.id + '_dim', zone.level + '%');
        }
      });
    }, 500);
  }

  widgetSetValue(widgetid, value) {
    xapi.Command.UserInterface.Extensions.Widget.SetValue({
      WidgetId: widgetid,
      Value: value
    }).catch(e => { });
  }


  activateLightScene(id) {
    this.executeScene(id);
  }


  ready() {
    ready = true;
  }

  notReady() {
    ready = false;
  }
}



