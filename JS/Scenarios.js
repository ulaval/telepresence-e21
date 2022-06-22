/*jshint esversion: 6 */
//VERSION:6.0

const xapi = require('xapi');
const Rkhelper = require('./Rkhelper');
const RoomConfig = require('./RoomConfig');

const DEBUG = false;


const PRES_NOPRES = 'PRES_NOPRESENTATION';
const PRES_LOCALPREVIEW = 'PRES_LOCALPREVIEW';
const PRES_LOCALSHARE = 'PRES_LOCALSHARE';
const PRES_REMOTE = 'PRES_REMOTE';
const PRES_REMOTELOCALPREVIEW = 'PRES_REMOTELOCALPREVIEW';

module.exports.PRES_NOPRES = PRES_NOPRES;
module.exports.PRES_LOCALPREVIEW = PRES_LOCALPREVIEW;
module.exports.PRES_LOCALSHARE = PRES_LOCALSHARE;
module.exports.PRES_REMOTE = PRES_REMOTE;
module.exports.PRES_REMOTELOCALPREVIEW = PRES_REMOTELOCALPREVIEW;

const OUT_MON = RoomConfig.config.video.remoteMonitorOutputId;
const OUT_PROJ = RoomConfig.config.video.projectorOutputId;
const MON_AUTO = 'Auto';
const MON_DUAL = 'Dual';
const MON_DUALPRESENTATIONONLY = 'DualPresentationOnly';
const MON_SINGLE = 'Single';
const MON_TRIPLE = 'Triple';
const MON_TRIPLEPRESENTATIONONLY = 'TriplePresentationOnly';
const ROLE_AUTO = 'Auto';
const ROLE_FIRST = 'First';
const ROLE_PRESENTATIONONLY = 'PresentationOnly';
const ROLE_SECOND = 'Second';

const SCE_STANDBY = 'SCE_STANDBY';
const SCE_NOCALL = 'SCE_NOCALL';
const SCE_INCALL = 'SCE_INCALL';

var customScenario = false;
var customScenarioName = '';



var selfViewStatus = 'Off';

function callPreset(name) {

  Rkhelper.System.Camera.getPresetId(name).then(preset => {
    xapi.Command.Camera.Preset.Activate({ PresetId: preset.PresetId });
  }).catch(err => {
    //console.log('Preset not found');
  });
}
export class Scenarios {
  constructor(controller) {
    if (DEBUG)
      console.log(`SCENARIOS: Contructor`);
    this.type = 'Scenarios';
    this.controller = controller;
    this.statusChangeCallback = Rkhelper.Status.addStatusChangeCallback(status => {
      this.statusChanged(status);
    });

    Rkhelper.IMC.registerFunction(this.enableCustomScenario);
    Rkhelper.IMC.registerFunction(this.disableCustomScenario);



    xapi.Status.Video.Selfview.Mode.on(mode => {
      selfViewStatus = mode;
      if (this.currentScenario == 'SCE_NOCALL' && !customScenario) {
        Rkhelper.Status.getSystemStatus().then(result => {
          this.update_SCE_NOCALL(result);
        });
      }
    });

  }
  tvOn() {
    clearTimeout(this.tvOffTimer);
    this.controller.tvOn();
  }
  tvOff() {
    this.controller.tvOff(false, false);
  }
  tvOffNow() {
    this.controller.tvOff(true, true);
  }
  projOn() {
    //clearTimeout(this.projOffTimer);
    this.controller.projOn();
  }
  projOff() {
    this.controller.projOff(false, false);
  }
  projOffNow() {
    this.controller.projOff(true, true);
  }
  screenUp() {
    this.controller.screenUp();
  }
  screenDown() {
    this.controller.screenDown();
  }


  enableCustomScenario(name) {
    if (DEBUG)
      console.log(`Enabling custom scenario: ${name}`);
    customScenario = true;
    customScenarioName = name;
  }
  disableCustomScenario() {
    if (DEBUG)
      console.log(`Disabling custom scenario: ${customScenarioName}`);
    customScenario = false;
    customScenarioName = '';
  }

