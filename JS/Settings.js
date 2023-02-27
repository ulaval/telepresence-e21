/*jshint esversion: 6 */
const xapi = require('xapi');
const RoomConfig = require('./RoomConfig');
const Rkhelper = require('./Rkhelper');

const DEBUG = false;

const TGL_AUTODISPLAYMODE = 'tgl_autodisplaymode';
const TGL_AUTOLIGHTSMODE = 'tgl_autolightsmode';
const TGL_CEILINGMICS = 'tgl_ceilingmics';


var controller;


var tgl_autoDisplayMode, tgl_autoLightsMode;

var autodisplaymode, autolightsmode;
var showdisplaycontrols = false;

var currentactivity = 'normal';

var presenterLocation = 'local';
var lastRemotePresentationValue = false;

var ceilingMicsMode = 'on';
var changePresenterLocationLocal;
var changePresenterLocationRemote;
var lastCommandResponse = '';

function drawRoomConfigPanel() {
  xapi.Command.UserInterface.Extensions.Panel.Save({
    PanelId: 'roomconfig'
  },
    `
<Extensions>
  <Version>1.9</Version>
  <Panel>
    <Order>${RoomConfig.config.ui.iconOrder.settings}</Order>
    <PanelId>roomconfig</PanelId>
    <Origin>local</Origin>
    <Type>Statusbar</Type>
    <Icon>Sliders</Icon>
    <Color>#c22987</Color>
    <Name>Paramètres</Name>
    <ActivityType>Custom</ActivityType>
      <Page>
      <Name>Salle</Name>
          <Row>
        <Name>Emplacement du présentateur</Name>
        <Widget>
          <WidgetId>preslocation</WidgetId>
          <Type>GroupButton</Type>
          <Options>size=4</Options>
          <ValueSpace>
            <Value>
              <Key>local</Key>
              <Name>Sur place</Name>
            </Value>
            <Value>
              <Key>remote</Key>
              <Name>À distance</Name>
            </Value>
          </ValueSpace>
        </Widget>
      </Row>

    ${getActivitiesControls()}
      <Row>
        <Name>Avertissements cadrage auto.</Name>
        <Widget>
          <WidgetId>tgl_prestrackwarn</WidgetId>
          <Type>ToggleButton</Type>
          <Options>size=1</Options>
        </Widget>
      </Row>
    ${getManualScreenControls()}
    </Page>
    ${getAudioControls()}
    ${getLightsPage()}
    

  </Panel>
</Extensions>
`);
  if (RoomConfig.config.room.showLightsIcon) {
    xapi.Command.UserInterface.Extensions.Panel.Save({
      PanelId: 'lighting'
    },
      `
  <Extensions>
  <Version>1.9</Version>
  <Panel>
    <Order>2</Order>
    <PanelId>lighting</PanelId>
    <Origin>local</Origin>
    <Location>HomeScreenAndCallControls</Location>
    <Icon>Lightbulb</Icon>
    <Color>#CF7900</Color>
    <Name>Éclairage</Name>
    <ActivityType>Custom</ActivityType>
  </Panel>
</Extensions>
  `);
  }

  xapi.Command.UserInterface.Extensions.Panel.Save({
    PanelId: 'disp'
  },
    `
  <Extensions>
  <Version>1.9</Version>
  <Panel>
    <Order>7</Order>
    <PanelId>disp</PanelId>
    <Location>Hidden</Location>
    <Icon>Lightbulb</Icon>
    <Name>Affichages</Name>
    <ActivityType>Custom</ActivityType>
    <Page>
      <Name>Affichages</Name>
      <Row>
        <Name>Auto</Name>
        <Widget>
          <WidgetId>tgl_autodisplaymode</WidgetId>
          <Type>ToggleButton</Type>
          <Options>size=1</Options>
        </Widget>
      </Row>
      <Row>
        <Name>Moniteur</Name>
        <Widget>
          <WidgetId>cmdmonitoroff</WidgetId>
          <Name>OFF</Name>
          <Type>Button</Type>
          <Options>size=2</Options>
        </Widget>
        <Widget>
          <WidgetId>cmdmonitoron</WidgetId>
          <Name>ON</Name>
          <Type>Button</Type>
          <Options>size=2</Options>
        </Widget>
      </Row>
      <Row>
        <Name>Projecteur</Name>
        <Widget>
          <WidgetId>cmdprojectoroff</WidgetId>
          <Name>OFF</Name>
          <Type>Button</Type>
          <Options>size=2</Options>
        </Widget>
        <Widget>
          <WidgetId>cmdprojectoron</WidgetId>
          <Name>ON</Name>
          <Type>Button</Type>
          <Options>size=2</Options>
        </Widget>
      </Row>
      <Options/>
    </Page>
  </Panel>
</Extensions>

  `
  );
  xapi.Command.UserInterface.Extensions.Widget.SetValue({
    WidgetId: 'tgl_autodisplaymode',
    Value: 'On'
  });
  xapi.Command.UserInterface.Extensions.Widget.SetValue({
    WidgetId:'tgl_prestrackwarn',
    Value: RoomConfig.config.room.presenterTrackWarningDisplay ? 'On' : 'Off'
  });
}


