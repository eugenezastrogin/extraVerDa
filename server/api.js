'use strict';

const fsPromises = require('fs').promises;
const path = require('path');
const fetch = require('node-fetch');

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:');
const tabletojson = require('tabletojson');

function extractEventName(address) {
  const rg = /results\/(.*)\/\?mode/i;
  const event_name = address.match(rg);
  if (event_name && event_name[1]) {
    return event_name[1];
  } else {
    return '';
  }
}

function dbinit(address, html) {
  const match = extractEventName(address);
  return new Promise((resolve, reject) => {
    const converted = tabletojson.convert(html);

    // Turn into arrays from array-like object
    const raw_data = converted
      .filter(x => x.length > 1)
      .map(y => y.map(z => Object.values(z)));

    db.serialize(function() {
      const sqlstr =
      `
      CREATE TABLE IF NOT EXISTS data (
        match_id TEXT,
        competitor_name TEXT,
        competitor_class TEXT,
        competitor_pf TEXT,
        competitor_cat TEXT,
        stage INTEGER,
        hf REAL,
        raw_points INTEGER,
        time REAL,
        last_modified TEXT,
        UNIQUE(match_id, stage, competitor_name)
      );
      `;
      db.run(sqlstr);
      const stmt = db.prepare(
        'INSERT OR REPLACE INTO data VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      raw_data.forEach(comp => {
        // Remove nbsp and Country code
        const comp_name = comp[0][1]
          .replace(/\u00a0/g, ' ')
          .replace(/ +[a-zA-Z]{3}($| \[DQ\])/g, '');
        const comp_cats = comp[0][2].split(' / ');
        comp.slice(3).forEach(r => stmt.run(
          match,
          comp_name,
          ...comp_cats,
          r[0],
          r[1],
          r[2],
          r[10],
          r[11]
        ));
      });
      stmt.finalize(() => {
        getPassed(match).then(sec => {
          getBody.cache[address] = [Date.now(), sec];
        })
        resolve(match);
      });
    });
  })
}

function needsUpdate([lastFetched, elapsedSecs]) {
  const isStale = (Date.now() - lastFetched) < (15 * 60 * 1000);
  const onGoing = elapsedSecs < (2 * 24 * 60 * 60);
  return onGoing && isStale;
}

