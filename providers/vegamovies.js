var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
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

// src/vegamovies/index.js
var cheerio = require("cheerio-without-node-native");
var PROVIDER_NAME = "VegaMovies";
var BASE_URL = "https://vegamovies.market";
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var DOMAINS_JSON_URL = "https://raw.githubusercontent.com/SaurabhKaperwan/Utils/refs/heads/main/urls.json";
var REQUEST_TIMEOUT = 12e3;
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5"
};
var MOBILE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
var MOBILE_HEADERS = {
  "User-Agent": MOBILE_UA,
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": BASE_URL + "/"
};
var EXCLUDED_BUTTONS = ["filepress", "gdtot", "dropgalaxy", "gdflix", "gdlink"];
function fetchSafe(_0) {
  return __async(this, arguments, function* (url, options = {}, timeout = REQUEST_TIMEOUT) {
    try {
      const signal = typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(timeout) : null;
      const merged = __spreadProps(__spreadValues({}, options), { headers: __spreadValues(__spreadValues({}, HEADERS), options.headers || {}) });
      if (signal) merged.signal = signal;
      return yield fetch(url, merged);
    } catch (e) {
      if (e.name === "AbortError") {
        console.error("[" + PROVIDER_NAME + "] Timeout: " + url.substring(0, 100));
      } else {
        console.error("[" + PROVIDER_NAME + "] fetchSafe: " + url.substring(0, 100) + " -> " + e.message);
      }
      return null;
    }
  });
}
function fetchJson(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    try {
      const res = yield fetchSafe(url, options);
      if (!res || !res.ok) return null;
      const text = yield res.text();
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  });
}
function fetchHtml(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    try {
      const res = yield fetchSafe(url, options);
      if (!res || !res.ok) return null;
      return cheerio.load(yield res.text());
    } catch (e) {
      return null;
    }
  });
}
function getOrigin(url) {
  try {
    const parts = url.split("//");
    if (parts.length < 2) return url;
    return parts[0] + "//" + parts[1].split("/")[0];
  } catch (e) {
    return url;
  }
}
function fixUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("/")) return baseUrl + url;
  return baseUrl + "/" + url;
}
function parseQuality(text) {
  const t = String(text || "").toLowerCase();
  if (t.includes("2160") || t.includes("4k") || t.includes("uhd")) return "2160p";
  if (t.includes("1440") || t.includes("2k")) return "1440p";
  if (t.includes("1080")) return "1080p";
  if (t.includes("720")) return "720p";
  if (t.includes("480")) return "480p";
  return "HD";
}
function makeStream(name, title, url, quality, headers) {
  return {
    name: PROVIDER_NAME + " | " + name,
    title: title || PROVIDER_NAME + " Stream",
    url: url || "",
    quality: quality || "HD",
    behaviorHints: {
      notWebReady: true,
      proxyHeaders: {
        request: headers || { "Referer": baseUrl + "/" }
      }
    }
  };
}
function dedupe(streams) {
  const seen = /* @__PURE__ */ new Set();
  return (streams || []).filter((s) => {
    if (!s || !s.url || seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });
}
function isStrictMatch(requestedTitle, requestedYear, scrapedTitle, scrapedYear) {
  if (!requestedTitle || !scrapedTitle) return false;
  const reqClean = requestedTitle.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim().replace(/\s+/g, " ");
  const scrClean = scrapedTitle.toLowerCase().replace(/download\s*/g, "").replace(/[^a-z0-9\s]/g, " ").trim().replace(/\s+/g, " ");
  if (!scrClean.includes(reqClean) && !scrClean.startsWith(reqClean)) return false;
  if (requestedYear && scrapedYear) {
    const rY = parseInt(requestedYear);
    const sY = parseInt(scrapedYear);
    if (!isNaN(rY) && !isNaN(sY)) {
      if (Math.abs(rY - sY) > 1) return false;
    }
  }
  return true;
}
var cachedDomains = null;
var domainCacheTime = 0;
var DOMAIN_CACHE_TTL = 4 * 60 * 60 * 1e3;
var baseUrl = BASE_URL;
var cachedHubDomain = "https://hubcloud.foo";
var cachedVcDomain = "https://vcloud.zip";
function refreshDomains() {
  return __async(this, null, function* () {
    const now = Date.now();
    if (cachedDomains && now - domainCacheTime < DOMAIN_CACHE_TTL) return cachedDomains;
    try {
      const data = yield fetchJson(DOMAINS_JSON_URL, {}, 8e3);
      if (data) {
        cachedDomains = data;
        domainCacheTime = now;
        if (data.vegamovies) baseUrl = data.vegamovies;
        if (data.hubcloud) cachedHubDomain = data.hubcloud;
        if (data.vcloud) cachedVcDomain = data.vcloud;
        console.log("[" + PROVIDER_NAME + "] Domains updated: site=" + baseUrl + " hub=" + cachedHubDomain + " vc=" + cachedVcDomain);
      }
    } catch (e) {
      console.log("[" + PROVIDER_NAME + "] Domain refresh failed, using defaults");
    }
    return cachedDomains || {};
  });
}
function getLatestHubDomain() {
  return cachedHubDomain;
}
function getLatestVcDomain() {
  return cachedVcDomain;
}
function getTMDBInfo(id, type) {
  return __async(this, null, function* () {
    const idStr = String(id || "").trim();
    const isImdb = idStr.startsWith("tt");
    const tmdbType = type === "tv" || type === "series" ? "tv" : "movie";
    try {
      if (isImdb) {
        const data = yield fetchJson("https://api.themoviedb.org/3/find/" + idStr + "?api_key=" + TMDB_API_KEY + "&external_source=imdb_id");
        const list = data ? tmdbType === "tv" ? data.tv_results : data.movie_results : null;
        if (list && list.length > 0) {
          const item = list[0];
          return {
            title: tmdbType === "tv" ? item.name : item.title,
            year: (item.first_air_date || item.release_date || "").split("-")[0],
            imdbId: idStr,
            tmdbId: item.id
          };
        }
        return { title: idStr, year: null, imdbId: idStr, tmdbId: null };
      } else {
        const data = yield fetchJson("https://api.themoviedb.org/3/" + tmdbType + "/" + idStr + "?api_key=" + TMDB_API_KEY + "&append_to_response=external_ids");
        if (data) {
          return {
            title: tmdbType === "tv" ? data.name : data.title,
            year: (data.first_air_date || data.release_date || "").split("-")[0],
            imdbId: data.imdb_id || data.external_ids && data.external_ids.imdb_id || null,
            tmdbId: data.id
          };
        }
      }
    } catch (e) {
      console.error("[" + PROVIDER_NAME + "] TMDB error: " + e.message);
    }
    return { title: idStr, year: null, imdbId: null, tmdbId: null };
  });
}
function searchByTitle(query, year) {
  return __async(this, null, function* () {
    if (!query) return [];
    const searchQuery = encodeURIComponent(query + (year ? " " + year : ""));
    const url = baseUrl + "/search.php?q=" + searchQuery + "&page=1&per_page=15";
    console.log("[" + PROVIDER_NAME + '] Search: "' + query.substring(0, 60) + '" -> ' + url.substring(0, 120));
    const data = yield fetchJson(url);
    if (!data || !data.hits || data.hits.length === 0) {
      console.log("[" + PROVIDER_NAME + "] Search: no results");
      return [];
    }
    console.log("[" + PROVIDER_NAME + "] Search: " + data.hits.length + " results");
    return data.hits.map((h) => {
      const doc = h.document || {};
      return {
        postId: String(doc.id || ""),
        title: (doc.post_title || "").replace(/Download\s*/gi, "").trim(),
        permalink: doc.permalink || "",
        imdbId: doc.imdb_id || "",
        year: ((doc.post_title || "").match(/\b(19|20)\d{2}\b/) || [null])[0]
      };
    });
  });
}
function fetchPostContent(postId, link) {
  return __async(this, null, function* () {
    if (!postId) return null;
    const apiUrl = baseUrl + "/wp-json/wp/v2/posts/" + postId;
    console.log("[" + PROVIDER_NAME + "] Fetching post content " + postId);
    try {
      const signal = typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(15e3) : null;
      const res = yield fetch(apiUrl, { headers: MOBILE_HEADERS, signal: signal || void 0 });
      if (res && res.ok) {
        const text = yield res.text();
        try {
          const json = JSON.parse(text);
          if (json && json.content && json.content.rendered) {
            return {
              title: (json.title && json.title.rendered || "").replace(/Download\s*/gi, "").trim(),
              html: json.content.rendered
            };
          }
        } catch (parseError) {
          console.log("[" + PROVIDER_NAME + "] WP-JSON parse failed (likely 256KB truncation). Falling back to raw HTML.");
        }
      }
    } catch (e) {
      console.error("[" + PROVIDER_NAME + "] WP-JSON fetch error: " + e.message);
    }
    try {
      const fallbackUrl = link ? fixUrl(link) : baseUrl + "/?p=" + postId;
      console.log("[" + PROVIDER_NAME + "] HTML Fallback fetching: " + fallbackUrl);
      const htmlRes = yield fetchHtml(fallbackUrl, { headers: HEADERS });
      if (htmlRes) {
        const contentHtml = htmlRes(".entry-content").html() || htmlRes(".post-content").html();
        if (contentHtml) {
          return {
            title: htmlRes("title").text().replace(/Download\s*/gi, "").trim(),
            html: contentHtml
          };
        }
      }
    } catch (e) {
      console.error("[" + PROVIDER_NAME + "] HTML fallback error: " + e.message);
    }
    return null;
  });
}
function extractNexdriveLinks(contentHtml) {
  if (!contentHtml) return [];
  const links = [];
  const $ = cheerio.load(contentHtml);
  const seenUrls = /* @__PURE__ */ new Set();
  $('a[href*="nexdrive"], a[href*="genxfm"], a[href*="fastdl"]').each((i, el) => {
    try {
      const href = $(el).attr("href");
      if (!href) return;
      const linkText = ($(el).text() || "").trim();
      if (EXCLUDED_BUTTONS.some((ex) => linkText.toLowerCase().includes(ex))) return;
      if (seenUrls.has(href)) return;
      seenUrls.add(href);
      let quality = "HD";
      const hrefPos = contentHtml.indexOf(href);
      if (hrefPos > 0) {
        const beforeHref = contentHtml.substring(Math.max(0, hrefPos - 3e3), hrefPos);
        const qualityPattern = /(?:^|>|\s)(\d{3,4}p|4K|UHD|HDR)(?:<|\s|$)/gi;
        let qMatch;
        let lastMatch = null;
        let lastIndex = -1;
        while ((qMatch = qualityPattern.exec(beforeHref)) !== null) {
          if (qMatch.index > lastIndex) {
            lastIndex = qMatch.index;
            lastMatch = qMatch[1];
          }
        }
        if (lastMatch) {
          quality = parseQuality(lastMatch);
        }
        if (!quality || quality === "HD") {
          const headingQ = beforeHref.match(/<(?:h[1-6]|strong|b)[^>]*>[^<]*?(\d{3,4}p|4K|UHD)[^<]*?<\//i);
          if (headingQ) quality = parseQuality(headingQ[1]);
        }
      }
      links.push({ href: fixUrl(href), quality: quality || "HD", label: linkText || "Download" });
    } catch (e) {
    }
  });
  return links;
}
function capLinksForEfficiency(links, maxTotal = 15) {
  if (!links || links.length <= maxTotal) return links;
  return links.slice(0, maxTotal);
}
function extractSeasonFromContent(contentHtml, targetSeason) {
  if (!contentHtml || targetSeason == null) return contentHtml;
  const regex = new RegExp(`(<h[1-6][^>]*>|<strong[^>]*>).*?(?:Season|Saison|Staffel)\\s+0*${targetSeason}\\b(?!\\s*[-\u2013]).*?(?:</h[1-6]>|</strong>)`, "gi");
  let match;
  let bestPos = -1;
  while ((match = regex.exec(contentHtml)) !== null) {
    if (match[0].toLowerCase().includes("download") === false || match[0].toLowerCase().includes("[") || match[0].toLowerCase().includes("p")) {
      bestPos = match.index;
      break;
    }
  }
  if (bestPos === -1) {
    const fallbackRegex = new RegExp(`\\b(?:Season|Saison|Staffel)\\s+0*${targetSeason}\\b(?!\\s*[-\u2013])`, "i");
    bestPos = contentHtml.search(fallbackRegex);
    if (bestPos !== -1) {
      let startTag = contentHtml.lastIndexOf("<h", bestPos);
      if (startTag === -1) startTag = contentHtml.lastIndexOf("<strong", bestPos);
      if (startTag !== -1) bestPos = startTag;
    }
  }
  if (bestPos !== -1) {
    const nextSeasonRegex = new RegExp(`(<h[1-6][^>]*>|<strong[^>]*>).*?(?:Season|Saison|Staffel)\\s+0*${targetSeason + 1}\\b(?!\\s*[-\u2013])`, "i");
    let endMatchPos = contentHtml.substring(bestPos + 10).search(nextSeasonRegex);
    const prevSeasonRegex = targetSeason > 1 ? new RegExp(`(<h[1-6][^>]*>|<strong[^>]*>).*?(?:Season|Saison|Staffel)\\s+0*${targetSeason - 1}\\b(?!\\s*[-\u2013])`, "i") : null;
    let endMatchPosPrev = prevSeasonRegex ? contentHtml.substring(bestPos + 10).search(prevSeasonRegex) : -1;
    let cutPos = contentHtml.length;
    if (endMatchPos !== -1) cutPos = Math.min(cutPos, bestPos + 10 + endMatchPos);
    if (endMatchPosPrev !== -1) cutPos = Math.min(cutPos, bestPos + 10 + endMatchPosPrev);
    let recentPos = contentHtml.substring(bestPos + 10).search(/<h[1-6][^>]*>.*?(?:Recent|Related|Similar).*?<\/h[1-6]>/i);
    if (recentPos !== -1) cutPos = Math.min(cutPos, bestPos + 10 + recentPos);
    return contentHtml.substring(bestPos, cutPos);
  }
  return null;
}
function extractSingleVc(vcUrl, referer, targetSeason, targetEpisode) {
  return __async(this, null, function* () {
    const streams = [];
    const lower = vcUrl.toLowerCase();
    if (lower.includes("vcloud") || lower.includes("hubcloud") || lower.includes("nexdrive") || lower.includes("fastdl")) {
      const isHub = lower.includes("hubcloud");
      const latestBase = isHub ? getLatestHubDomain() : getLatestVcDomain();
      const curBase = getOrigin(vcUrl);
      let newUrl = vcUrl;
      if (curBase !== latestBase && (vcUrl.includes("vcloud") || vcUrl.includes("hubcloud"))) {
        newUrl = vcUrl.replace(curBase, latestBase);
      }
      const html = yield fetchHtml(newUrl, {
        headers: __spreadProps(__spreadValues({}, HEADERS), { "Referer": referer || baseUrl + "/", "Cookie": "xla=s4t" }),
        redirect: "manual"
      });
      if (!html) return streams;
      const rawHtml = html.html();
      const pageTitle = html("title").text() || "";
      if (targetSeason != null || targetEpisode != null) {
        const seMatch = pageTitle.match(/[.\s_\-](?:S|Season)\s*0*(\d{1,2})\s*(?:E|Ep|Episode)\s*0*(\d{1,2})[.\s_\-]/i);
        if (seMatch) {
          const vcSeason = parseInt(seMatch[1]);
          const vcEpisode = parseInt(seMatch[2]);
          if (targetSeason != null && vcSeason !== targetSeason) {
            console.log(`[${PROVIDER_NAME}] V-Cloud title mismatch: Title=${pageTitle.substring(0, 40)} Target=S${targetSeason}`);
            return streams;
          }
          if (targetEpisode != null && vcEpisode !== targetEpisode) {
            console.log(`[${PROVIDER_NAME}] V-Cloud title mismatch: Title=${pageTitle.substring(0, 40)} Target=E${targetEpisode}`);
            return streams;
          }
        } else {
          const sMatch = pageTitle.match(/[.\s_\-](?:S|Season)\s*0*(\d{1,2})[.\s_\-]/i);
          if (sMatch && targetSeason != null) {
            const vcSeason = parseInt(sMatch[1]);
            if (vcSeason !== targetSeason) {
              console.log(`[${PROVIDER_NAME}] V-Cloud pack mismatch: Title=${pageTitle.substring(0, 40)} Target=S${targetSeason}`);
              return streams;
            }
          }
        }
      }
      let bridgeUrl = "";
      const varMatch = rawHtml.match(/var\s+url\s*=\s*['"]([^'"]+)['"]/);
      if (varMatch) bridgeUrl = varMatch[1];
      if (!bridgeUrl) {
        const downloadHref = html("#download").attr("href") || html("a").filter((i, el) => {
          const href = html(el).attr("href") || "";
          return href.includes("hubcloud.php") || href.includes("token") || href.includes("dl");
        }).first().attr("href");
        if (downloadHref) bridgeUrl = downloadHref.startsWith("http") ? downloadHref : getOrigin(newUrl) + "/" + downloadHref.replace(/^\//, "");
      }
      if (!bridgeUrl) return streams;
      if (bridgeUrl.indexOf("://") < 0) bridgeUrl = getOrigin(newUrl) + bridgeUrl;
      const bridgeHtml = yield fetchHtml(bridgeUrl, {
        headers: __spreadProps(__spreadValues({}, HEADERS), { "Referer": newUrl, "Cookie": "xla=s4t" })
      });
      if (!bridgeHtml) return streams;
      const bridgeRaw = bridgeHtml.html();
      const headerText = bridgeHtml("div.card-header").text() || "";
      const quality = parseQuality(headerText) || "HD";
      const serverTasks = [];
      bridgeHtml("a.btn, a").each((i, el) => {
        try {
          let href = bridgeHtml(el).attr("href") || "";
          let text = (bridgeHtml(el).text() || "").trim();
          let lowerText = text.toLowerCase();
          if (!href || href === "#") return;
          if (href.toLowerCase().includes(".zip")) return;
          if (lowerText.includes("10gbps") || lowerText.includes("gdflix") || lowerText.includes("dropgalaxy") || lowerText.includes("telegram")) {
            return;
          }
          if (lowerText.includes("fsl")) {
            const synced = href + "?s=" + (1 + (/* @__PURE__ */ new Date()).getMinutes());
            serverTasks.push(() => {
              streams.push(makeStream("FSL | " + quality, text + " [" + headerText + "]", synced, quality, { "Referer": bridgeUrl }));
            });
          }
          const isFastCdn = href.includes("r2.dev") || href.includes("gofile") || href.includes("diskcdn") || href.includes("lotuscdn") || href.includes("workers.dev");
          if (lowerText.includes("download") || isFastCdn) {
            serverTasks.push(() => {
              streams.push(makeStream("Download | " + quality, text + " [" + headerText + "]", href, quality, { "Referer": bridgeUrl }));
            });
          }
        } catch (e) {
        }
      });
      if (serverTasks.length === 0) {
        const fslHref = bridgeHtml("#fsl").attr("href");
        if (fslHref) {
          const synced = fslHref + "?s=" + (1 + (/* @__PURE__ */ new Date()).getMinutes());
          serverTasks.push(() => {
            streams.push(makeStream("FSL | " + quality, "FSL Server [" + headerText + "]", synced, quality, { "Referer": bridgeUrl }));
          });
        }
      }
      serverTasks.forEach((fn) => fn());
    }
    return streams;
  });
}
function loadStreamsFromUrl(url, label, quality, referer, targetSeason, targetEpisode) {
  return __async(this, null, function* () {
    const lower = url.toLowerCase();
    if (lower.includes("vcloud") || lower.includes("hubcloud")) {
      return yield extractSingleVc(url, referer || url, targetSeason, targetEpisode);
    }
    if (lower.includes("nexdrive") || lower.includes("genxfm") || lower.includes("fastdl")) {
      const $ = yield fetchHtml(url, { headers: __spreadProps(__spreadValues({}, HEADERS), { "Referer": referer || baseUrl + "/" }), redirect: "manual" });
      if (!$) return [];
      const tasks = [];
      $('a[href*="vcloud"], a[href*="hubcloud"]').each((i, el) => {
        const href = $(el).attr("href");
        if (href) tasks.push(() => extractSingleVc(fixUrl(href), url, targetSeason, targetEpisode));
      });
      const results = yield Promise.all(tasks.map((fn) => (() => __async(null, null, function* () {
        try {
          return yield fn();
        } catch (e) {
          return [];
        }
      }))()));
      const streams = [];
      results.forEach((r) => {
        if (Array.isArray(r)) r.forEach((s) => {
          if (s && s.url) streams.push(s);
        });
      });
      return streams;
    }
    return [];
  });
}
function extractFromPost(post, label, isTv, targetSeason, targetEpisode) {
  return __async(this, null, function* () {
    try {
      let contentHtml = post.html;
      let seasonLabel = "";
      if (isTv && targetSeason != null) {
        const filtered = extractSeasonFromContent(contentHtml, targetSeason);
        if (filtered) {
          contentHtml = filtered;
        }
        seasonLabel = " S" + targetSeason;
        if (targetEpisode) seasonLabel += "E" + targetEpisode;
      }
      const links = extractNexdriveLinks(contentHtml);
      const efficientLinks = capLinksForEfficiency(links);
      if (efficientLinks.length === 0) return [];
      const streams = [];
      const tasks = [];
      for (const link of efficientLinks) {
        const quality = link.quality || "HD";
        const displayLabel = label + seasonLabel + " [" + quality + "]";
        tasks.push(() => loadStreamsFromUrl(link.href, displayLabel, quality, baseUrl + "/", targetSeason, targetEpisode));
      }
      console.log(`[${PROVIDER_NAME}] Resolving ${tasks.length} nexdrive links for post...`);
      const results = yield Promise.all(tasks.map((fn) => (() => __async(null, null, function* () {
        try {
          return yield fn();
        } catch (e) {
          return [];
        }
      }))()));
      results.forEach((r) => {
        if (Array.isArray(r)) r.forEach((s) => {
          if (s && s.url) streams.push(s);
        });
      });
      return streams;
    } catch (e) {
      console.error("[" + PROVIDER_NAME + "] extractPost Fatal: " + e.message);
      return [];
    }
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      console.log(`[${PROVIDER_NAME}] Request: ID=${tmdbId} Type=${mediaType} S=${season} E=${episode}`);
      yield refreshDomains();
      const isTv = mediaType === "tv" || mediaType === "series";
      const media = yield getTMDBInfo(tmdbId, mediaType);
      let imdbId = media.imdbId;
      let mediaTitle = media.title;
      let mediaYear = media.year;
      if ((!imdbId || !imdbId.startsWith("tt")) && String(tmdbId).startsWith("tt")) {
        imdbId = String(tmdbId);
      }
      let searchResults = [];
      if (imdbId && imdbId.startsWith("tt")) {
        console.log(`[${PROVIDER_NAME}] Searching by exact IMDb ID: ${imdbId}`);
        searchResults = yield searchByTitle(imdbId, null);
      }
      if (searchResults.length === 0) {
        let query = mediaTitle;
        if (isTv && season != null) query += " season " + Number(season);
        else if (mediaYear) query += " " + mediaYear;
        console.log(`[${PROVIDER_NAME}] Falling back to title search: ${query}`);
        searchResults = yield searchByTitle(query, mediaYear);
        if (searchResults.length === 0 && isTv && season != null) {
          searchResults = yield searchByTitle(mediaTitle, mediaYear);
        }
      }
      if (searchResults.length === 0) return [];
      let bestMatch = null;
      const targetImdb = imdbId && imdbId.startsWith("tt") ? imdbId : null;
      for (const r of searchResults) {
        if (targetImdb && r.imdbId === targetImdb) {
          const sMatch = !isTv || !season || new RegExp("(?:s|season|staffel|saison)\\s*0*" + Number(season) + "\\b", "i").test(r.title);
          if (sMatch) {
            bestMatch = r;
            break;
          }
        }
        if (!bestMatch) {
          if (isStrictMatch(mediaTitle, mediaYear, r.title, r.year)) {
            bestMatch = r;
          }
        }
      }
      if (!bestMatch || !bestMatch.postId) {
        console.log(`[${PROVIDER_NAME}] No strict match found. Rejecting to prevent serving wrong media.`);
        return [];
      }
      console.log(`[${PROVIDER_NAME}] Matched: "${bestMatch.title}"`);
      const postData = yield fetchPostContent(bestMatch.postId, bestMatch.permalink);
      if (!postData) return [];
      const streams = yield extractFromPost(postData, mediaTitle, isTv, season != null ? Number(season) : null, episode != null ? Number(episode) : null);
      return dedupe(streams);
    } catch (e) {
      console.error("[" + PROVIDER_NAME + "] Fatal: " + e.message);
      return [];
    }
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
