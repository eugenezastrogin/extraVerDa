'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const compression = require('compression')
const bodyParser = require('body-parser');
const morgan = require('morgan');
const mr = require('./api');

const app = express();

const mode_online = true;

// create a write stream (in append mode)
const accessLogStream =
  fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });

// setup the logger
app.use(morgan('combined', { stream: accessLogStream }))

app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static('../public'))

app.get('/match', function(req, res) {
  const verification = req.query.e;

  if (verification) {
    mr.getBody(verification, mode_online).then(() => {
      res.status(200).send(JSON.stringify({ ok: true }));
    }).catch(e => {
      if (e === 'bl') {
        res.status(412).send();
      } else {
        console.log(e);
      }
    });
  }
});

app.get('/classes', function(req, res) {
  const verification = req.query.e;

  mr.getBody(verification, mode_online).then(match => {
    mr.classes(match).then(data => {
      res.status(200).send(data);
    }).catch(e => console.log(e));
  }).catch(e => console.log(e));
});

app.get('/competitors', function(req, res) {
  const verification = req.query.e;
  const comp_class = req.query.class;

  mr.getBody(verification, mode_online).then(match => {
    mr.competitors(match, comp_class).then(data => {
      res.status(200).send(data);
    }).catch(e => console.log(e));
  }).catch(e => console.log(e));
});

app.get('/stages', function(req, res) {
  const verification = req.query.e;
  const comp_num = req.query.n;
  const comp_class = req.query.class;
  const comp_stage = req.query.stage;

  mr.getBody(verification, mode_online).then(match => {
    if (comp_class === 'overall') {
      mr.stages_combined(match, comp_stage).then(data => {
        res.status(200).send(data);
      }).catch(e => console.log(e));
    } else if (comp_class) {
      mr.stages_by_class(match, comp_class, comp_stage).then(data => {
        res.status(200).send(data);
      }).catch(e => console.log(e));
    } else if (comp_num) {
      mr.stages_by_competitor(match, comp_num).then(data => {
        res.status(200).send(data);
      }).catch(e => console.log(e));
    }
  }).catch(e => console.log(e));
});

app.get('/overall', function(req, res) {
  const verification = req.query.e;
  const comp_class = req.query.class;
  const type = req.query.type;

  mr.getBody(verification, mode_online).then(match => {
    if (comp_class === 'combined') {
      mr.combined_overall(match).then(data => {
        res.status(200).send(data);
      }).catch(e => console.log(e));
    } else if (comp_class) {
      mr.class_overall(match, comp_class).then(data => {
        res.status(200).send(data);
      }).catch(e => console.log(e));
    } else {
    }
  }).catch(e => console.log(e));
});

module.exports = app;
