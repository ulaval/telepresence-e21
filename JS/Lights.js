/*jshint esversion: 6 */
import xapi from 'xapi';
import * as RoomConfig from './RoomConfig';

const DEBUG = false;

export class Lights {
  constructor(controller) {
    this.controller = controller;
    this.uiListener = undefined;
    this._lightsConfig = RoomConfig.config.lights;
    this.lastScene = undefined;
    const that = this;
    this.autolights = true;

    that.uiListener = xapi.Event.UserInterface.Extensions.Widget.Action.on(action => {
      if (action.WidgetId == 'tgl_autolightsmode' && action.Type == 'changed' && action.Value == 'off') {
        if (DEBUG)
          console.log('DISABLING AUTO LIGHTS!');
        that.updateZoneWidgets();
      }
      if (action.WidgetId == 'tgl_autolightsmode' && action.Type == 'changed' && action.Value == 'on') {
        if (DEBUG)
          console.log('ENABLING AUTO LIGHTS!');
        that.executeScene(this.lastScene, true);
        that.updateZoneWidgets();
      }

      for (let scene of that._lightsConfig.scenes) {
        if (action.WidgetId == scene.id && action.Type == 'clicked') {
          that.executeScene(scene.id, true);
        }
      }

      for (let element of that._lightsConfig.zones) {
        if (action.Type == 'changed') {
          if (action.WidgetId == element.id + '_onoff') {
            that.zoneOnOff(element, action.Value);
            if (action.Value == 'on') {
              that.zoneDim(element, element.level);
            }
          }
        }
        if (action.Type == 'clicked') {
          if (action.WidgetId == element.id + '_dim' && action.Value == 'increment') {
            that.zoneDimIncDec(element, element.steps);
          }
          else if (action.WidgetId == element.id + '_dim' && action.Value == 'decrement') {
            that.zoneDimIncDec(element, -element.steps);
          }
        }
      }
    });
  }


  sendMessage(text) {
    if (RoomConfig.config.room.lightsControl) {
      text = text.toUpperCase();
      if (DEBUG)
        console.log(`Lights -> ${text}`);
      xapi.Command.Message.Send({
        Text: text
      });
    }
  }

  executeScene(sceneId, manual = false) {
    var delaycount = 0;
    const that = this;
    if (this.lastScene != sceneId || manual) {
      this.lastScene = sceneId;
      if (DEBUG)
        console.log('Execute lights scene: ' + sceneId);

      for (let s of this._lightsConfig.scenes) {
        if (s.id == sceneId) {
          for (let p of s.presets) {
            let tempzone = {};
            tempzone.id = p.zone;
            setTimeout(function () {
              that.zoneOnOff(tempzone, p.state, true);
              setTimeout(function () {
                that.zoneDim(tempzone, p.level);
              }, delaycount);
            }, delaycount);
            delaycount += 500;
          }
        }
      }
    }
  }



  zoneOnOff(zone, onoff, executescene) {
    const that = this;
    for (let element of that._lightsConfig.zones) {
      if (element.id == zone.id) {
        element.state = onoff;
        if (onoff == 'on') {
          if (!executescene) {
            that.zoneDim(zone, element.lastDimLevel);
          }
        }
        else {
          element.lastDimLevel = element.level;
          that.zoneDim(zone, 0);
        }
        that.widgetSetValue(zone.id + '_onoff', onoff);
        that.updateZoneWidgets();
      }
    }
  }


  zoneDimIncDec(zone, amount) {
    var level = zone.level + amount;
    if (level < 0) level = 0;
    if (level > 100) level = 100;
    this.zoneDim(zone, level);
  }

  zoneDim(zone, level) {
    const that = this;
    for (let element of that._lightsConfig.zones) {
      if (element.id == zone.id) {

        element.level = level;
        that.sendMessage(`${zone.id}_dim ${level}`);
        that.widgetSetValue(zone.id + '_dim', level + '%');
        that.updateZoneWidgets();

      }
    }
  }

  updateZoneWidgets() {
    const that = this;
    setTimeout(function () { //gros fix innocent parce que l'interface est un peu lente
      for (let zone of that._lightsConfig.zones) {
        that.widgetSetValue(zone.id + '_onoff', zone.state);
        if (zone.type == 'dim') {
          that.widgetSetValue(zone.id + '_dim', zone.level + '%');
        }
      }
    }, 500);
  }

  widgetSetValue(widgetid, value) {
    xapi.Command.UserInterface.Extensions.Widget.SetValue({
      WidgetId: widgetid,
      Value: value
    }).catch(e => { });
  }


  activateLightScene(id, manual = false) {
    this.executeScene(id, manual);
  }
};