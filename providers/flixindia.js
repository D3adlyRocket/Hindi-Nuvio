/**
 * flixindia - Built from src/flixindia/
 * Generated: 2026-01-04T14:14:51.476Z
 */
var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
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

// src/flixindia/http.js
var BASE_URL = "https://m.flixindia.xyz/";
var BASE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  Referer: BASE_URL,
  Origin: BASE_URL,
  "X-Requested-With": "XMLHttpRequest"
};
var COOKIE_JAR = "";
function storeCookies(res) {
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    COOKIE_JAR = setCookie.split(";")[0];
    console.log("[HTTP][COOKIE] Stored:", COOKIE_JAR);
  }
}
function sleep(ms) {
  return __async(this, null, function* () {
    return new Promise((r) => setTimeout(r, ms));
  });
}
function requestWithRetry(fetchFn, label, retries = 3) {
  return __async(this, null, function* () {
    let attempt = 0;
    let delay = 500;
    while (attempt < retries) {
      try {
        console.log(`[HTTP][RETRY] ${label} attempt ${attempt + 1}/${retries}`);
        return yield fetchFn();
      } catch (err) {
        attempt++;
        console.log(`[HTTP][RETRY] \u274C ${label} failed:`, err.message);
        if (attempt >= retries) {
          console.log(`[HTTP][RETRY] \u274C ${label} giving up`);
          throw err;
        }
        yield sleep(delay);
        delay *= 2;
      }
    }
  });
}
function fetchText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    return requestWithRetry(() => __async(this, null, function* () {
      const res = yield fetch(url, __spreadProps(__spreadValues({}, options), {
        headers: __spreadValues(__spreadValues(__spreadValues({}, BASE_HEADERS), COOKIE_JAR ? { Cookie: COOKIE_JAR } : {}), options.headers || {})
      }));
      storeCookies(res);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return yield res.text();
    }), `GET ${url}`);
  });
}
function fetchJson(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const method = (options.method || "GET").toUpperCase();
    return requestWithRetry(() => __async(this, null, function* () {
      const res = yield fetch(url, __spreadProps(__spreadValues({}, options), {
        headers: __spreadValues(__spreadValues(__spreadValues({}, BASE_HEADERS), COOKIE_JAR ? { Cookie: COOKIE_JAR } : {}), options.headers || {})
      }));
      storeCookies(res);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return yield res.json();
    }), `${method} ${url}`);
  });
}

// src/flixindia/utils.js
function extractCsrf(html) {
  console.log("\n[CSRF] Extracting CSRF token...");
  const match = html.match(/CSRF_TOKEN\s*=\s*['"]([^'"]+)['"]/);
  if (!match) {
    console.log("[CSRF] \u274C Not found");
    return null;
  }
  console.log("[CSRF] \u2705 Found:", match[1]);
  return match[1];
}
var QUALITY_REGEX = /\b(camrip|hdcam|cam|hdtc|tc|telesync|ts|scr|screener|dvdscr)\b/i;
var STRICT_SUBSTRINGS = [
  "hqcam",
  "clean cam",
  "line audio",
  "xbet",
  "1xbet",
  "zip",
  "rar",
  "tar",
  "7z",
  "apk",
  "exe",
  "pdf"
];
function isBannedTitle(title) {
  const lower = title.toLowerCase();
  for (const word of STRICT_SUBSTRINGS) {
    if (lower.includes(word)) {
      console.log(`[FILTER] \u274C STRICT exclude "${title}" (matched: ${word})`);
      return true;
    }
  }
  if (QUALITY_REGEX.test(lower)) {
    console.log(`[FILTER] \u274C SOFT exclude "${title}" (quality tag match)`);
    return true;
  }
  return false;
}

// src/flixindia/hosts.js
function getHostname(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch (e) {
    return "";
  }
}
function getPath(url) {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch (e) {
    return "";
  }
}
function classifyHost(url) {
  const hostname = getHostname(url);
  const path = getPath(url);
  if (hostname.includes("hubcloud")) {
    let kind = "unknown";
    if (path.startsWith("/drive"))
      kind = "drive";
    else if (path.startsWith("/video"))
      kind = "video";
    console.log("[HOST] hubcloud \u2192", kind, url);
    return { host: "hubcloud", kind };
  }
  if (hostname.includes("gdflix") || hostname.includes("gdlink")) {
    let kind = "unknown";
    if (path.startsWith("/file"))
      kind = "file";
    else if (path.startsWith("/pack"))
      kind = "pack";
    console.log("[HOST] gdflix \u2192", kind, url);
    return { host: "gdflix", kind };
  }
  if (hostname.includes("vcloud")) {
    console.log("[HOST] vcloud \u2192 unknown", url);
    return { host: "vcloud", kind: "unknown" };
  }
  console.log("[HOST] unknown \u2192", url);
  return { host: "unknown", kind: "unknown" };
}