function getActivitiesControls() {
  var xml = ``;

  if (RoomConfig.config.room.showActivities) {
    xml = `
      <Row>
        <Name>Activité</Name>
        <Widget>
          <WidgetId>currentactivity</WidgetId>
          <Type>GroupButton</Type>
          <Options>size=4;columns=2</Options>
          <ValueSpace>`;
    for (const activity of RoomConfig.config.room.activities) {
      xml += `
          <Value>
            <Key>${activity.id}</Key>
            <Name>${activity.name}</Name>
           </Value>
      `;
    }

    xml += `
     </ValueSpace>
        </Widget>
      </Row>
    `;
  }
  return xml;
}
function getAudioControls() {
  var xml = `<Page>
      <Name>Son</Name>
      <Row>
        <Name>Microphones auditoire</Name>
        <Widget>
          <WidgetId>tgl_ceilingmics</WidgetId>
          <Type>ToggleButton</Type>
          <Options>size=1</Options>
        </Widget>
      </Row>

      
      
      `;

  for (const input of RoomConfig.config.audio.inputs) {
    xml += `
          <Row>
        <Name>${input.name}</Name>
        <Widget>
          <WidgetId>audioinput_${input.connector}</WidgetId>
          <Type>GroupButton</Type>
          <Options>size=4</Options>
          <ValueSpace>
            <Value>
              <Key>mute</Key>
              <Name>Muet</Name>
            </Value>
            <Value>
              <Key>normal</Key>
              <Name>Normal</Name>
            </Value>
            <Value>
              <Key>loud</Key>
              <Name>Plus fort</Name>
            </Value>
            <Value>
              <Key>louder</Key>
              <Name>Très fort</Name>
            </Value>
          </ValueSpace>
        </Widget>
      </Row>
    `;
  }
  xml += `</Page>`;
  return xml;
}

function getDisplayControls() {
  var xml = '';
  if (showdisplaycontrols) {
    xml = `
    <Row>
        <Name>Alimentation télé</Name>
        <Widget>
          <WidgetId>tvpower</WidgetId>
          <Type>GroupButton</Type>
          <Options>size=4;columns=4</Options>
          <ValueSpace>
            <Value>
              <Key>off</Key>
              <Name>OFF</Name>
            </Value>
            <Value>
              <Key>on</Key>
              <Name>ON</Name>
            </Value>
          </ValueSpace>
        </Widget>
      </Row>
      <Row>
        <Name>Alimentation projecteur</Name>
        <Widget>
          <WidgetId>projpower</WidgetId>
          <Type>GroupButton</Type>
          <Options>size=4</Options>
          <ValueSpace>
            <Value>
              <Key>off</Key>
              <Name>OFF</Name>
            </Value>
            <Value>
              <Key>on</Key>
              <Name>ON</Name>
            </Value>
          </ValueSpace>
        </Widget>
      </Row>
      `;
  }
  return xml;

}
function getManualScreenControls() {
  if (RoomConfig.config.room.motorizedScreen) {
    var controls = `
      <Row>
        <Name>Toile de projection</Name>
        <Widget>
          <WidgetId>screen_down</WidgetId>
          <Type>Button</Type>
          <Options>size=1;icon=arrow_down</Options>
        </Widget>
        <Widget>
          <WidgetId>screen_up</WidgetId>
          <Type>Button</Type>
          <Options>size=1;icon=arrow_up</Options>
        </Widget>
      </Row>`;
    return controls;
  }
}
function getLightsPage() {
  if (RoomConfig.config.room.lightsControl) {
    var xml = `
    <Page>
      <PageId>lights</PageId>
      <Name>Éclairage</Name>

      ${getLightsControls()}
      <Options/>
    </Page>
    `;
    return xml;
  }
}
function getLightsControls() {
  var xml = '';

  xml += `<Row>
        <Name>Éclairage automatique</Name>
        <Widget>
          <WidgetId>tgl_autolightsmode</WidgetId>
          <Type>ToggleButton</Type>
          <Options>size=1</Options>
        </Widget>
      </Row>
    `;
  xml += getZonesControls();
  xml += getLightsScenes();


  return xml;
}


