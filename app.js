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
	let build_search_filters = (requirements) => {
		requirements = JSON.parse(requirements)
		console.log(requirements)
		let filter = []
		if (requirements.hasOwnProperty('title') && requirements["title"] != null && requirements["title"] != ""){
			let title_req = strip_special_characters(requirements["title"]).toLowerCase().replace(" ", "%")
			filter = filter.concat(
				"LOWER(title_eng) LIKE '%" + title_req + "%'"
			)
		}
		if (requirements.hasOwnProperty('min_score') && requirements["min_score"] != null && requirements["min_score"] != ""){
			let min_score = parseFloat(requirements["min_score"])
			filter = filter.concat(
				" score_mal >= " + min_score
			)
		}
		if (requirements.hasOwnProperty('min_votes') && requirements["min_votes"] != null && requirements["min_votes"] != ""){
			let min_votes = parseInt(requirements["min_votes"])
			filter = filter.concat(
				" votes_mal >= " + min_votes
			)
		}
		if (requirements.hasOwnProperty('type') && requirements["type"] != null && requirements["type"] != ""){
			let inp = strip_special_characters(requirements["type"]).split(" ")
			let req = []
			for (let i in inp){
				req = req.concat(" LOWER(type) = '" + inp[i].toLowerCase() + "' ")
			}
			filter = filter.concat(
				" (" + req.join(" OR ") + ") "
			)
		}
		if (requirements.hasOwnProperty('adapt') && requirements["adapt"] != null && requirements["adapt"] != ""){
			let inp = strip_special_characters(requirements["adapt"]).split(" ")
			let req = []
			for (let i in inp){
				req = req.concat(" LOWER(source) = '" + inp[i].toLowerCase().replace("_", " ") + "' ")
			}
			filter = filter.concat(
				" (" + req.join(" OR ") + ") "
			)
		}
		if (filter.length == 0){
			return ""
		}
		filter = " WHERE " + filter.join(" AND ")
		return filter
	}

	req.body["page"] = Math.max(parseInt(req.body["page"]), 0)
	let acceptedSortFields = {
		"title": "title_eng",
		"rating": "score_mal"
	};
	let acceptedSortOrder = {
		"ascending": "ASC",
		"descending": "DESC"
	};
	
	let query = `
		SELECT
			id, {fields}
		FROM anime
		{search_conditions}
		ORDER BY {sort_field} {sort_order}
		LIMIT {start_from}, 50
	`;
	console.log(req.body)
	query = utils.format_query(query, {
		"fields": "title_eng, title_native, score_mal, type, img",
		"sort_field": acceptedSortFields[req.body["sort_field"]],
		"sort_order": acceptedSortOrder[req.body["sort_order"]],
		"start_from": req.body["page"] * 50,
		"search_conditions": build_search_filters(req.body["search"])
	});
	console.log(query)

	const queryRes = await pool.query(query);
	try {
		res.render("anime_list.html", {
			animeList: queryRes,
			defaults: req.body,
			search_params: JSON.stringify(req.body["search"])});
	} catch(err) {
		console.log(err);
		res.status(500).send("database failed").end();
	}
}
app.post("/anime_list", anime_list_request);
app.get("/anime_list", async (req, res) => {
	// Default values
	req.body["sort_field"] = "rating";
	req.body["sort_order"] = "descending";
	req.body["page"] = 0;
	req.body["search"] = "{}"
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

//map_tag_to_anime
app.post("/map_tag_to_anime", async (req, res) => {
  console.log(req.query);
  try {
    await pool.query(
      "INSERT INTO `anime_tag_mapping` (anime_id, tag_id) VALUES (?,?)",
      [req.query["anime_id"], req.query["tag_id"]]
    );
  } catch (err) {
    console.log(err);
  }
  res.redirect("/");
});

app.get("/add_waifu_tag", async (req, res) => {
	console.log(req.body);
	console.log(req.query);
	try {
		await pool.query(
			"INSERT INTO `waifu_tag` (name) VALUES (?)",
			req.query["name"]
		);
	} catch (err) {
		console.log(err);
	}
	res.redirect("/");
});

app.post("/map_tag_to_waifu", async (req, res) => {
	console.log(req.query);
	try{
		await pool.query(
			"INSERT INTO `waifu_tag_mapping` (anime_id, tag_id, votes) VALUES (?, ?, 0)",
			[req.query["waifu_id"], req.query["tag_id"]]
		);
	} catch (err) {
		console.log(err);
	}
	res.redirect("/");
});

app.post("/waifu_tag_vote", async (req, res) => {
	console.log(req.query);
	try{
		await pool.query(
			"UPDATE `waifu_tag_mapping` SET `votes` = votes + 1 WHERE `waifu_id` = ? AND `tag_id` = ?",
			[req.query["waifu_id"], req.query["tag_id"]]
		);
	} catch (err) {
		console.log(err);
	}
	res.redirect("/");
});

app.post("/waifu_tag_unvote", async (req, res) => {
	console.log(req.query);
	try{
		await pool.query(
			"UPDATE `waifu_tag_mapping` SET `votes` = votes - 1 WHERE `waifu_id` = ? AND `tag_id` = ?",
			[req.query["waifu_id"], req.query["tag_id"]]
		);
	} catch (err){
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

