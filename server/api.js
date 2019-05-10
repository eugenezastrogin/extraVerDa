const fsPromises = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:');
const tabletojson = require('tabletojson');

const getBody = async (address, online=true) => {
  function dbinit(html) {
    return new Promise((resolve, reject) => {
      const converted = tabletojson.convert(html);

      const headerRegEx = /<H3>([\s\S]*)<\/H3>/i;
      const event_name = html.match(headerRegEx)[1];
      // Turn into arrays from array-like object
      const raw_data = converted
        .filter(x => x.length > 1)
        .map(y => y.map(z => Object.values(z)));

      db.serialize(function() {
        const sqlstr = `CREATE TABLE IF NOT EXISTS data (
                          match_id TEXT
                        , competitor_name TEXT
                        , competitor_class TEXT
                        , competitor_pf TEXT
                        , competitor_cat TEXT
                        , stage INTEGER
                        , hf REAL
                        , raw_points INTEGER
                        , time REAL
                        , last_modified TEXT
                        , UNIQUE(match_id, stage, competitor_name)
                    );`;
        db.run(sqlstr);
        const stmt = db.prepare(
          'INSERT OR IGNORE INTO data VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        raw_data.forEach(comp => {
          let comp_name = comp[0][1].replace(/\u00a0/g, ' ').split(' ');
          comp_name.pop()
          comp_name = comp_name.join(' ');
          const comp_cats = comp[0][2].split(' / ');
          comp.slice(3).forEach(r => stmt.run(
            event_name,
            comp_name,
            ...comp_cats,
            r[0],
            r[1],
            r[2],
            r[10],
            r[11]
          ));
        });
        stmt.finalize(resolve);
      });
    })
  }

  let body;
  if (online) {
    html = fetch(
      address,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const data = await html;
    console.log('STATUS IS: ', data.status);
    if (data.status != '200') return
    body = await data.text();
  } else {
    body = await fsPromises.readFile(
      path.resolve(__dirname, './test.html'),
      { encoding: 'UTF-8' },
    );
  }

  return dbinit(body);
};

function classes() {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT DISTINCT competitor_class FROM data',
      (err, rows) => {
        if (err) {
          console.log(err);
          reject(err);
        }
        const extractClasses = rows.map(x => x.competitor_class);
        resolve(extractClasses);
      },
    );
  });
}

function competitors(comp_class) {
  return new Promise((resolve, reject) => {
    let competitors = [];
    db.each(
      'SELECT DISTINCT competitor_name FROM data WHERE competitor_class=?',
      comp_class,

      (err, rows) => {
        if (err) {
          console.log(err);
          reject(err);
        }
        competitors.push(rows.competitor_name);
      },

      () => resolve(competitors),
    );
  });
}

function stages_by_competitor(competitor) {
  return new Promise((resolve, reject) => {
    db.all(
      `
      WITH stage_points_tb AS (
          SELECT *,
              (hf / MAX(hf) OVER (PARTITION BY stage, match_id, competitor_class)) *
              MAX(raw_points) OVER (PARTITION BY stage, match_id, competitor_class) AS stage_points
          FROM data
      ), stage_result AS (
          SELECT stage,
                 competitor_class,
                 competitor_name,
                 ROUND(stage_points, 1) AS STAGE_POINTS,
                 ROUND(
                     (stage_points /
                     MAX(raw_points) OVER (PARTITION BY stage, match_id, competitor_class)) * 100,
                     2
                 ) AS STAGE_PERCENT,
                 ROW_NUMBER() OVER (PARTITION BY stage, competitor_class ORDER BY stage_points DESC) AS RANK
          FROM stage_points_tb
          ORDER BY stage, stage_points DESC
      )
      SELECT stage, RANK, STAGE_PERCENT, STAGE_POINTS FROM stage_result
      ` +
      "WHERE competitor_name LIKE '#' || ? || ' %'",
      competitor,
      function(err, rows) {
        if (err) {
          console.log(err);
          reject(err);
        }
        console.log(rows);
        const extractStages = rows;
        resolve(extractStages);
      }
    );
  })
}

function stages_by_class(comp_class, stage) {
  return new Promise((resolve, reject) => {
    db.all(
      `
      WITH stage_points_tb AS (
          SELECT *,
              (hf / MAX(hf) OVER (PARTITION BY stage, match_id, competitor_class)) *
              MAX(raw_points) OVER (PARTITION BY stage, match_id, competitor_class) AS stage_points
          FROM data
      ), stage_result AS (
          SELECT stage,
                 competitor_class,
                 competitor_name,
                 time,
                 ROUND(stage_points, 1) AS STAGE_POINTS,
                 ROUND(
                     (stage_points /
                     MAX(raw_points) OVER (PARTITION BY stage, match_id, competitor_class)) * 100,
                     2
                 ) AS STAGE_PERCENT,
                 ROW_NUMBER() OVER (PARTITION BY stage, competitor_class ORDER BY stage_points DESC) AS RANK
          FROM stage_points_tb
          ORDER BY stage, stage_points DESC
      )
      SELECT RANK, time, STAGE_POINTS, STAGE_PERCENT, competitor_name FROM stage_result
      ` +
      'WHERE competitor_class=? AND stage=?' +
      'ORDER BY RANK',
      comp_class, stage,
      function(err, rows) {
        if (err) {
          console.log(err);
          reject(err);
        }
        const extractStages = rows;
        resolve(extractStages);
      }
    )
  });
}

module.exports = {
  getBody,
  classes,
  competitors,
  stages_by_competitor,
  stages_by_class,
};