// src/flixindia/quality.js
var QUALITY_PATTERNS = [
  { label: "2160p", regex: /\b2160p\b/i },
  { label: "1080p", regex: /\b1080p\b/i },
  { label: "720p", regex: /\b720p\b/i },
  { label: "480p", regex: /\b480p\b/i }
];
function extractQuality(title) {
  for (const q of QUALITY_PATTERNS) {
    if (q.regex.test(title)) {
      console.log(`[QUALITY] ${q.label} \u2190 "${title}"`);
      return q.label;
    }
  }
  console.log(`[QUALITY] unknown \u2190 "${title}"`);
  return "unknown";
}

// src/flixindia/search.js
function search(query) {
  return __async(this, null, function* () {
    console.log("\n[SEARCH] \u25B6 Starting search:", query);
    try {
      const homeHtml = yield fetchText(BASE_URL);
      const csrf = extractCsrf(homeHtml);
      if (!csrf) {
        console.log("[SEARCH] \u274C CSRF not found");
        return [];
      }
      const body = new URLSearchParams({
        action: "search",
        csrf_token: csrf,
        q: query
      }).toString();
      const json = yield fetchJson(BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body
      });
      if (!Array.isArray(json.results)) {
        console.log("[SEARCH] \u26A0\uFE0F No results array");
        return [];
      }
      const results = [];
      for (const item of json.results) {
        try {
          if (!(item == null ? void 0 : item.title) || !(item == null ? void 0 : item.url))
            continue;
          if (isBannedTitle(item.title))
            continue;
          results.push(__spreadValues({
            title: item.title,
            url: item.url,
            quality: extractQuality(item.title)
          }, classifyHost(item.url)));
        } catch (err) {
          console.log("[SEARCH] \u26A0\uFE0F Skipping bad item:", err.message);
        }
      }
      console.log("[SEARCH] \u25B6 Final results:", results.length);
      return results;
    } catch (err) {
      console.log("[SEARCH] \u274C Search failed completely:", err.message);
      return [];
    }
  });
}

// src/flixindia/hubcloud.js
var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));
function resolveHubCloud(entryUrl, meta) {
  return __async(this, null, function* () {
    console.log("\n[HUBCLOUD] \u25B6 Resolving:", entryUrl);
    const streams = [];
    const entryHtml = yield fetchText(entryUrl);
    console.log("[HUBCLOUD] Entry HTML length:", entryHtml.length);
    const $entry = import_cheerio_without_node_native.default.load(entryHtml);
    let fileSize = null;
    try {
      const sizeText = $entry("li").filter((_, el) => $entry(el).text().includes("File Size")).find("i").text().trim();
      if (sizeText) {
        fileSize = sizeText;
        console.log(`[HUBCLOUD] \u{1F4E6} File Size: ${fileSize}`);
      }
    } catch (err) {
      console.log("[HUBCLOUD] \u26A0\uFE0F Could not extract size:", err.message);
    }
    const generatorUrl = $entry("a#download").attr("href");
    if (!generatorUrl) {
      console.log("[HUBCLOUD] \u274C Generate link not found");
      return streams;
    }
    console.log("[HUBCLOUD] Generate link found:", generatorUrl);
    const finalHtml = yield fetchText(generatorUrl);
    console.log("[HUBCLOUD] Final page HTML length:", finalHtml.length);
    const $final = import_cheerio_without_node_native.default.load(finalHtml);
    const fslUrl = $final("a#fsl").attr("href");
    if (fslUrl) {
      console.log("[HUBCLOUD] \u2705 FSL link found:", fslUrl);
      streams.push({
        name: "Flixindia - hubcloud - FSL",
        title: meta.title,
        url: fslUrl,
        quality: meta.quality,
        size: fileSize,
        // <--- Added Size
        source: "hubcloud-fsl"
      });
    } else {
      console.log("[HUBCLOUD] \u26A0\uFE0F No FSL link found");
    }
    $final("a[href]").each((_, el) => {
      const href = $final(el).attr("href");
      if (!href)
        return;
      let url;
      try {
        url = new URL(href);
      } catch (e) {
        return;
      }
      console.log("[HUBCLOUD] Link found:", url.href);
      if (url.hostname.includes("pixeldrain")) {
        console.log("[HUBCLOUD] \u{1F7E3} PixelDrain candidate:", url.href);
        const resolved = resolvePixelDrain(url);
        if (resolved) {
          streams.push({
            name: "Flixindia - hubcloud - PixelDrain",
            title: meta.title,
            url: resolved,
            quality: meta.quality,
            size: fileSize,
            // <--- Added Size
            source: "hubcloud-pixeldrain"
          });
        }
      }
    });
    const filtered = streams.filter((s) => {
      if (s.url.includes("gpdl") || s.url.includes("hubcdn")) {
        console.log("[HUBCLOUD] \u274C Excluding direct / non-streamable:", s.url);
        return false;
      }
      return true;
    });
    console.log("[HUBCLOUD] \u25B6 Final streams:", filtered.length);
    return filtered;
  });
}
function resolvePixelDrain(url) {
  try {
    const parts = url.pathname.split("/").filter(Boolean);
    let fileId = null;
    if (parts[0] === "u" && parts[1]) {
      fileId = parts[1];
    } else if (parts[0] === "file" && parts[1]) {
      fileId = parts[1];
    } else if (parts[0] === "api" && parts[1] === "file" && parts[2]) {
      fileId = parts[2];
    }
    if (!fileId) {
      console.log("[PIXELDRAIN] \u274C Unsupported format:", url.href);
      return null;
    }
    const finalUrl = `https://${url.hostname}/api/file/${fileId}`;
    console.log("[PIXELDRAIN] \u2705 Final stream URL:", finalUrl);
    return finalUrl;
  } catch (err) {
    console.log("[PIXELDRAIN] \u274C Error:", err.message);
    return null;
  }
}

