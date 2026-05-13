// VegaMovies Scraper for Nuvio Local Scrapers
// React Native compatible version

console.log('[VegaMovies] Initializing VegaMovies scraper');

// Constants  
const TMDB_API_KEY = "1c29a5198ee1854bd5eb45dbe8d17d92";
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const BASE_URL = 'https://vegamovies.market';
const TIMEOUT = 25000;

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
};

// Quality mapping
const qualityOrder = {
    '2160p': 6, '4K': 6,
    '1440p': 5, '2K': 5,
    '1080p': 4,
    '720p': 3,
    '480p': 2,
    '360p': 1,
    'Unknown': 0
};

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
    return fetch(url, {
        timeout: TIMEOUT,
        headers: { ...HEADERS, ...options.headers },
        redirect: options.redirect || 'follow',
        ...options
    }).then(function(response) {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response;
    });
}

// Get TMDB details
function getTMDBDetails(tmdbId, mediaType) {
    const endpoint = mediaType === 'tv' ? 'tv' : 'movie';
    const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;

    return makeRequest(url).then(function(response) {
        return response.json();
    }).then(function(data) {
        const isTv = mediaType === 'tv';
        return {
            title: isTv ? data.name : data.title,
            year: (isTv ? data.first_air_date : data.release_date)?.substring(0, 4) || '',
            imdbId: data.external_ids?.imdb_id || '',
            mediaType: isTv ? 'tv' : 'movie'
        };
    }).catch(function(error) {
        console.log(`[VegaMovies] TMDB lookup failed: ${error.message}`);
        return null;
    });
}

// Search VegaMovies
function searchVegaMovies(title, year) {
    const query = encodeURIComponent(`${title} ${year}`);
    const searchUrl = `${BASE_URL}/search.php?q=${query}`;

    console.log(`[VegaMovies] Searching: ${searchUrl}`);

    return makeRequest(searchUrl).then(function(response) {
        return response.json();
    }).then(function(data) {
        if (!data.hits || data.hits.length === 0) {
            throw new Error('No search results found');
        }

        const firstHit = data.hits[0];
        let permalink = firstHit.document.permalink;

        // Make absolute URL
        if (!permalink.startsWith('http')) {
            permalink = BASE_URL + permalink;
        }

        console.log(`[VegaMovies] Found: ${firstHit.document.post_title}`);
        return permalink;
    });
}

// Extract quality and size from text
function extractQuality(text) {
    const resMatch = text.match(/(\d{3,4})[pP]/);
    if (resMatch) return resMatch[1] + 'p';
    if (/4K/i.test(text)) return '4K';
    if (/2K/i.test(text)) return '2K';
    return 'Unknown';
}

function extractFileSize(text) {
    const sizeMatch = text.match(/(\d+(?:\.\d+)?)\s*(GB|MB)/i);
    if (sizeMatch) return sizeMatch[1] + ' ' + sizeMatch[2].toUpperCase();
    return null;
}


function extractNexdriveLinks(vegaPageUrl) {
    console.log(`[VegaMovies] Extracting download links from: ${vegaPageUrl}`);

    return makeRequest(vegaPageUrl).then(function(response) {
        return response.text();
    }).then(function(html) {
        const nexdriveLinks = [];

        
        const qualityBlocks = html.split(/<h[1-6]/i);

        for (let i = 0; i < qualityBlocks.length; i++) {
            const block = qualityBlocks[i];

            
            const quality = extractQuality(block);
            const size = extractFileSize(block);

          
            const linkMatch = block.match(/<a[^>]+href="([^"]*(?:nexdrive|genxfm)[^"]*)"[^>]*>/i);
            if (linkMatch) {
                let link = linkMatch[1];
                if (!link.startsWith('http')) {
                    link = BASE_URL + link;
                }
                nexdriveLinks.push({ url: link, quality, size });
            }
        }

        console.log(`[VegaMovies] Found ${nexdriveLinks.length} download link(s)`);
        return nexdriveLinks;
    });
}


