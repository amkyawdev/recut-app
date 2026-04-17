/**
 * Subtitle Routes
 * Handles subtitle CRUD operations, merge, and export
 */

const express = require('express');
const router = express.Router();
const subtitleController = require('../controllers/subtitleController');
const srtProcessor = require('../utils/srtProcessor');

// GET /api/subtitles - List all subtitles
router.get('/', (req, res, next) => {
    subtitleController.listSubtitles(req, res, next);
});

// GET /api/subtitles/:id - Get specific subtitle
router.get('/:id', (req, res, next) => {
    subtitleController.getSubtitle(req, res, next);
});

// PUT /api/subtitles/:id - Update subtitle
router.put('/:id', (req, res, next) => {
    subtitleController.updateSubtitle(req, res, next);
});

// DELETE /api/subtitles/:id - Delete subtitle
router.delete('/:id', (req, res, next) => {
    subtitleController.deleteSubtitle(req, res, next);
});

// POST /api/subtitles/merge - Merge transcript with SRT
router.post('/merge', (req, res, next) => {
    subtitleController.mergeTranscript(req, res, next);
});

// POST /api/subtitles/sync - Auto-sync transcript to video
router.post('/sync', (req, res, next) => {
    subtitleController.syncTranscript(req, res, next);
});

// POST /api/subtitles/validate - Validate subtitles
router.post('/validate', (req, res, next) => {
    subtitleController.validateSubtitles(req, res, next);
});

// POST /api/subtitles/batch-update - Batch update subtitles
router.post('/batch-update', (req, res, next) => {
    subtitleController.batchUpdate(req, res, next);
});

// GET /api/export/srt/:id - Export as SRT file
router.get('/export/srt/:id', (req, res, next) => {
    subtitleController.exportSRT(req, res, next);
});

// GET /api/export/json/:id - Export as JSON
router.get('/export/json/:id', (req, res, next) => {
    subtitleController.exportJSON(req, res, next);
});

module.exports = router;