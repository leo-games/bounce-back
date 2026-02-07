# Bounce Back

Bounce Back is a casual puzzle game where you bounce a ball off bricks into a
hole. Levels get progressively harder and introduce new obstacles such as
moving bricks and red kill bricks that reset your turn. A built‑in level editor
lets you design your own puzzles and share them with others.

## Run and deploy your AI Studio app

This repository contains everything you need to run the app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Level Editor

Switch to **Level Editor** mode from the menu to create, import or export levels.
Drag bricks, set them to move horizontally or vertically and mark kill bricks in
red. Saving/exporting now validates that a level has at least one playable
winning shot. Saved levels are stored in your browser and can be exported as
JSON files to share with the community.
