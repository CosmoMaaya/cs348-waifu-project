"use strict";

// Includes
const fs = require("fs");
const express = require("express");
const mysql = require("promise-mysql");
const bodyParser = require("body-parser"); // parsing form requests
const nunjucks = require("nunjucks"); // templating engine
const utils = require("./utils");
const { strip_special_characters } = require("./utils");

const config = JSON.parse(
  fs.readFileSync(
    fs.existsSync("config-local.json") ? "config-local.json" : "config.json"
  )
);

const app = express();
let comment = "";

app.disable("x-powered-by");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
nunjucks.configure("views", {
  autoescape: true,
  express: app,
  noCache: true
});

let pool;

app.get("/", async (req, res) => {
  // try {
  //     const queryRes = await pool.query("SELECT * FROM anime");
  //     res.render("index.html", {waifuList: queryRes});
  // } catch(err) {
  //     console.log(err);
  //     res.status(500).send("database failed").end();
  // }
  res.redirect("/anime_list");
});

//app.post("/add", async (req, res) => {
//  console.log(req.body);
//  try {
//    await pool.query("INSERT INTO myanimelist (title) VALUES (?)", [
//      req.body.title,
//    ]);
//  } catch (err) {
//    console.log(err);
//  }
//  res.redirect("/");
//});

