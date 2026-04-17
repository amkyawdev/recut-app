/**
 * Upload Routes
 * Handles file uploads for videos, subtitles, and transcripts
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const uploadController = require('../controllers/uploadController');

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let dest;
        if (file.fieldname === 'video') {
            dest = path.join(__dirname, '..', 'uploads', 'videos');
        } else if (file.fieldname === 'subtitle') {
            dest = path.join(__dirname, '..', 'uploads', 'subtitles');
        } else if (file.fieldname === 'transcript') {
            dest = path.join(__dirname, '..', 'uploads', 'transcripts');
        } else {
            dest = path.join(__dirname, '..', 'uploads');
        }
        
        // Create directory if not exists
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const uniqueName = `${uuidv4()}${ext}`;
        cb(null, uniqueName);
    }
});

// File filter for security
const fileFilter = (req, file, cb) => {
    const allowedMimes = {
        video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'],
        subtitle: ['text/plain', 'application/x-subrip'],
        transcript: ['text/plain', 'application/json', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    };
    
    const field = file.fieldname;
    const mime = file.mimetype;
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (field === 'video' && (allowedMimes.video.includes(mime) || ['.mp4', '.webm', '.mov', '.avi', '.mkv'].includes(ext))) {
        cb(null, true);
    } else if (field === 'subtitle' && (allowedMimes.subtitle.includes(mime) || ext === '.srt')) {
        cb(null, true);
    } else if (field === 'transcript' && (allowedMimes.transcript.includes(mime) || ['.txt', '.json', '.docx'].includes(ext))) {
        cb(null, true);
    } else {
        cb(new Error(`Invalid file type for ${field}`), false);
    }
};

// Multer upload configurations
const videoUpload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024 * 1024 // 2GB for videos
    }
});

const subtitleUpload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB for subtitles
    }
});

const transcriptUpload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB for transcripts
    }
});

// Routes

// POST /api/upload/video - Upload video file
router.post('/video', videoUpload.single('video'), (req, res, next) => {
    uploadController.handleVideoUpload(req, res, next);
});

// POST /api/upload/subtitle - Upload SRT file
router.post('/subtitle', subtitleUpload.single('subtitle'), (req, res, next) => {
    uploadController.handleSubtitleUpload(req, res, next);
});

// POST /api/upload/transcript - Upload transcript file
router.post('/transcript', transcriptUpload.single('transcript'), (req, res, next) => {
    uploadController.handleTranscriptUpload(req, res, next);
});

// POST /api/upload/multiple - Upload multiple files
router.post('/multiple', subtitleUpload.array('subtitles', 10), (req, res, next) => {
    uploadController.handleMultipleUpload(req, res, next);
});

// Error handling for multer
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                error: 'File too large',
                message: err.message
            });
        }
        return res.status(400).json({
            error: 'Upload error',
            message: err.message
        });
    }
    if (err) {
        return res.status(400).json({
            error: 'Upload failed',
            message: err.message
        });
    }
    next();
});

module.exports = router;