  update_SCE_INCALL(status) {
    if (DEBUG)
      console.log('INCALL -> statusChanged');

    /* TV */
    this.tvOn();

    /* PROJECTOR */
    if (status.presLocation == 'local') {
      if (status.presentationStatus.presentationType == PRES_NOPRES) {
        this.projOff();
      }
      else {
        this.projOn();
      }
    }
    else {
      this.projOn();
    }


    /* SCREEN */
    if (status.activity == 'normal') {
      if (status.presentationStatus.presentationType == PRES_NOPRES) {
        this.screenUp();
      }
      else {
        this.screenDown();
      }
    }
    else if (status.activity == 'writeonboard') {
      this.screenUp();
    }


    /* MONITOR ROLES */
    if (status.activity == 'normal') {
      if (status.presLocation == 'local') {
        xapi.Config.Video.Monitors.set(MON_DUALPRESENTATIONONLY);
        xapi.Config.Video.Output.Connector[OUT_PROJ].MonitorRole.set(ROLE_PRESENTATIONONLY);
        xapi.Config.Video.Output.Connector[OUT_MON].MonitorRole.set(ROLE_FIRST);
        xapi.Command.Video.Matrix.Reset();
        if (status.presentationStatus.presentationType == PRES_NOPRES) {
          setTimeout(() => {
            xapi.Command.Video.Matrix.Assign({
              Mode: 'Replace',
              Output: OUT_PROJ,
              RemoteMain: 4
            });
          }, 1000);
        }
      }
      else if (status.presLocation == 'remote') {
        xapi.Config.Video.Output.Connector[OUT_PROJ].MonitorRole.set(ROLE_FIRST);
        xapi.Config.Video.Output.Connector[OUT_MON].MonitorRole.set(ROLE_FIRST);
        if (status.presentationStatus.presentationType == PRES_NOPRES) {
          xapi.Config.Video.Monitors.set(MON_DUALPRESENTATIONONLY);
          xapi.Command.Video.Matrix.Reset();
        }
        else if (status.presentationStatus.presentationType == PRES_LOCALPREVIEW || status.presentationStatus.presentationType == PRES_LOCALSHARE) {
          xapi.Config.Video.Monitors.set(MON_SINGLE);
          xapi.Command.Video.Matrix.Reset();
          xapi.Command.Video.Layout.LayoutFamily.Set({
            LayoutFamily: 'Overlay',
            Target: 'Local'
          });

          xapi.Command.Video.ActiveSpeakerPIP.Set({
            Position: RoomConfig.config.room.remotePresenterPIPPosition
          });
          setTimeout(() => {
            xapi.Command.Video.Matrix.Assign({
              Mode: 'Replace',
              Output: OUT_MON,
              RemoteMain: 1,
            });
          }, 1000);

        }
        else if (status.presentationStatus.presentationType == PRES_REMOTE) {
          xapi.Config.Video.Monitors.set(MON_SINGLE);
          xapi.Command.Video.Matrix.Reset();
          xapi.Command.Video.Layout.LayoutFamily.Set({
            LayoutFamily: 'Overlay',
            Target: 'Local'
          });

          xapi.Command.Video.ActiveSpeakerPIP.Set({
            Position: RoomConfig.config.room.remotePresenterPIPPosition
          });
          setTimeout(() => {
            xapi.Command.Video.Matrix.Assign({
              Mode: 'Replace',
              Output: OUT_MON,
              RemoteMain: 1,
            });
          }, 1000);

        }
        else if (status.presentationStatus.presentationType == PRES_REMOTELOCALPREVIEW) {
          xapi.Config.Video.Monitors.set(MON_SINGLE);
          xapi.Command.Video.Matrix.Reset();
          xapi.Command.Video.Layout.LayoutFamily.Set({
            LayoutFamily: 'Overlay',
            Target: 'Local'
          });

          xapi.Command.Video.ActiveSpeakerPIP.Set({
            Position: RoomConfig.config.room.remotePresenterPIPPosition
          });
          setTimeout(() => {
            xapi.Command.Video.Matrix.Assign({
              Mode: 'Replace',
              Output: OUT_MON,
              RemoteMain: 1,
            });
          }, 1000);

        }
      }

    }
    else if (status.activity == 'writeonboard') {
      if (RoomConfig.config.room.boardBehindScreen) {
        setTimeout(() => {
          xapi.Command.Video.Matrix.Assign({
            Mode: 'Replace',
            Output: OUT_PROJ,
            RemoteMain: 4
          });
        }, 1000);

      }
      if (status.presLocation == 'local') {
        xapi.Config.Video.Monitors.set(MON_DUALPRESENTATIONONLY);
        xapi.Config.Video.Output.Connector[OUT_PROJ].MonitorRole.set(ROLE_PRESENTATIONONLY);
        xapi.Config.Video.Output.Connector[OUT_MON].MonitorRole.set(ROLE_FIRST);
        xapi.Command.Video.Matrix.Reset();

      }
      else if (status.presLocation == 'remote') {
        if (RoomConfig.config.room.boardBehindScreen) {
          setTimeout(() => {
            xapi.Command.Video.Matrix.Assign({
              Mode: 'Replace',
              Output: OUT_PROJ,
              RemoteMain: 4
            });
          }, 1000);

        }
        if (status.presentationStatus.presentationType == PRES_NOPRES) {
          xapi.Config.Video.Monitors.set(MON_DUALPRESENTATIONONLY);
          xapi.Config.Video.Output.Connector[OUT_PROJ].MonitorRole.set(ROLE_FIRST);
          xapi.Config.Video.Output.Connector[OUT_MON].MonitorRole.set(ROLE_FIRST);
        }
        else if (status.presentationStatus.presentationType == PRES_LOCALPREVIEW || status.presentationStatus.presentationType == PRES_LOCALSHARE) {
          xapi.Config.Video.Monitors.set(MON_SINGLE);
          xapi.Config.Video.Output.Connector[OUT_PROJ].MonitorRole.set(ROLE_FIRST);
          xapi.Config.Video.Output.Connector[OUT_MON].MonitorRole.set(ROLE_FIRST);
        }
        else if (status.presentationStatus.presentationType == PRES_REMOTE) {
          xapi.Config.Video.Monitors.set(MON_DUALPRESENTATIONONLY);
          xapi.Config.Video.Output.Connector[OUT_PROJ].MonitorRole.set(ROLE_PRESENTATIONONLY);
          xapi.Config.Video.Output.Connector[OUT_MON].MonitorRole.set(ROLE_FIRST);
        }
        else if (status.presentationStatus.presentationType == PRES_REMOTELOCALPREVIEW) {
          xapi.Config.Video.Monitors.set(MON_DUALPRESENTATIONONLY);
          xapi.Config.Video.Output.Connector[OUT_PROJ].MonitorRole.set(ROLE_PRESENTATIONONLY);
          xapi.Config.Video.Output.Connector[OUT_MON].MonitorRole.set(ROLE_FIRST);
        }
        xapi.Command.Video.Matrix.Reset();
      }
    }


    /* CAMERA */
    if (status.activity == 'normal') {
      if (status.presLocation == 'local') {
        if (RoomConfig.config.room.autoEnablePresenterTrack) {
          xapi.Command.Cameras.PresenterTrack.Set({
            Mode: 'Follow'
          });
        }
        else {
          callPreset('Console');
        }
      }
      else if (status.presLocation == 'remote') {
        if (RoomConfig.config.room.useRoomPreset)
          callPreset('Salle');
      }
    }
    else if (status.activity == 'writeonboard') {
      callPreset('Tableau');
    }

    /* AUDIO ROUTING */
    if (status.presLocation == 'local') {
      Rkhelper.Audio.getLocalOutputId('Room').then(roomOutput => {
        Rkhelper.Audio.getLocalOutputId('Monitor').then(monitorOutput => {
          Rkhelper.Audio.getRemoteInputsIds().then(ri => {
            ri.forEach(i => {
              xapi.Command.Audio.LocalOutput.DisconnectInput({
                InputId: i,
                OutputId: roomOutput
              });
              xapi.Command.Audio.LocalOutput.ConnectInput({
                InputId: i,
                OutputId: monitorOutput
              });
            });
          });
        });
      });
    }
    else {
      Rkhelper.Audio.getLocalOutputId('Room').then(roomOutput => {
        Rkhelper.Audio.getLocalOutputId('Monitor').then(monitorOutput => {
          Rkhelper.Audio.getRemoteInputsIds().then(ri => {
            ri.forEach(i => {
              xapi.Command.Audio.LocalOutput.ConnectInput({
                InputId: i,
                OutputId: roomOutput
              });
              xapi.Command.Audio.LocalOutput.DisconnectInput({
                InputId: i,
                OutputId: monitorOutput
              });
            });
          });
        });
      });
    }
    /* LIGHTS */
    if (status.activity == 'normal') {
      if (status.presentationStatus.presentationType == PRES_NOPRES) {
        if (status.presLocation == 'local') {
          this.controller.activateLightScene('scene_normal');
        }
        else {
          this.controller.activateLightScene('scene_projection');
        }
      }
      else {
        this.controller.activateLightScene('scene_projection');
      }
    }
    else if (status.activity == 'writeonboard') {
      this.controller.activateLightScene('scene_board');
    }
  }



