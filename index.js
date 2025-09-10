// index.js
import express from "express";
import dotenv from "dotenv";
dotenv.config();

import { rwClient, roClient } from "./twitterClient.js";
import { getSinceId, setSinceId, isProcessed, markProcessed, updateScoreForUser, topPlayers } from "./firebaseClient.js";
import { extractMoveFromText, formatResultReply } from "./helpers.js";
import { botMove, decide } from "./gameLogic.js";

const PORT = process.env.PORT || 10000;
const BOT_USER_ID = process.env.BOT_USER_ID;
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 15000);

if (!BOT_USER_ID) {
  console.error("BOT_USER_ID env var is required (numeric user id)");
  process.exit(1);
}

const app = express();
app.use(express.json());

app.get("/", (req, res) => res.send("RPS X Bot running"));
app.get("/health", (req, res) => res.send({ ok: true, ts: new Date().toISOString() }));

// simple leaderboard route (optional)
app.get("/leaderboard", async (req, res) => {
  try {
    const top = await topPlayers(20);
    res.json({ top });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "failed to fetch leaderboard" });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// MAIN polling loop
let isPolling = false;

async function fetchMentions(sinceId) {
  // Using twitter-api-v2 readOnly client; use mentions timeline.
  // The library exposes client.v2.userMentionTimeline(userId, params)
  // We'll request expansions to get author info via 'expansions=author_id' and 'user.fields=username'
  const params = { "tweet.fields": ["author_id", "text", "created_at"].join(","), expansions: "author_id", "user.fields": "username" };
  if (sinceId) params.since_id = sinceId;

  try {
    const timeline = await roClient.v2.userMentionTimeline(BOT_USER_ID, params);
    // timeline may be a paginator
    const tweets = [];
    for await (const t of timeline) tweets.push(t);
    return tweets; // array of tweets
  } catch (err) {
    console.error("fetchMentions error:", err);
    return [];
  }
}

async function handleTweet(tweet) {
  try {
    const tweetId = tweet.id;
    // double-check if processed
    if (await isProcessed(tweetId)) {
      return;
    }

    const text = tweet.text || "";
    // find move in the text
    const move = extractMoveFromText(text);

    // fetch author username
    let username = "there";
    try {
      const user = await roClient.v2.user(tweet.author_id);
      if (user && user.data && user.data.username) username = user.data.username;
    } catch (err) {
      // fallback - keep username as 'there'
    }

    if (!move) {
      // guide the user
      const replyText = `@${username} Hi! To play rock-paper-scissors, tag me and include 'rock', 'paper', or 'scissors' in your reply. Example: "@mybot rock"`;
      await rwClient.v2.reply(replyText, tweetId);
      await markProcessed(tweetId);
      return;
    }

    // play
    const myMove = botMove();
    const outcome = decide(move, myMove);
    const replyText = formatResultReply(username, move, myMove, outcome);
    await rwClient.v2.reply(replyText, tweetId);

    // update scoreboard: outcome from player's perspective
    await updateScoreForUser(tweet.author_id, username, outcome);
    await markProcessed(tweetId);
  } catch (err) {
    console.error("handleTweet error:", err);
  }
}

async function pollLoop() {
  if (isPolling) return;
  isPolling = true;
  console.log("Starting poll loop, interval:", POLL_INTERVAL_MS, "ms");

  while (true) {
    try {
      const sinceId = await getSinceId();
      const tweets = await fetchMentions(sinceId);
      // tweets are newest first? We'll iterate from oldest to newest to ensure since_id moves forward correctly.
      if (tweets.length > 0) {
        const ordered = tweets.slice().reverse();
        for (const t of ordered) {
          await handleTweet(t);
          // After processing a tweet, update since_id so we don't re-poll older ones even if service restarts
          await setSinceId(t.id);
        }
      }
    } catch (err) {
      console.error("pollLoop error:", err);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

pollLoop().catch((err) => console.error("pollLoop failed:", err));
