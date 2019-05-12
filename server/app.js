'use strict';

const express = require('express');
const compression = require('compression')
const bodyParser = require('body-parser');
const mr = require('./api');

const app = express();

const mode_online = true;

app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static('../public'))

app.get('/match', function(req, res) {
  const verification = req.query.e;
  if (verification) {
    mr.getBody(verification, mode_online).then(() => {
      res.status(200).send('ok');
    }).catch(e => console.log(e));
  }
});

app.get('/classes', function(req, res) {
  const verification = req.query.e;
  mr.getBody(verification, mode_online).then(() => {
    mr.classes().then(data => {
      res.status(200).send(data);
    }).catch(e => console.log(e));
  });
});

app.get('/competitors', function(req, res) {
  const verification = req.query.e;
  mr.getBody(verification, mode_online).then(() => {
    const comp_class = req.query.class;
    mr.competitors(comp_class).then(data => {
      res.status(200).send(data);
    }).catch(e => console.log(e));
  });
});

app.get('/stages', function(req, res) {
  const verification = req.query.e;
  mr.getBody(verification, mode_online).then(() => {
    const comp_num = req.query.n;
    const comp_class = req.query.class;
    const comp_stage = req.query.stage;
    if (comp_class) {
      mr.stages_by_class(comp_class, comp_stage).then(data => {
        res.status(200).send(data);
      });
    } else if (comp_num) {
      mr.stages_by_competitor(comp_num).then(data => {
        res.status(200).send(data);
      });
    }
  }).catch(e => console.log(e));
});

module.exports = app;