  update_SCE_NOCALL(status) {
    if (DEBUG)
      console.log('NOCALL -> statusChanged');

    /* TV */
    this.tvOn();


    /* PROJECTOR */
    if (status.presentationStatus.presentationType == PRES_NOPRES) {
      this.projOff();
    }
    else {
      this.projOn();
    }

    /* SCREEN */
    if (status.activity == 'normal') {
      if (status.presentationStatus.presentationType == PRES_NOPRES) {
        //this.screenUp(); ne remonte pas la toile pour rien
      }
      else {
        this.screenDown();
      }
    }
    else if (status.activity == 'writeonboard') {
      this.screenUp();
    }



    /* VIDEO ROUTING */
    if (status.activity == 'normal') {
      if (status.presentationStatus.presentationType == PRES_NOPRES) {
        xapi.Command.Video.Matrix.Reset();
        setTimeout(() => {
          xapi.Command.Video.Matrix.Assign({
            Mode: 'Replace',
            Output: OUT_MON,
            RemoteMain: 4
          });

          xapi.Command.Video.Matrix.Assign({
            Mode: 'Replace',
            Output: OUT_PROJ,
            RemoteMain: 4
          });
        }, 1000);


        if (selfViewStatus == 'On') {
          setTimeout(() => {
            xapi.Command.Video.Matrix.Assign({
              Mode: 'Replace',
              Output: OUT_MON,
              SourceId: RoomConfig.config.camera.connector
            });
          }, 1000);

        }
      }
      else {
        xapi.Config.Video.Monitors.set(MON_DUALPRESENTATIONONLY);
        xapi.Config.Video.Output.Connector[OUT_PROJ].MonitorRole.set(ROLE_PRESENTATIONONLY);
        xapi.Config.Video.Output.Connector[OUT_MON].MonitorRole.set(ROLE_PRESENTATIONONLY);
        xapi.Command.Video.Matrix.Reset({
          Output: OUT_PROJ
        });
        xapi.Command.Video.Matrix.Reset({
          Output: OUT_MON
        });
        if (selfViewStatus == 'On') {
          setTimeout(() => {
            xapi.Command.Video.Matrix.Assign({
              Mode: 'Replace',
              Output: OUT_MON,
              SourceId: RoomConfig.config.camera.connector
            });
          }, 1000);

        }
      }
    }
    else if (status.activity == 'writeonboard') {
      if (status.presentationStatus == PRES_NOPRES) {
        xapi.Command.Video.Matrix.Reset();
        setTimeout(() => {
          xapi.Command.Video.Matrix.Assign({
            Mode: 'Replace',
            Output: OUT_PROJ,
            RemoteMain: 4
          });
          xapi.Command.Video.Matrix.Assign({
            Mode: 'Replace',
            Output: OUT_MON,
            RemoteMain: 4
          });
        }, 1000);

        if (selfViewStatus == 'On') {
          setTimeout(() => {
            xapi.Command.Video.Matrix.Assign({
              Mode: 'Replace',
              Output: OUT_MON,
              SourceId: RoomConfig.config.camera.connector
            });
          }, 1000);

        }
      }
      else {
        xapi.Config.Video.Monitors.set(MON_DUALPRESENTATIONONLY);
        xapi.Config.Video.Output.Connector[OUT_PROJ].MonitorRole.set(ROLE_PRESENTATIONONLY);
        xapi.Config.Video.Output.Connector[OUT_MON].MonitorRole.set(ROLE_PRESENTATIONONLY);
        xapi.Command.Video.Matrix.Reset();
        if (RoomConfig.config.room.boardBehindScreen) {
          setTimeout(() => {
            xapi.Command.Video.Matrix.Assign({
              Mode: 'Replace',
              Output: OUT_PROJ,
              RemoteMain: 4
            });
          }, 1000);

        }
        if (selfViewStatus == 'On') {
          setTimeout(() => {
            xapi.Command.Video.Matrix.Assign({
              Mode: 'Replace',
              Output: OUT_MON,
              SourceId: RoomConfig.config.camera.connector
            });
          }, 1000);

        }
      }
    }

    /* LIGHTS */
    if (status.activity == 'normal') {
      if (status.presentationStatus.presentationType == PRES_NOPRES) {
        this.controller.activateLightScene('scene_normal');
      }
      else {
        this.controller.activateLightScene('scene_projection');
      }
    }
    else if (status.activity == 'writeonboard') {
      this.controller.activateLightScene('scene_board');
    }
  }

