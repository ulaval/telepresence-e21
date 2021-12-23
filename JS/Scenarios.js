/*jshint esversion: 6 */
//VERSION:4.2
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
    this.systemReady = false;
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


  update_SCE_STANDBY(status) {
    if (DEBUG)
      console.log('STANDBY -> statusChanged');
    xapi.Command.Video.Matrix.Reset();
    this.tvOffNow();
    this.projOffNow();
    this.screenUp();

    //audio routing (defaults)
    if (RoomConfig.config.audio.useCombinedAecReference) {
      Rkhelper.Audio.getLocalOutputId('Room').then(roomOutput => {
        Rkhelper.Audio.getLocalOutputId('Monitor').then(monitorOutput => {
          Rkhelper.Audio.getLocalOutputId('AEC').then(aecOutput => {
            xapi.Command.Audio.LocalOutput.Update({
              LoudSpeaker: 'Off',
              OutputId: aecOutput
            });
            xapi.Command.Audio.LocalOutput.Update({
              Loudspeaker: 'Off',
              OutputId: roomOutput
            });
            xapi.Command.Audio.LocalOutput.Update({
              Loudspeaker: 'On',
              OutputId: monitorOutput
            });

          });
        });
      });
    }
    else {
      Rkhelper.Audio.getLocalOutputId('Room').then(roomOutput => {
        Rkhelper.Audio.getLocalOutputId('Monitor').then(monitorOutput => {
          xapi.Command.Audio.LocalOutput.Update({
            Loudspeaker: 'Off',
            OutputId: roomOutput
          });
          xapi.Command.Audio.LocalOutput.Update({
            Loudspeaker: 'On',
            OutputId: monitorOutput
          });
        });
      });
    }

    xapi.Command.Video.Selfview.Set({ mode: 'Off' });



    this.controller.activateLightScene('scene_normal');
  }


  update_SCE_NOCALL(status, onlymatrix) {
    if (DEBUG)
      console.log('NOCALL -> statusChanged');


    //audio routing (defaults)
    if (RoomConfig.config.audio.useCombinedAecReference) {
      Rkhelper.Audio.getLocalOutputId('Room').then(roomOutput => {
        Rkhelper.Audio.getLocalOutputId('Monitor').then(monitorOutput => {
          Rkhelper.Audio.getLocalOutputId('AEC').then(aecOutput => {
            xapi.Command.Audio.LocalOutput.Update({
              LoudSpeaker: 'Off',
              OutputId: aecOutput
            });
            xapi.Command.Audio.LocalOutput.Update({
              Loudspeaker: 'Off',
              OutputId: roomOutput
            });
            xapi.Command.Audio.LocalOutput.Update({
              Loudspeaker: 'On',
              OutputId: monitorOutput
            });

          });
        });
      });
    }
    else {
      Rkhelper.Audio.getLocalOutputId('Room').then(roomOutput => {
        Rkhelper.Audio.getLocalOutputId('Monitor').then(monitorOutput => {
          xapi.Command.Audio.LocalOutput.Update({
            Loudspeaker: 'Off',
            OutputId: roomOutput
          });
          xapi.Command.Audio.LocalOutput.Update({
            Loudspeaker: 'On',
            OutputId: monitorOutput
          });
        });
      });
    }
    if (status.activity == 'normal') {
      if (status.presentationStatus.localPresentation) {


        /***************************/
        // NO CALL
        // Activité: Normal
        // Présentation: OUI
        // NNP
        /************************* */
        this.tvOn();
        this.projOn();
        this.screenDown();
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
          xapi.Command.Video.Matrix.Assign({
            Mode: 'Replace',
            Output: OUT_MON,
            SourceId: RoomConfig.config.camera.connector
          });
        }
        this.controller.activateLightScene('scene_projection');
      }
      else {


        /***************************/
        // NO CALL
        // Activité: Normal
        // Présentation: NON
        // NNN
        /************************* */
        this.tvOn();
        this.projOff();
        xapi.Command.Video.Matrix.Reset();
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

        if (selfViewStatus == 'On') {
          xapi.Command.Video.Matrix.Assign({
            Mode: 'Replace',
            Output: OUT_MON,
            SourceId: RoomConfig.config.camera.connector
          });
        }
        this.controller.activateLightScene('scene_normal');
      }
    }
    /* Écrire au tableau */
    else if (status.activity == 'writeonboard') {
      if (status.presentationStatus.localPresentation) {


        /***************************/
        // NO CALL
        // Activité: Écrire au tableau
        // Présentation: OUI
        /************************* */
        this.tvOn();
        this.projOn();
        this.screenUp();

        xapi.Config.Video.Monitors.set(MON_DUALPRESENTATIONONLY);
        xapi.Config.Video.Output.Connector[OUT_PROJ].MonitorRole.set(ROLE_PRESENTATIONONLY);
        xapi.Config.Video.Output.Connector[OUT_MON].MonitorRole.set(ROLE_PRESENTATIONONLY);
        xapi.Command.Video.Matrix.Reset();
        if (RoomConfig.config.room.boardBehindScreen) {
          xapi.Command.Video.Matrix.Assign({
            Mode: 'Replace',
            Output: OUT_PROJ,
            RemoteMain: 4
          });
        }
        if (selfViewStatus == 'On') {
          xapi.Command.Video.Matrix.Assign({
            Mode: 'Replace',
            Output: OUT_MON,
            SourceId: RoomConfig.config.camera.connector
          });
        }
        this.controller.activateLightScene('scene_board');
      }
      else {


        /***************************/
        // NO CALL
        // Activité: Écrire au tableau
        // Présentation: NON
        /************************* */
        this.tvOn();
        this.projOffNow();
        this.screenUp();
        xapi.Command.Video.Matrix.Reset();
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
        if (selfViewStatus == 'On') {
          xapi.Command.Video.Matrix.Assign({
            Mode: 'Replace',
            Output: OUT_MON,
            SourceId: RoomConfig.config.camera.connector
          });
        }

        this.controller.activateLightScene('scene_board');
      }
    }
  }


  update_SCE_INCALL(status) {
    //console.log(status);
    if (DEBUG)
      console.log('INCALL -> statusChanged');
    if (status.activity == 'normal') {

      //  NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL 
      // NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL 
      //NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL NORMAL 
      //Présentateur local



      if (status.presLocation == 'local') {


        /***************************/
        // IN CALL
        // Activité: Normal
        // Présentateur: LOCAL
        // Présentation: NON
        /************************* */
        if (status.presentationStatus.presentationType == PRES_NOPRES) {
          this.tvOn();
          this.projOff();
          xapi.Config.Video.Monitors.set(MON_DUALPRESENTATIONONLY);
          xapi.Config.Video.Output.Connector[OUT_PROJ].MonitorRole.set(ROLE_PRESENTATIONONLY);
          xapi.Config.Video.Output.Connector[OUT_MON].MonitorRole.set(ROLE_FIRST);
          xapi.Command.Video.Matrix.Reset();

          xapi.Command.Video.Matrix.Assign({
            Mode: 'Replace',
            Output: OUT_PROJ,
            RemoteMain: 4
          });


          /* Active le speakertrack */
          if (RoomConfig.config.room.autoEnablePresenterTrack) {
            xapi.Command.Cameras.PresenterTrack.Set({
              Mode: 'Follow'
            });
          }
          else {
            callPreset('Console');
          }

          //audio routing
          if (RoomConfig.config.audio.useCombinedAecReference) {
            Rkhelper.Audio.getLocalOutputId('Room').then(roomOutput => {
              Rkhelper.Audio.getLocalOutputId('Monitor').then(monitorOutput => {
                Rkhelper.Audio.getLocalOutputId('AEC').then(aecOutput => {
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
                  xapi.Command.Audio.LocalOutput.Update({
                    Loudspeaker: 'Off',
                    OutputId: roomOutput
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    Loudspeaker: 'Off',
                    OutputId: monitorOutput
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    LoudSpeaker: 'On',
                    OutputId: aecOutput
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
                xapi.Command.Audio.LocalOutput.Update({
                  Loudspeaker: 'Off',
                  OutputId: roomOutput
                });
                xapi.Command.Audio.LocalOutput.Update({
                  Loudspeaker: 'On',
                  OutputId: monitorOutput
                });

              });
            });
          }

          this.controller.activateLightScene('scene_normal');
        }


        /***************************/
        // IN CALL
        // Activité: Normal
        // Présentateur: LOCAL
        // Présentation: LOCALE
        /************************* */
        else if (status.presentationStatus.presentationType == PRES_LOCALPREVIEW || status.presentationStatus.presentationType == PRES_LOCALSHARE) {
          this.tvOn();
          this.projOn();
          this.screenDown();
          xapi.Config.Video.Monitors.set(MON_DUALPRESENTATIONONLY);
          xapi.Config.Video.Output.Connector[OUT_PROJ].MonitorRole.set(ROLE_PRESENTATIONONLY);
          xapi.Config.Video.Output.Connector[OUT_MON].MonitorRole.set(ROLE_FIRST);
          xapi.Command.Video.Matrix.Reset();

          /* Active le speakertrack */
          if (RoomConfig.config.room.autoEnablePresenterTrack) {
            xapi.Command.Cameras.PresenterTrack.Set({
              Mode: 'Follow'
            });
          }
          else {
            callPreset('Console');
          }

          //audio routing
          if (RoomConfig.config.audio.useCombinedAecReference) {
            Rkhelper.Audio.getLocalOutputId('Room').then(roomOutput => {
              Rkhelper.Audio.getLocalOutputId('Monitor').then(monitorOutput => {
                Rkhelper.Audio.getLocalOutputId('AEC').then(aecOutput => {
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
                  xapi.Command.Audio.LocalOutput.Update({
                    Loudspeaker: 'Off',
                    OutputId: roomOutput
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    Loudspeaker: 'Off',
                    OutputId: monitorOutput
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    LoudSpeaker: 'On',
                    OutputId: aecOutput
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
                xapi.Command.Audio.LocalOutput.Update({
                  Loudspeaker: 'Off',
                  OutputId: roomOutput
                });
                xapi.Command.Audio.LocalOutput.Update({
                  Loudspeaker: 'On',
                  OutputId: monitorOutput
                });
              });
            });
          }


          this.controller.activateLightScene('scene_projection');
        }


        /***************************/
        // IN CALL
        // Activité: Normal
        // Présentateur: LOCAL
        // Présentation: DISTANTE
        /************************* */
        else if (status.presentationStatus.presentationType == PRES_REMOTE) {
          this.tvOn();
          this.projOn();
          this.screenDown();
          xapi.Config.Video.Monitors.set(MON_DUALPRESENTATIONONLY);
          xapi.Config.Video.Output.Connector[OUT_PROJ].MonitorRole.set(ROLE_PRESENTATIONONLY);
          xapi.Config.Video.Output.Connector[OUT_MON].MonitorRole.set(ROLE_FIRST);
          xapi.Command.Video.Matrix.Reset();

          /* Active le speakertrack */
          if (RoomConfig.config.room.autoEnablePresenterTrack) {
            xapi.Command.Cameras.PresenterTrack.Set({
              Mode: 'Follow'
            });
          }
          else {
            callPreset('Console');
          }

          //audio routing
          if (RoomConfig.config.audio.useCombinedAecReference) {
            Rkhelper.Audio.getLocalOutputId('Room').then(roomOutput => {
              Rkhelper.Audio.getLocalOutputId('Monitor').then(monitorOutput => {
                Rkhelper.Audio.getLocalOutputId('AEC').then(aecOutput => {
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
                  xapi.Command.Audio.LocalOutput.Update({
                    Loudspeaker: 'Off',
                    OutputId: roomOutput
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    Loudspeaker: 'Off',
                    OutputId: monitorOutput
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    LoudSpeaker: 'On',
                    OutputId: aecOutput
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
                xapi.Command.Audio.LocalOutput.Update({
                  Loudspeaker: 'Off',
                  OutputId: roomOutput
                });
                xapi.Command.Audio.LocalOutput.Update({
                  Loudspeaker: 'On',
                  OutputId: monitorOutput
                });

              });
            });
          }


          this.controller.activateLightScene('scene_projection');
        }

        /***************************/
        // IN CALL
        // Activité: Normal
        // Présentateur: LOCAL
        // Présentation: LOCALE + DISTANTE
        // TODO
        /************************* */
        else if (status.presentationStatus.presentationType == PRES_REMOTELOCALPREVIEW) {
          this.tvOn();
          this.projOn();
          this.screenDown();
          xapi.Config.Video.Monitors.set(MON_DUALPRESENTATIONONLY);
          xapi.Config.Video.Output.Connector[OUT_PROJ].MonitorRole.set(ROLE_PRESENTATIONONLY);
          xapi.Config.Video.Output.Connector[OUT_MON].MonitorRole.set(ROLE_FIRST);
          xapi.Command.Video.Matrix.Reset();

          /* Active le speakertrack */
          if (RoomConfig.config.room.autoEnablePresenterTrack) {
            xapi.Command.Cameras.PresenterTrack.Set({
              Mode: 'Follow'
            });
          }
          else {
            callPreset('Console');
          }

          //audio routing
          if (RoomConfig.config.audio.useCombinedAecReference) {
            Rkhelper.Audio.getLocalOutputId('Room').then(roomOutput => {
              Rkhelper.Audio.getLocalOutputId('Monitor').then(monitorOutput => {
                Rkhelper.Audio.getLocalOutputId('AEC').then(aecOutput => {
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
                  xapi.Command.Audio.LocalOutput.Update({
                    Loudspeaker: 'Off',
                    OutputId: roomOutput
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    Loudspeaker: 'Off',
                    OutputId: monitorOutput
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    LoudSpeaker: 'On',
                    OutputId: aecOutput
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
                xapi.Command.Audio.LocalOutput.Update({
                  Loudspeaker: 'Off',
                  OutputId: roomOutput
                });
                xapi.Command.Audio.LocalOutput.Update({
                  Loudspeaker: 'On',
                  OutputId: monitorOutput
                });

              });
            });
          }


          this.controller.activateLightScene('scene_projection');
        }

      }


      //Présentateur distant
      else {
        /***************************/
        // IN CALL
        // Activité: Normal
        // Présentateur: DISTANT
        // Présentation: NON
        /************************* */
        if (status.presentationStatus.presentationType == PRES_NOPRES) {
          this.tvOn();
          this.projOn();
          this.screenDown();
          xapi.Config.Video.Monitors.set(MON_DUALPRESENTATIONONLY);
          xapi.Config.Video.Output.Connector[OUT_PROJ].MonitorRole.set(ROLE_FIRST);
          xapi.Config.Video.Output.Connector[OUT_MON].MonitorRole.set(ROLE_FIRST);
          xapi.Command.Video.Matrix.Reset();

          /* Active le preset Salle */
          console.log('CALLING PRESET CAM 2');
          callPreset('Salle');

          //audio routing
          if (RoomConfig.config.audio.useCombinedAecReference) {
            Rkhelper.Audio.getLocalOutputId('Room').then(roomOutput => {
              Rkhelper.Audio.getLocalOutputId('Monitor').then(monitorOutput => {
                Rkhelper.Audio.getLocalOutputId('AEC').then(aecOutput => {
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
                  xapi.Command.Audio.LocalOutput.Update({
                    Loudspeaker: 'Off',
                    OutputId: roomOutput
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    Loudspeaker: 'Off',
                    OutputId: monitorOutput
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    LoudSpeaker: 'On',
                    OutputId: aecOutput
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
                xapi.Command.Audio.LocalOutput.Update({
                  Loudspeaker: 'Off',
                  OutputId: monitorOutput
                });
                xapi.Command.Audio.LocalOutput.Update({
                  Loudspeaker: 'On',
                  OutputId: roomOutput
                });
              });
            });
          }



          this.controller.activateLightScene('scene_normal');
        }


        /***************************/
        // IN CALL
        // Activité: Normal
        // Présentateur: DISTANT
        // Présentation: LOCALE
        /************************* */
        else if (status.presentationStatus.presentationType == PRES_LOCALPREVIEW || status.presentationStatus.presentationType == PRES_LOCALSHARE) {
          this.tvOn();
          this.projOn();
          this.screenDown();
          xapi.Config.Video.Monitors.set(MON_SINGLE);
          xapi.Config.Video.Output.Connector[OUT_PROJ].MonitorRole.set(ROLE_FIRST);
          xapi.Config.Video.Output.Connector[OUT_MON].MonitorRole.set(ROLE_FIRST);
          xapi.Command.Video.Matrix.Reset();

          /* Active le preset Salle */
          console.log('CALLING PRESET CAM 2');
          callPreset('Salle');

          //Layouts
          xapi.Command.Video.Layout.LayoutFamily.Set({
            LayoutFamily: 'Overlay',
            Target: 'Local'
          });

          xapi.Command.Video.ActiveSpeakerPIP.Set({
            Position: RoomConfig.config.room.remotePresenterPIPPosition
          });

          xapi.Command.Video.Matrix.Assign({
            Mode: 'Replace',
            Output: OUT_MON,
            RemoteMain: 1,
          });


          //audio routing
          if (RoomConfig.config.audio.useCombinedAecReference) {
            Rkhelper.Audio.getLocalOutputId('Room').then(roomOutput => {
              Rkhelper.Audio.getLocalOutputId('Monitor').then(monitorOutput => {
                Rkhelper.Audio.getLocalOutputId('AEC').then(aecOutput => {
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
                  xapi.Command.Audio.LocalOutput.Update({
                    Loudspeaker: 'Off',
                    OutputId: roomOutput
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    Loudspeaker: 'Off',
                    OutputId: monitorOutput
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    LoudSpeaker: 'On',
                    OutputId: aecOutput
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
                xapi.Command.Audio.LocalOutput.Update({
                  Loudspeaker: 'Off',
                  OutputId: monitorOutput
                });
                xapi.Command.Audio.LocalOutput.Update({
                  Loudspeaker: 'On',
                  OutputId: roomOutput
                });
              });
            });
          }


          this.controller.activateLightScene('scene_projection');
        }


        /***************************/
        // IN CALL
        // Activité: Normal
        // Présentateur: DISTANT
        // Présentation: DISTANTE
        /************************* */
        else if (status.presentationStatus.presentationType == PRES_REMOTE) {
          this.tvOn();
          this.projOn();
          this.screenDown();
          xapi.Config.Video.Monitors.set(MON_SINGLE);
          xapi.Config.Video.Output.Connector[OUT_PROJ].MonitorRole.set(ROLE_FIRST);
          xapi.Config.Video.Output.Connector[OUT_MON].MonitorRole.set(ROLE_FIRST);
          xapi.Command.Video.Matrix.Reset();

          /* Active le preset Salle */
          console.log('CALLING PRESET CAM 2');
          callPreset('Salle');

          //Layouts
          xapi.Command.Video.Layout.LayoutFamily.Set({
            LayoutFamily: 'Overlay',
            Target: 'Local'
          });

          xapi.Command.Video.ActiveSpeakerPIP.Set({
            Position: RoomConfig.config.room.remotePresenterPIPPosition
          });

          xapi.Command.Video.Matrix.Assign({
            Mode: 'Replace',
            Output: OUT_MON,
            RemoteMain: 1,
          });

          //audio routing
          if (RoomConfig.config.audio.useCombinedAecReference) {
            Rkhelper.Audio.getLocalOutputId('Room').then(roomOutput => {
              Rkhelper.Audio.getLocalOutputId('Monitor').then(monitorOutput => {
                Rkhelper.Audio.getLocalOutputId('AEC').then(aecOutput => {
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
                  xapi.Command.Audio.LocalOutput.Update({
                    Loudspeaker: 'Off',
                    OutputId: roomOutput
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    Loudspeaker: 'Off',
                    OutputId: monitorOutput
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    LoudSpeaker: 'On',
                    OutputId: aecOutput
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
                xapi.Command.Audio.LocalOutput.Update({
                  Loudspeaker: 'Off',
                  OutputId: monitorOutput
                });
                xapi.Command.Audio.LocalOutput.Update({
                  Loudspeaker: 'On',
                  OutputId: roomOutput
                });
              });
            });
          }


          this.controller.activateLightScene('scene_projection');
        }

        /***************************/
        // IN CALL
        // Activité: Normal
        // Présentateur: DISTANT
        // Présentation: LOCALE + DISTANTE
        /************************* */
        else if (status.presentationStatus.presentationType == PRES_REMOTELOCALPREVIEW) {
          this.tvOn();
          this.projOn();
          this.screenDown();
          xapi.Config.Video.Monitors.set(MON_SINGLE);
          xapi.Config.Video.Output.Connector[OUT_PROJ].MonitorRole.set(ROLE_FIRST);
          xapi.Config.Video.Output.Connector[OUT_MON].MonitorRole.set(ROLE_FIRST);
          xapi.Command.Video.Matrix.Reset();

          /* Active le preset Salle */
          console.log('CALLING PRESET CAM 2');
          callPreset('Salle');

          //Layouts
          xapi.Command.Video.Layout.LayoutFamily.Set({
            LayoutFamily: 'Overlay',
            Target: 'Local'
          });

          xapi.Command.Video.ActiveSpeakerPIP.Set({
            Position: RoomConfig.config.room.remotePresenterPIPPosition
          });

          xapi.Command.Video.Matrix.Assign({
            Mode: 'Replace',
            Output: OUT_MON,
            RemoteMain: 1,
          });

          //audio routing
          if (RoomConfig.config.audio.useCombinedAecReference) {
            Rkhelper.Audio.getLocalOutputId('Room').then(roomOutput => {
              Rkhelper.Audio.getLocalOutputId('Monitor').then(monitorOutput => {
                Rkhelper.Audio.getLocalOutputId('AEC').then(aecOutput => {
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
                  xapi.Command.Audio.LocalOutput.Update({
                    Loudspeaker: 'Off',
                    OutputId: roomOutput
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    Loudspeaker: 'Off',
                    OutputId: monitorOutput
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    LoudSpeaker: 'On',
                    OutputId: aecOutput
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
                xapi.Command.Audio.LocalOutput.Update({
                  Loudspeaker: 'Off',
                  OutputId: monitorOutput
                });
                xapi.Command.Audio.LocalOutput.Update({
                  Loudspeaker: 'On',
                  OutputId: roomOutput
                });
              });
            });
          }


          this.controller.activateLightScene('scene_projection');
        }
      }

    }






















    //  WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD 
    // WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD 
    //WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD WRITE ON BOARD 



    /* Écrire au tableau */
    else if (status.activity == 'writeonboard') {

      /* Active le preset tableau */
      callPreset('Tableau');

      //Présentateur local
      if (status.presLocation == 'local') {


        /***************************/
        // IN CALL
        // Activité: BOARD
        // Présentateur: LOCAL
        // Présentation: NON
        /************************* */
        if (status.presentationStatus.presentationType == PRES_NOPRES) {
          this.tvOn();
          this.projOff();
          this.screenUp();
          xapi.Config.Video.Monitors.set(MON_DUALPRESENTATIONONLY);
          xapi.Config.Video.Output.Connector[OUT_PROJ].MonitorRole.set(ROLE_PRESENTATIONONLY);
          xapi.Config.Video.Output.Connector[OUT_MON].MonitorRole.set(ROLE_FIRST);
          xapi.Command.Video.Matrix.Reset();
          if (RoomConfig.config.room.boardBehindScreen) {
            xapi.Command.Video.Matrix.Assign({
              Mode: 'Replace',
              Output: OUT_PROJ,
              RemoteMain: 4
            });
          }
          //audio routing
          if (RoomConfig.config.audio.useCombinedAecReference) {
            Rkhelper.Audio.getLocalOutputId('Room').then(roomOutput => {
              Rkhelper.Audio.getLocalOutputId('Monitor').then(monitorOutput => {
                Rkhelper.Audio.getLocalOutputId('AEC').then(aecOutput => {
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
                  xapi.Command.Audio.LocalOutput.Update({
                    Loudspeaker: 'Off',
                    OutputId: roomOutput
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    Loudspeaker: 'Off',
                    OutputId: monitorOutput
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    LoudSpeaker: 'On',
                    OutputId: aecOutput
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
                xapi.Command.Audio.LocalOutput.Update({
                  Loudspeaker: 'Off',
                  OutputId: roomOutput
                });
                xapi.Command.Audio.LocalOutput.Update({
                  Loudspeaker: 'On',
                  OutputId: monitorOutput
                });

              });
            });
          }

          this.controller.activateLightScene('scene_board');
        }


        /***************************/
        // IN CALL
        // Activité: BOARD
        // Présentateur: LOCAL
        // Présentation: LOCALE
        /************************* */
        else if (status.presentationStatus.presentationType == PRES_LOCALPREVIEW || status.presentationStatus.presentationType == PRES_LOCALSHARE) {
          this.tvOn();
          this.projOn();
          this.screenUp();
          xapi.Config.Video.Monitors.set(MON_DUALPRESENTATIONONLY);
          xapi.Config.Video.Output.Connector[OUT_PROJ].MonitorRole.set(ROLE_PRESENTATIONONLY);
          xapi.Config.Video.Output.Connector[OUT_MON].MonitorRole.set(ROLE_FIRST);
          xapi.Command.Video.Matrix.Reset();
          if (RoomConfig.config.room.boardBehindScreen) {
            xapi.Command.Video.Matrix.Assign({
              Mode: 'Replace',
              Output: OUT_PROJ,
              RemoteMain: 4
            });
          }
          //audio routing
          if (RoomConfig.config.audio.useCombinedAecReference) {
            Rkhelper.Audio.getLocalOutputId('Room').then(roomOutput => {
              Rkhelper.Audio.getLocalOutputId('Monitor').then(monitorOutput => {
                Rkhelper.Audio.getLocalOutputId('AEC').then(aecOutput => {
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
                  xapi.Command.Audio.LocalOutput.Update({
                    Loudspeaker: 'Off',
                    OutputId: roomOutput
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    Loudspeaker: 'Off',
                    OutputId: monitorOutput
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    LoudSpeaker: 'On',
                    OutputId: aecOutput
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
                xapi.Command.Audio.LocalOutput.Update({
                  Loudspeaker: 'Off',
                  OutputId: roomOutput
                });
                xapi.Command.Audio.LocalOutput.Update({
                  Loudspeaker: 'On',
                  OutputId: monitorOutput
                });
              });
            });
          }


          this.controller.activateLightScene('scene_board');
        }


        /***************************/
        // IN CALL
        // Activité: BOARD
        // Présentateur: LOCAL
        // Présentation: DISTANTE
        /************************* */
        else if (status.presentationStatus.presentationType == PRES_REMOTE) {
          this.tvOn();
          this.projOn();
          this.screenUp();
          xapi.Config.Video.Monitors.set(MON_DUALPRESENTATIONONLY);
          xapi.Config.Video.Output.Connector[OUT_PROJ].MonitorRole.set(ROLE_PRESENTATIONONLY);
          xapi.Config.Video.Output.Connector[OUT_MON].MonitorRole.set(ROLE_FIRST);
          xapi.Command.Video.Matrix.Reset();
          if (RoomConfig.config.room.boardBehindScreen) {
            xapi.Command.Video.Matrix.Assign({
              Mode: 'Replace',
              Output: OUT_PROJ,
              RemoteMain: 4
            });
          }
          //audio routing
          if (RoomConfig.config.audio.useCombinedAecReference) {
            Rkhelper.Audio.getLocalOutputId('Room').then(roomOutput => {
              Rkhelper.Audio.getLocalOutputId('Monitor').then(monitorOutput => {
                Rkhelper.Audio.getLocalOutputId('AEC').then(aecOutput => {
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
                  xapi.Command.Audio.LocalOutput.Update({
                    Loudspeaker: 'Off',
                    OutputId: roomOutput
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    Loudspeaker: 'Off',
                    OutputId: monitorOutput
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    LoudSpeaker: 'On',
                    OutputId: aecOutput
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
                xapi.Command.Audio.LocalOutput.Update({
                  Loudspeaker: 'Off',
                  OutputId: roomOutput
                });
                xapi.Command.Audio.LocalOutput.Update({
                  Loudspeaker: 'On',
                  OutputId: monitorOutput
                });

              });
            });
          }


          this.controller.activateLightScene('scene_board');
        }

        /***************************/
        // IN CALL
        // Activité: BOARD
        // Présentateur: LOCAL
        // Présentation: LOCALE + DISTANTE
        // TODO
        /************************* */
        else if (status.presentationStatus.presentationType == PRES_REMOTELOCALPREVIEW) {
          this.tvOn();
          this.projOn();
          this.screenUp();
          xapi.Config.Video.Monitors.set(MON_DUALPRESENTATIONONLY);
          xapi.Config.Video.Output.Connector[OUT_PROJ].MonitorRole.set(ROLE_PRESENTATIONONLY);
          xapi.Config.Video.Output.Connector[OUT_MON].MonitorRole.set(ROLE_FIRST);
          xapi.Command.Video.Matrix.Reset();
          if (RoomConfig.config.room.boardBehindScreen) {
            xapi.Command.Video.Matrix.Assign({
              Mode: 'Replace',
              Output: OUT_PROJ,
              RemoteMain: 4
            });
          }

          //audio routing
          if (RoomConfig.config.audio.useCombinedAecReference) {
            Rkhelper.Audio.getLocalOutputId('Room').then(roomOutput => {
              Rkhelper.Audio.getLocalOutputId('Monitor').then(monitorOutput => {
                Rkhelper.Audio.getLocalOutputId('AEC').then(aecOutput => {
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
                  xapi.Command.Audio.LocalOutput.Update({
                    Loudspeaker: 'Off',
                    OutputId: roomOutput
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    Loudspeaker: 'Off',
                    OutputId: monitorOutput
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    LoudSpeaker: 'On',
                    OutputId: aecOutput
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
                xapi.Command.Audio.LocalOutput.Update({
                  Loudspeaker: 'Off',
                  OutputId: roomOutput
                });
                xapi.Command.Audio.LocalOutput.Update({
                  Loudspeaker: 'On',
                  OutputId: monitorOutput
                });

              });
            });
          }


          this.controller.activateLightScene('scene_board');
        }

      }


      //Présentateur distant
      else {


        /***************************/
        // IN CALL
        // Activité: BOARD
        // Présentateur: DISTANT
        // Présentation: NON
        /************************* */
        if (status.presentationStatus.presentationType == PRES_NOPRES) {
          this.tvOn();
          this.projOff();
          this.screenUp();
          xapi.Config.Video.Monitors.set(MON_DUALPRESENTATIONONLY);
          xapi.Config.Video.Output.Connector[OUT_PROJ].MonitorRole.set(ROLE_FIRST);
          xapi.Config.Video.Output.Connector[OUT_MON].MonitorRole.set(ROLE_FIRST);
          xapi.Command.Video.Matrix.Reset();
          if (RoomConfig.config.room.boardBehindScreen) {
            xapi.Command.Video.Matrix.Assign({
              Mode: 'Replace',
              Output: OUT_PROJ,
              RemoteMain: 4
            });
          }

          //audio routing
          if (RoomConfig.config.audio.useCombinedAecReference) {
            Rkhelper.Audio.getLocalOutputId('Room').then(roomOutput => {
              Rkhelper.Audio.getLocalOutputId('Monitor').then(monitorOutput => {
                Rkhelper.Audio.getLocalOutputId('AEC').then(aecOutput => {
                  Rkhelper.Audio.getRemoteInputsIds().then(ri => {
                    ri.forEach(i => {
                      xapi.Command.Audio.LocalOutput.DisconnectInput({
                        InputId: i,
                        OutputId: monitorOutput
                      });
                      xapi.Command.Audio.LocalOutput.ConnectInput({
                        InputId: i,
                        OutputId: roomOutput
                      });
                    });
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    Loudspeaker: 'Off',
                    OutputId: roomOutput
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    Loudspeaker: 'Off',
                    OutputId: monitorOutput
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    LoudSpeaker: 'On',
                    OutputId: aecOutput
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
                    xapi.Command.Audio.LocalOutput.DisconnectInput({
                      InputId: i,
                      OutputId: monitorOutput
                    });
                    xapi.Command.Audio.LocalOutput.ConnectInput({
                      InputId: i,
                      OutputId: roomOutput
                    });
                  });
                });
                xapi.Command.Audio.LocalOutput.Update({
                  Loudspeaker: 'Off',
                  OutputId: monitorOutput
                });
                xapi.Command.Audio.LocalOutput.Update({
                  Loudspeaker: 'On',
                  OutputId: roomOutput
                });
              });
            });
          }


          this.controller.activateLightScene('scene_board');
        }


        /***************************/
        // IN CALL
        // Activité: BOARD
        // Présentateur: DISTANT
        // Présentation: LOCALE
        /************************* */
        else if (status.presentationStatus.presentationType == PRES_LOCALPREVIEW || status.presentationStatus.presentationType == PRES_LOCALSHARE) {
          this.tvOn();
          this.projOn();
          this.screenUp();
          xapi.Config.Video.Monitors.set(MON_SINGLE);
          xapi.Config.Video.Output.Connector[OUT_PROJ].MonitorRole.set(ROLE_FIRST);
          xapi.Config.Video.Output.Connector[OUT_MON].MonitorRole.set(ROLE_FIRST);
          xapi.Command.Video.Matrix.Reset();
          if (RoomConfig.config.room.boardBehindScreen) {
            xapi.Command.Video.Matrix.Assign({
              Mode: 'Replace',
              Output: OUT_PROJ,
              RemoteMain: 4
            });
          }

          //Layouts
          xapi.Command.Video.Layout.LayoutFamily.Set({
            LayoutFamily: 'Overlay',
            Target: 'Local'
          });

          xapi.Command.Video.ActiveSpeakerPIP.Set({
            Position: RoomConfig.config.room.remotePresenterPIPPosition
          });

          xapi.Command.Video.Matrix.Assign({
            Mode: 'Replace',
            Output: OUT_MON,
            RemoteMain: 1,
          });


          //audio routing
          if (RoomConfig.config.audio.useCombinedAecReference) {
            Rkhelper.Audio.getLocalOutputId('Room').then(roomOutput => {
              Rkhelper.Audio.getLocalOutputId('Monitor').then(monitorOutput => {
                Rkhelper.Audio.getLocalOutputId('AEC').then(aecOutput => {
                  Rkhelper.Audio.getRemoteInputsIds().then(ri => {
                    ri.forEach(i => {
                      xapi.Command.Audio.LocalOutput.DisconnectInput({
                        InputId: i,
                        OutputId: monitorOutput
                      });
                      xapi.Command.Audio.LocalOutput.ConnectInput({
                        InputId: i,
                        OutputId: roomOutput
                      });
                    });
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    Loudspeaker: 'Off',
                    OutputId: roomOutput
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    Loudspeaker: 'Off',
                    OutputId: monitorOutput
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    LoudSpeaker: 'On',
                    OutputId: aecOutput
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
                    xapi.Command.Audio.LocalOutput.DisconnectInput({
                      InputId: i,
                      OutputId: monitorOutput
                    });
                    xapi.Command.Audio.LocalOutput.ConnectInput({
                      InputId: i,
                      OutputId: roomOutput
                    });
                  });
                });
                xapi.Command.Audio.LocalOutput.Update({
                  Loudspeaker: 'Off',
                  OutputId: monitorOutput
                });
                xapi.Command.Audio.LocalOutput.Update({
                  Loudspeaker: 'On',
                  OutputId: roomOutput
                });
              });
            });
          }


          this.controller.activateLightScene('scene_board');
        }


        /***************************/
        // IN CALL
        // Activité: BOARD
        // Présentateur: DISTANT
        // Présentation: DISTANTE
        /************************* */
        else if (status.presentationStatus.presentationType == PRES_REMOTE) {
          this.tvOn();
          this.projOn();
          this.screenUp();
          xapi.Config.Video.Monitors.set(MON_DUALPRESENTATIONONLY);
          xapi.Config.Video.Output.Connector[OUT_PROJ].MonitorRole.set(ROLE_PRESENTATIONONLY);
          xapi.Config.Video.Output.Connector[OUT_MON].MonitorRole.set(ROLE_FIRST);
          xapi.Command.Video.Matrix.Reset();
          if (RoomConfig.config.room.boardBehindScreen) {
            xapi.Command.Video.Matrix.Assign({
              Mode: 'Replace',
              Output: OUT_PROJ,
              RemoteMain: 4
            });
          }

          //Layouts
          xapi.Command.Video.Layout.LayoutFamily.Set({
            LayoutFamily: 'Overlay',
            Target: 'Local'
          });

          xapi.Command.Video.ActiveSpeakerPIP.Set({
            Position: RoomConfig.config.room.remotePresenterPIPPosition
          });

          xapi.Command.Video.Matrix.Assign({
            Mode: 'Replace',
            Output: OUT_MON,
            RemoteMain: 1,
          });

          //audio routing
          if (RoomConfig.config.audio.useCombinedAecReference) {
            Rkhelper.Audio.getLocalOutputId('Room').then(roomOutput => {
              Rkhelper.Audio.getLocalOutputId('Monitor').then(monitorOutput => {
                Rkhelper.Audio.getLocalOutputId('AEC').then(aecOutput => {
                  Rkhelper.Audio.getRemoteInputsIds().then(ri => {
                    ri.forEach(i => {
                      xapi.Command.Audio.LocalOutput.DisconnectInput({
                        InputId: i,
                        OutputId: monitorOutput
                      });
                      xapi.Command.Audio.LocalOutput.ConnectInput({
                        InputId: i,
                        OutputId: roomOutput
                      });
                    });
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    Loudspeaker: 'Off',
                    OutputId: roomOutput
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    Loudspeaker: 'Off',
                    OutputId: monitorOutput
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    LoudSpeaker: 'On',
                    OutputId: aecOutput
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
                    xapi.Command.Audio.LocalOutput.DisconnectInput({
                      InputId: i,
                      OutputId: monitorOutput
                    });
                    xapi.Command.Audio.LocalOutput.ConnectInput({
                      InputId: i,
                      OutputId: roomOutput
                    });
                  });
                });
                xapi.Command.Audio.LocalOutput.Update({
                  Loudspeaker: 'Off',
                  OutputId: monitorOutput
                });
                xapi.Command.Audio.LocalOutput.Update({
                  Loudspeaker: 'On',
                  OutputId: roomOutput
                });
              });
            });
          }


          this.controller.activateLightScene('scene_board');
        }

        /***************************/
        // IN CALL
        // Activité: BOARD
        // Présentateur: DISTANT
        // Présentation: LOCALE + DISTANTE
        /************************* */
        else if (status.presentationStatus.presentationType == PRES_REMOTELOCALPREVIEW) {
          this.tvOn();
          this.projOn();
          this.screenUp();
          xapi.Config.Video.Monitors.set(MON_DUALPRESENTATIONONLY);
          xapi.Config.Video.Output.Connector[OUT_PROJ].MonitorRole.set(ROLE_PRESENTATIONONLY);
          xapi.Config.Video.Output.Connector[OUT_MON].MonitorRole.set(ROLE_FIRST);
          xapi.Command.Video.Matrix.Reset();
          if (RoomConfig.config.room.boardBehindScreen) {
            xapi.Command.Video.Matrix.Assign({
              Mode: 'Replace',
              Output: OUT_PROJ,
              RemoteMain: 4
            });
          }

          //audio routing
          if (RoomConfig.config.audio.useCombinedAecReference) {
            Rkhelper.Audio.getLocalOutputId('Room').then(roomOutput => {
              Rkhelper.Audio.getLocalOutputId('Monitor').then(monitorOutput => {
                Rkhelper.Audio.getLocalOutputId('AEC').then(aecOutput => {
                  Rkhelper.Audio.getRemoteInputsIds().then(ri => {
                    ri.forEach(i => {
                      xapi.Command.Audio.LocalOutput.DisconnectInput({
                        InputId: i,
                        OutputId: monitorOutput
                      });
                      xapi.Command.Audio.LocalOutput.ConnectInput({
                        InputId: i,
                        OutputId: roomOutput
                      });
                    });
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    Loudspeaker: 'Off',
                    OutputId: roomOutput
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    Loudspeaker: 'Off',
                    OutputId: monitorOutput
                  });
                  xapi.Command.Audio.LocalOutput.Update({
                    LoudSpeaker: 'On',
                    OutputId: aecOutput
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
                    xapi.Command.Audio.LocalOutput.DisconnectInput({
                      InputId: i,
                      OutputId: monitorOutput
                    });
                    xapi.Command.Audio.LocalOutput.ConnectInput({
                      InputId: i,
                      OutputId: roomOutput
                    });
                  });
                });
                xapi.Command.Audio.LocalOutput.Update({
                  Loudspeaker: 'Off',
                  OutputId: roomOutput
                });
                xapi.Command.Audio.LocalOutput.Update({
                  Loudspeaker: 'On',
                  OutputId: monitorOutput
                });

              });
            });
          }


          this.controller.activateLightScene('scene_board');
        }
      }
    }
  }

  statusChanged(status) {
    if (DEBUG)
      console.log(`SCENARIOS: statusChanged`);
    if (this.systemReady) {
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
            setTimeout(function () {
              /* Active le speakertrack */
              if (RoomConfig.config.room.autoEnablePresenterTrack) {
                xapi.Command.Cameras.PresenterTrack.Set({
                  Mode: 'Follow'
                });
              }
              else {
                callPreset('Console');
              }
            }, 8000);
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
    else {
      if (DEBUG)
        console.log('statusChanged, but system not ready.');
    }
  }



  ready() {
    this.systemReady = true;
  }


  notReady() {
    this.systemReady = false;
  }

}