function getLightsScenes() {
  var xml = `<Row>
        <Name>Scènes</Name>`;
  for (const scene of RoomConfig.config.lights.scenes) {
    if (scene.show) {
      xml += `
        <Widget>
          <WidgetId>${scene.id}</WidgetId>
          <Name>${scene.name}</Name>
          <Type>Button</Type>
          <Options>size=2</Options>
        </Widget>
      `;
    }
  }
  xml += `</Row>`;
  return xml;
}

function getZonesControls() {
  var xml = ``;
  for (const zone of RoomConfig.config.lights.zones) {
    if (zone.show) {
      xml += `<Row>
        <Name>${zone.name}</Name>
        `;

      if (zone.type == 'dim') {
        xml += `<Widget>
          <WidgetId>${zone.id}_dim</WidgetId>
          <Type>Spinner</Type>
          <Options>size=2;style=plusminus</Options>
        </Widget>`;

      }

      xml += `
        <Widget>
          <WidgetId>${zone.id}_onoff</WidgetId>
          <Type>ToggleButton</Type>
          <Options>size=1</Options>
        </Widget>
        `;
      xml += `</Row>`;
    }
  }
  return xml;
}

async function displayStatus() {
  let webexStatus = await xapi.Status.Webex.Status.get();
  let temperature = await xapi.Status.SystemUnit.Hardware.Monitoring.Temperature.Status.get();
  let macrosdiag = await xapi.Status.Diagnostics.Message[1].References.get();
  macrosdiag = macrosdiag.split('&')[1];
  macrosdiag = macrosdiag.split('=')[1];
  let uptime = await xapi.Status.SystemUnit.Uptime.get();
  let upgradeStatus = await xapi.Status.Provisioning.Software.UpgradeStatus.Status.get();
  setTimeout(() => {
    xapi.Command.UserInterface.Message.Prompt.Display({
      duration: 0,
      title: `${RoomConfig.config.room.name} ${RoomConfig.config.version}`,
      text: `Webex: ${webexStatus}, Temp: ${temperature}, Crash: ${macrosdiag},<br> Upttime: ${uptime}, Upgrade: ${upgradeStatus}`
    });
  }, 1000);

}

function setDefaultValues() {

  currentactivity = RoomConfig.config.room.defaultActivity;
  for (const input of RoomConfig.config.audio.inputs) {

    if (input.defaultMode == 'mute') {
      muteAudioInput(input.connector);
    }
    else {
      unmuteAudioInput(input.connector);
    }
    setAudioInputLevel(input.connector, input.normal);

  }

  /*
  tgl_autoDisplayMode = new Rkhelper.UI.Toggle(TGL_AUTODISPLAYMODE, 'on');
  */

  if (RoomConfig.config.room.lightsControl) {
    tgl_autoLightsMode = new Rkhelper.UI.Toggle(TGL_AUTOLIGHTSMODE, 'on');
  }



  xapi.Command.UserInterface.Extensions.Widget.SetValue({
    WidgetId: 'preslocation',
    Value: RoomConfig.config.room.defaultPresenterLocation
  });
  presenterLocation = 'local';
  changePresenterLocationLocal();

  if (RoomConfig.config.room.showActivities) {


    xapi.Command.UserInterface.Extensions.Widget.SetValue({
      WidgetId: 'currentactivity',
      Value: RoomConfig.config.room.defaultActivity
    });
  }

  xapi.Command.Audio.Microphones.Unmute();
  xapi.Command.Audio.Volume.Set({ Level: RoomConfig.config.audio.defaultVolume });

  setCeilingMicsMode('on');

  showdisplaycontrols = false;
  updateUiElements();

}



function getActivity(id) {
  var act;
  for (const activity of RoomConfig.config.room.activities) {
    if (activity.id == id) {
      if (DEBUG)
        console.log('Found activity: ' + activity.name);
      act = activity;
    }
  }
  return act;
}