  update_SCE_STANDBY(status) {
    if (DEBUG)
      console.log('STANDBY -> statusChanged');
    xapi.Command.Video.Matrix.Reset();
    this.tvOffNow();
    this.projOffNow();
    this.screenUp();
    xapi.Command.Video.Selfview.Set({ mode: 'Off' });
    this.controller.activateLightScene('scene_normal');
  }

  statusChanged(status) {
    if (DEBUG)
      console.log(`SCENARIOS: statusChanged`);

    if (customScenario) {
      if (DEBUG)
        console.log(`SCENARIOS: skipping statusChanged, custom scenario in use: ${customScenarioName}`);
    }
    else {
      xapi.Status.Standby.State.get().then(standby => {
        if (standby == 'Standby') {
          this.currentScenario = 'SCE_STANDBY';
          this.update_SCE_STANDBY(status);
        }
        else if (standby == 'Off') {

          if (status.callStatus.Status == undefined) {
            this.currentScenario = 'SCE_NOCALL';
            this.update_SCE_NOCALL(status);
          }
          else if (status.callStatus.Status == 'Connected' || status.callStatus.Status == 'Connecting') {
            this.currentScenario = 'SCE_INCALL';
            this.update_SCE_INCALL(status);
          }
        }
      });
    }
  }
}