async function getBody(address, online=true) {
  const rg = /m.+dy\.ru\/.+results\/.+\/\?mode=verif.+/;
  if (!rg.test(address)) return Promise.reject('bl');

  if (!getBody.cache) {
    getBody.cache = {};
  }
  // Memoize for 15 minutes before refetching
  if (
    getBody.cache[address] &&
    !needsUpdate(getBody.cache[address])
  ) {
    return Promise.resolve(extractEventName(address));
  }
  console.log('Fetching anew: ', address);

  let body;
  if (online) {
    const html = fetch(
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

  return dbinit(address, body);
};

function getPassed(match) {
  // Return seconds passed from last modified match verification row
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT
        strftime('%s', 'now') -
        strftime('%s', MAX(datetime(last_modified))) as passed
      FROM data
      ` +
      'WHERE match_id=?',
      match,
      (err, rows) => {
        if (err) {
          reject(err);
        }
        resolve(rows[0].passed);
      },
    );
  });
}

function classes(match) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT DISTINCT competitor_class FROM data WHERE match_id=?',
      match,
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

function competitors(match, comp_class) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT DISTINCT competitor_name FROM data ' +
      'WHERE match_id=? AND competitor_class=?',
      match, comp_class,

      (err, rows) => {
        if (err) {
          console.log(err);
          reject(err);
        }
        const extractCompetitors = rows.map(x => x.competitor_name);
        resolve(extractCompetitors);
      },
    );
  });
}

function stages_by_competitor(match, competitor) {
  return new Promise((resolve, reject) => {
    db.all(
      `
      WITH stage_points_tb AS (
        SELECT
          *,
          (
            hf / MAX(hf) OVER (
              PARTITION BY stage, match_id, competitor_class
            )
          ) * MAX(raw_points) OVER (
            PARTITION BY stage, match_id, competitor_class
          ) AS stage_points
        FROM
          data
      ),
      stage_result AS (
        SELECT
          stage,
          match_id,
          competitor_class,
          competitor_name,
          ROUND(stage_points, 1) AS STAGE_POINTS,
          ROUND(
            (
              stage_points / MAX(raw_points) OVER (
                PARTITION BY stage, match_id, competitor_class
              )
            ) * 100,
            2
          ) AS STAGE_PERCENT,
          ROW_NUMBER() OVER (
            PARTITION BY stage,
            match_id,
            competitor_class
            ORDER BY
              stage_points DESC
          ) AS RANK,
          hf
        FROM
          stage_points_tb
        ORDER BY
          stage,
          stage_points DESC
      )
      SELECT
        stage,
        RANK,
        STAGE_PERCENT as percent,
        STAGE_POINTS as points,
        ROUND(hf, 2) as hf
      FROM
        stage_result
      ` +
      "WHERE match_id=? AND competitor_name LIKE '#' || ? || ' %'",
      match, competitor,
      function(err, rows) {
        if (err) {
          console.log(err);
          reject(err);
        }
        const extractStages = rows;
        resolve(extractStages);
      }
    );
  })
}

function class_overall(match, comp_class) {
  return new Promise((resolve, reject) => {
    db.all(
      `
      WITH stage_points_tb AS (
        SELECT
          *,
          (
            hf / MAX(hf) OVER (
              PARTITION BY stage, match_id, competitor_class
            )
          ) * MAX(raw_points) OVER (
            PARTITION BY stage, match_id, competitor_class
          ) AS stage_points
        FROM
          data
      ),
      competitor_points AS (
        SELECT
          match_id,
          competitor_class,
          competitor_name,
          SUM(stage_points) as competitor_points
        FROM
          stage_points_tb
        GROUP BY
          match_id,
          competitor_class,
          competitor_name
      ),
      winner_points AS (
        SELECT
          *,
          MAX(competitor_points) OVER (
            PARTITION by match_id, competitor_class
          ) as winner_points
        FROM
          competitor_points
      ),
      competitor_percent AS (
        SELECT
          *,
          (
            competitor_points / winner_points
          ) * 100 AS competitor_percent
        FROM
          winner_points
      )
      SELECT
        *,
        ROUND(competitor_percent, 2) as percent,
        ROUND(competitor_points, 2) as points,
        ROW_NUMBER() OVER (
          PARTITION BY match_id,
          competitor_class
          ORDER BY
            competitor_percent DESC
        ) AS RANK
      FROM
        competitor_percent
      ` +
      'WHERE match_id=? AND competitor_class=?' +
      'ORDER BY RANK',
      match, comp_class,
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

function combined_overall(match) {
  return new Promise((resolve, reject) => {
    db.all(
      `
      WITH stage_points_tb AS (
        SELECT
          *,
          (
            hf / MAX(hf) OVER (PARTITION BY stage, match_id)
          ) * MAX(raw_points) OVER (PARTITION BY stage, match_id) AS stage_points
        FROM
          data
      ),
      competitor_points AS (
        SELECT
          match_id,
          competitor_name,
          competitor_class AS class,
          SUM(stage_points) as competitor_points
        FROM
          stage_points_tb
        GROUP BY
          match_id,
          competitor_name
      ),
      winner_points AS (
        SELECT
          *,
          MAX(competitor_points) OVER (PARTITION by match_id) as winner_points
        FROM
          competitor_points
      ),
      competitor_percent AS (
        SELECT
          *,
          (
            competitor_points / winner_points
          ) * 100 AS competitor_percent
        FROM
          winner_points
      )
      SELECT
        *,
        ROUND(competitor_percent, 2) as percent,
        ROUND(competitor_points, 2) as points,
        ROW_NUMBER() OVER (
          PARTITION BY match_id
          ORDER BY
            competitor_percent DESC
        ) AS RANK
      FROM
        competitor_percent
      ` +
      'WHERE match_id=?' +
      'ORDER BY RANK',
      match,
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

function stages_by_class(match, comp_class, stage) {
  return new Promise((resolve, reject) => {
    db.all(
      `
      WITH stage_points_tb AS (
        SELECT
          *,
          (
            hf / MAX(hf) OVER (
              PARTITION BY stage, match_id, competitor_class
            )
          ) * MAX(raw_points) OVER (
            PARTITION BY stage, match_id, competitor_class
          ) AS stage_points
        FROM
          data
      ),
      stage_result AS (
        SELECT
          stage,
          match_id,
          competitor_class,
          competitor_name,
          time,
          ROUND(stage_points, 1) AS STAGE_POINTS,
          ROUND(
            (
              stage_points / MAX(raw_points) OVER (
                PARTITION BY stage, match_id, competitor_class
              )
            ) * 100,
            2
          ) AS STAGE_PERCENT,
          ROW_NUMBER() OVER (
            PARTITION BY match_id,
            stage,
            competitor_class
            ORDER BY
              stage_points DESC
          ) AS RANK,
          hf
        FROM
          stage_points_tb
      )
      SELECT
        match_id,
        RANK,
        time,
        STAGE_POINTS as points,
        STAGE_PERCENT as percent,
        competitor_name,
        ROUND(hf, 2) as hf
      FROM
        stage_result
      ` +
      'WHERE match_id=? AND competitor_class=? AND stage=?' +
      'ORDER BY RANK',
      match, comp_class, stage,
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

function stages_combined(match, stage) {
  return new Promise((resolve, reject) => {
    db.all(
      `
      WITH stage_points_tb AS (
        SELECT
          *,
          (
            hf / MAX(hf) OVER (PARTITION BY stage, match_id)
          ) * MAX(raw_points) OVER (PARTITION BY stage, match_id) AS stage_points
        FROM
          data
      ),
      stage_result AS (
        SELECT
          stage,
          match_id,
          competitor_name,
          time,
          ROUND(stage_points, 1) AS STAGE_POINTS,
          ROUND(
            (
              stage_points / MAX(raw_points) OVER (PARTITION BY stage, match_id)
            ) * 100,
            2
          ) AS STAGE_PERCENT,
          ROW_NUMBER() OVER (
            PARTITION BY stage,
            match_id
            ORDER BY
              stage_points DESC
          ) AS RANK,
          hf
        FROM
          stage_points_tb
      )
      SELECT
        match_id,
        RANK,
        time,
        STAGE_POINTS as points,
        STAGE_PERCENT as percent,
        competitor_name,
        ROUND(hf, 2) as hf
      FROM
        stage_result
      ` +
      'WHERE match_id=? AND stage=?' +
      'ORDER BY RANK',
      match, stage,
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
  class_overall,
  combined_overall,
  stages_by_competitor,
  stages_by_class,
  stages_combined,
};
