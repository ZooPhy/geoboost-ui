'use strict';

let express = require('express');
let request = require('request');
// let request = require('tiny-json-http'); //migrate soon

const API_URI = require('../bin/settings').TOPO_SERVICES_URI;

let router = express.Router();

router.get('/', function(req, res) {
  res.status(200).render('home', {});
});

router.get('/aboutgeoboost2', function(req, res) {
  res.status(200).render('about');
});

router.post('/detect', function(req, res) {
  var result;
  // console.log('Route: /detect ' + req.body.text);
  try {
    if (typeof(req.body.text) === 'string') {
      var body = String(req.body.text.trim());
      var uri = API_URI+'/detect';
      // console.log('Route: The uri is \''+uri+'\' with body \'' +body+ '\'');
      request.post({
        headers: {'content-type' : 'application/json'},
        url: uri,
        body: JSON.stringify({'text': body})
      }, function (error, response, body) {
        if (response && response.statusCode === 200) {
          var rawRecords = JSON.parse(body);
          // console.log(rawRecords);
          console.log('Route: Success '+ rawRecords.length + ' retrieved.');
          result = {
            status: 200,
            count: rawRecords.length,
            records: rawRecords
          };
        } else if (error) {
          var errorMsg = 'Route: Failed to call API';
          console.error(errorMsg + ":" + error);
          result = {status: 500, error: errorMsg};
        } else {
          var errorMsg = 'Route: Extract failed to retrieve records from services API';
          console.error(errorMsg + ":" + (response)?body:'');
          result = {status: 500, error: errorMsg};
        }
        res.status(result.status).send(result);
      });
    } else {
      var errorMsg = 'Route: Bad extract query ';
      console.warn(errorMsg + ":" + String(req.query.query));
      result = {status: 400, error: errorMsg};
      res.status(result.status).send(result);
    }
  } catch (err) {
    var errorMsg = 'Route: Failed to retrieve records from services API';
    console.error(errorMsg + ":" +err);
    result = {status: 500, error: errorMsg};
    res.status(result.status).send(result);
  }
});

router.post('/resolve', function(req, res) {
  var result;
  // console.log('Route: /resolve ' + req.body.text);
  try {
    if (typeof(req.body.text) === 'string') {
      var body = String(req.body.text.trim());
      var uri = API_URI+'/resolve';
      // console.log('Route: The uri is \''+uri+'\' with body \'' +body+ '\'');
      request.post({
        headers: {'content-type' : 'application/json'},
        url: uri,
        body: JSON.stringify({'text': body})
      }, function (error, response, body) {
        if (response && response.statusCode === 200) {
          var rawRecords = JSON.parse(body);
          // console.log(rawRecords);
          console.log('Route: Success '+ rawRecords.locations.length + ' retrieved.');
          result = {
            status: 200,
            text: rawRecords.text,
            count: rawRecords.locations.length,
            records: rawRecords.locations
          };
        } else if (error) {
          var errorMsg = 'Route: Failed to call API';
          console.error(errorMsg + ":" + error);
          result = {status: 500, error: errorMsg};
        } else {
          var errorMsg = 'Route: Extract failed to retrieve records from services API';
          console.error(errorMsg + ":" + (response)?body:'');
          result = {status: 500, error: errorMsg};
        }
        res.status(result.status).send(result);
      });
    } else {
      var errorMsg = 'Route: Bad extract query ';
      console.warn(errorMsg + ":" + String(req.query.query));
      result = {status: 400, error: errorMsg};
      res.status(result.status).send(result);
    }
  } catch (err) {
    var errorMsg = 'Route: Failed to retrieve records from services API';
    console.error(errorMsg + ":" +err);
    result = {status: 500, error: errorMsg};
    res.status(result.status).send(result);
  }
});

router.get('/accession', function(req, res) {
  var result;
  console.log('Route: /accession ' + req.query.text);
  try {
    if (typeof(req.query.text) === 'string') {
      var query = String(req.query.text.trim());
      var suff = String(req.query.suff.trim());
      var maxlocs = String(req.query.maxlocs.trim());
      var uri = API_URI+'/accession?text='+query+'&suff='+suff+'&maxlocs='+maxlocs;
      console.log('Route: The uri is \''+uri+'\'');
      request.get(uri, function (error, response, body) {
        if (response && response.statusCode === 200) {
          // console.log(body)
          var rawRecords = JSON.parse(body);
          console.log('Route: Success '+ rawRecords.genbankrecords.length + ' retrieved.');
          result = {
            status: 200,
            count: rawRecords.genbankrecords.length,
            records: rawRecords.genbankrecords,
            errors: rawRecords.errors
          };
        } else if (error) {
          var errorMsg = 'Route: Failed to call API';
          console.error(errorMsg + ":" + error);
          result = {status: 500, error: errorMsg};
        } else {
          var errorMsg = 'Route:Search failed to retrieve records from services API';
          console.error(errorMsg + ":" + (response)?body:'');
          result = {status: 500, error: errorMsg};
        }
        res.status(result.status).send(result);
      });
    } else {
      var errorMsg = 'Route: Bad Search query';
      console.warn(errorMsg + ":" + String(req.query.query));
      result = {status: 400, error: errorMsg};
      res.status(result.status).send(result);
    }
  } catch (err) {
    var errorMsg = 'Route:Failed to retrieve records from services  API';
    console.error(errorMsg + ":" +err);
    result = {status: 500, error: errorMsg};
    res.status(result.status).send(result);
  }
});

router.get('/pubmed', function(req, res) {
  var result;
  console.log('Route: /pubmed ' + req.query.text);
  try {
    if (typeof(req.query.text) === 'string') {
      var query = String(req.query.text.trim());
      var uri = API_URI+'/pubmed?text='+query;
      console.log('Route: The uri is \''+uri+'\'');
      request.get(uri, function (error, response, body) {
        if (response && response.statusCode === 200) {
          // console.log(body)
          var rawRecords = JSON.parse(body);
          console.log('Route: Success '+ rawRecords.pubmedrecords.length + ' retrieved.');
          result = {
            status: 200,
            count: rawRecords.pubmedrecords.length,
            records: rawRecords.pubmedrecords,
            errors: rawRecords.errors
          };
        } else if (error) {
          var errorMsg = 'Route: Failed to call API';
          console.error(errorMsg + ":" + error);
          result = {status: 500, error: errorMsg};
        } else {
          var errorMsg = 'Route:Search failed to retrieve records from services API';
          console.error(errorMsg + ":" + (response)?body:'');
          result = {status: 500, error: errorMsg};
        }
        res.status(result.status).send(result);
      });
    } else {
      var errorMsg = 'Route: Bad Search query';
      console.warn(errorMsg + ":" + String(req.query.query));
      result = {status: 400, error: errorMsg};
      res.status(result.status).send(result);
    }
  } catch (err) {
    var errorMsg = 'Route:Failed to retrieve records from services  API';
    console.error(errorMsg + ":" +err);
    result = {status: 500, error: errorMsg};
    res.status(result.status).send(result);
  }
});

module.exports = router;
