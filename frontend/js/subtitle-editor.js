/**
 * Subtitle Editor Module
 * Handles subtitle editing, synchronization, and list management
 */

const SubtitleEditor = (function() {
    'use strict';

    // State
    let subtitles = [];
    let currentIndex = -1;
    let isModified = false;
    let searchQuery = '';
    let filteredSubtitles = [];
    
    // Callbacks
    let onChangeCallback = null;
    let onSelectCallback = null;

    /**
     * Initialize the editor
     */
    function init() {
        // Set up event listeners
        setupEventListeners();
        
        // Load from storage if available
        loadFromStorage();
    }

    /**
     * Set up editor event listeners
     */
    function setupEventListeners() {
        // Start time input
        const startTimeInput = document.getElementById('start-time');
        if (startTimeInput) {
            startTimeInput.addEventListener('change', handleStartTimeChange);
        }

        // End time input
        const endTimeInput = document.getElementById('end-time');
        if (endTimeInput) {
            endTimeInput.addEventListener('change', handleEndTimeChange);
        }

        // Subtitle text input
        const textInput = document.getElementById('subtitle-text');
        if (textInput) {
            textInput.addEventListener('input', Utils.debounce(handleTextChange, 500));
        }

        // Save button
        const saveBtn = document.getElementById('save-subtitle-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', handleSave);
        }

        // Split button
        const splitBtn = document.getElementById('split-subtitle-btn');
        if (splitBtn) {
            splitBtn.addEventListener('click', handleSplit);
        }

        // Merge button
        const mergeBtn = document.getElementById('merge-subtitle-btn');
        if (mergeBtn) {
            mergeBtn.addEventListener('click', handleMerge);
        }

        // Search input
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce(handleSearch, 300));
        }

        // Offset slider
        const offsetSlider = document.getElementById('offset-slider');
        if (offsetSlider) {
            offsetSlider.addEventListener('input', handleOffsetChange);
        }

        // Add subtitle button
        const addBtn = document.getElementById('add-subtitle-btn');
        if (addBtn) {
            addBtn.addEventListener('click', handleAddSubtitle);
        }
    }

    /**
     * Load subtitles from storage
     */
    function loadFromStorage() {
        const stored = Utils.Storage.get('subtitles', null);
        if (stored && Array.isArray(stored)) {
            subtitles = stored;
            renderList();
        }
    }

    /**
     * Save subtitles to storage
     */
    function saveToStorage() {
        Utils.Storage.set('subtitles', subtitles);
        isModified = true;
        if (onChangeCallback) {
            onChangeCallback(subtitles);
        }
    }

    /**
     * Load subtitles from SRT file content
     * @param {string} content - SRT file content
     */
    function loadFromSRT(content) {
        subtitles = SRTParser.parse(content);
        renderList();
        saveToStorage();
        Utils.showToast(`Loaded ${subtitles.length} subtitles`, 'success');
    }

    /**
     * Load subtitles from JSON
     * @param {Array} data - Array of subtitle objects
     */
    function loadFromJSON(data) {
        if (Array.isArray(data)) {
            subtitles = data;
            renderList();
            saveToStorage();
            Utils.showToast(`Loaded ${subtitles.length} subtitles`, 'success');
        }
    }

    /**
     * Get current subtitles
     * @returns {Array} Subtitles array
     */
    function getSubtitles() {
        return subtitles;
    }

    /**
     * Handle start time change
     */
    function handleStartTimeChange(e) {
        if (currentIndex < 0) return;
        
        const timecode = e.target.value;
        const time = Utils.parseTimecode(timecode);
        
        if (time >= 0) {
            subtitles[currentIndex].startTime = time;
            subtitles[currentIndex].startTimecode = timecode;
            saveToStorage();
        }
    }

    /**
     * Handle end time change
     */
    function handleEndTimeChange(e) {
        if (currentIndex < 0) return;
        
        const timecode = e.target.value;
        const time = Utils.parseTimecode(timecode);
        
        if (time >= 0) {
            subtitles[currentIndex].endTime = time;
            subtitles[currentIndex].endTimecode = timecode;
            saveToStorage();
        }
    }

    /**
     * Handle text change
     */
    function handleTextChange(e) {
        if (currentIndex < 0) return;
        
        subtitles[currentIndex].text = e.target.value;
        saveToStorage();
        renderList();
    }

    /**
     * Handle save button
     */
    function handleSave() {
        saveToStorage();
        Utils.showToast('Subtitle saved', 'success');
    }

    /**
     * Handle split subtitle
     */
    function handleSplit() {
        if (currentIndex < 0) return;
        
        const text = subtitles[currentIndex].text;
        const middle = Math.floor(text.length / 2);
        
        const [first, second] = SRTParser.splitSubtitle(subtitles[currentIndex], middle);
        
        subtitles.splice(currentIndex, 1, first, second);
        
        // Renumber
        renumberSubtitles();
        saveToStorage();
        renderList();
        
        // Select the first part
        selectSubtitle(currentIndex);
        Utils.showToast('Subtitle split', 'success');
    }

    /**
     * Handle merge with next subtitle
     */
    function handleMerge() {
        if (currentIndex < 0 || currentIndex >= subtitles.length - 1) return;
        
        subtitles = SRTParser.mergeWithNext(subtitles, currentIndex);
        
        renumberSubtitles();
        saveToStorage();
        renderList();
        
        Utils.showToast('Subtitles merged', 'success');
    }

    /**
     * Handle search
     */
    function handleSearch(e) {
        searchQuery = e.target.value.toLowerCase();
        
        if (!searchQuery) {
            filteredSubtitles = [];
            renderList();
            return;
        }
        
        filteredSubtitles = subtitles.filter(sub => 
            sub.text.toLowerCase().includes(searchQuery)
        );
        
        renderList(filteredSubtitles);
    }

    /**
     * Handle offset change
     */
    function handleOffsetChange(e) {
        const offset = parseInt(e.target.value, 10);
        const offsetValue = document.getElementById('offset-value');
        
        if (offsetValue) {
            offsetValue.textContent = `${offset > 0 ? '+' : ''}${offset}ms`;
        }
    }

    /**
     * Apply time offset to all subtitles
     * @param {number} offset - Offset in milliseconds
     */
    function applyOffset(offset) {
        if (offset === 0 || subtitles.length === 0) return;
        
        subtitles = SRTParser.sync(subtitles, offset);
        saveToStorage();
        renderList();
        
        // Update current selection if any
        if (currentIndex >= 0 && currentIndex < subtitles.length) {
            loadSubtitleToEditor(currentIndex);
        }
        
        Utils.showToast(`Applied offset: ${offset}ms`, 'success');
    }

    /**
     * Handle add new subtitle
     */
    function handleAddSubtitle() {
        const currentTime = VideoPlayer.getCurrentTime();
        const duration = VideoPlayer.getDuration();
        
        // Find a good position to insert
        let insertIndex = subtitles.findIndex(sub => {
            const start = sub.startTime || Utils.parseTimecode(sub.startTimecode);
            return start > currentTime;
        });
        
        if (insertIndex === -1) {
            insertIndex = subtitles.length;
        }
        
        const newSubtitle = SRTParser.createSubtitle(currentTime, 3000);
        
        subtitles.splice(insertIndex, 0, newSubtitle);
        renumberSubtitles();
        saveToStorage();
        renderList();
        
        // Select the new subtitle
        selectSubtitle(insertIndex);
        Utils.showToast('New subtitle added', 'success');
    }

    /**
     * Select subtitle at index
     * @param {number} index - Subtitle index
     */
    function selectSubtitle(index) {
        if (index < 0 || index >= subtitles.length) return;
        
        currentIndex = index;
        loadSubtitleToEditor(index);
        
        // Update UI
        const items = document.querySelectorAll('.subtitle-item');
        items.forEach((item, i) => {
            item.classList.toggle('active', i === index);
        });
        
        // Scroll into view
        if (items[index]) {
            items[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        
        if (onSelectCallback) {
            onSelectCallback(subtitles[index], index);
        }
    }

    /**
     * Load subtitle to editor panel
     * @param {number} index - Subtitle index
     */
    function loadSubtitleToEditor(index) {
        const subtitle = subtitles[index];
        
        const startTimeInput = document.getElementById('start-time');
        const endTimeInput = document.getElementById('end-time');
        const textInput = document.getElementById('subtitle-text');
        
        if (startTimeInput) {
            startTimeInput.value = subtitle.startTimecode || Utils.formatSRTTime(subtitle.startTime);
        }
        
        if (endTimeInput) {
            endTimeInput.value = subtitle.endTimecode || Utils.formatSRTTime(subtitle.endTime);
        }
        
        if (textInput) {
            textInput.value = subtitle.text || '';
        }
    }

    /**
     * Find subtitle at given time
     * @param {number} time - Time in milliseconds
     */
    function findSubtitleAtTime(time) {
        const index = SRTParser.getSubtitleIndexAtTime(subtitles, time);
        
        if (index >= 0) {
            selectSubtitle(index);
            return subtitles[index];
        }
        
        return null;
    }

    /**
     * Renumber subtitles
     */
    function renumberSubtitles() {
        subtitles = subtitles.map((sub, i) => ({
            ...sub,
            id: i + 1
        }));
    }

    /**
     * Render subtitle list
     * @param {Array} items - Items to render (optional, defaults to subtitles)
     */
    function renderList(items = subtitles) {
        const container = document.getElementById('subtitle-items');
        if (!container) return;

        container.innerHTML = '';
        
        // Update count
        const countEl = document.getElementById('subtitle-count');
        if (countEl) {
            countEl.textContent = subtitles.length;
        }

        items.forEach((subtitle, index) => {
            const li = document.createElement('li');
            li.className = 'subtitle-item';
            li.dataset.index = index;
            
            const startTime = subtitle.startTime || Utils.parseTimecode(subtitle.startTimecode);
            const endTime = subtitle.endTime || Utils.parseTimecode(subtitle.endTimecode);
            
            li.innerHTML = `
                <span class="subtitle-number">${subtitle.id}</span>
                <div class="subtitle-content">
                    <div class="subtitle-time">${Utils.formatSRTTime(startTime)} - ${Utils.formatSRTTime(endTime)}</div>
                    <div class="subtitle-text">${Utils.sanitizeText(subtitle.text || '')}</div>
                </div>
            `;
            
            li.addEventListener('click', () => {
                const originalIndex = items === filteredSubtitles 
                    ? subtitles.findIndex(s => s.id === subtitle.id)
                    : index;
                selectSubtitle(originalIndex);
                
                // Seek video to this time
                VideoPlayer.seekTo(startTime);
            });
            
            container.appendChild(li);
        });
    }

    /**
     * Get SRT content
     * @returns {string} SRT formatted string
     */
    function getSRT() {
        return SRTParser.format(subtitles);
    }

    /**
     * Get JSON content
     * @returns {string} JSON string
     */
    function getJSON() {
        return SRTParser.exportToJSON(subtitles);
    }

    /**
     * Export subtitles
     * @param {string} format - Format (srt, json)
     * @param {string} filename - Filename
     */
    function exportSubtitles(format = 'srt', filename = 'subtitles') {
        if (format === 'json') {
            Utils.downloadFile(getJSON(), `${filename}.json`, 'application/json');
        } else {
            Utils.downloadFile(getSRT(), `${filename}.srt`, 'text/plain');
        }
        
        Utils.showToast(`Exported as ${format.toUpperCase()}`, 'success');
    }

    /**
     * Clear all subtitles
     */
    function clear() {
        subtitles = [];
        currentIndex = -1;
        saveToStorage();
        renderList();
        
        // Clear editor
        const startTimeInput = document.getElementById('start-time');
        const endTimeInput = document.getElementById('end-time');
        const textInput = document.getElementById('subtitle-text');
        
        if (startTimeInput) startTimeInput.value = '';
        if (endTimeInput) endTimeInput.value = '';
        if (textInput) textInput.value = '';
    }

    /**
     * Set change callback
     */
    function onChange(callback) {
        onChangeCallback = callback;
    }

    /**
     * Set select callback
     */
    function onSelect(callback) {
        onSelectCallback = callback;
    }

    /**
     * Get current index
     */
    function getCurrentIndex() {
        return currentIndex;
    }

    /**
     * Get current subtitle
     */
    function getCurrentSubtitle() {
        return currentIndex >= 0 ? subtitles[currentIndex] : null;
    }

    /**
     * Validate subtitles
     * @returns {Array} Array of validation issues
     */
    function validate() {
        return SRTParser.validate(subtitles);
    }

    // Public API
    return {
        init,
        loadFromSRT,
        loadFromJSON,
        getSubtitles,
        selectSubtitle,
        findSubtitleAtTime,
        applyOffset,
        renderList,
        getSRT,
        getJSON,
        exportSubtitles,
        clear,
        onChange,
        onSelect,
        getCurrentIndex,
        getCurrentSubtitle,
        validate
    };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SubtitleEditor;
}