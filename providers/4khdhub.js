"use strict";

var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var MURPH_BASE = "https://badboysxs-morpheus.hf.space";
var PROVIDER_NAME = "4KHDHub Murph";
var PROVIDER_TAG = "[4KHDHub Murph]";
var REQUEST_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*"
};

var __doomProbeCache = Object.create(null);
var __doomProbeCacheTtlMs = 10 * 60 * 1000;
var __doomProbeTimeoutMs = 6 * 1000;

function withTimeout(promise, timeoutMs) {
  return new Promise(function(resolve, reject) {
    var settled = false;
    var timer = setTimeout(function() {
      if (settled) return;
      settled = true;
      reject(new Error("timeout"));
    }, timeoutMs);

    Promise.resolve(promise).then(function(value) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    }, function(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
  });
}

function mergeHeaders(base, extra) {
  var merged = {};
  var key;
  for (key in base || {}) merged[key] = base[key];
  for (key in extra || {}) merged[key] = extra[key];
  return merged;
}

function normalizeQuality(value) {
  var text = String(value || "");
  if (/2160p|4k/i.test(text)) return "2160p";
  var match = text.match(/(1080p|720p|480p|360p|240p)/i);
  return match ? match[1].toLowerCase() : "Auto";
}

function extractSize(value) {
  var match = String(value || "").match(/\[([^\]]+)\]/);
  return match ? match[1] : "";
}

function looksLikeHls(url, contentType) {
  var normalizedUrl = String(url || "").toLowerCase();
  var normalizedType = String(contentType || "").toLowerCase();
  return normalizedUrl.indexOf(".m3u8") !== -1
    || normalizedType.indexOf("mpegurl") !== -1
    || normalizedType.indexOf("application/x-mpegurl") !== -1
    || normalizedType.indexOf("vnd.apple.mpegurl") !== -1;
}

function getProbeCacheKey(stream) {
  var headers = stream && stream.headers ? stream.headers : {};
  return [
    stream && stream.url ? stream.url : "",
    headers.Referer || headers.referer || "",
    headers.Origin || headers.origin || ""
  ].join("|");
}

function getCachedProbeResult(cacheKey) {
  var entry = __doomProbeCache[cacheKey];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > __doomProbeCacheTtlMs) {
    delete __doomProbeCache[cacheKey];
    return null;
  }
  return entry.ok;
}

function setCachedProbeResult(cacheKey, ok) {
  __doomProbeCache[cacheKey] = {
    ok: !!ok,
    timestamp: Date.now()
  };
}

function responseIsSeekable(response, url) {
  if (!response || !response.ok) return false;
  var headers = response.headers;
  var contentType = headers && headers.get ? headers.get("content-type") || "" : "";
  if (looksLikeHls(url, contentType)) return true;
  var acceptRanges = headers && headers.get ? headers.get("accept-ranges") || "" : "";
  var contentRange = headers && headers.get ? headers.get("content-range") || "" : "";
  return response.status === 206
    || /bytes/i.test(acceptRanges)
    || /^bytes\s+/i.test(contentRange);
}

function probeStream(stream) {
  if (!stream || !stream.url || typeof fetch !== "function") {
    return Promise.resolve(false);
  }

  var cacheKey = getProbeCacheKey(stream);
  var cached = getCachedProbeResult(cacheKey);
  if (cached !== null) return Promise.resolve(cached);

  var url = stream.url;
  var isHls = looksLikeHls(url, "");
  var baseHeaders = mergeHeaders({}, stream.headers || {});
  var rangedHeaders = mergeHeaders({}, baseHeaders);
  if (!isHls && !rangedHeaders.Range && !rangedHeaders.range) {
    rangedHeaders.Range = "bytes=0-1";
  }

  var attempts = [
    { method: "GET", headers: isHls ? baseHeaders : rangedHeaders, redirect: "follow" },
    { method: "HEAD", headers: baseHeaders, redirect: "follow" }
  ];

  function tryAttempt(index) {
    if (index >= attempts.length) return Promise.resolve(false);
    return withTimeout(fetch(url, attempts[index]), __doomProbeTimeoutMs)
      .then(function(response) {
        if (responseIsSeekable(response, url)) return true;
        return tryAttempt(index + 1);
      })
      .catch(function() {
        return tryAttempt(index + 1);
      });
  }

  return tryAttempt(0).then(function(ok) {
    setCachedProbeResult(cacheKey, ok);
    return ok;
  });
}

