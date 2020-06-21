"use strict";

// Includes
const fs = require("fs");
const express = require("express");
const mysql = require("promise-mysql");
const bodyParser = require("body-parser"); // parsing form requests
const nunjucks = require("nunjucks"); // templating engine
const utils = require("./utils");

const config = JSON.parse(fs.readFileSync(fs.existsSync("config-local.json") ? "config-local.json" : "config.json"));

const app = express();

app.disable("x-powered-by");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: false}));
nunjucks.configure("views", {
	autoescape: true,
	express: app
});

let pool;

app.get("/", async (req, res) => {
	try {
		const queryRes = await pool.query("SELECT * FROM anime");
		res.render("index.html", {waifuList: queryRes});
	} catch(err) {
		console.log(err);
		res.status(500).send("database failed").end();
	}
});

app.post("/add", async (req, res) => {
	console.log(req.body);
	try {
		await pool.query("INSERT INTO myanimelist (title) VALUES (?)", [req.body.title]);
	} catch(err) {
		console.log(err);
	}
	res.redirect("/");
});

let anime_list_request = async (req, res) => {
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
			{fields}
		FROM anime
		ORDER BY {sort_field} {sort_order}
		LIMIT 50
	`;
	query = utils.format_query(query, {
		"fields": "title_eng, title_native, score_mal, type, img",
		"sort_field": acceptedSortFields[req.body["sort_field"]],
		"sort_order": acceptedSortOrder[req.body["sort_order"]]
	});
	console.log(query)
	const queryRes = await pool.query(query);
	// console.log(queryRes)

	try {
		res.render("anime_list.html", {animeList: queryRes, defaults: req.body});
	} catch(err) {
		console.log(err);
		res.status(500).send("database failed").end();
	}
}
app.post("/anime_list", anime_list_request);
app.get("/anime_list", async (req, res) => {
	// Default values
	req.body["sort_field"] = "title";
	req.body["sort_order"] = "ascending";
	await anime_list_request(req, res);
});

(async () => {
	try {
		pool = await mysql.createPool(config.database);

		const port = process.env.PORT || 8080;
		app.listen(port, () => {
			console.log("Listening on " + port);
		});
	} catch(err) {
		console.log(err);
	}
})();
