# Crypto-Arbitrage-Calculator
This was the 1st place winning submission for the Kraken Data Arbitrage Profitability challenge at the 2019 WyoHackathon. It enables cryptocurrency traders to make more informed trades by analyzing arbitrage values via cryptowat.ch API trade values for all currencies across several markets including transactions fees.

## How to use
Generate your API key on Cryptowat.ch and insert the keys into the respective fields on lines 77 and 78 of 'index.js'

## Inspiration
Kraken Arbitrage Profitability challenge at WyoHackathon

## What it does
This program analyzes cryptocurrency trade values across multiple markets and compares them with other exchanges to locate ideal arbitrage opportunities for traders.

## How I built it
Using node.js in concert with cryptowat.ch APIs (WebSocket and REST), we were able to scrape real-time cryptocurrency values, compare them across markets, and come up with arbitrage values.

## What I learned
Cryptowat.ch API's, node.js, and crypto-trading mechanics.

## Built With
  marketwat.ch APIs (Websocket & REST) and node.js

## Try it out
  repl.it: https://repl.it/@tbenne10/Kraken