function looksLikeDirectMediaUrl(url) {
  var normalized = String(url || "").toLowerCase();
  if (!/^https?:\/\//i.test(normalized)) return false;
  if (/\/login\.php\b/.test(normalized) || /action=logout/.test(normalized)) return false;
  return /\.m(?:kv|p4)(?:$|[?#])/.test(normalized)
    || /\.m3u8(?:$|[?#])/.test(normalized)
    || /\.ts(?:$|[?#])/.test(normalized);
}

function looksLikeMurphFallbackCandidate(stream) {
  if (!stream || !stream.url) return false;
  if (!looksLikeDirectMediaUrl(stream.url)) return false;
  var size = Number(stream.videoSize || (stream.behaviorHints && stream.behaviorHints.videoSize) || 0);
  if (size > 0) return true;
  return /\[[^\]]+(gb|mb)\]/i.test(String(stream.title || ""))
    || /4khdhub/i.test(String(stream.name || ""));
}

function filterSeekableStreams(streams) {
  if (!Array.isArray(streams) || streams.length === 0) {
    return Promise.resolve([]);
  }
  return Promise.all(streams.map(function(stream) {
    return probeStream(stream)
      .then(function(ok) { return { stream: stream, ok: ok }; })
      .catch(function() { return { stream: stream, ok: false }; });
  })).then(function(results) {
    var filtered = results.filter(function(item) { return item.ok; }).map(function(item) { return item.stream; });
    if (filtered.length === 0) {
      filtered = results
        .map(function(item) { return item.stream; })
        .filter(looksLikeMurphFallbackCandidate);
      if (filtered.length > 0) {
        console.log(PROVIDER_TAG + " Seekable filter fallback kept " + filtered.length + "/" + streams.length + " streams");
        return filtered;
      }
    }
    if (filtered.length === 0) {
      console.log(PROVIDER_TAG + " Seekable filter kept 0/" + streams.length + " streams; returning original streams as fallback");
      return streams;
    }
    console.log(PROVIDER_TAG + " Seekable filter kept " + filtered.length + "/" + streams.length + " streams");
    return filtered;
  });
}

function fetchJson(url) {
  return withTimeout(fetch(url, { headers: REQUEST_HEADERS, redirect: "follow" }), 15 * 1000).then(function(response) {
    if (!response.ok) throw new Error("HTTP " + response.status + " -> " + url);
    return response.json();
  });
}

function absolutizeUrl(url) {
  if (!url) return "";
  url = String(url);
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("/")) return MURPH_BASE + url;
  return MURPH_BASE + "/" + url.replace(/^\.?\//, "");
}

function extractMurphStreams(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  var candidates = [
    payload.streams,
    payload.data && payload.data.streams,
    payload.result && payload.result.streams,
    payload.data && payload.data.results,
    payload.results,
    payload.items
  ];
  for (var i = 0; i < candidates.length; i += 1) {
    if (Array.isArray(candidates[i])) return candidates[i];
  }
  return [];
}

function isProviderMatch(name) {
  return /4k\s*hd\s*hub/i.test(String(name || ""));
}

function resolveImdbId(id, mediaType) {
  if (!id) return Promise.resolve("");
  if (String(id).startsWith("tt")) return Promise.resolve(String(id));

  if (mediaType === "tv") {
    var tvUrl = "https://api.themoviedb.org/3/tv/" + id + "/external_ids?api_key=" + TMDB_API_KEY;
    return fetchJson(tvUrl).then(function(data) {
      return data && data.imdb_id ? data.imdb_id : "";
    }).catch(function() {
      return "";
    });
  }

  var movieUrl = "https://api.themoviedb.org/3/movie/" + id + "?api_key=" + TMDB_API_KEY;
  return fetchJson(movieUrl).then(function(data) {
    return data && data.imdb_id ? data.imdb_id : "";
  }).catch(function() {
    return "";
  });
}

function buildEndpoint(imdbId, mediaType, season, episode) {
  if (!imdbId) return "";
  if (mediaType === "tv") {
    if (season == null || episode == null) return "";
    return MURPH_BASE + "/stream/series/" + imdbId + ":" + season + ":" + episode + ".json";
  }
  return MURPH_BASE + "/stream/movie/" + imdbId + ".json";
}

function dedupeStreams(streams) {
  var seen = new Set();
  return streams.filter(function(stream) {
    var fingerprint = [stream.name || "", stream.title || "", stream.url || ""].join("|");
    if (seen.has(fingerprint)) return false;
    seen.add(fingerprint);
    return true;
  });
}

function mapMurphStream(item) {
  if (!item) return null;
  var name = String(item.name || "");
  if (!isProviderMatch(name)) return null;
  var url = item.url || item.streamUrl || item.stream_url || item.src || item.file || "";
  if (!url) return null;
  var absoluteUrl = absolutizeUrl(url);
  var title = item.title || item.description || item.label || "4KHDHub stream";
  return {
    name: name.replace(/4k\s*hd\s*hub/i, PROVIDER_NAME),
    title: title,
    url: absoluteUrl,
    quality: normalizeQuality(name + " " + title),
    size: extractSize(title),
    behaviorHints: item.behaviorHints,
    videoSize: item.behaviorHints && item.behaviorHints.videoSize,
    headers: void 0
  };
}

function getStreams(id, type, season, episode) {
  var mediaType = type === "series" ? "tv" : (type || "movie");
  return resolveImdbId(id, mediaType).then(function(imdbId) {
    if (!imdbId) return [];
    var endpoint = buildEndpoint(imdbId, mediaType, season, episode);
    if (!endpoint) return [];
    return fetchJson(endpoint).then(function(payload) {
      var streams = extractMurphStreams(payload);
      var mapped = streams.map(mapMurphStream).filter(Boolean);
      return filterSeekableStreams(dedupeStreams(mapped));
    });
  }).catch(function(error) {
    console.error(PROVIDER_TAG + " " + (error && error.message ? error.message : String(error)));
    return [];
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams: getStreams };
} else {
  global.getStreams = getStreams;
}

// __DOOM_STREAM_NORMALIZATION__
function __doomNormalizeHeaders(headers) {
  if (!headers || typeof headers !== "object") return null;
  var normalized = {};
  var key;
  for (key in headers) {
    if (headers[key] !== undefined && headers[key] !== null && headers[key] !== "") {
      normalized[key] = String(headers[key]);
    }
  }
  return Object.keys(normalized).length ? normalized : null;
}

function __doomLooksWebReady(url) {
  var normalized = String(url || "").toLowerCase();
  return normalized.indexOf("https://") === 0
    && (normalized.indexOf(".mp4") !== -1 || normalized.indexOf("format=mp4") !== -1);
}

function __doomNormalizeStream(rawStream) {
  if (!rawStream || typeof rawStream !== "object") return null;
  var targetUrl = rawStream.url || rawStream.externalUrl;
  if (!targetUrl || typeof targetUrl !== "string") return null;

  var requestHeaders = __doomNormalizeHeaders(rawStream.headers);
  var behaviorHints = {};
  var key;
  for (key in rawStream.behaviorHints || {}) behaviorHints[key] = rawStream.behaviorHints[key];

  if (rawStream.fileName && !behaviorHints.filename) behaviorHints.filename = rawStream.fileName;
  if (typeof rawStream.size === "number" && rawStream.size > 0 && !behaviorHints.videoSize) {
    behaviorHints.videoSize = rawStream.size;
  }
  if (typeof rawStream.videoSize === "number" && rawStream.videoSize > 0 && !behaviorHints.videoSize) {
    behaviorHints.videoSize = rawStream.videoSize;
  }
  if (!behaviorHints.bingeGroup) {
    var providerId = typeof PLUGIN_TAG !== "undefined" ? PLUGIN_TAG : (typeof TAG !== "undefined" ? TAG : "doom-plug");
    behaviorHints.bingeGroup = String(providerId).replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  }
  if (!__doomLooksWebReady(targetUrl) || requestHeaders) behaviorHints.notWebReady = true;
  if (requestHeaders) behaviorHints.proxyHeaders = { request: requestHeaders };

  var description = rawStream.description || rawStream.title || rawStream.name || "Doom-plug stream";
  return {
    name: rawStream.name || "Doom-plug",
    title: description,
    description: description,
    url: targetUrl,
    behaviorHints: behaviorHints
  };
}

(function() {
  if (typeof getStreams !== "function" || getStreams.__doomNormalizedWrapped) return;

  var __doomOriginalGetStreamsForNormalization = getStreams;
  var __doomNormalizedGetStreams = function() {
    return Promise.resolve(__doomOriginalGetStreamsForNormalization.apply(this, arguments))
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