// src/flixindia/index.js
var TMDB_API_KEY = "919605fd567bbffcf76492a03eb4d527";
var TMDB_BASE = "https://api.themoviedb.org/3";
function pad2(num) {
  return String(num).padStart(2, "0");
}
function isV4Key(key) {
  return key && key.length > 40;
}
function getTmdbTitle(tmdbId, mediaType) {
  return __async(this, null, function* () {
    try {
      if (!TMDB_API_KEY || TMDB_API_KEY === "YOUR_TMDB_API_KEY_HERE") {
        console.error("[FlixIndia] \u274C Missing TMDB API Key");
        return null;
      }
      let endpoint;
      if (mediaType === "movie")
        endpoint = `/movie/${tmdbId}`;
      else if (mediaType === "tv")
        endpoint = `/tv/${tmdbId}`;
      else
        return null;
      let url = `${TMDB_BASE}${endpoint}`;
      const options = { method: "GET", headers: {} };
      if (isV4Key(TMDB_API_KEY)) {
        options.headers.Authorization = `Bearer ${TMDB_API_KEY}`;
      } else {
        url += `?api_key=${TMDB_API_KEY}`;
      }
      const data = yield fetchJson(url, options);
      if (mediaType === "movie")
        return (data == null ? void 0 : data.title) || null;
      if (mediaType === "tv")
        return (data == null ? void 0 : data.name) || null;
      return null;
    } catch (error) {
      console.error(`[TMDB] Error: ${error.message}`);
      return null;
    }
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      const baseTitle = yield getTmdbTitle(tmdbId, mediaType);
      if (!baseTitle) {
        console.log("[FlixIndia] TMDB title not found");
        return [];
      }
      let query;
      if (mediaType === "movie") {
        query = baseTitle;
      } else if (mediaType === "tv") {
        if (season == null || episode == null)
          return [];
        query = `${baseTitle} S${pad2(season)}E${pad2(episode)}`;
      } else {
        return [];
      }
      const results = yield search(query);
      if (!Array.isArray(results))
        return [];
      const limitedResults = results.slice(0, 5);
      const promises = limitedResults.map((item) => __async(this, null, function* () {
        try {
          if (item.host === "hubcloud") {
            const resolved = yield resolveHubCloud(item.url, {
              title: item.title,
              quality: item.quality
            });
            return resolved.map((stream) => ({
              name: stream.name,
              title: stream.title,
              url: stream.url,
              quality: stream.quality || "unknown",
              size: stream.size || null,
              // <--- New Field
              headers: {}
            }));
          }
        } catch (err) {
          console.log(`[FlixIndia] Error resolving ${item.url}: ${err.message}`);
        }
        return [];
      }));
      const resultsArrays = yield Promise.all(promises);
      return resultsArrays.flat();
    } catch (err) {
      console.error(`[FlixIndia] Critical Error: ${err.message}`);
      return [];
    }
  });
}
module.exports = { getStreams };
