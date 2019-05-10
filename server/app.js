const express = require('express');
const bodyParser = require('body-parser');
const mr = require('./api');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static('../public'))

app.get('/classes', function(req, res) {
  mr.getBody('', false).then(() => {
    mr.classes().then(data => {
      res.status(200).send(data);
    });
  });
});

app.get('/competitors', function(req, res) {
  mr.getBody('', false).then(() => {
    const comp_class = req.query.class;
    mr.competitors(comp_class).then(data => {
      res.status(200).send(data);
    });
  });
});

app.get('/stages', function(req, res) {
  mr.getBody('', false).then(() => {
    const comp_num = req.query.n;
    const comp_class = req.query.class;
    const comp_stage = req.query.stage;
    console.log(comp_num, comp_class, comp_stage);
    if (comp_class) {
      mr.stages_by_class(comp_class, comp_stage).then(data => {
        res.status(200).send(data);
      });
    } else if (comp_num) {
      mr.stages_by_competitor(comp_num).then(data => {
        res.status(200).send(data);
      });
    }
  });
});

module.exports = app;
