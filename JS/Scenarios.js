/************************************************************

Système: Salles comodales 2021
Script: Scenarios
Description: Gestion des scénarios
Version: ->2.0
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
  - CHANGELOG MOVED TO GITHUB

  
Version 3:
  - Arrangé un bug d'affichage lorsque le présentateur est à distance et qu'il n'y a pas de présentation
  - Arrangé un bug de routage audio lorsque le présentateur est à distance. Le son sera seulement routé dans la salle, pas dans la barre de son

Version 2:
  - Quand le système tombe en veille, la scène d'éclairage "normal" est maintenant executée correctement

*************************************************************/


import xapi from 'xapi';
import * as Rkhelper from './Rkhelper';
import * as RoomConfig from './RoomConfig';

const DEBUG = true;


export const PRES_NOPRES = 'PRES_NOPRESENTATION';
export const PRES_LOCALPREVIEW = 'PRES_LOCALPREVIEW';
export const PRES_LOCALSHARE = 'PRES_LOCALSHARE';
export const PRES_REMOTE = 'PRES_REMOTE';
export const PRES_REMOTELOCALPREVIEW = 'PRES_REMOTELOCALPREVIEW';


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



export class Scenarios {
  constructor(controller) {
    if (DEBUG)
      console.log(`SCENARIOS: Contructor`);
    this.type = 'Scenarios';
    this.controller = controller;
    this.currentScenario = undefined;
    this.customScenario = false;
    this.systemReady = false;
    this.statusChangeCallback = Rkhelper.Status.addStatusChangeCallback(status => {
      this.statusChanged(status);
    });

    Rkhelper.IMC.registerFunction(this.enableCustomScenario);
    Rkhelper.IMC.registerFunction(this.disableCustomScenario);


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

  update_SCE_NOCALL(status) {
    if (DEBUG)
      console.log('NOCALL -> statusChanged');
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

      /* Active le speakertrack */
      if (RoomConfig.config.room.autoEnablePresenterTrack) {
        xapi.Command.Cameras.PresenterTrack.Set({
          Mode: 'Follow'
        });
      }
      else {
        Rkhelper.System.Camera.getPresetId('Console').then(preset => {
          xapi.Command.Camera.Preset.Activate({ PresetId: preset.PresetId });
        });
      }


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




          //audio routing
          if (RoomConfig.config.audio.useCombinedAecReference) {
            Rkhelper.Audio.getLocalOutputId('Room').then(roomOutput => {
              Rkhelper.Audio.getLocalOutputId('Monitor').then(monitorOutput => {
                Rkhelper.Audio.getLocalOutputId('AEC').then(aecOutput => {
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

          //audio routing
          if (RoomConfig.config.audio.useCombinedAecReference) {
            Rkhelper.Audio.getLocalOutputId('Room').then(roomOutput => {
              Rkhelper.Audio.getLocalOutputId('Monitor').then(monitorOutput => {
                Rkhelper.Audio.getLocalOutputId('AEC').then(aecOutput => {
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

          //audio routing
          if (RoomConfig.config.audio.useCombinedAecReference) {
            Rkhelper.Audio.getLocalOutputId('Room').then(roomOutput => {
              Rkhelper.Audio.getLocalOutputId('Monitor').then(monitorOutput => {
                Rkhelper.Audio.getLocalOutputId('AEC').then(aecOutput => {
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

          //audio routing
          if (RoomConfig.config.audio.useCombinedAecReference) {
            Rkhelper.Audio.getLocalOutputId('Room').then(roomOutput => {
              Rkhelper.Audio.getLocalOutputId('Monitor').then(monitorOutput => {
                Rkhelper.Audio.getLocalOutputId('AEC').then(aecOutput => {
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

          //audio routing
          if (RoomConfig.config.audio.useCombinedAecReference) {
            Rkhelper.Audio.getLocalOutputId('Room').then(roomOutput => {
              Rkhelper.Audio.getLocalOutputId('Monitor').then(monitorOutput => {
                Rkhelper.Audio.getLocalOutputId('AEC').then(aecOutput => {
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
      Rkhelper.System.Camera.getPresetId('Tableau').then(preset => {
        xapi.Command.Camera.Preset.Activate({ PresetId: preset.PresetId });
      });

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
                      OutputId: roomrOutput
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
                      OutputId: roomrOutput
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
                      OutputId: roomrOutput
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
                      OutputId: roomrOutput
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
            this.update_SCE_STANDBY(status);
          }
          else {
            if (status.callStatus.Status == undefined) {
              this.update_SCE_NOCALL(status);
            }
            else if (status.callStatus.Status == 'Connected' || status.callStatus.Status == 'Connecting') {
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




