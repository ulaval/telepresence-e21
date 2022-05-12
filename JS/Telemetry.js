/*jshint esversion: 6 */
//VERSION:5.1[dev]

import xapi from 'xapi';

function getAuth(username, password) {
  let b64 = btoa(`${username}:${password}`);
  return `Authorization: Basic ${b64}`;
}

class Telemetry {
  constructor(url, auth) {
    console.log(auth)
  }

  observeStatus(status, key, topic) {
    status[key].on(s => {
      console.log(topic + ' = ' + s);
    });
  }
}






var t = new Telemetry('https://',getAuth('zagig','Ieidm2f++'));
//observeStatus(xapi.Status.Audio, 'Volume', '/systems/PVE/PVE1115/dev/DeskPro/Volume');