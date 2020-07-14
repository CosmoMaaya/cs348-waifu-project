"use strict";

// Includes
const fs = require("fs");
const express = require("express");
const mysql = require("promise-mysql");
const bodyParser = require("body-parser"); // parsing form requests
const nunjucks = require("nunjucks"); // templating engine
const utils = require("./utils");

const config = JSON.parse(
  fs.readFileSync(
    fs.existsSync("config-local.json") ? "config-local.json" : "config.json"
  )
);

const app = express();

app.disable("x-powered-by");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));
nunjucks.configure("views", {
  autoescape: true,
  express: app,
});

let pool;

app.get("/", async (req, res) => {
  // try {
  // 	const queryRes = await pool.query("SELECT * FROM anime");
  // 	res.render("index.html", {waifuList: queryRes});
  // } catch(err) {
  // 	console.log(err);
  // 	res.status(500).send("database failed").end();
  // }
  res.redirect("/anime_list");
});

app.post("/add", async (req, res) => {
  console.log(req.body);
  try {
    await pool.query("INSERT INTO myanimelist (title) VALUES (?)", [
      req.body.title,
    ]);
  } catch (err) {
    console.log(err);
  }
  res.redirect("/");
});

let anime_list_request = async (req, res) => {
  req.body["page"] = Math.max(parseInt(req.body["page"]), 0);
  let acceptedSortFields = {
    title: "title_eng",
    rating: "score_mal",
  };
  let acceptedSortOrder = {
    ascending: "ASC",
    descending: "DESC",
  };

  let query = `
		SELECT
			id, {fields}
		FROM anime
		ORDER BY {sort_field} {sort_order}
		LIMIT {start_from}, 50
	`;
  query = utils.format_query(query, {
    fields: "title_eng, title_native, score_mal, type, img",
    sort_field: acceptedSortFields[req.body["sort_field"]],
    sort_order: acceptedSortOrder[req.body["sort_order"]],
    start_from: req.body["page"] * 50,
  });

  const queryRes = await pool.query(query);
  try {
    res.render("anime_list.html", { animeList: queryRes, defaults: req.body });
  } catch (err) {
    console.log(err);
    res.status(500).send("database failed").end();
  }
};
app.post("/anime_list", anime_list_request);
app.get("/anime_list", async (req, res) => {
  // Default values
  req.body["sort_field"] = "rating";
  req.body["sort_order"] = "descending";
  req.body["page"] = 0;
  await anime_list_request(req, res);
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
    fields: "title_eng, title_native, score_mal, type, img",
    anime_id: anime_id,
  });

  let character_list_query = `
		SELECT
			{fields}
		FROM anime_to_waifu_mapping
		INNER JOIN waifu
		ON anime_to_waifu_mapping.waifu_id = waifu.id
		WHERE anime_id = {anime_id}
		ORDER BY {sort_order}
	`;
  character_list_query = utils.format_query(character_list_query, {
    anime_id: anime_id,
    fields: "name_eng, role, likes_ap / (likes_ap + dislikes_ap) as score, img",
    sort_order: "likes_ap / (likes_ap + dislikes_ap)",
  });

  let info_query_res = await pool.query(anime_info_query);
  let character_list_res = await pool.query(character_list_query);
  try {
    res.render("anime_page.html", {
      animeInfo: info_query_res[0],
      characterList: character_list_res,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("database failed").end();
  }
};

app.get("/anime/:id", anime_page_request);

//anime_tag

app.post("/add_anime_tag", async (req, res) => {
  console.log(req.body);
  console.log(req.query);
  try {
    await pool.query(
      "INSERT INTO `anime_tag` (name) VALUES (?)",
      req.query["name"]
    );
  } catch (err) {
    console.log(err);
  }
  res.redirect("/");
});

(async () => {
  try {
    pool = await mysql.createPool(config.database);

    const port = process.env.PORT || 8080;
    app.listen(port, () => {
      console.log("Listening on " + port);
    });
  } catch (err) {
    console.log(err);
  }
})();

app.get("/add_waifu_tag", async (req, res) => {
	console.log(req.body);
	console.log(req.query);
	try {
		await pool.query{
			"INSERT INTO `waifu_tag` (name) VALUES (?)",
			req.query["name"]
		};
	} catch (err) {
		console.log(err);
	}
	res.redirect("/");
});
