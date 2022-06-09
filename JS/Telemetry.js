/*jshint esversion: 6 */
//VERSION:6.0

import xapi from 'xapi';
const tel = require('./EMQX');
const RoomConfig = require('./RoomConfig');

const PATH = RoomConfig.config.telemetry.basepath;

var startTime;

var t = new tel.Telemetry(RoomConfig.config.telemetry.url, tel.getAuth(RoomConfig.config.telemetry.username, RoomConfig.config.telemetry.password));


t.observeStatus(xapi.Status.Standby.State, '', PATH + '/dev/RoomKitPro/standby', 0, false);
t.observeStatus(xapi.Status.Audio.Volume, '', PATH + '/dev/RoomKitPro/volume', 0, false);


xapi.Status.Standby.State.on(async state => {
  if (state == 'Off') {
    startTime = new Date();
  }
  if (state == 'Standby') {
    var endTime = new Date();
    var timeDiff = endTime - startTime; //in ms
    // strip the ms
    timeDiff /= 1000;

    // get seconds 
    var seconds = Math.round(timeDiff);
    await t.publish(PATH + '/var/lastsessiontimesec', seconds, 0, false);
  }
});




/* TEMPERATURE */
async function publishEnvironnement() {
  const ra = await xapi.Status.Peripherals.ConnectedDevice[1001].RoomAnalytics.get();
  const temp = ra.AmbientTemperature;
  const humid = ra.RelativeHumidity;
  const airqual = ra.AirQuality.Index;

  await t.publish(PATH + '/env/temperature', temp, 1, true);
  await t.publish(PATH + '/env/humidity', humid, 1, true);
  await t.publish(PATH + '/env/airquality', airqual, 1, true);
}

async function publishOnline() {
  var time = new Date().toLocaleTimeString();
  await t.publish(PATH + '/dev/RoomKitPro/online', time, 1, true);
}

async function init() {
  publishEnvironnement();
  setInterval(() => { publishEnvironnement(); }, 600000);


  setInterval(() => { publishOnline(); }, 30000);
  /* CALL */
  xapi.Event.CallSuccessful.on(async value => {
    await t.publish(PATH + '/var/callstatus', 'connected', 0, true);
  });
  xapi.Event.CallDisconnect.on(async value => {
    await t.publish(PATH + '/var/callstatus', 'disconnected', 0, true);
  });

  /* People presence */
  xapi.Status.RoomAnalytics.PeoplePresence.on(async value => {
    await t.publish(PATH + '/env/presence', value, 0, true);
  });


  xapi.Status.RoomAnalytics.PeoplePresence.get().then(async value => {
    await t.publish(PATH + '/env/presence', value, 0, true);
  });

  /* Alarme de feu ou de monoxyde de carbone */
  xapi.Status.RoomAnalytics.T3Alarm.Detected.on(async value => {
    await t.publish(PATH + '/env/t3alarm', value, 0, true);
  });

  xapi.Status.RoomAnalytics.T3Alarm.Detected.get().then(async value => {
    await t.publish(PATH + '/env/t3alarm', value, 0, true);
  });

}


init();
