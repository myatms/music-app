// Enhanced Music Book Application JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

let savedMusicCount = 0;

async function initializeApp() {
    const searchForm = document.getElementById('searchForm');
    const savedMusicList = document.getElementById('savedMusicList');

    if (searchForm) {
        searchForm.addEventListener('submit', handleSearch);
        // Load initial stats
        await updateStats();
    }

    if (savedMusicList) {
        await loadSavedMusic();
        await updateStats();
    }

    // Add real-time clock
    updateClock();
    setInterval(updateClock, 1000);
}

function updateClock() {
    const now = new Date();
    const clockElement = document.getElementById('currentTime');
    if (clockElement) {
        clockElement.textContent = now.toLocaleTimeString();
    }
}

async function updateStats() {
    try {
        const response = await fetch('/api/music/saved');
        const musicList = await response.json();
        
        if (response.ok) {
            savedMusicCount = musicList.length;
            updateStatsDisplay(musicList.length);
        }
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

function updateStatsDisplay(count) {
    const statsElement = document.getElementById('savedCount');
    if (statsElement) {
        statsElement.textContent = count;
    }
}

async function handleSearch(e) {
    e.preventDefault();
    
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim();
    
    if (!query) {
        showNotification('Please enter a search term', 'warning');
        return;
    }

    const resultsDiv = document.getElementById('results');
    const loadingDiv = document.getElementById('loading');
    
    resultsDiv.innerHTML = '';
    loadingDiv.style.display = 'block';

    try {
        const response = await fetch(`/api/music/search?query=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Search failed');
        }

        displayResults(data);
        showNotification(`Found ${data.results.length} results for "${query}"`, 'success');
        
    } catch (error) {
        console.error('Search error:', error);
        showNotification(`Search error: ${error.message}`, 'error');
        resultsDiv.innerHTML = `
            <div class="error">
                <div style="font-size: 3rem; margin-bottom: 10px;">😔</div>
                <h3>Search Failed</h3>
                <p>${error.message}</p>
            </div>
        `;
    } finally {
        loadingDiv.style.display = 'none';
    }
}

function displayResults(data) {
    const resultsDiv = document.getElementById('results');
    
    if (data.results.length === 0) {
        resultsDiv.innerHTML = `
            <div class="no-results">
                <div style="font-size: 4rem; margin-bottom: 15px;">🔍</div>
                <h3>No Results Found</h3>
                <p>Try searching for different terms or check your spelling.</p>
            </div>
        `;
        return;
    }

    const source = data.source;
    const resultsHTML = data.results.map((music, index) => `
        <div class="music-item ${source}-source" style="animation-delay: ${index * 0.1}s">
            <span class="source-badge ${source}">
                ${source === 'youtube' ? '🎵 YouTube' : '💾 Saved'}
            </span>
            
            <div class="music-header">
                ${music.thumbnail ? `
                    <img src="${music.thumbnail}" alt="Thumbnail" class="thumbnail" 
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjkwIiB2aWV3Qm94PSIwIDAgMTIwIDkwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iOTAiIGZpbGw9IiNmMWYxZjEiLz48dGV4dCB4PSI2MCIgeT0iNDUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+'">
                ` : ''}
                
                <div class="music-content">
                    <h3>${escapeHtml(music.name)}</h3>
                    <div class="music-meta">
                        <p><strong>Artist:</strong> ${escapeHtml(music.artist || 'Unknown')}</p>
                        ${music.album ? `<p><strong>Album:</strong> ${escapeHtml(music.album)}</p>` : ''}
                        ${music.description ? `<p class="description">${escapeHtml(music.description.substring(0, 120))}...</p>` : ''}
                    </div>
                </div>
            </div>
            
            <div class="music-actions">
                ${music.youtube_url ? 
                    `<a href="${music.youtube_url}" target="_blank" class="btn btn-primary">
                        <span>▶️</span> Watch on YouTube
                    </a>` : 
                    ''
                }
                ${source === 'youtube' ? 
                    `<button onclick="saveMusic('${escapeHtml(music.name)}', '${escapeHtml(music.artist || 'Unknown')}', '${escapeHtml(music.album || 'Unknown')}', '${music.youtube_url}', '${music.youtube_video_id}')" class="btn btn-success">
                        <span>💾</span> Save to Collection
                    </button>` : 
                    ''
                }
                ${source === 'database' ? 
                    `<button onclick="deleteMusic(${music.id})" class="btn btn-danger">
                        <span>🗑️</span> Remove
                    </button>` : 
                    ''
                }
            </div>
        </div>
    `).join('');

    resultsDiv.innerHTML = resultsHTML;
}

async function saveMusic(name, artist, album, youtubeUrl, youtubeVideoId) {
    try {
        const response = await fetch('/api/music/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: name,
                artist: artist,
                album: album,
                youtube_url: youtubeUrl,
                youtube_video_id: youtubeVideoId
            })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('🎉 Music saved to your collection!', 'success');
            await updateStats();
        } else {
            throw new Error(data.error || 'Save failed');
        }
    } catch (error) {
        console.error('Save error:', error);
        showNotification(`❌ Error saving music: ${error.message}`, 'error');
    }
}

async function loadSavedMusic() {
    try {
        const response = await fetch('/api/music/saved');
        const musicList = await response.json();

        if (!response.ok) {
            throw new Error('Failed to load saved music');
        }

        displaySavedMusic(musicList);
        await updateStats();
    } catch (error) {
        console.error('Load error:', error);
        document.getElementById('savedMusicList').innerHTML = `
            <div class="error">
                <div style="font-size: 3rem; margin-bottom: 10px;">😔</div>
                <h3>Failed to Load Music</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

function displaySavedMusic(musicList) {
    const savedMusicList = document.getElementById('savedMusicList');
    
    if (musicList.length === 0) {
        savedMusicList.innerHTML = `
            <div class="no-results">
                <div style="font-size: 4rem; margin-bottom: 15px;">🎵</div>
                <h3>Your Music Collection is Empty</h3>
                <p>Start by searching for music and saving your favorites!</p>
                <a href="/" class="btn btn-primary" style="margin-top: 20px;">
                    <span>🔍</span> Start Searching
                </a>
            </div>
        `;
        return;
    }

    const musicHTML = musicList.map((music, index) => `
        <div class="music-item database-source" style="animation-delay: ${index * 0.1}s">
            <span class="source-badge database">💾 Saved</span>
            
            <div class="music-header">
                <div class="music-content">
                    <h3>${escapeHtml(music.name)}</h3>
                    <div class="music-meta">
                        <p><strong>Artist:</strong> ${escapeHtml(music.artist)}</p>
                        <p><strong>Album:</strong> ${escapeHtml(music.album)}</p>
                        <p><strong>Saved:</strong> ${new Date(music.created_at).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}</p>
                    </div>
                </div>
            </div>
            
            <div class="music-actions">
                ${music.youtube_url ? 
                    `<a href="${music.youtube_url}" target="_blank" class="btn btn-primary">
                        <span>▶️</span> Watch on YouTube
                    </a>` : 
                    ''
                }
                <button onclick="deleteMusic(${music.id})" class="btn btn-danger">
                    <span>🗑️</span> Remove from Collection
                </button>
            </div>
        </div>
    `).join('');

    savedMusicList.innerHTML = musicHTML;
}

async function deleteMusic(id) {
    if (!confirm('Are you sure you want to remove this music from your collection?')) {
        return;
    }

    try {
        const response = await fetch(`/api/music/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('🗑️ Music removed from your collection', 'success');
            await loadSavedMusic();
            await updateStats();
        } else {
            throw new Error(data.error || 'Delete failed');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showNotification(`❌ Error deleting music: ${error.message}`, 'error');
    }
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notif => notif.remove());

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;

    // Add styles if not already added
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
                animation: slideInRight 0.3s ease;
            }
            .notification-content {
                background: white;
                padding: 15px 20px;
                border-radius: 10px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                display: flex;
                align-items: center;
                gap: 10px;
                min-width: 300px;
            }
            .notification-success .notification-content {
                border-left: 4px solid #10b981;
            }
            .notification-error .notification-content {
                border-left: 4px solid #ef4444;
            }
            .notification-warning .notification-content {
                border-left: 4px solid #f59e0b;
            }
            .notification-close {
                background: none;
                border: none;
                font-size: 1.2rem;
                cursor: pointer;
                padding: 0;
                margin-left: auto;
            }
            @keyframes slideInRight {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
            }
        `;
        document.head.appendChild(styles);
    }

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl+K or Cmd+K for search focus
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.focus();
        }
    }
    
    // Escape to clear search
    if (e.key === 'Escape') {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
            searchInput.blur();
        }
    }
});