app.post("/anime_list_query", async (req, res) => {
  let build_search_filters = (requirements) => {
    console.log(requirements);
    let filter = [];
    if (requirements["tags_blacklist"]){
      let blacklist = requirements["tags_blacklist"].split(",").map(x=>x.trim());
      filter = filter.concat("id NOT IN (select anime_id FROM anime_tag_mapping WHERE tag_id IN (SELECT id FROM anime_tag WHERE name IN ("
      + blacklist.map(x=>"\""+x+"\"").join(",")+")))")
    }
    if (requirements["tags_whitelist"]){
      let whitelist = requirements["tags_whitelist"].split(",").map(x=>x.trim());
      filter = filter.concat("id IN (select anime_id FROM anime_tag_mapping WHERE tag_id IN (SELECT id FROM anime_tag WHERE name IN ("
      + whitelist.map(x=>"\""+x+"\"").join(",")+")))")
    }
    if (requirements["title"]) {
      let title_req = strip_special_characters(requirements["title"])
        .toLowerCase()
        .replace(" ", "%");
      filter = filter.concat("LOWER(title_eng) LIKE '%" + title_req + "%'");
    }
    if (requirements["min_score"]) {
      let min_score = parseFloat(requirements["min_score"]);
      filter = filter.concat(" score >= " + min_score);
    }
    // if (requirements.hasOwnProperty('min_votes') && requirements["min_votes"] != null && requirements["min_votes"] != ""){
    //     let min_votes = parseInt(requirements["min_votes"])
    //     filter = filter.concat(
    //         " votes_mal >= " + min_votes
    //     )
    // }
    if (requirements["type"]) {
      let inp = requirements["type"];
      let req = [];
      for (let i in inp) {
        req = req.concat(" LOWER(type) = '" + strip_special_characters(inp[i]).toLowerCase() + "' ");
      }
      if(req.length != 0) {
        filter = filter.concat(" (" + req.join(" OR ") + ") ");
      } else {
		filter = filter.concat(" FALSE ");
	  }
    }
    if (requirements["adapt"]) {
      let inp = requirements["adapt"];
      let req = [];
      for (let i in inp) {
        req = req.concat(
          " LOWER(source) = '" + strip_special_characters(inp[i]).toLowerCase().replace("_", " ") + "' "
        );
      }
      if(req.length != 0) {
        filter = filter.concat(" (" + req.join(" OR ") + ") ");
      } else {
		filter = filter.concat(" FALSE ");
	  }
    }
    if (filter.length == 0) {
      return "";
    }
    filter = " WHERE " + filter.join(" AND ");
    return filter;
  };

  req.body["page"] = Math.max(parseInt(req.body["page"]), 1) - 1;
  let acceptedSortFields = {
    title: "title_eng",
    rating: "score",
  };
  let acceptedSortOrder = {
    ascending: "ASC",
    descending: "DESC",
  };

  let query = `
        SELECT
            id, {fields}
        FROM anime
        {search_conditions}
        ORDER BY {sort_field} {sort_order}
        LIMIT {start_from}, 50
    `;
  console.log(req.body);
  query = utils.format_query(query, {
    fields: "title_eng, title_native, score, type, img",
    sort_field: acceptedSortFields[req.body["sort_field"]],
    sort_order: acceptedSortOrder[req.body["sort_order"]],
    start_from: req.body["page"] * 50,
    search_conditions: build_search_filters(req.body),
  });
  console.log(query);

  comment = "Filter and sort anime list";
  try {
      const queryRes = await pool.query(query);
    res.render("anime_list_query.html", {
      animeList: queryRes,
      defaults: req.body,
      search_params: JSON.stringify(req.body["search"]),
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("database failed").end();
  }
});

app.get("/anime_list", async (req, res) => {
    res.render("anime_list.html");
});

// add rating for anime
app.post("/anime/:id/vote", async (req, res) => {
  let anime_id = parseInt(req.params.id);

  let rating_query = `
    SELECT
      score
    FROM anime
    WHERE id = {anime_id}
  `;
  rating_query = utils.format_query(rating_query, { anime_id: anime_id });
  comment = "Get the current score before voting computation";
  let rating_res = await pool.query(rating_query);
  let existing_rating = parseFloat(rating_res[0].score);
  let user_rating = parseFloat(req.body.user_rating);
  let new_rating =
    Math.round(((existing_rating * 100 + user_rating) / 101) * 100) / 100;

  try {
    comment = "Set the score after the voting computation";
    await pool.query("UPDATE anime SET score = ? WHERE id = ?", [
      new_rating,
      anime_id,
    ]);
  } catch (err) {
    console.log(err);
  }
  res.redirect(req.originalUrl.slice(0, -5));
});

let anime_page_request = async (req, res) => {
  let anime_id = parseInt(req.params.id);
  let anime_info_query = `
        SELECT
            {fields}
        FROM anime
        WHERE id = {anime_id}
    `;
  anime_info_query = utils.format_query(anime_info_query, {
    fields: "title_eng, title_native, score, type, img",
    anime_id: anime_id,
  });

  let character_list_query = `
        WITH waifu_info AS (
            SELECT *
            FROM anime_to_waifu_mapping
            INNER JOIN waifu        
            ON anime_to_waifu_mapping.waifu_id = waifu.id
            WHERE anime_id = {anime_id}
        ) 
        SELECT 
            {fields}
        FROM (
            SELECT *, 1 AS filter
            FROM waifu_info
            WHERE role = "main"
            UNION ALL
            SELECT *, 2 AS filter
            FROM waifu_info
            WHERE role = "supporting"
            UNION ALL
            SELECT *, 3 AS filter
            FROM waifu_info
            WHERE role = "minor"
             ) tmp
        ORDER BY filter, {sort_order}
    `;

  character_list_query = utils.format_query(character_list_query, {
    anime_id: anime_id,
    fields:
      "name_eng, waifu_id, role, likes / (likes + dislikes) as score, img",
    sort_order: "likes / (likes + dislikes) DESC",
  });

  let anime_tags_query = `
          SELECT name FROM anime_tag 
        INNER JOIN (
            SELECT tag_id 
            FROM anime_tag_mapping
            WHERE anime_id = {anime_id}
        ) temp
        ON anime_tag.id = temp.tag_id
  `;

  anime_tags_query = utils.format_query(anime_tags_query, {
    anime_id: anime_id,
  });
  comment = "Get the detailed info for an anime";
  let info_query_res = await pool.query(anime_info_query);
  comment = "Get a list of characters for an anime";
  let character_list_res = await pool.query(character_list_query);
  comment = "Get a list of tags for an anime";
  let anime_tag_res = await pool.query(anime_tags_query);
  try {
    res.render("anime_page.html", {
      animeInfo: info_query_res[0],
      characterList: character_list_res,
      animeIdLink: "/anime/" + anime_id,
      animeTagInfo: anime_tag_res,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("database failed").end();
  }
};

app.get("/anime/:id", anime_page_request);

let waifu_page_request = async (req, res) => {
  let waifu_id = parseInt(req.params.id);
  let waifu_info_query = `
        SELECT
            {fields}
        FROM waifu
        WHERE id = {waifu_id}
    `;
  let waifu_tags_query = `
    SELECT waifu_tag.id, waifu_tag.name, waifu_tag_mapping.votes
    FROM waifu_tag
    INNER JOIN waifu_tag_mapping
    ON waifu_tag_mapping.waifu_id = {waifu_id} AND waifu_tag.id = waifu_tag_mapping.tag_id
    `;

  waifu_info_query = utils.format_query(waifu_info_query, {
    fields: "name_eng, name_native, gender, hair_color, likes, dislikes, img",
    waifu_id: waifu_id,
  });
  waifu_tags_query = utils.format_query(waifu_tags_query, {
    waifu_id: waifu_id,
  });

  comment = "Get detailed info for a waifu";
  let waifu_info_res = await pool.query(waifu_info_query);
  comment = "Get tag info for a waifu";
  let waifu_tags_res = await pool.query(waifu_tags_query);
  try {
    res.render("waifu_page.html", {
      //todo: add tag vote and may need modify the vote req.
      waifuIDLink: "/waifu/" + waifu_id,
      waifuInfo: waifu_info_res[0],
      waifuTags: waifu_tags_res,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("database failed").end();
  }
};

app.get("/waifu/:id", waifu_page_request);

app.get("/allWaifuTags", async(req, res) => {
    comment = "List all waifu tags";
    const queryRes = await pool.query("SELECT name FROM waifu_tag");
    const result = [];
    queryRes.forEach(e => {
        result.push(e.name);
    });

    res.end(JSON.stringify(result));
});

app.get("/allAnimeTags", async(req, res) => {
    comment = "List all anime tags";
    const queryRes = await pool.query("SELECT name FROM anime_tag");
    const result = [];
    queryRes.forEach(e => {
        result.push(e.name);
    });

    res.end(JSON.stringify(result));
});

//Add anime_tag

app.post("/anime/:id/add_anime_tag", async (req, res) => {
  try {
    let tag_id;
    comment = "Try to search for the anime tag id if it already exists";
    let tag_id_res = await pool.query(
      "SELECT id FROM anime_tag WHERE name = (?)",
      req.body.tagName
    );

    if (tag_id_res.length == 0) {
      comment = "Anime tag id doesn't already exist? Insert it";
      let insert_new_tag_res = await pool.query(
        "INSERT INTO `anime_tag` (name) VALUES (?)",
        req.body.tagName
      );
      tag_id = insert_new_tag_res.insertId;
    } else {
      tag_id = tag_id_res[0].id;
      comment = "Check if tag is already attached to an anime";
      let tag_mapping_res = await pool.query(
        "SELECT * FROM anime_tag_mapping WHERE anime_id = (?) AND tag_id = (?)",
        [req.params.id, tag_id]
      );
      if (tag_mapping_res.length > 0) {
        console.log("already exists");
        res.redirect(req.originalUrl.slice(0, -14));
        return;
      }
    }
    comment = "Attach an anime tag to an anime";
    await pool.query(
      "INSERT INTO `anime_tag_mapping` (anime_id, tag_id) VALUES (?,?)",
      [req.params.id, tag_id]
    );
  } catch (err) {
    console.log(err);
  }
  // original URL is /anime/:id/add_anime_tag. Remove last 14 chars to get anime page
  res.redirect(req.originalUrl.slice(0, -14));
});

//map_tag_to_anime
app.post("/map_tag_to_anime", async (req, res) => {
  console.log(req.query);
  try {
    comment = "Add an existing tag to an anime";
    await pool.query(
      "INSERT INTO `anime_tag_mapping` (anime_id, tag_id) VALUES (?,?)",
      [req.query["anime_id"], req.query["tag_id"]]
    );
  } catch (err) {
    console.log(err);
  }
  res.redirect("/");
});

app.post("/waifu/:id/add_waifu_tag", async (req, res) => {
  try {
    let tag_id;
    comment = "Try to search for the waifu tag id if it already exists";
    let tag_id_res = await pool.query(
      "SELECT id FROM waifu_tag WHERE name = (?)",
      req.body.tagName
    );

    if (tag_id_res.length == 0) {
      comment = "Waifu tag id doesn't already exist? Insert it";
      let insert_new_tag_res = await pool.query(
        "INSERT INTO `waifu_tag` (name) VALUES (?)",
        req.body.tagName
      );
      tag_id = insert_new_tag_res.insertId;
    } else {
      tag_id = tag_id_res[0].id;
      comment = "Check if tag is already attached to an waifu";
      let tag_mapping_res = await pool.query(
        "SELECT * FROM waifu_tag_mapping WHERE waifu_id = (?) AND tag_id = (?)",
        [req.params.id, tag_id]
      );
      if (tag_mapping_res.length > 0) {
        console.log("already exists");
        res.redirect(req.originalUrl.slice(0, -14));
        return;
      }
    }
    comment = "Attach a waifu tag to a waifu";
    await pool.query(
      "INSERT INTO `waifu_tag_mapping` (waifu_id, tag_id) VALUES (?,?)",
      [req.params.id, tag_id]
    );
  } catch (err) {
    console.log(err);
  }
  // original URL is /waifu/:id/add_waifu_tag. Remove last 14 chars to get anime page
  res.redirect(req.originalUrl.slice(0, -14));
});

app.post("/map_tag_to_waifu", async (req, res) => {
  console.log(req.query);
  try {
    comment = "Add an existing tag to a waifu";
    await pool.query(
      "INSERT INTO `waifu_tag_mapping` (anime_id, tag_id, votes) VALUES (?, ?, 0)",
      [req.query["waifu_id"], req.query["tag_id"]]
    );
  } catch (err) {
    console.log(err);
  }
  res.redirect("/");
});

app.post("/waifu/:id/waifu_tag_vote", async (req, res) => {
  let waifuID = req.params.id;
  let tagID = req.body["tagID"];
  try {
    comment = "Vote for a tag attached to a waifu";
    await pool.query(
      "UPDATE `waifu_tag_mapping` SET `votes` = votes + 1 WHERE `waifu_id` = ? AND `tag_id` = ?",
      [waifuID, tagID]
    );
  } catch (err) {
    console.log(err);
  }
  res.redirect(req.originalUrl.slice(0, -14));
});

app.post("/waifu/:id/waifu_tag_unvote", async (req, res) => {
  let waifuID = req.params.id;
  let tagID = req.body["tagID"];
  try {
    comment = "Remove a vote for a tag attached to a waifu";
    await pool.query(
      "UPDATE `waifu_tag_mapping` SET `votes` = votes - 1 WHERE `waifu_id` = ? AND `tag_id` = ?",
      [waifuID, tagID]
    );
  } catch (err) {
    console.log(err);
  }
  res.redirect(req.originalUrl.slice(0, -16));
});

app.use(function (err, req, res, next) {
  console.error(err);
  console.error(err.stack);
  res.status(500).send('Internal Server Error Occurred')
});

(async () => {
  try {
    pool = await mysql.createPool(config.database);

    if (process.argv.includes("dumpsql")) {
      const oldQuery = pool.query;
      pool.query = function (...args) {
        console.error("/* " + comment + " */");
        console.error(
          "/* Code location: " +
            new Error().stack
              .split("\n")[2]
              .replace(__dirname + "/", "")
              .trim() +
            " */"
        );
        console.error(mysql.format(...args).trim() + ";");
        console.error();
        return oldQuery.call(pool, ...args);
      };
    }

    const port = process.env.PORT || 8080;
    app.listen(port, () => {
      console.log("Listening on " + port);
    });
  } catch (err) {
    console.log(err);
  }
})();