function updateUiElements() {
  /*
  xapi.Command.UserInterface.Extensions.Widget.SetValue({
    WidgetId: TGL_AUTODISPLAYMODE,
    Value: boolToOnOff(!showdisplaycontrols)
  }).catch();
  */
  for (const input of RoomConfig.config.audio.inputs) {
    xapi.Command.UserInterface.Extensions.Widget.SetValue({
      WidgetId: `audioinput_${input.connector}`,
      Value: input.defaultMode
    });
  }

  if (showdisplaycontrols) {
    xapi.Command.UserInterface.Extensions.Widget.SetValue({
      WidgetId: 'tvpower',
      Value: controller.disp_tv.getStatus()
    });
    xapi.Command.UserInterface.Extensions.Widget.SetValue({
      WidgetId: 'projpower',
      Value: controller.disp_proj.getStatus()
    });
  }

  if (RoomConfig.config.room.showActivities) {
    xapi.Command.UserInterface.Extensions.Widget.SetValue({
      WidgetId: 'preslocation',
      Value: presenterLocation
    });


    xapi.Command.UserInterface.Extensions.Widget.SetValue({
      WidgetId: 'currentactivity',
      Value: currentactivity
    });

    xapi.Command.UserInterface.Extensions.Widget.SetValue({
      WidgetId: TGL_CEILINGMICS,
      Value: ceilingMicsMode
    });
  }

  controller.lights.updateZoneWidgets();
}


xapi.Event.UserInterface.Extensions.Widget.Action.on(action => {
  /*
  if (action.WidgetId == TGL_AUTODISPLAYMODE) {
    showdisplaycontrols = !onOffToBool(action.Value);
    drawRoomConfigPanel();
    updateUiElements();
  }
  */
  if (action.WidgetId == TGL_AUTOLIGHTSMODE) {
    drawRoomConfigPanel();
    updateUiElements();
  }
  else if (action.WidgetId == TGL_CEILINGMICS) {
    setCeilingMicsMode(action.Value);
  }
  else if (action.WidgetId.substring(0, 11) == 'audioinput_' && action.Type == 'pressed') {
    RoomConfig.config.audio.inputs.forEach(function (element, index) {
      if ('audioinput_' + element.connector == action.WidgetId) {
        RoomConfig.config.audio.inputs[index].mode = action.Value;
        if (action.Value == 'mute') {

          muteAudioInput(element.connector);
        }
        else {
          unmuteAudioInput(element.connector);
          setAudioInputLevel(element.connector, getAudioLevelFor(index, action));
        }
      }
    });
  }
  else if (action.WidgetId == 'currentactivity') {
    currentactivity = getActivity(action.Value).id;

    xapi.Command.UserInterface.Message.TextLine.Display({
      Text: `Lancement de l'activité "${getActivity(action.Value).name}"`,
      Duration: 2
    });
    Rkhelper.UI.prompt.display({
      Duration: 2,
      Title: `Changement d'activité`,
      Text: `Lancement de l'activité "${getActivity(action.Value).name}"`
    },
      response => {

      },
      cancel => {

      });
  }

});

xapi.Event.UserInterface.Extensions.Panel.Clicked.on(panel => {
  if (panel.PanelId == 'roomconfig') {
    updateUiElements();
  }
  if (panel.PanelId == 'lighting') {
    xapi.Command.UserInterface.Extensions.Panel.Open({
      PageId: 'lights',
      PanelId: 'roomconfig'
    });
  }
});



function getAudioLevelFor(input, action) {
  input = RoomConfig.config.audio.inputs[input];
  var newLevel;
  switch (action.Value) {
    case 'normal':
      return input.normal;
    case 'loud':
      newLevel = input.normal + RoomConfig.config.audio.loud;
      if (newLevel > 70) {
        return 70;
      }
      else {
        return newLevel;
      }
      break;
    case 'louder':
      newLevel = input.normal + RoomConfig.config.audio.louder;
      if (newLevel > 70) {
        return 70;
      }
      else {
        return newLevel;
      }
      break;
  }
}
function muteAudioInput(input) {
  xapi.Config.Audio.Input.Microphone[input].Mode.set('off');
}
function unmuteAudioInput(input) {
  xapi.Config.Audio.Input.Microphone[input].Mode.set('on');
}
function setAudioInputLevel(input, level) {
  xapi.Config.Audio.Input.Microphone[input].Level.set(level);
}

function onOffToBool(value) {
  if (value.toLowerCase() == 'on')
    return true;
  return false;
}
function boolToOnOff(value) {
  if (value)
    return 'on';
  return 'off';
}