function extractVCloudFromNexdrive(nexdriveUrl) {
    console.log(`[VegaMovies] Extracting V-Cloud from: ${nexdriveUrl}`);

    return makeRequest(nexdriveUrl).then(function(response) {
        return response.text();
    }).then(function(html) {
        
        const vcloudMatch = html.match(/<a[^>]+href="([^"]*vcloud[^"]*)"[^>]*>[\s\S]*?V-Cloud/i);
        if (!vcloudMatch) {
            throw new Error('V-Cloud link not found on nexdrive page');
        }

        const vcloudUrl = vcloudMatch[1];
        console.log(`[VegaMovies] Found V-Cloud: ${vcloudUrl}`);
        return vcloudUrl;
    });
}

// Extract download servers from V-Cloud page
function extractServersFromVCloud(vcloudUrl, quality, size) {
    console.log(`[VegaMovies] Processing V-Cloud: ${vcloudUrl}`);

    return makeRequest(vcloudUrl).then(function(response) {
        return response.text();
    }).then(function(html) {
        // Extract file info
        const sizeMatch = html.match(/<i[^>]*id="size"[^>]*>([^<]+)<\/i>/);
        const fileSize = sizeMatch ? sizeMatch[1].trim() : size;

        // Extract filename from the title or header
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i) || 
                          html.match(/<h\d[^>]*>([^<]*\.mkv[^<]*)<\/h\d>/i) ||
                          html.match(/>\s*([^<]*\d{3,4}p[^<]*\.mkv)\s*</i);
        const filename = titleMatch ? titleMatch[1].trim() : `Video File ${quality}`;

        const tokenMatch = html.match(/token[=:][\s'"]*([A-Za-z0-9+/=]+)/);

        let downloadPageUrl = vcloudUrl;
        if (tokenMatch) {
            const token = tokenMatch[1];
            downloadPageUrl = vcloudUrl.replace(/\/$/, '') + '?token=' + token;
        } else {
            // If no token found, try the URL as-is (might already have token from redirect)
            downloadPageUrl = vcloudUrl;
        }

        console.log(`[VegaMovies] Fetching download servers: ${downloadPageUrl}`);
        return makeRequest(downloadPageUrl).then(function(response) {
            return response.text();
        }).then(function(downloadHtml) {

            let serverUrl = null;
            let serverType = null;

            const gbpsButtonRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>(?:[^<]|<(?!\/a>))*Download[^<]*\[?Server[^<]*:?[^<]*10\s?Gbps[^<]*\]?(?:[^<]|<(?!\/a>))*<\/a>/gi;
            let match = gbpsButtonRegex.exec(downloadHtml);
            if (match) {
                serverUrl = match[1];
                serverType = '10Gbps';
                console.log('[VegaMovies] Matched 10Gbps button');
            }

            if (!serverUrl) {
                const fslButtonRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>(?:[^<]|<(?!\/a>))*Download[^<]*\[?FSL[^<]*Server[^<]*\]?(?:[^<]|<(?!\/a>))*<\/a>/gi;
                match = fslButtonRegex.exec(downloadHtml);
                if (match) {
                    serverUrl = match[1];
                    serverType = 'FSL';
                    console.log('[VegaMovies] Matched FSL button');
                }
            }


          
            if (!serverUrl) {
                const buttonPatterns = [
                    /<a[^>]+class=["'][^"']*btn[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>[^<]*10\s?Gbps/gi,
                    /<a[^>]+href=["']([^"']+)["'][^>]+class=["'][^"']*btn[^"']*["'][^>]*>[^<]*10\s?Gbps/gi,
                    /<button[^>]*onclick=["']location\.href=["']([^"']+)["'][^>]*>[^<]*10\s?Gbps/gi
                ];

                for (const pattern of buttonPatterns) {
                    pattern.lastIndex = 0;
                    match = pattern.exec(downloadHtml);
                    if (match) {
                        serverUrl = match[1];
                        serverType = '10Gbps';
                        break;
                    }
                }
            }

            if (!serverUrl) {
                console.log('[VegaMovies] Could not find button. HTML sample (chars 500-1500):');
                console.log(downloadHtml.substring(500, 1500));
                throw new Error('No valid download server button found');
            }

            console.log(`[VegaMovies] Found ${serverType} button with URL: ${serverUrl.substring(0, 80)}...`);
            return { url: serverUrl, filename, size: fileSize, serverType };
        });
    }).then(function(serverInfo) {
        // Handle different server types
        if (serverInfo.serverType === '10Gbps') {
            console.log(`[VegaMovies] Following 10Gbps redirects: ${serverInfo.url.substring(0, 80)}...`);

            return makeRequest(serverInfo.url, {
                method: 'GET',
                redirect: 'follow'
            }).then(function(response) {
                const finalUrl = response.url;
                console.log(`[VegaMovies] After redirects: ${finalUrl.substring(0, 100)}...`);

                if (finalUrl.includes('gamerxyt.com/dl.php')) {
                    const linkMatch = finalUrl.match(/[?&]link=([^&]+)/);
                    if (linkMatch) {
                        const googleLink = decodeURIComponent(linkMatch[1]);
                        console.log(`[VegaMovies] Extracted link from parameter: ${googleLink.substring(0, 100)}...`);
                        return googleLink;
                    }
                }

                return finalUrl;
            }).then(function(downloadUrl) {
                return {
                    name: `VegaMovies 10Gbps${quality !== 'Unknown' ? ' - ' + quality : ''}`,
                    title: `${serverInfo.filename}${serverInfo.size ? '\n' + serverInfo.size : ''}`,
                    url: downloadUrl,
                    quality: quality,
                    size: serverInfo.size,
                    headers: {
                        'User-Agent': HEADERS['User-Agent']
                    },
                    provider: 'vegamovies'
                };
            });
        } else if (serverInfo.serverType === 'FSL') {
            console.log(`[VegaMovies] Following FSL redirects: ${serverInfo.url.substring(0, 80)}...`);

            return makeRequest(serverInfo.url, {
                method: 'GET',
                redirect: 'follow'
            }).then(function(response) {
                const finalUrl = response.url;
                console.log(`[VegaMovies] Final FSL URL: ${finalUrl.substring(0, 100)}...`);

                return {
                    name: `VegaMovies FSL${quality !== 'Unknown' ? ' - ' + quality : ''}`,
                    title: `${serverInfo.filename}${serverInfo.size ? '\n' + serverInfo.size : ''}`,
                    url: finalUrl,
                    quality: quality,
                    size: serverInfo.size,
                    headers: {
                        'User-Agent': HEADERS['User-Agent']
                    },
                    provider: 'vegamovies'
                };
            });
        } else {
            // Unknown server type - just try following redirects
            console.log(`[VegaMovies] Following redirects for unknown server type`);

            return makeRequest(serverInfo.url, {
                method: 'GET',
                redirect: 'follow'
            }).then(function(response) {
                return {
                    name: `VegaMovies${quality !== 'Unknown' ? ' - ' + quality : ''}`,
                    title: `${serverInfo.filename}`,
                    url: response.url,
                    quality: quality,
                    size: serverInfo.size,
                    headers: {
                        'User-Agent': HEADERS['User-Agent']
                    },
                    provider: 'vegamovies'
                };
            });
        }
    });
}

// Main scraper function
async function invokeVegaMovies(tmdbId, mediaType, seasonNum = null, episodeNum = null) {
    const isSeries = seasonNum !== null;
    console.log(`[VegaMovies] ${isSeries ? 'TV Show' : 'Movie'}: TMDB ID ${tmdbId}${isSeries ? ` S${seasonNum}E${episodeNum}` : ''}`);

    try {
        // Step 1: Get TMDB details
        const mediaInfo = await getTMDBDetails(tmdbId, mediaType);
        if (!mediaInfo) {
            return [];
        }

        console.log(`[VegaMovies] Title: "${mediaInfo.title}" (${mediaInfo.year})`);

        // Step 2: Search VegaMovies
        const vegaPageUrl = await searchVegaMovies(mediaInfo.title, mediaInfo.year);

        // Step 3: Extract nexdrive links (one per quality)
        const nexdriveLinks = await extractNexdriveLinks(vegaPageUrl);

        if (nexdriveLinks.length === 0) {
            console.log('[VegaMovies] No download links found');
            return [];
        }


        function parseSizeToBytes(sizeStr) {
            if (!sizeStr) return 0;
            const match = sizeStr.match(/(\d+(?:\.\d+)?)\s*(GB|MB)/i);
            if (!match) return 0;
            const value = parseFloat(match[1]);
            const unit = match[2].toUpperCase();
            return unit === 'GB' ? value * 1024 * 1024 * 1024 : value * 1024 * 1024;
        }

        // Group by quality
        const qualityGroups = {
            '4K': [],
            '2160p': [],
            '1080p': [],
            '720p': []
        };

        nexdriveLinks.forEach(function(link) {
            const q = link.quality;
            if (qualityGroups[q]) {
                qualityGroups[q].push(link);
            }
        });

        // Select best links
        const selectedLinks = [];
        const fourKLinks = qualityGroups['4K'].concat(qualityGroups['2160p']);
        if (fourKLinks.length > 0) {
            // Sort by file size (largest first)
            fourKLinks.sort(function(a, b) {
                return parseSizeToBytes(b.size) - parseSizeToBytes(a.size);
            });
            selectedLinks.push(fourKLinks[0]);
        }

        
        if (qualityGroups['1080p'].length > 0) {
            const best1080p = qualityGroups['1080p'].sort(function(a, b) {
                return parseSizeToBytes(b.size) - parseSizeToBytes(a.size);
            })[0];
            selectedLinks.push(best1080p);
        }

      
        if (qualityGroups['720p'].length > 0) {
            const best720p = qualityGroups['720p'].sort(function(a, b) {
                return parseSizeToBytes(b.size) - parseSizeToBytes(a.size);
            })[0];
            selectedLinks.push(best720p);
        }

        if (selectedLinks.length === 0) {
            console.log('[VegaMovies] No suitable quality links found');
            return [];
        }

        console.log(`[VegaMovies] Selected ${selectedLinks.length} quality link(s): ${selectedLinks.map(l => l.quality).join(', ')}`);

        const streamPromises = selectedLinks.map(function(nexdriveInfo) {
            return extractVCloudFromNexdrive(nexdriveInfo.url)
                .then(function(vcloudUrl) {
                    return extractServersFromVCloud(vcloudUrl, nexdriveInfo.quality, nexdriveInfo.size);
                })
                .catch(function(error) {
                    console.log(`[VegaMovies] Failed to process ${nexdriveInfo.quality}: ${error.message}`);
                    return null;
                });
        });

        const streams = (await Promise.all(streamPromises)).filter(s => s !== null);

        // Sort by quality
        streams.sort(function(a, b) {
            return (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0);
        });

        console.log(`[VegaMovies] Total streams: ${streams.length}`);
        return streams;

    } catch (error) {
        console.error(`[VegaMovies] Error: ${error.message}`);
        return [];
    }
}

// Main function
function getStreams(tmdbId, mediaType = 'movie', seasonNum = null, episodeNum = null) {
    return invokeVegaMovies(tmdbId, mediaType, seasonNum, episodeNum).catch(function(error) {
        console.error(`[VegaMovies] Error in getStreams: ${error.message}`);
        return [];
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
