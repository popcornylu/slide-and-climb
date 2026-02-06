# 滑梯棋 (Slide and Climb)

## Project Overview
A web-based Snakes and Ladders board game, deployed on GitHub Pages.

## Tech Stack
- Vanilla HTML/CSS/JavaScript (no frameworks)
- Web Audio API for sound effects
- Canvas for spinner rendering

## Project Structure
- `index.html` - Main game page, version displayed in `#version` div
- `css/style.css` - Styles
- `js/main.js` - Game logic, player setup, turn management
- `js/board.js` - Board rendering, cell colors, movement animation
- `js/spinner.js` - Spinner canvas with segment highlighting/dimming
- `js/sound.js` - Audio system (file-based with Web Audio API fallback)
- `sounds/` - Audio files (tick.mp3, result.mp3, step.mp3, ladder.mp3)

## Key Rules
- P1 is always a human player (not changeable)
- Turn order is randomly shuffled (not spinner-based)
- Ladder start cells have green number text, end cells have green background
- Snake start cells have red number text, end cells have red background

## Version
- Current: v1.5.0
- Format: semver, displayed in index.html `#version` div
- Remember to update version on each deploy

## Deployment
- `git push origin main` triggers GitHub Pages deployment
- URL: https://popcornylu.github.io/slide-and-climb/

## Sound Effects
- Audio files in `sounds/` directory (mp3 preferred for browser compatibility)
- Fallback chain: .mp3 -> .wav -> .aiff
- AIFF files may not work in Chrome; convert to MP3 with ffmpeg

## Development
- Use `python3 -m http.server 8000` for local testing
- Hard refresh (Cmd+Shift+R) to bypass cache
