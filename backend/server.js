/**
 * Burme Transcript App - Express Server
 * Node.js backend for video and subtitle management
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Import routes
const uploadRoutes = require('./routes/upload');
const subtitleRoutes = require('./routes/subtitles');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'],
    credentials: true
}));

app.use(express.json({ limit: '2gb' }));
app.use(express.urlencoded({ extended: true, limit: '2gb' }));

// Static files (for uploaded content)
const uploadsDir = path.join(__dirname, 'uploads');
const subtitlesDir = path.join(__dirname, 'uploads', 'subtitles');
const videosDir = path.join(__dirname, 'uploads', 'videos');

// Create directories if they don't exist
[uploadsDir, subtitlesDir, videosDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/subtitles', subtitleRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Get server info
app.get('/api/info', (req, res) => {
    res.json({
        name: 'Burme Transcript API',
        version: '1.0.0',
        endpoints: {
            upload: {
                video: 'POST /api/upload/video',
                subtitle: 'api/upload/subtitle',
                transcript: 'POST /api/upload/transcript'
            },
            subtitles: {
                get: 'GET /api/subtitles/:id',
                update: 'PUT /api/subtitles/:id',
                merge: 'POST /api/subtitles/merge',
                delete: 'DELETE /api/subtitles/:id',
                export: 'GET /api/export/srt/:id'
            }
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    // Multer file upload errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            error: 'File too large',
            message: 'The uploaded file exceeds the maximum allowed size'
        });
    }
    
    if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
            error: 'Too many files',
            message: 'Too many files uploaded at once'
        });
    }
    
    // Default error
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Route ${req.method} ${req.path} not found`
    });
});

// Start server
app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('Burme Transcript API Server');
    console.log('='.repeat(50));
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Uploads directory: ${uploadsDir}`);
    console.log('\nAPI Endpoints:');
    console.log('  POST /api/upload/video    - Upload video file');
    console.log('  POST /api/upload/subtitle - Upload SRT file');
    console.log('  POST /api/upload/transcript - Upload transcript');
    console.log('  GET  /api/subtitles/:id   - Get subtitle content');
    console.log('  PUT  /api/subtitles/:id   - Update subtitle');
    console.log('  POST /api/subtitles/merge - Merge transcript with SRT');
    console.log('  DELETE /api/subtitles/:id - Delete subtitle');
    console.log('  GET  /api/export/srt/:id  - Export SRT file');
    console.log('='.repeat(50));
});

module.exports = app;