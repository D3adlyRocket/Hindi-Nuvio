/**
 * netmirror - Built from src/netmirror/
 * Generated: 2026-05-11T13:43:18.798Z
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

// src/netmirror/constants.js
var CONFIG_URL = "https://raw.githubusercontent.com/SaurabhKaperwan/Utils/refs/heads/main/urls.json";
var FALLBACK_NF_API = "https://tv.imgcdn.kim/newtv";
var OTT_SERVICES = [
  { code: "nf", name: "Netflix" },
  { code: "pv", name: "PrimeVideo" },
  { code: "hs", name: "Hotstar" }
];
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";

// src/netmirror/utils.js
function getNfMirrorApi() {
  return __async(this, null, function* () {
    try {
      const resp = yield fetch(CONFIG_URL);
      const data = yield resp.json();
      return data.nfmirror || FALLBACK_NF_API;
    } catch (e) {
      console.warn("[NetMirror] Using fallback API URL:", FALLBACK_NF_API);
      return FALLBACK_NF_API;
    }
  });
}
function getMediaDetails(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const type = mediaType === "tv" ? "tv" : "movie";
    const url = `${TMDB_BASE_URL}/${type}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    const response = yield fetch(url);
    return response.json();
  });
}

// src/netmirror/index.js
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    console.log(`[NetMirror] Starting search for ${mediaType} ${tmdbId}`);
    const finalStreams = [];
    try {
      const media = yield getMediaDetails(tmdbId, mediaType);
      const title = mediaType === "tv" ? media.name : media.title;
      if (!title) {
        console.log(`[NetMirror] Could not retrieve media title.`);
        return [];
      }
      const apiBase = yield getNfMirrorApi();
      console.log(`[NetMirror] Resolved API base: ${apiBase}`);
      const promises = OTT_SERVICES.map(
        (service) => extractServiceStreams(apiBase, service, title, mediaType, season, episode).catch((e) => {
          console.warn(`[NetMirror] Error from service ${service.name}:`, e.message);
          return [];
        })
      );
      const results = yield Promise.all(promises);
      for (const list of results) {
        finalStreams.push(...list);
      }
    } catch (err) {
      console.error("[NetMirror] Fatal overall extraction failure:", err.message);
    }
    console.log(`[NetMirror] Returning total ${finalStreams.length} stream(s).`);
    return finalStreams;
  });
}
function extractServiceStreams(apiBase, service, rawTitle, mediaType, season, episode) {
  return __async(this, null, function* () {
    const serviceStreams = [];
    const title = rawTitle.trim();
    const headers = {
      "ott": service.code,
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:136.0) Gecko/20100101 Firefox/136.0 /OS.GatuNewTV v1.0",
      "x-requested-with": "NetmirrorNewTV v1.0"
    };
    console.log(`[NetMirror] Searching ${service.name} for "${title}"`);
    const searchUrl = `${apiBase}/search.php?s=${encodeURIComponent(title)}`;
    const searchResp = yield fetch(searchUrl, { headers });
    const searchJson = yield searchResp.json();
    const searchResults = searchJson.searchResult || [];
    const match = searchResults.find((item) => item.t && item.t.trim().toLowerCase() === title.toLowerCase());
    if (!match || !match.id) {
      console.log(`[NetMirror] No direct match on ${service.name}`);
      return [];
    }
    const netId = match.id;
    let finalId = netId;
    if (mediaType === "tv") {
      console.log(`[NetMirror] TV Match on ${service.name} (ID: ${netId}), drilling down to S${season}E${episode}`);
      const postResp = yield fetch(`${apiBase}/post.php?id=${netId}`, { headers });
      const postData = yield postResp.json();
      const seasons = postData.season || [];
      const targetTerm = `Season ${season}`;
      const seasonEntry = seasons.find((s) => s.s && s.s.toString().includes(targetTerm));
      if (!seasonEntry || !seasonEntry.id) {
        console.log(`[NetMirror] Season ${season} not found on ${service.name}`);
        return [];
      }
      const seasonId = seasonEntry.id;
      let episodeId = null;
      let page = 1;
      while (!episodeId && page < 10) {
        console.log(`[NetMirror] Paging episodes list (Page ${page}) on ${service.name}`);
        const epResp = yield fetch(`${apiBase}/episodes.php?id=${seasonId}&page=${page}`, { headers });
        const epData = yield epResp.json();
        const episodesList = epData.episodes || [];
        const epMatch = episodesList.find((e) => e.ep && e.ep.toString() === episode.toString());
        if (epMatch && epMatch.id) {
          episodeId = epMatch.id;
        }
        if (parseInt(epData.nextPageShow) !== 1) {
          break;
        }
        page++;
      }
      if (!episodeId) {
        console.log(`[NetMirror] Episode ${episode} not found on ${service.name}`);
        return [];
      }
      finalId = episodeId;
    }
    console.log(`[NetMirror] Fetching final stream payload for ID ${finalId} on ${service.name}`);
    const playerResp = yield fetch(`${apiBase}/player.php?id=${finalId}`, { headers });
    const playerData = yield playerResp.json();
    if (playerData && playerData.video_link) {
      serviceStreams.push({
        name: service.name,
        title: "Auto",
        url: playerData.video_link,
        quality: "Auto",
        headers: {
          "Referer": playerData.referer || "",
          "User-Agent": headers["user-agent"]
        },
        provider: "netmirror"
      });
      console.log(`[NetMirror] SUCCESS: Captured link for ${service.name}`);
    }
    return serviceStreams;
  });
}
module.exports = { getStreams };
