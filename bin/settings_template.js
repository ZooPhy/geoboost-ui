'use strict';

console.log('Loading settings..');

const SETTINGS = {
  TOPO_SERVICES_URI: 'http://localhost:8025/topo', //uri for toponym extraction rest service
  SERVER_PORT: 3000 //port on which this ui will be available. 3000 is default in node.js apps
};

module.exports = SETTINGS;