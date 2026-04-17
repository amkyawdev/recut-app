/**
 * SRT Processor Utility
 * Backend SRT parsing and processing
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse SRT content to JSON
 */
function parse(content) {
    if (!content || typeof content !== 'string') {
        return [];
    }

    const subtitles = [];
    const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
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
 */
function parseBlock(block) {
    if (!block) return null;

    const lines = block.split('\n');
    if (lines.length < 3) return null;

    const index = parseInt(lines[0].trim(), 10);
    if (isNaN(index)) return null;

    const timecodeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/);
    if (!timecodeMatch) return null;

    return {
        id: index,
        startTime: parseTimecode(timecodeMatch[1]),
        endTime: parseTimecode(timecodeMatch[2]),
        startTimecode: timecodeMatch[1].replace('.', ','),
        endTimecode: timecodeMatch[2].replace('.', ','),
        text: lines.slice(2).join('\n').trim()
    };
}

/**
 * Parse timecode to milliseconds
 */
function parseTimecode(timecode) {
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
 */
function formatTimecode(ms) {
    if (ms < 0) ms = 0;

    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}

/**
 * Convert JSON subtitles to SRT format
 */
function format(subtitles) {
    if (!Array.isArray(subtitles) || subtitles.length === 0) {
        return '';
    }

    return subtitles.map((subtitle, index) => {
        const id = subtitle.id || (index + 1);
        const startTime = subtitle.startTime !== undefined ? subtitle.startTime : parseTimecode(subtitle.startTimecode);
        const endTime = subtitle.endTime !== undefined ? subtitle.endTime : parseTimecode(subtitle.endTimecode);
        const text = subtitle.text || '';

        return `${id}\n${formatTimecode(startTime)} --> ${formatTimecode(endTime)}\n${text}`;
    }).join('\n\n');
}

/**
 * Apply time offset to all subtitles
 */
function sync(subtitles, offset) {
    if (!Array.isArray(subtitles)) return [];

    return subtitles.map(subtitle => {
        const startTime = (subtitle.startTime || parseTimecode(subtitle.startTimecode)) + offset;
        const endTime = (subtitle.endTime || parseTimecode(subtitle.endTimecode)) + offset;

        const validStartTime = Math.max(0, startTime);
        const validEndTime = Math.max(0, endTime);

        return {
            ...subtitle,
            startTime: validStartTime,
            endTime: validEndTime,
            startTimecode: formatTimecode(validStartTime),
            endTimecode: formatTimecode(validEndTime)
        };
    });
}

/**
 * Search and replace in subtitles
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

        return { ...subtitle, text: newText };
    });

    return { subtitles: modifiedSubtitles, count };
}

/**
 * Merge subtitles with transcript
 */
function mergeWithTranscript(subtitles, transcriptText) {
    if (!transcriptText || !Array.isArray(subtitles)) {
        return subtitles;
    }

    const transcriptLines = transcriptText.split(/\n+/).filter(line => line.trim());

    return subtitles.map((subtitle, index) => {
        if (index < transcriptLines.length) {
            return { ...subtitle, text: transcriptLines[index].trim() };
        }
        return subtitle;
    });
}

/**
 * Validate subtitles
 */
function validate(subtitles) {
    const issues = [];

    if (!Array.isArray(subtitles)) return issues;

    for (let i = 0; i < subtitles.length; i++) {
        const current = subtitles[i];
        const start = current.startTime || parseTimecode(current.startTimecode);
        const end = current.endTime || parseTimecode(current.endTimecode);

        if (start < 0 || end < 0) {
            issues.push({ type: 'negative_time', index: i + 1, message: `Subtitle ${i + 1} has negative time` });
        }

        if (end < start) {
            issues.push({ type: 'invalid_duration', index: i + 1, message: `Subtitle ${i + 1} ends before it starts` });
        }

        if (i < subtitles.length - 1) {
            const next = subtitles[i + 1];
            const nextStart = next.startTime || parseTimecode(next.startTimecode);

            if (end > nextStart) {
                issues.push({ type: 'overlap', index: i + 1, message: `Subtitle ${i + 1} overlaps with subtitle ${i + 2}` });
            }
        }
    }

    return issues;
}

/**
 * Read and parse SRT file
 */
function readSRTFile(filepath) {
    try {
        const content = fs.readFileSync(filepath, 'utf8');
        return parse(content);
    } catch (error) {
        console.error('Error reading SRT file:', error);
        return [];
    }
}

/**
 * Write subtitles to SRT file
 */
function writeSRTFile(filepath, subtitles) {
    try {
        const content = format(subtitles);
        fs.writeFileSync(filepath, content, 'utf8');
        return true;
    } catch (error) {
        console.error('Error writing SRT file:', error);
        return false;
    }
}

module.exports = {
    parse,
    format,
    parseTimecode,
    formatTimecode,
    sync,
    searchAndReplace,
    mergeWithTranscript,
    validate,
    readSRTFile,
    writeSRTFile
};