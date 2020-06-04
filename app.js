'use strict';

const fs = require("fs");
const express = require("express");
const mysql = require("promise-mysql");

const config = JSON.parse(fs.readFileSync("config.json"));

const app = express();
let pool;

function init() {
	app.get("/", async (req, res) => {
		try {
			const queryRes = await pool.query("SELECT * FROM myanimelist");
			res.status(200).send(JSON.stringify(queryRes)).end();
		} catch(err) {
			console.log(err);
			res.status(500).send("database failed").end();
		}
	});
}

(async () => {
	try {
		pool = await mysql.createPool(config.database);

		init();

		const port = process.env.PORT || 8080;
		app.listen(port, () => {
			console.log("Listening on " + port);
		});
	} catch(err) {
		console.log(err);
	}
})();
