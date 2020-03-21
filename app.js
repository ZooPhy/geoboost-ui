'use strict';

let express = require('express');
let path = require('path');
let cookieParser = require('cookie-parser');
let bodyParser = require('body-parser');
let request = require('request');
// let request = require('tiny-json-http'); //migrate soon
const API_URI = require('./bin/settings').TOPO_SERVICES_URI;

let index = require('./routes/index');

let app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('./public'));
app.use(express.static('./public/stylesheets'));
app.use(express.static('./public/images'));
app.use(express.static('./public/javascripts'));
app.use(express.static('./public/downloads'));

app.use('/', index);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(function(req, res) {
  res.status(404).send();
});

console.log('GeoBoost2 Started Up');

console.log('Testing GeoBoost2 Services API:' + API_URI);

request.get(API_URI, function (error, response, body) {
  if (error) {
    console.error('GeoBoost2 API test failed: '+error);
  }
  else if (response && response.statusCode === 200) {
    console.log('GeoBoost2 API test suceeded with response: '+body);
  }
  else {
    let err = 'unknown';
    let status = 'unknown';
    if (response) {
      err = body;
      status = response.statusCode;
    }
    console.error('GeoBoost2 API test failed with status: '+status+'\nand message: '+err);
  }
});

module.exports = app;
