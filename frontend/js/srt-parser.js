/**
 * SRT Parser Module
 * Handles parsing, formatting, and manipulation of SRT subtitle files
 */

const SRTParser = (function() {
    'use strict';

    /**
     * Parse SRT content to JSON
     * @param {string} content - SRT file content
     * @returns {Array} Array of subtitle objects
     */
    function parseSRT(content) {
        if (!content || typeof content !== 'string') {
            return [];
        }

        const subtitles = [];
        // Normalize line endings
        const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // Split into blocks (separated by blank lines)
        const blocks = normalizedContent.split(/\n\s*\n/);
        
        for (const block of blocks) {
            const parsed = parseBlock(block.trim());
            if (parsed) {
                subtitles.push(parsed);
            }
        }
        
        return subtitles;
    }

    /**
     * Parse a single SRT block
     * @param {string} block - Single subtitle block
     * @returns {Object|null} Subtitle object or null if invalid
     */
    function parseBlock(block) {
        if (!block) return null;

        const lines = block.split('\n');
        if (lines.length < 3) return null;

        // Extract index
        const index = parseInt(lines[0].trim(), 10);
        if (isNaN(index)) return null;

        // Extract timecode
        const timecodeMatch = lines[1].match(
            /(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/
        );
        
        if (!timecodeMatch) return null;

        const startTime = parseTimecode(timecodeMatch[1]);
        const endTime = parseTimecode(timecodeMatch[2]);

        // Extract text (remaining lines)
        const text = lines.slice(2).join('\n').trim();

        return {
            id: index,
            startTime: startTime,
            endTime: endTime,
            startTimecode: formatTimecode(startTime),
            endTimecode: formatTimecode(endTime),
            text: text,
            // Store original text for reference
            originalText: text
        };
    }

    /**
     * Parse timecode string to milliseconds
     * @param {string} timecode - Timecode string (HH:MM:SS,mmm or HH:MM:SS.mmm)
     * @returns {number} Time in milliseconds
     */
    function parseTimecode(timecode) {
        // Handle both comma and dot as decimal separator
        const normalized = timecode.replace(',', '.');
        const parts = normalized.split(':');
        
        if (parts.length !== 3) return 0;

        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        const secondsParts = parts[2].split('.');
        
        const seconds = parseInt(secondsParts[0], 10);
        const milliseconds = parseInt((secondsParts[1] || '0').padEnd(3, '0'), 10);

        return (hours * 3600000) + (minutes * 60000) + (seconds * 1000) + milliseconds;
    }

    /**
     * Format milliseconds to SRT timecode
     * @param {number} ms - Time in milliseconds
     * @returns {string} Formatted timecode
     */
    function formatTimecode(ms) {
        // Ensure non-negative
        if (ms < 0) ms = 0;

        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const milliseconds = ms % 1000;

        return [
            hours.toString().padStart(2, '0'),
            minutes.toString().padStart(2, '0'),
            seconds.toString().padStart(2, '0'),
            milliseconds.toString().padStart(3, '0')
        ].join(':');
    }

    /**
     * Format milliseconds to display time (HH:MM:SS,mmm)
     * @param {number} ms - Time in milliseconds
     * @returns {string} Formatted timecode with comma
     */
    function formatTimecodeDisplay(ms) {
        return formatTimecode(ms).replace('.', ',');
    }

    /**
     * Convert JSON subtitles to SRT format
     * @param {Array} subtitles - Array of subtitle objects
     * @returns {string} SRT formatted string
     */
    function formatSRT(subtitles) {
        if (!Array.isArray(subtitles) || subtitles.length === 0) {
            return '';
        }

        return subtitles.map((subtitle, index) => {
            const id = subtitle.id || (index + 1);
            const startTime = subtitle.startTime !== undefined ? subtitle.startTime : parseTimecode(subtitle.startTimecode);
            const endTime = subtitle.endTime !== undefined ? subtitle.endTime : parseTimecode(subtitle.endTimecode);
            const text = subtitle.text || '';

            return [
                id,
                `${formatTimecodeDisplay(startTime)} --> ${formatTimecodeDisplay(endTime)}`,
                text
            ].join('\n');
        }).join('\n\n');
    }

    /**
     * Apply time offset to all subtitles
     * @param {Array} subtitles - Array of subtitle objects
     * @param {number} offset - Offset in milliseconds (positive or negative)
     * @returns {Array} Subtitles with adjusted timing
     */
    function syncSubtitles(subtitles, offset) {
        if (!Array.isArray(subtitles)) return [];
        
        return subtitles.map(subtitle => {
            const startTime = (subtitle.startTime || parseTimecode(subtitle.startTimecode)) + offset;
            const endTime = (subtitle.endTime || parseTimecode(subtitle.endTimecode)) + offset;
            
            // Ensure times don't go negative
            const validStartTime = Math.max(0, startTime);
            const validEndTime = Math.max(0, endTime);

            return {
                ...subtitle,
                startTime: validStartTime,
                endTime: validEndTime,
                startTimecode: formatTimecodeDisplay(validStartTime),
                endTimecode: formatTimecodeDisplay(validEndTime)
            };
        });
    }

    /**
     * Search and replace in subtitles
     * @param {Array} subtitles - Array of subtitle objects
     * @param {string} search - Search term
     * @param {string} replace - Replacement text
     * @param {Object} options - Search options (caseSensitive, useRegex)
     * @returns {Object} Object with modified subtitles and match count
     */
    function searchAndReplace(subtitles, search, replace, options = {}) {
        const { caseSensitive = false, useRegex = false } = options;
        
        if (!Array.isArray(subtitles) || !search) return { subtitles, count: 0 };

        let count = 0;
        const modifiedSubtitles = subtitles.map(subtitle => {
            let newText = subtitle.text;
            
            if (useRegex) {
                try {
                    const flags = caseSensitive ? 'g' : 'gi';
                    const regex = new RegExp(search, flags);
                    const matches = newText.match(regex);
                    if (matches) {
                        count += matches.length;
                        newText = newText.replace(regex, replace);
                    }
                } catch (e) {
                    // Invalid regex, skip
                }
            } else {
                const searchTerm = caseSensitive ? search : search.toLowerCase();
                const textToCheck = caseSensitive ? newText : newText.toLowerCase();
                let pos = 0;
                let matchCount = 0;
                
                while ((pos = textToCheck.indexOf(searchTerm, pos)) !== -1) {
                    matchCount++;
                    pos += searchTerm.length;
                }
                
                if (matchCount > 0) {
                    count += matchCount;
                    if (caseSensitive) {
                        newText = newText.split(search).join(replace);
                    } else {
                        const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                        newText = newText.replace(regex, replace);
                    }
                }
            }

            return {
                ...subtitle,
                text: newText
            };
        });

        return { subtitles: modifiedSubtitles, count };
    }

    /**
     * Find subtitle at given time
     * @param {Array} subtitles - Array of subtitle objects
     * @param {number} time - Time in milliseconds
     * @returns {Object|null} Subtitle at time or null
     */
    function findSubtitleAtTime(subtitles, time) {
        if (!Array.isArray(subtitles)) return null;
        
        return subtitles.find(subtitle => {
            const start = subtitle.startTime || parseTimecode(subtitle.startTimecode);
            const end = subtitle.endTime || parseTimecode(subtitle.endTimecode);
            return time >= start && time <= end;
        }) || null;
    }

    /**
     * Get index of subtitle at given time
     * @param {Array} subtitles - Array of subtitle objects
     * @param {number} time - Time in milliseconds
     * @returns {number} Index of subtitle or -1
     */
    function getSubtitleIndexAtTime(subtitles, time) {
        if (!Array.isArray(subtitles)) return -1;
        
        return subtitles.findIndex(subtitle => {
            const start = subtitle.startTime || parseTimecode(subtitle.startTimecode);
            const end = subtitle.endTime || parseTimecode(subtitle.endTimecode);
            return time >= start && time <= end;
        });
    }

    /**
     * Validate subtitles for overlapping entries
     * @param {Array} subtitles - Array of subtitle objects
     * @returns {Array} Array of validation issues
     */
    function validateSubtitles(subtitles) {
        const issues = [];
        
        if (!Array.isArray(subtitles)) return issues;

        for (let i = 0; i < subtitles.length; i++) {
            const current = subtitles[i];
            const start = current.startTime || parseTimecode(current.startTimecode);
            const end = current.endTime || parseTimecode(current.endTimecode);

            // Check for negative times
            if (start < 0 || end < 0) {
                issues.push({
                    type: 'negative_time',
                    index: i + 1,
                    message: `Subtitle ${i + 1} has negative time`
                });
            }

            // Check for end before start
            if (end < start) {
                issues.push({
                    type: 'invalid_duration',
                    index: i + 1,
                    message: `Subtitle ${i + 1} ends before it starts`
                });
            }

            // Check for overlapping with next subtitle
            if (i < subtitles.length - 1) {
                const next = subtitles[i + 1];
                const nextStart = next.startTime || parseTimecode(next.startTimecode);
                
                if (end > nextStart) {
                    issues.push({
                        type: 'overlap',
                        index: i + 1,
                        message: `Subtitle ${i + 1} overlaps with subtitle ${i + 2}`
                    });
                }
            }
        }

        return issues;
    }

    /**
     * Merge subtitles with transcript text
     * @param {Array} subtitles - Existing SRT data
     * @param {string} transcriptText - Plain transcript text
     * @returns {Array} Merged subtitles
     */
    function mergeWithTranscript(subtitles, transcriptText) {
        if (!transcriptText || !Array.isArray(subtitles)) {
            return subtitles;
        }

        // Split transcript into lines
        const transcriptLines = transcriptText.split(/\n+/).filter(line => line.trim());
        
        // Simple alignment: distribute transcript lines to subtitles
        // More sophisticated alignment would use timing data
        return subtitles.map((subtitle, index) => {
            if (index < transcriptLines.length) {
                return {
                    ...subtitle,
                    text: transcriptLines[index].trim()
                };
            }
            return subtitle;
        });
    }

    /**
     * Split subtitle at given position
     * @param {Object} subtitle - Subtitle to split
     * @param {number} position - Character position to split at
     * @returns {Array} Array of two subtitles
     */
    function splitSubtitle(subtitle, position) {
        const text = subtitle.text || '';
        const middle = Math.min(position, text.length);
        
        const startTime = subtitle.startTime || parseTimecode(subtitle.startTimecode);
        const endTime = subtitle.endTime || parseTimecode(subtitle.endTimecode);
        const duration = endTime - startTime;
        
        // Calculate split time (proportional to text position)
        const splitTime = startTime + Math.floor((duration * middle) / Math.max(text.length, 1));
        
        const firstPart = {
            ...subtitle,
            id: subtitle.id,
            text: text.substring(0, middle),
            endTime: splitTime,
            endTimecode: formatTimecodeDisplay(splitTime)
        };
        
        const secondPart = {
            ...subtitle,
            id: subtitle.id + 1,
            text: text.substring(middle),
            startTime: splitTime,
            startTimecode: formatTimecodeDisplay(splitTime)
        };

        return [firstPart, secondPart];
    }

    /**
     * Merge subtitle with next one
     * @param {Array} subtitles - Array of all subtitles
     * @param {number} index - Index of subtitle to merge
     * @returns {Array} Subtitles after merge
     */
    function mergeWithNext(subtitles, index) {
        if (!Array.isArray(subtitles) || index < 0 || index >= subtitles.length - 1) {
            return subtitles;
        }

        const current = subtitles[index];
        const next = subtitles[index + 1];
        
        const merged = {
            ...current,
            text: (current.text || '') + '\n' + (next.text || ''),
            endTime: next.endTime || parseTimecode(next.endTimecode),
            endTimecode: next.endTimecode
        };

        const result = [...subtitles];
        result.splice(index, 2, merged);
        
        // Renumber IDs
        return result.map((sub, i) => ({ ...sub, id: i + 1 }));
    }

    /**
     * Create new subtitle at specific time
     * @param {number} time - Start time in milliseconds
     * @param {number} duration - Duration in milliseconds (default 3000ms)
     * @returns {Object} New subtitle object
     */
    function createSubtitle(time, duration = 3000) {
        return {
            id: 0, // Will be set by caller
            startTime: time,
            endTime: time + duration,
            startTimecode: formatTimecodeDisplay(time),
            endTimecode: formatTimecodeDisplay(time + duration),
            text: ''
        };
    }

    /**
     * Export subtitles to JSON
     * @param {Array} subtitles - Array of subtitle objects
     * @returns {string} JSON string
     */
    function exportToJSON(subtitles) {
        return JSON.stringify(subtitles, null, 2);
    }

    /**
     * Import subtitles from JSON
     * @param {string} json - JSON string
     * @returns {Array} Array of subtitle objects
     */
    function importFromJSON(json) {
        try {
            const parsed = JSON.parse(json);
            if (Array.isArray(parsed)) {
                return parsed;
            }
            return [];
        } catch (e) {
            console.error('Failed to parse JSON:', e);
            return [];
        }
    }

    // Public API
    return {
        parse: parseSRT,
        format: formatSRT,
        parseTimecode,
        formatTimecode,
        formatTimecodeDisplay,
        sync: syncSubtitles,
        searchAndReplace,
        findSubtitleAtTime,
        getSubtitleIndexAtTime,
        validate: validateSubtitles,
        mergeWithTranscript,
        splitSubtitle,
        mergeWithNext,
        createSubtitle,
        exportToJSON,
        importFromJSON
    };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SRTParser;
}