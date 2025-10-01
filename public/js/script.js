// Search functionality
document.addEventListener('DOMContentLoaded', function() {
    const searchForm = document.getElementById('searchForm');
    const savedMusicList = document.getElementById('savedMusicList');

    if (searchForm) {
        searchForm.addEventListener('submit', handleSearch);
    }

    if (savedMusicList) {
        loadSavedMusic();
    }
});

async function handleSearch(e) {
    e.preventDefault();
    
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim();
    
    if (!query) return;

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
    } catch (error) {
        console.error('Search error:', error);
        resultsDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    } finally {
        loadingDiv.style.display = 'none';
    }
}

function displayResults(data) {
    const resultsDiv = document.getElementById('results');
    
    if (data.results.length === 0) {
        resultsDiv.innerHTML = '<div class="no-results">No results found</div>';
        return;
    }

    const source = data.source;
    const resultsHTML = data.results.map(music => `
        <div class="music-item">
            <span class="source-badge ${source}">${source.toUpperCase()}</span>
            ${music.thumbnail ? `<img src="${music.thumbnail}" alt="Thumbnail" class="thumbnail">` : ''}
            <div class="music-content">
                <h3>${escapeHtml(music.name)}</h3>
                <p><strong>Artist:</strong> ${escapeHtml(music.artist || 'Unknown')}</p>
                ${music.album ? `<p><strong>Album:</strong> ${escapeHtml(music.album)}</p>` : ''}
                ${music.description ? `<p>${escapeHtml(music.description.substring(0, 100))}...</p>` : ''}
                <div class="music-actions">
                    ${music.youtube_url ? 
                        `<a href="${music.youtube_url}" target="_blank" class="btn-secondary">🎵 Watch on YouTube</a>` : 
                        ''
                    }
                    ${source === 'youtube' ? 
                        `<button onclick="saveMusic('${escapeHtml(music.name)}', '${escapeHtml(music.artist || 'Unknown')}', '${escapeHtml(music.album || 'Unknown')}', '${music.youtube_url}', '${music.youtube_video_id}')" class="btn-secondary">
                            💾 Save to Collection
                        </button>` : 
                        ''
                    }
                </div>
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
            alert('Music saved successfully!');
        } else {
            throw new Error(data.error || 'Save failed');
        }
    } catch (error) {
        console.error('Save error:', error);
        alert('Error saving music: ' + error.message);
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
    } catch (error) {
        console.error('Load error:', error);
        document.getElementById('savedMusicList').innerHTML = 
            '<div class="error">Error loading saved music</div>';
    }
}

function displaySavedMusic(musicList) {
    const savedMusicList = document.getElementById('savedMusicList');
    
    if (musicList.length === 0) {
        savedMusicList.innerHTML = '<div class="no-results">No saved music yet. Start by searching and saving some music!</div>';
        return;
    }

    const musicHTML = musicList.map(music => `
        <div class="music-item">
            <span class="source-badge database">SAVED</span>
            <h3>${escapeHtml(music.name)}</h3>
            <p><strong>Artist:</strong> ${escapeHtml(music.artist)}</p>
            <p><strong>Album:</strong> ${escapeHtml(music.album)}</p>
            <p><strong>Saved:</strong> ${new Date(music.created_at).toLocaleDateString()}</p>
            <div class="music-actions">
                ${music.youtube_url ? 
                    `<a href="${music.youtube_url}" target="_blank" class="btn-secondary">🎵 Watch on YouTube</a>` : 
                    ''
                }
                <button onclick="deleteMusic(${music.id})" class="btn-danger">🗑️ Delete</button>
            </div>
        </div>
    `).join('');

    savedMusicList.innerHTML = musicHTML;
}

async function deleteMusic(id) {
    if (!confirm('Are you sure you want to delete this music?')) {
        return;
    }

    try {
        const response = await fetch(`/api/music/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok) {
            alert('Music deleted successfully!');
            loadSavedMusic(); // Reload the list
        } else {
            throw new Error(data.error || 'Delete failed');
        }
    } catch (error) {
        console.error('Delete error:', error);
        alert('Error deleting music: ' + error.message);
    }
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