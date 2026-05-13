/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║            HindMoviez — Nuvio Stream Plugin Optimized for Android TV                       ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Source     › https://hindmovie.ltd                                                        ║
 * ║  Author     › Sanchit  |  TG: @S4NCHITT                                                    ║
 * ║  Project    › Murph's Streams                                                              ║
 * ║  Manifest   › https://badboysxs-morpheus.hf.space/manifest.json                            ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Supports   › Movies & Series  (480p / 720p / 1080p / 4K)                                  ║
 * ║  Chain      › mvlink.site → hshare.ink → hcloud → Servers                                ║
 * ║  Info       › Quality + Language parsed from page headings                                 ║
 * ║  Parallel   › All links resolved concurrently                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

"use strict";

var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var MURPH_BASE = "https://badboysxs-morpheus.hf.space"; 

async function fetchJson(url) {
    try {
        const resp = await fetch(url, { method: "GET" });
        return resp.ok ? await resp.json() : null;
    } catch (e) { return null; }
}

async function resolveMediaDetails(id, type) {
    const tmdbType = type === "series" ? "tv" : "movie";
    let imdbId = String(id).startsWith("tt") ? id : null;
    let title = "Movie";

    const detailsUrl = `https://api.themoviedb.org/3/${tmdbType}/${id}?api_key=${TMDB_API_KEY}`;
    const externalIdsUrl = `https://api.themoviedb.org/3/${tmdbType}/${id}/external_ids?api_key=${TMDB_API_KEY}`;
    
    const [details, external] = await Promise.all([
        fetchJson(detailsUrl),
        fetchJson(externalIdsUrl)
    ]);

    if (details) {
        title = details.title || details.name || "Movie";
    }
    
    if (!imdbId && external) {
        imdbId = external.imdb_id;
    }

    return { imdbId, title };
}

function isHindMovieSource(stream) {
    const name = String(stream.name || "").toLowerCase();
    const title = String(stream.title || "").toLowerCase();
    const hasHindMovie = name.includes("hindmovie") || title.includes("hindmovie");
    const isNotHDHub = !name.includes("hdhub") && !title.includes("hdhub");
    return hasHindMovie && isNotHDHub;
}

async function getStreams(id, type, season, episode) {
    const { imdbId, title: movieTitle } = await resolveMediaDetails(id, type);
    if (!imdbId) return [];

    const endpoint = (type === "series") 
        ? `${MURPH_BASE}/stream/series/${imdbId}:${season}:${episode}.json`
        : `${MURPH_BASE}/stream/movie/${imdbId}.json`;

    const payload = await fetchJson(endpoint);
    if (!payload || !payload.streams) return [];

    return payload.streams
        .filter(isHindMovieSource) 
        .map(s => {
            let finalUrl = s.url;
            if (finalUrl && !finalUrl.startsWith("http")) {
                finalUrl = MURPH_BASE + (finalUrl.startsWith("/") ? "" : "/") + finalUrl;
            }

            return {
                name: `HindMovie | ${movieTitle}`,
                title: s.title || "HindMovie Stream",
                url: finalUrl,
                behaviorHints: { 
                    // Changed bingeGroup to force Android TV to refresh its list
                    bingeGroup: "hind-movie-v3-refresh" 
                }
            };
        });
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}

/**
 * ANDROID TV COMPATIBILITY NORMALIZER
 */
function __doomNormalizeStream(rawStream) {
    if (!rawStream || !rawStream.url) return null;

    return {
        // Force the name to exactly what we defined, no suffixes
        name: rawStream.name,
        title: rawStream.title,
        url: rawStream.url,
        behaviorHints: rawStream.behaviorHints
    };
}

(function() {
    if (typeof getStreams !== "function" || getStreams.__doomNormalizedWrapped) return;

    var __doomOriginalGetStreams = getStreams;
    var __doomNormalizedGetStreams = function() {
        return Promise.resolve(__doomOriginalGetStreams.apply(this, arguments))
            .then(function(streams) {
                if (!Array.isArray(streams)) return [];
                return streams.map(__doomNormalizeStream).filter(Boolean);
            });
    };

    __doomNormalizedGetStreams.__doomNormalizedWrapped = true;
    getStreams = __doomNormalizedGetStreams;

    if (typeof module !== "undefined" && module.exports) {
        module.exports.getStreams = getStreams;
    } else if (typeof global !== "undefined") {
        global.getStreams = getStreams;
    }
})();
