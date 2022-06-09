/*jshint esversion: 6 */
//VERSION:6.0

import xapi from 'xapi';
const DEBUG = false;

const API_PUBLISH = '/api/v4/mqtt/publish';


module.exports.getAuth = function getAuth(username, password) {
  let b64 = btoa(`${username}:${password}`);
  return `Authorization: Basic ${b64}`;
};

module.exports.Telemetry = class Telemetry {
  constructor(url, auth) {
    this.url = url;
    this.auth = auth;
    this.clientid = 'EMQX.js-' + Math.floor(Math.random() * 10000000);
  }

  async observeStatus(status, key, topic, qos = 0, retain = false) {
    status[key].on(async s => {
      await this.publish(topic, s, qos, retain);
    });
  }

  async publish(topic, payload, qos = 0, retain = false) {
    var mqttmsg = {
      topic: topic,
      payload: payload,
      qos: qos,
      retain: retain,
      clientid: this.clientid
    };

    var publishurl = this.url + API_PUBLISH;

    await xapi.Command.HttpClient.Post({
      AllowInsecureHTTPS: true,
      Header: this.auth,
      ResultBody: 'PlainText',
      Url: publishurl
    }, JSON.stringify(mqttmsg)).then(response => {
      if (DEBUG) console.log(`MQTT Message sent. ${topic}=${payload}`);
    }).catch(err => {
      console.log(err);
      throw (`MQTT server error: StatusCode=${err.data.StatusCode} message=${err.message}`);
    });
  }
};