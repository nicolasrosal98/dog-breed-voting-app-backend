import { Client } from "pg";
import { config } from "dotenv";
import express from "express";
import cors from "cors";
import path from "path";

config(); //Read .env file lines as though they were env vars.

//Call this script with the environment variable LOCAL set if you want to connect to a local db (i.e. without SSL)
//Do not set the environment variable LOCAL if you want to connect to a heroku DB.

//For the ssl property of the DB connection config, use a value of...
// false - when connecting to a local DB
// { rejectUnauthorized: false } - when connecting to a heroku DB
const herokuSSLSetting = { rejectUnauthorized: false };
const sslSetting = process.env.LOCAL ? false : herokuSSLSetting;
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
};

const app = express();

app.use(express.json()); //add body parser to each following route handler
app.use(cors()); //add CORS support to each following route handler

const client = new Client(dbConfig);
client.connect();

app.get("/", async (req, res) => {
  res.sendFile(path.join(__dirname + "/../index.html"));
});

app.put<{}, {}, { breed: string; subbreed: string | null }>(
  "/score",
  async (req, res) => {
    const { breed, subbreed } = req.body;
    let text: string;
    let values: string[];
    if (subbreed !== null) {
      text =
        "UPDATE dog SET score = score + 1 WHERE breed_id = (SELECT id from breed WHERE name = ($1)) AND subbreed_name = ($2) RETURNING *;";
      values = [breed, subbreed];
    } else {
      text =
        "UPDATE dog SET score = score + 1 WHERE breed_id = (SELECT id from breed WHERE name = ($1)) RETURNING *;";
      values = [breed];
    }
    const increasedScore = await client.query(text, values);

    res.status(200).json({
      status: "success",
      message: "score increased by 1",
      response: increasedScore.rows[0],
    });
  }
);

app.get("/score", async (req, res) => {
  const scores = await client.query(
    "SELECT breed.name, dog.subbreed_name, dog.score FROM dog LEFT JOIN breed ON dog.breed_id = breed.id ORDER BY score desc LIMIT 10"
  );
  res.status(200).json({
    status: "success",
    message: "get top 10 scores desc",
    scores: scores.rows,
  });
});

//Start the server on the given port
const port = process.env.PORT;
if (!port) {
  throw "Missing PORT environment variable.  Set it in .env file.";
}
app.listen(port, () => {
  console.log(`Server is up and running on port ${port}`);
});
