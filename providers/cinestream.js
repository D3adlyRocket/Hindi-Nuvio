/**
 * cinestream - Built from src/cinestream/
 * Generated: 2026-04-03T00:33:53.557Z
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

// src/cinestream/index.js
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";
var API_BASE = "https://webstreamr.hayd.uk";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json"
};
function getIMDBId(tmdbId, mediaType) {
  return __async(this, null, function* () {
    var _a;
    const url = `${TMDB_BASE_URL}/${mediaType}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    const res = yield fetch(url, { headers: { "Accept": "application/json" } });
    const data = yield res.json();
    return {
      imdbId: (_a = data.external_ids) == null ? void 0 : _a.imdb_id,
      title: mediaType === "tv" ? data.name : data.title
    };
  });
}
function getStreams(tmdbId, mediaType = "movie", season = null, episode = null) {
  return __async(this, null, function* () {
    try {
      const info = yield getIMDBId(tmdbId, mediaType);
      if (!info.imdbId)
        return [];
      let apiUrl = "";
      if (mediaType === "movie") {
        apiUrl = `${API_BASE}/stream/movie/${info.imdbId}.json`;
      } else {
        apiUrl = `${API_BASE}/stream/series/${info.imdbId}:${season}:${episode}.json`;
      }
      console.log(`[CineStream] Fetching: ${apiUrl}`);
      const res = yield fetch(apiUrl, { headers: HEADERS });
      if (!res.ok)
        return [];
      const data = yield res.json();
      const streams = data.streams || [];
      return streams.map((s) => {
        var _a, _b;
        return {
          name: `CS [${s.name.split("|").pop().trim()}]`,
          title: s.title.split("\n")[0],
          url: s.url,
          quality: s.title.includes("1080p") ? "1080p" : s.title.includes("720p") ? "720p" : "Auto",
          headers: ((_b = (_a = s.behaviorHints) == null ? void 0 : _a.proxyHeaders) == null ? void 0 : _b.request) || { "Referer": API_BASE }
        };
      });
    } catch (e) {
      console.error("[CineStream] Error:", e.message);
      return [];
    }
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = { getStreams };
}
