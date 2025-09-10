// twitterClient.js
import { TwitterApi } from "twitter-api-v2";

const client = new TwitterApi({
  appKey: process.env.TWITTER_APP_KEY,
  appSecret: process.env.TWITTER_APP_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
  // bearer token optional, but we have it
});

export const rwClient = client.readWrite; // for posting replies
export const roClient = client.readOnly;   // for read-only requests
