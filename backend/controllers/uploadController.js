/**
 * Upload Controller
 * Handles file upload processing and response
 */

const path = require('path');
const fs = require('fs');

// In-memory storage (in production, use a database)
const uploads = new Map();

/**
 * Handle video upload
 */
function handleVideoUpload(req, res, next) {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'No file uploaded',
                message: 'Please provide a video file'
            });
        }

        const fileData = {
            id: path.parse(req.file.filename).name,
            originalName: req.file.originalname,
            filename: req.file.filename,
            path: req.file.path,
            size: req.file.size,
            mimetype: req.file.mimetype,
            type: 'video',
            createdAt: new Date().toISOString()
        };

        // Store in memory
        uploads.set(fileData.id, fileData);

        // Generate URL
        const url = `/uploads/videos/${req.file.filename}`;

        res.status(201).json({
            success: true,
            message: 'Video uploaded successfully',
            data: {
                id: fileData.id,
                name: fileData.originalName,
                url: url,
                size: fileData.size,
                type: fileData.type
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Handle subtitle upload
 */
function handleSubtitleUpload(req, res, next) {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'No file uploaded',
                message: 'Please provide a subtitle file'
            });
        }

        // Read and parse SRT content
        const content = fs.readFileSync(req.file.path, 'utf8');
        const subtitles = parseSRT(content);

        const fileData = {
            id: path.parse(req.file.filename).name,
            originalName: req.file.originalname,
            filename: req.file.filename,
            path: req.file.path,
            size: req.file.size,
            mimetype: req.file.mimetype,
            type: 'subtitle',
            content: content,
            subtitles: subtitles,
            createdAt: new Date().toISOString()
        };

        // Store in memory
        uploads.set(fileData.id, fileData);

        res.status(201).json({
            success: true,
            message: 'Subtitle uploaded successfully',
            data: {
                id: fileData.id,
                name: fileData.originalName,
                type: 'subtitle',
                count: subtitles.length,
                subtitles: subtitles
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Handle transcript upload
 */
function handleTranscriptUpload(req, res, next) {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'No file uploaded',
                message: 'Please provide a transcript file'
            });
        }

        let content = '';
        
        if (req.file.mimetype === 'application/json') {
            const jsonContent = JSON.parse(fs.readFileSync(req.file.path, 'utf8'));
            content = Array.isArray(jsonContent) 
                ? jsonContent.map(item => item.text || item.content || '').join('\n')
                : jsonContent.text || jsonContent.content || '';
        } else {
            content = fs.readFileSync(req.file.path, 'utf8');
        }

        const fileData = {
            id: path.parse(req.file.filename).name,
            originalName: req.file.originalname,
            filename: req.file.filename,
            path: req.file.path,
            size: req.file.size,
            mimetype: req.file.mimetype,
            type: 'transcript',
            content: content,
            createdAt: new Date().toISOString()
        };

        // Store in memory
        uploads.set(fileData.id, fileData);

        // Split into lines
        const lines = content.split(/\n+/).filter(line => line.trim());

        res.status(201).json({
            success: true,
            message: 'Transcript uploaded successfully',
            data: {
                id: fileData.id,
                name: fileData.originalName,
                type: 'transcript',
                lineCount: lines.length,
                preview: content.substring(0, 500)
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Handle multiple file upload
 */
function handleMultipleUpload(req, res, next) {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                error: 'No files uploaded',
                message: 'Please provide subtitle files'
            });
        }

        const results = req.files.map(file => {
            const content = fs.readFileSync(file.path, 'utf8');
            const subtitles = parseSRT(content);

            const fileData = {
                id: path.parse(file.filename).name,
                originalName: file.originalname,
                filename: file.filename,
                path: file.path,
                size: file.size,
                type: 'subtitle',
                content: content,
                subtitles: subtitles,
                createdAt: new Date().toISOString()
            };

            uploads.set(fileData.id, fileData);

            return {
                id: fileData.id,
                name: fileData.originalName,
                count: subtitles.length
            };
        });

        res.status(201).json({
            success: true,
            message: `${results.length} files uploaded successfully`,
            data: results
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Parse SRT content to JSON
 */
function parseSRT(content) {
    const subtitles = [];
    const blocks = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split(/\n\s*\n/);
    
    for (const block of blocks) {
        const lines = block.trim().split('\n');
        if (lines.length < 3) continue;

        const index = parseInt(lines[0], 10);
        if (isNaN(index)) continue;

        const timecodeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/);
        if (!timecodeMatch) continue;

        subtitles.push({
            id: index,
            startTime: parseTimecode(timecodeMatch[1]),
            endTime: parseTimecode(timecodeMatch[2]),
            startTimecode: timecodeMatch[1].replace('.', ','),
            endTimecode: timecodeMatch[2].replace('.', ','),
            text: lines.slice(2).join('\n').trim()
        });
    }

    return subtitles;
}

/**
 * Parse timecode to milliseconds
 */
function parseTimecode(timecode) {
    const normalized = timecode.replace(',', '.');
    const parts = normalized.split(':');
    
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const secondsParts = parts[2].split('.');
    
    const seconds = parseInt(secondsParts[0], 10);
    const milliseconds = parseInt((secondsParts[1] || '0').padEnd(3, '0'), 10);

    return (hours * 3600000) + (minutes * 60000) + (seconds * 1000) + milliseconds;
}

/**
 * Get upload by ID
 */
function getUpload(id) {
    return uploads.get(id);
}

/**
 * Get all uploads
 */
function getAllUploads() {
    return Array.from(uploads.values());
}

module.exports = {
    handleVideoUpload,
    handleSubtitleUpload,
    handleTranscriptUpload,
    handleMultipleUpload,
    getUpload,
    getAllUploads
};