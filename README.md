# Burme Transcript App 🎬

A web application for movie transcript editing with SRT subtitle support. Built with vanilla HTML, CSS, and JavaScript for the frontend, and Node.js/Express for the backend.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Video Player**: Custom HTML5 video player with playback controls
- **SRT Support**: Parse, edit, and export SRT subtitle files
- **Real-time Editing**: Edit subtitle text while watching the video
- **Time Sync**: Adjust subtitle timing with offset controls
- **Drag & Drop**: Upload video and subtitle files via drag and drop
- **Search**: Find and replace text in subtitles
- **Export**: Download edited subtitles as SRT or JSON
- **Dark/Light Theme**: Toggle between dark and light modes
- **Auto-save**: Automatically save changes to local storage

## Project Structure

```
burme-transcript-app/
├── frontend/
│   ├── index.html          # Main HTML file
│   ├── css/
│   │   ├── style.css       # Main styles
│   │   └── player.css      # Video player styles
│   └── js/
│       ├── main.js         # Application entry point
│       ├── player.js       # Video player module
│       ├── subtitle-editor.js  # Subtitle editor module
│       ├── srt-parser.js   # SRT parser module
│       └── utils.js        # Utility functions
├── backend/
│   ├── server.js           # Express server
│   ├── package.json        # Node dependencies
│   ├── routes/
│   │   ├── upload.js       # Upload endpoints
│   │   └── subtitles.js    # Subtitle endpoints
│   ├── controllers/
│   │   ├── uploadController.js
│   │   └── subtitleController.js
│   └── utils/
│       ├── srtProcessor.js
│       └── fileHandler.js
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
└── README.md
```

## Quick Start

### Option 1: Open Frontend Directly (No Server Required)

Simply open `frontend/index.html` in your browser:

```bash
# Using Python
cd frontend
python -m http.server 8080

# Then open http://localhost:8080 in your browser
```

### Option 2: Run Backend API (Optional)

The frontend works standalone, but you can also run the backend for advanced features:

```bash
# Install dependencies
cd backend
npm install

# Start server
npm start

# Server runs on http://localhost:3000
```

### Option 3: Docker

```bash
# Build and run with Docker
cd docker
docker-compose up -d

# Access at http://localhost:3000
```

## Usage

### Upload Video
1. Click the video upload zone or drag & drop an MP4/WebM/MOV file
2. The video will load in the player

### Load Subtitles
1. Click the subtitle upload zone or drag & drop an SRT file
2. Subtitles will appear in the list on the right

### Edit Subtitles
1. Click on any subtitle in the list to select it
2. The video will seek to that timestamp
3. Edit the text in the center panel
4. Click "Save" or use keyboard shortcuts

### Export
1. Click "Export SRT" in the header
2. Download the edited subtitle file

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play/Pause |
| ← | Seek back 5s |
| → | Seek forward 5s |
| ↑ | Volume up |
| ↓ | Volume down |
| M | Mute |
| F | Fullscreen |

## API Endpoints (Backend)

### Upload
- `POST /api/upload/video` - Upload video file
- `POST /api/upload/subtitle` - Upload SRT file
- `POST /api/upload/transcript` - Upload transcript

### Subtitles
- `GET /api/subtitles` - List all subtitles
- `GET /api/subtitles/:id` - Get subtitle content
- `PUT /api/subtitles/:id` - Update subtitle
- `DELETE /api/subtitles/:id` - Delete subtitle
- `POST /api/subtitles/merge` - Merge transcript with SRT
- `GET /api/export/srt/:id` - Export as SRT

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Technologies

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Storage**: localStorage, IndexedDB
- **File Handling**: Multer (Node.js)

## License

MIT License - See LICENSE file for details

---

Built with ❤️ for video editors and subtitle creators
