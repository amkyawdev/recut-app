/**
 * Subtitle Controller
 * Handles subtitle CRUD operations, merge, and export
 */

const path = require('path');
const fs = require('fs');
const srtProcessor = require('../utils/srtProcessor');
const uploadController = require('./uploadController');

// In-memory subtitle storage
const subtitleStore = new Map();

/**
 * List all subtitles
 */
function listSubtitles(req, res, next) {
    try {
        const uploads = uploadController.getAllUploads();
        const subtitles = uploads.filter(u => u.type === 'subtitle');
        
        res.json({
            success: true,
            data: subtitles.map(s => ({
                id: s.id,
                name: s.originalName,
                count: s.subtitles?.length || 0,
                createdAt: s.createdAt
            }))
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get specific subtitle
 */
function getSubtitle(req, res, next) {
    try {
        const { id } = req.params;
        const upload = uploadController.getUpload(id);
        
        if (!upload || upload.type !== 'subtitle') {
            return res.status(404).json({
                error: 'Subtitle not found',
                message: `No subtitle found with ID: ${id}`
            });
        }
        
        res.json({
            success: true,
            data: {
                id: upload.id,
                name: upload.originalName,
                subtitles: upload.subtitles,
                count: upload.subtitles.length
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Update subtitle
 */
function updateSubtitle(req, res, next) {
    try {
        const { id } = req.params;
        const { subtitles } = req.body;
        
        const upload = uploadController.getUpload(id);
        
        if (!upload || upload.type !== 'subtitle') {
            return res.status(404).json({
                error: 'Subtitle not found',
                message: `No subtitle found with ID: ${id}`
            });
        }
        
        // Update subtitles
        upload.subtitles = subtitles || upload.subtitles;
        
        // Regenerate SRT content
        const srtContent = srtProcessor.format(subtitles);
        upload.content = srtContent;
        
        // Save to file
        fs.writeFileSync(upload.path, srtContent, 'utf8');
        
        res.json({
            success: true,
            message: 'Subtitle updated successfully',
            data: {
                id: upload.id,
                count: upload.subtitles.length
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Delete subtitle
 */
function deleteSubtitle(req, res, next) {
    try {
        const { id } = req.params;
        const upload = uploadController.getUpload(id);
        
        if (!upload || upload.type !== 'subtitle') {
            return res.status(404).json({
                error: 'Subtitle not found',
                message: `No subtitle found with ID: ${id}`
            });
        }
        
        // Delete file
        if (fs.existsSync(upload.path)) {
            fs.unlinkSync(upload.path);
        }
        
        res.json({
            success: true,
            message: 'Subtitle deleted successfully'
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Merge transcript with SRT
 */
function mergeTranscript(req, res, next) {
    try {
        const { subtitleId, transcriptId, method = 'auto' } = req.body;
        
        const subtitleUpload = uploadController.getUpload(subtitleId);
        const transcriptUpload = uploadController.getUpload(transcriptId);
        
        if (!subtitleUpload || subtitleUpload.type !== 'subtitle') {
            return res.status(404).json({
                error: 'Subtitle not found',
                message: `No subtitle found with ID: ${subtitleId}`
            });
        }
        
        if (!transcriptUpload || transcriptUpload.type !== 'transcript') {
            return res.status(404).json({
                error: 'Transcript not found',
                message: `No transcript found with ID: ${transcriptId}`
            });
        }
        
        // Merge based on method
        let merged;
        if (method === 'auto') {
            merged = srtProcessor.mergeWithTranscript(
                subtitleUpload.subtitles,
                transcriptUpload.content
            );
        } else {
            // Manual mode - just return both for frontend alignment
            merged = subtitleUpload.subtitles;
        }
        
        // Update subtitle
        subtitleUpload.subtitles = merged;
        const srtContent = srtProcessor.format(merged);
        subtitleUpload.content = srtContent;
        fs.writeFileSync(subtitleUpload.path, srtContent, 'utf8');
        
        res.json({
            success: true,
            message: 'Transcript merged successfully',
            data: {
                id: subtitleUpload.id,
                count: merged.length
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Sync transcript to video timing
 */
function syncTranscript(req, res, next) {
    try {
        const { subtitleId, offset = 0 } = req.body;
        
        const upload = uploadController.getUpload(subtitleId);
        
        if (!upload || upload.type !== 'subtitle') {
            return res.status(404).json({
                error: 'Subtitle not found',
                message: `No subtitle found with ID: ${subtitleId}`
            });
        }
        
        // Apply offset
        const synced = srtProcessor.sync(upload.subtitles, offset);
        
        // Update subtitle
        upload.subtitles = synced;
        const srtContent = srtProcessor.format(synced);
        upload.content = srtContent;
        fs.writeFileSync(upload.path, srtContent, 'utf8');
        
        res.json({
            success: true,
            message: 'Transcript synced successfully',
            data: {
                id: upload.id,
                offset: offset,
                count: synced.length
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Validate subtitles
 */
function validateSubtitles(req, res, next) {
    try {
        const { subtitles } = req.body;
        
        if (!subtitles || !Array.isArray(subtitles)) {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'Subtitles array is required'
            });
        }
        
        const issues = srtProcessor.validate(subtitles);
        
        res.json({
            success: true,
            data: {
                valid: issues.length === 0,
                issues: issues,
                count: subtitles.length
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Batch update subtitles
 */
function batchUpdate(req, res, next) {
    try {
        const { subtitleId, updates } = req.body;
        
        const upload = uploadController.getUpload(subtitleId);
        
        if (!upload || upload.type !== 'subtitle') {
            return res.status(404).json({
                error: 'Subtitle not found',
                message: `No subtitle found with ID: ${subtitleId}`
            });
        }
        
        // Apply updates
        const { search, replace, options = {} } = updates;
        
        if (search !== undefined) {
            upload.subtitles = srtProcessor.searchAndReplace(
                upload.subtitles,
                search,
                replace,
                options
            ).subtitles;
        }
        
        // Save
        const srtContent = srtProcessor.format(upload.subtitles);
        upload.content = srtContent;
        fs.writeFileSync(upload.path, srtContent, 'utf8');
        
        res.json({
            success: true,
            message: 'Batch update completed',
            data: {
                id: upload.id,
                count: upload.subtitles.length
            }
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Export as SRT
 */
function exportSRT(req, res, next) {
    try {
        const { id } = req.params;
        const upload = uploadController.getUpload(id);
        
        if (!upload || upload.type !== 'subtitle') {
            return res.status(404).json({
                error: 'Subtitle not found',
                message: `No subtitle found with ID: ${id}`
            });
        }
        
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${upload.originalName}"`);
        res.send(upload.content);
    } catch (error) {
        next(error);
    }
}

/**
 * Export as JSON
 */
function exportJSON(req, res, next) {
    try {
        const { id } = req.params;
        const upload = uploadController.getUpload(id);
        
        if (!upload || upload.type !== 'subtitle') {
            return res.status(404).json({
                error: 'Subtitle not found',
                message: `No subtitle found with ID: ${id}`
            });
        }
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${upload.originalName.replace('.srt', '')}.json"`);
        res.json(upload.subtitles);
    } catch (error) {
        next(error);
    }
}

module.exports = {
    listSubtitles,
    getSubtitle,
    updateSubtitle,
    deleteSubtitle,
    mergeTranscript,
    syncTranscript,
    validateSubtitles,
    batchUpdate,
    exportSRT,
    exportJSON
};