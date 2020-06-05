"use strict";

// Includes
const fs = require("fs");
const express = require("express");
const mysql = require("promise-mysql");
const bodyParser = require("body-parser"); // parsing form requests
const nunjucks = require("nunjucks"); // templating engine

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
		const queryRes = await pool.query("SELECT * FROM myanimelist");
		res.render("index.html", {waifuList: JSON.stringify(queryRes)});
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
