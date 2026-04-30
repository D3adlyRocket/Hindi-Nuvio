/**
 * streamflix - Built from src/streamflix/
 * Generated: 2026-04-29T06:17:49.061Z
 */
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/streamflix/index.js
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var SF_BASE = "https://api.streamflix.app";
var CONFIG_URL = `${SF_BASE}/config/config-streamflixapp.json`;
var FIREBASE_DB = "https://chilflix-410be-default-rtdb.asia-southeast1.firebasedatabase.app";
var PROXY_URL = "https://script.google.com/macros/s/AKfycbzKvHoxL0rV7PGsti4EN0oNMoiFmizAmipZ2R_ZoCQeIyAC_xeXVBeI2vB2GDa4fGIYYg/exec";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Referer": "https://api.streamflix.app/",
  "Accept": "application/json, text/plain, */*"
};
function getStreams(tmdbId, mediaType = "movie", season = null, episode = null) {
  return __async(this, null, function* () {
    try {
      console.log(`[StreamFlix] Request: ID=${tmdbId}, Type=${mediaType}, S=${season}, E=${episode}`);
      const mediaInfo = yield getMediaDetails(tmdbId, mediaType);
      if (!mediaInfo || !mediaInfo.title) {
        console.log("[StreamFlix] Could not resolve media details (TMDB match failed).");
        return [];
      }
      const config = yield getConfig();
      if (!config)
        return [];
      const items = yield fetchMetadata(mediaInfo.id || tmdbId, mediaInfo.title);
      if (!items || items.length === 0) {
        console.log("[StreamFlix] No matches found in StreamFlix database.");
        return [];
      }
      const allStreams = [];
      for (const item of items) {
        let streams = [];
        if (mediaType === "movie") {
          streams = yield processMovie(item, config, mediaInfo.title);
        } else {
          streams = yield processTV(item, config, season, episode, mediaInfo.title);
        }
        allStreams.push(...streams);
      }
      return allStreams.sort((a, b) => (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0));
    } catch (e) {
      console.error(`[StreamFlix] Global Error: ${e.message}`);
      return [];
    }
  });
}
function getMediaDetails(id, type) {
  return __async(this, null, function* () {
    const isImdb = id.toString().startsWith("tt");
    const tmdbType = type === "tv" ? "tv" : "movie";
    try {
      if (isImdb) {
        console.log(`[StreamFlix] Mobile detected (IMDB ID: ${id}). Resolving to TMDB...`);
        const findUrl = `https://api.themoviedb.org/3/find/${id}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
        const res = yield fetch(findUrl);
        const data = yield res.json();
        const results = type === "tv" ? data.tv_results : data.movie_results;
        if (results && results.length > 0) {
          const item = results[0];
          return {
            id: item.id,
            title: type === "tv" ? item.name : item.title,
            year: (item.first_air_date || item.release_date || "").split("-")[0]
          };
        }
        return null;
      } else {
        const url = `https://api.themoviedb.org/3/${tmdbType}/${id}?api_key=${TMDB_API_KEY}`;
        const res = yield fetch(url);
        const data = yield res.json();
        return {
          id: data.id,
          title: type === "tv" ? data.name : data.title,
          year: (data.first_air_date || data.release_date || "").split("-")[0]
        };
      }
    } catch (e) {
      console.error(`[StreamFlix] TMDB Resolver Failed: ${e.message}`);
      return null;
    }
  });
}
function fetchMetadata(tmdbId, title) {
  return __async(this, null, function* () {
    if (PROXY_URL) {
      console.log(`[StreamFlix] Searching Proxy: ${title} (ID: ${tmdbId})`);
      const proxyReq = `${PROXY_URL}?tmdb=${tmdbId}&title=${encodeURIComponent(title)}`;
      const res = yield fetch(proxyReq);
      const json = yield res.json();
      return json.success ? json.data : [];
    }
    return [];
  });
}
function getConfig() {
  return __async(this, null, function* () {
    try {
      const res = yield fetch(CONFIG_URL, { headers: HEADERS });
      return yield res.json();
    } catch (e) {
      return null;
    }
  });
}
function processMovie(item, config, tmdbTitle) {
  return __async(this, null, function* () {
    const streams = [];
    const path = item.movielink;
    if (!path)
      return [];
    const langs = detectLanguages(item);
    if (config.premium) {
      config.premium.forEach((base) => {
        streams.push(createStreamObject(base + path, "1080p", langs, item, tmdbTitle));
      });
    }
    return streams;
  });
}
function processTV(item, config, s, e, tmdbTitle) {
  return __async(this, null, function* () {
    const streams = [];
    const movieKey = item.moviekey;
    if (!movieKey)
      return [];
    const langs = detectLanguages(item);
    try {
      const epRes = yield fetch(`${FIREBASE_DB}/Data/${movieKey}/seasons/${s}/episodes/${e - 1}.json`);
      const epData = yield epRes.json();
      if (epData && epData.link) {
        const path = epData.link;
        if (config.premium)
          config.premium.forEach((base) => streams.push(createStreamObject(base + path, "1080p", langs, item, tmdbTitle, s, e, epData.name)));
      }
    } catch (err) {
    }
    return streams;
  });
}
function createStreamObject(url, quality, langs, item, tmdbTitle, s, e, epName) {
  const titleLines = [
    tmdbTitle + (item.movieyear ? ` (${item.movieyear})` : ""),
    `\u{1F4FA} ${quality}`
  ];
  if (s && e)
    titleLines.push(`\u{1F4CC} S${s}E${e} - ${epName || "Episode"}`);
  titleLines.push(`by Kabir \xB7 StreamFlix 2.0 Port`);
  return {
    name: `\u{1F3AC} StreamFlix | ${quality}`,
    title: titleLines.join("\n"),
    url,
    quality,
    headers: {
      "User-Agent": HEADERS["User-Agent"],
      "Referer": "https://api.streamflix.app/",
      "Origin": "https://api.streamflix.app"
    }
  };
}
function detectLanguages(item) {
  const title = (item.moviename || "").toLowerCase();
  const found = [];
  const map = { "hindi": "Hindi", "tamil": "Tamil", "telugu": "Telugu", "english": "English", "kannada": "Kannada", "malayalam": "Malayalam", "bengali": "Bengali" };
  for (const key in map) {
    if (title.includes(key))
      found.push(map[key]);
  }
  return found.length > 0 ? found : ["Hindi"];
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
