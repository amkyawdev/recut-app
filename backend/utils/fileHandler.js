/**
 * File Handler Utility
 * Handles file operations and management
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Get file info
 */
function getFileInfo(filepath) {
    try {
        const stats = fs.statSync(filepath);
        return {
            exists: true,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory()
        };
    } catch (error) {
        return { exists: false, error: error.message };
    }
}

/**
 * Generate unique filename
 */
function generateUniqueFilename(originalName) {
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    return `${name}-${uuidv4()}${ext}`;
}

/**
 * Copy file
 */
function copyFile(source, destination) {
    try {
        fs.copyFileSync(source, destination);
        return true;
    } catch (error) {
        console.error('Error copying file:', error);
        return false;
    }
}

/**
 * Move file
 */
function moveFile(source, destination) {
    try {
        fs.renameSync(source, destination);
        return true;
    } catch (error) {
        // If rename fails (cross-device), try copy + delete
        if (error.code === 'EXDEV') {
            if (copyFile(source, destination)) {
                fs.unlinkSync(source);
                return true;
            }
        }
        console.error('Error moving file:', error);
        return false;
    }
}

/**
 * Delete file
 */
function deleteFile(filepath) {
    try {
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error deleting file:', error);
        return false;
    }
}

/**
 * Create directory
 */
function createDirectory(dirpath) {
    try {
        if (!fs.existsSync(dirpath)) {
            fs.mkdirSync(dirpath, { recursive: true });
        }
        return true;
    } catch (error) {
        console.error('Error creating directory:', error);
        return false;
    }
}

/**
 * Delete directory
 */
function deleteDirectory(dirpath) {
    try {
        if (fs.existsSync(dirpath)) {
            fs.rmSync(dirpath, { recursive: true, force: true });
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error deleting directory:', error);
        return false;
    }
}

/**
 * List files in directory
 */
function listFiles(dirpath, extension = null) {
    try {
        if (!fs.existsSync(dirpath)) {
            return [];
        }

        let files = fs.readdirSync(dirpath);
        
        if (extension) {
            files = files.filter(f => f.endsWith(extension));
        }

        return files.map(f => ({
            name: f,
            path: path.join(dirpath, f),
            isFile: fs.statSync(path.join(dirpath, f)).isFile()
        }));
    } catch (error) {
        console.error('Error listing files:', error);
        return [];
    }
}

/**
 * Clean old files
 */
function cleanOldFiles(dirpath, maxAgeHours = 24) {
    try {
        if (!fs.existsSync(dirpath)) {
            return 0;
        }

        const files = fs.readdirSync(dirpath);
        let deleted = 0;
        const now = Date.now();
        const maxAge = maxAgeHours * 60 * 60 * 1000;

        files.forEach(file => {
            const filepath = path.join(dirpath, file);
            const stats = fs.statSync(filepath);
            
            if (now - stats.mtime.getTime() > maxAge) {
                fs.unlinkSync(filepath);
                deleted++;
            }
        });

        return deleted;
    } catch (error) {
        console.error('Error cleaning files:', error);
        return 0;
    }
}

/**
 * Get disk usage
 */
function getDiskUsage(dirpath) {
    try {
        if (!fs.existsSync(dirpath)) {
            return { total: 0, used: 0, free: 0 };
        }

        // Simple implementation - just sum file sizes
        let totalSize = 0;
        const files = fs.readdirSync(dirpath);
        
        files.forEach(file => {
            const filepath = path.join(dirpath, file);
            const stats = fs.statSync(filepath);
            if (stats.isFile()) {
                totalSize += stats.size;
            }
        });

        return {
            total: totalSize,
            used: totalSize,
            free: 0 // Would need OS-specific implementation
        };
    } catch (error) {
        console.error('Error getting disk usage:', error);
        return { total: 0, used: 0, free: 0 };
    }
}

/**
 * Read file content
 */
function readFileContent(filepath, encoding = 'utf8') {
    try {
        return fs.readFileSync(filepath, encoding);
    } catch (error) {
        console.error('Error reading file:', error);
        return null;
    }
}

/**
 * Write file content
 */
function writeFileContent(filepath, content, encoding = 'utf8') {
    try {
        const dir = path.dirname(filepath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filepath, content, encoding);
        return true;
    } catch (error) {
        console.error('Error writing file:', error);
        return false;
    }
}

/**
 * Sanitize filename
 */
function sanitizeFilename(filename) {
    // Remove invalid characters
    return filename.replace(/[<>:"/\\|?*]/g, '_')
        .replace(/\.+/g, '.')
        .replace(/^\.+/, '')
        .substring(0, 255);
}

module.exports = {
    getFileInfo,
    generateUniqueFilename,
    copyFile,
    moveFile,
    deleteFile,
    createDirectory,
    deleteDirectory,
    listFiles,
    cleanOldFiles,
    getDiskUsage,
    readFileContent,
    writeFileContent,
    sanitizeFilename
};