function setCeilingMicsMode(mode) {
  if (mode == 'on') {
    ceilingMicsMode = 'on';
    for (const mic of RoomConfig.config.audio.roomMics) {
      unmuteAudioInput(mic);
    }
  }
  else {
    ceilingMicsMode = 'off';
    for (const mic of RoomConfig.config.audio.roomMics) {
      muteAudioInput(mic);
    }
  }
}

xapi.Event.UserInterface.Extensions.Widget.on(event => {
  if (event.Action != undefined) {
    if (event.Action.WidgetId == 'preslocation' && event.Action.Type == 'pressed') {
      presenterLocation = event.Action.Value;
    }
  }
});

function init(c) {
  changePresenterLocationLocal = Rkhelper.IMC.getFunctionCall('changePresenterLocationLocal');
  changePresenterLocationRemote = Rkhelper.IMC.getFunctionCall('changePresenterLocationRemote');

  controller = c;
  drawRoomConfigPanel();
  setDefaultValues();

  Rkhelper.IMC.callFunction('ui_InitDone');
  xapi.Status.Standby.State.on(value => {
    if (value == 'Standby') {
      setDefaultValues();
      drawRoomConfigPanel();
    }
    else if (value == 'Off') {
      setDefaultValues();
      drawRoomConfigPanel();
    }

  });

  Rkhelper.statusChangeCallback = Rkhelper.Status.addStatusChangeCallback(status => {
    if (status.callStatus.Status == 'Connected' && status.presentationStatus.remotePresentation && presenterLocation == 'local') {
      Rkhelper.UI.prompt.display({
        Duration: 15,
        FeedbackId: 'switchtoremotepres',
        Title: `Emplacement du présentateur`,
        Text: `La présentation semble provenir de l'extérieur.<br><br>Voulez-vous changer le mode d'affichage pour "Présentateur à distance" ?`,
        Options: [
          {
            label: `Non, le présentateur est ici`,
            callback: function () { }
          },
          {
            label: 'Oui, le présentateur est à distance',
            callback: function () {
              xapi.Command.UserInterface.Extensions.Widget.SetValue({
                WidgetId: 'preslocation',
                Value: 'remote'
              });
              changePresenterLocationRemote();
              presenterLocation = 'remote';
            }
          }
        ]
      },
        cancel => {

        });


    }
  });



  xapi.Status.Call.on(e => {
    switch (e.RemoteNumber) {
      case '.':
        displayAdvCmdPrompt();
        break;
    }
  });
  xapi.Event.UserInterface.Message.TextInput.Response.on(value => {
    if (value.FeedbackId == 'advcmd') {
      switch (value.Text.toLowerCase()) {
        case 'unlock':
          xapi.Config.UserInterface.SettingsMenu.Mode.set('Unlocked');
          lastCommandResponse = 'Configuration unlocked';
          break;
        case 'lock':
          xapi.Config.UserInterface.SettingsMenu.Mode.set('Locked');
          lastCommandResponse = 'Configuration locked';
          break;
        case 'restart macros':
          lastCommandResponse = 'Macros restarting';
          xapi.Command.Macros.Runtime.Restart();
          break;
        case 'displays':
          xapi.Command.UserInterface.Extensions.Panel.Open({
            PanelId: 'disp'
          });
          break;

        case 'restart control':
          xapi.Command.Message.Send({
            text: 'SYSTEM_CRESTRON_REBOOT'
          });
          xapi.Command.Message.Send({
            text: 'HW_RESTART'
          });
          lastCommandResponse = 'Restarting control system';
          break;

        case 'status':
          displayStatus();
          break;
      }
    }
    displayAdvCmdPrompt();
  });
  xapi.Event.UserInterface.Message.TextInput.Clear.on(value => {
    lastCommandResponse = '';
    clearCallHistory();
  });


}
function displayAdvCmdPrompt() {
  xapi.Command.UserInterface.Message.TextInput.Display({
    Duration: 0,
    FeedbackId: 'advcmd',
    InputText: '',
    InputType: 'SingleLine',
    KeyboardState: 'Open',
    Placeholder: '',
    SubmitText: 'Exécuter',
    Text: `Dernière réponse:<br>${lastCommandResponse}`,
    Title: 'Commandes avancées'
  });
}
function clearCallHistory() {
  setTimeout(() => {
    xapi.Command.CallHistory.DeleteAll();
  }, 5000);
}
function msgbox(title, text) {
  xapi.Command.UserInterface.Message.Prompt.Display(
    { Duration: 0, "Option.1": 'OK', Text: text, Title: title });
}

module.exports.init = init;

