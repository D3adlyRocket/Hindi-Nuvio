/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                      4KHDHub — Nuvio Stream Plugin                          ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Source     › https://4khdhub.dad                                           ║
 * ║  Author     › Sanchit  |  TG: @S4NCHITT                                     ║
 * ║  Project    › Murph's Streams                                                ║
 * ║  Manifest   › https://badboysxs-morpheus.hf.space/manifest.json             ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Supports   › Movies & Series (480p / 1080p / 2160p 4K / DV HDR)            ║
 * ║  Chain      › gadgetsweb.xyz → HubCloud → /bypass extractor API             ║
 * ║  Info       › Quality · codec · language · size from page badges            ║
 * ║  Parallel   › All cards resolved concurrently                               ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 /**
 * 4khdhub - Built from src/4khdhub/
 * Generated: 2025-12-31T21:33:16.718Z
 */
"use strict";
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

// src/4khdhub/constants.js
var BASE_URL = "https://4khdhub.dad";
var TMDB_API_KEY = "1c29a5198ee1854bd5eb45dbe8d17d92";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
var DOMAINS_URL = "https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json";

// src/4khdhub/utils.js
var domainCache = { url: BASE_URL, ts: 0 };
function fetchLatestDomain() {
  return __async(this, null, function* () {
    const now = Date.now();
    if (now - domainCache.ts < 36e5) return domainCache.url;
    try {
      const response = yield fetch(DOMAINS_URL);
      const data = yield response.json();
      if (data && data["4khdhub"]) {
        domainCache.url = data["4khdhub"];
        domainCache.ts = now;
      }
    } catch (e) {}
    return domainCache.url;
  });
}

// src/4khdhub/http.js
function fetchText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    try {
      const response = yield fetch(url, {
        headers: __spreadValues({
          "User-Agent": USER_AGENT
        }, options.headers)
      });
      return yield response.text();
    } catch (err) {
      console.log(`[4KHDHub] Request failed for ${url}: ${err.message}`);
      return null;
    }
  });
}

// src/4khdhub/tmdb.js
function getTmdbDetails(tmdbId, type) {
  return __async(this, null, function* () {
    const isSeries = type === "series" || type === "tv";
    const endpoint = isSeries ? "tv" : "movie";
    const url = `https://api.themoviedb.org/3/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    console.log(`[4KHDHub] Fetching TMDB details from: ${url}`);
    try {
      const response = yield fetch(url);
      const data = yield response.json();
      if (isSeries) {
        return {
          title: data.name,
          year: data.first_air_date ? parseInt(data.first_air_date.split("-")[0]) : 0
        };
      } else {
        return {
          title: data.title,
          year: data.release_date ? parseInt(data.release_date.split("-")[0]) : 0
        };
      }
    } catch (error) {
      console.log(`[4KHDHub] TMDB request failed: ${error.message}`);
      return null;
    }
  });
}

// src/4khdhub/utils.js
function atob(input) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let str = String(input).replace(/=+$/, "");
  if (str.length % 4 === 1) {
    throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
  }
  let output = "";
  for (let bc = 0, bs, buffer, i = 0; buffer = str.charAt(i++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
    buffer = chars.indexOf(buffer);
  }
  return output;
}
function rot13Cipher(str) {
  return str.replace(/[a-zA-Z]/g, function(c) {
    return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
  });
}
function levenshteinDistance(s, t) {
  if (s === t)
    return 0;
  const n = s.length;
  const m = t.length;
  if (n === 0)
    return m;
  if (m === 0)
    return n;
  const d = [];
  for (let i = 0; i <= n; i++) {
    d[i] = [];
    d[i][0] = i;
  }
  for (let j = 0; j <= m; j++) {
    d[0][j] = j;
  }
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = s.charAt(i - 1) === t.charAt(j - 1) ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  return d[n][m];
}
function parseBytes(val) {
  if (typeof val === "number")
    return val;
  if (!val)
    return 0;
  const match = val.match(/^([0-9.]+)\s*([a-zA-Z]+)$/);
  if (!match)
    return 0;
  const num = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  let multiplier = 1;
  if (unit.indexOf("k") === 0)
    multiplier = 1024;
  else if (unit.indexOf("m") === 0)
    multiplier = 1024 * 1024;
  else if (unit.indexOf("g") === 0)
    multiplier = 1024 * 1024 * 1024;
  else if (unit.indexOf("t") === 0)
    multiplier = 1024 * 1024 * 1024 * 1024;
  return num * multiplier;
}
function formatBytes(val) {
  if (val === 0)
    return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  let i = Math.floor(Math.log(val) / Math.log(k));
  if (i < 0)
    i = 0;
  return parseFloat((val / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// src/4khdhub/parsers.js — ported from 4khdhub.js
function extractQuality(text) {
  var t = (text || "").toUpperCase();
  if (/\b(2160P|4K)\b/.test(t)) return "4K";
  if (/\b1080P\b/.test(t)) return "1080p";
  if (/\b720P\b/.test(t)) return "720p";
  if (/\b480P\b/.test(t)) return "480p";
  return "HD";
}

function extractCodec(text) {
  var t = text || "";
  if (/DV[\s.]?HDR[\s.]?H[\s.]?265/i.test(t)) return "DV HDR H265";
  if (/HDR[\s.-]DV[\s.]?H[\s.]?265/i.test(t)) return "HDR DV H265";
  if (/DV[\s.]?HDR/i.test(t)) return "DV HDR";
  if (/HDR[\s.-]DV/i.test(t)) return "HDR DV";
  if (/\bHDR\b/i.test(t)) return "HDR";
  if (/H[\s.]?265|HEVC/i.test(t)) return "H.265";
  if (/H[\s.]?264|x264/i.test(t)) return "H.264";
  if (/\bAV1\b/i.test(t)) return "AV1";
  return null;
}

function extractAudio(text) {
  var t = text || "";
  if (/DDP5\.1.*Atmos|Atmos.*DDP/i.test(t)) return "DDP5.1 Atmos";
  if (/DDP5\.1/i.test(t)) return "DDP5.1";
  if (/AAC5\.1/i.test(t)) return "AAC5.1";
  if (/TrueHD.*Atmos|Atmos.*TrueHD/i.test(t)) return "TrueHD Atmos";
  if (/\bTrueHD\b/i.test(t)) return "TrueHD";
  if (/\bAtmos\b/i.test(t)) return "Atmos";
  if (/\bDDP\b/i.test(t)) return "DDP";
  if (/\bAAC\b/i.test(t)) return "AAC";
  return null;
}

function extractLanguages(text) {
  var t = text || "";
  var langs = [];
  var LANG_MAP = [
    ["Hindi",      /\bHindi\b/i],
    ["English",    /\bEnglish\b/i],
    ["Tamil",      /\bTamil\b/i],
    ["Telugu",     /\bTelugu\b/i],
    ["Malayalam",  /\bMalayalam\b/i],
    ["Kannada",    /\bKannada\b/i],
    ["Bengali",    /\bBengali\b/i],
    ["Punjabi",    /\bPunjabi\b/i],
    ["Korean",     /\bKorean\b/i],
    ["Japanese",   /\bJapanese\b/i],
    ["Chinese",    /\bChinese\b/i],
    ["Spanish",    /\bSpanish\b/i],
    ["French",     /\bFrench\b/i],
    ["German",     /\bGerman\b/i],
    ["Arabic",     /\bArabic\b/i],
    ["Russian",    /\bRussian\b/i],
    ["Turkish",    /\bTurkish\b/i],
    ["Portuguese", /\bPortuguese\b/i],
  ];
  LANG_MAP.forEach(function(pair) {
    if (pair[1].test(t)) langs.push(pair[0]);
  });
  if (/\bMulti\b/i.test(t) && !langs.length) langs.push("Multi-Audio");
  return langs;
}

function parseCardInfo(cheerioInstance, el) {
  var $ = cheerioInstance;
  var header     = $(el).find(".download-header").first();
  var headerText = header.find(".flex-1").clone().children("code").remove().end().text().trim();
  var fileTitle  = $(el).find(".file-title, .episode-file-title").text().trim();

  var badgeText = "";
  header.find("code .badge, code span").each(function(_, b) {
    badgeText += " " + $(b).text().trim();
  });

  var corpus  = headerText + " " + fileTitle + " " + badgeText;
  var codec   = extractCodec(fileTitle + " " + headerText);
  var audio   = extractAudio(fileTitle);
  var langs   = extractLanguages(badgeText + " " + headerText);

  var srcMatch = corpus.match(/\b(WEB[\s-]?DL|WEBRip|BluRay|BRRip|HDCAM|NF|AMZN|DSNP)\b/i);
  var SOURCE_LABELS = { 'bluray': 'BluRay', 'brrip': 'BRRip', 'webrip': 'WEBRip', 'web-dl': 'WEB-DL', 'webdl': 'WEB-DL', 'hdcam': 'HDCAM', 'nf': 'NF', 'amzn': 'AMZN', 'dsnp': 'DSNP' };
  var source   = srcMatch ? (SOURCE_LABELS[srcMatch[1].toLowerCase().replace(/\s/g, '')] || srcMatch[1].toUpperCase()) : null;

  return { codec, audio, languages: langs, source };
}

// src/4khdhub/search.js
var cheerio = require("cheerio-without-node-native");
function fetchPageUrl(name, year, isSeries) {
  return __async(this, null, function* () {
    const domain = yield fetchLatestDomain();
    const searchUrl = `${domain}/?s=${encodeURIComponent(name + " " + year)}`;
    console.log(`[4KHDHub] Search Request URL: ${searchUrl}`);
    const html = yield fetchText(searchUrl);
    if (!html) {
      console.log("[4KHDHub] Search failed: No HTML response");
      return null;
    }
    const $ = cheerio.load(html);
    const targetType = isSeries ? "Series" : "Movies";
    console.log(`[4KHDHub] Parsing search results for type: ${targetType}`);
    const matchingCards = $(".movie-card").filter((_, el) => {
      const hasFormat = $(el).find(`.movie-card-format:contains("${targetType}")`).length > 0;
      if (!hasFormat) {
      }
      return hasFormat;
    }).filter((_, el) => {
      const metaText = $(el).find(".movie-card-meta").text();
      const movieCardYear = parseInt(metaText);
      const yearMatch = !isNaN(movieCardYear) && Math.abs(movieCardYear - year) <= 1;
      if (!yearMatch) {
        console.log(`[4KHDHub] Skip: Year mismatch (${movieCardYear} vs ${year}) - ${$(el).find(".movie-card-title").text().trim()}`);
      }
      return yearMatch;
    }).filter((_, el) => {
      const movieCardTitle = $(el).find(".movie-card-title").text().replace(/\[.*?]/g, "").trim();
      const distance = levenshteinDistance(movieCardTitle.toLowerCase(), name.toLowerCase());
      const match = distance < 5;
      console.log(`[4KHDHub] Checking: "${movieCardTitle}" (Dist: ${distance}) vs "${name}"`);
      return match;
    }).map((_, el) => {
      let href = $(el).attr("href");
      if (href && !href.startsWith("http")) {
        href = domain + (href.startsWith("/") ? "" : "/") + href;
      }
      return href;
    }).get();
    if (matchingCards.length === 0) {
      console.log("[4KHDHub] No matching cards found after filtering");
    } else {
      console.log(`[4KHDHub] Found ${matchingCards.length} matching cards`);
    }
    return matchingCards.length > 0 ? matchingCards[0] : null;
  });
}

// src/4khdhub/extractor.js
var cheerio2 = require("cheerio-without-node-native");
function resolveRedirectUrl(redirectUrl) {
  return __async(this, null, function* () {
    const redirectHtml = yield fetchText(redirectUrl);
    if (!redirectHtml)
      return null;
    try {
      const redirectDataMatch = redirectHtml.match(/'o','(.*?)'/);
      if (!redirectDataMatch)
        return null;
      const step1 = atob(redirectDataMatch[1]);
      const step2 = atob(step1);
      const step3 = rot13Cipher(step2);
      const step4 = atob(step3);
      const redirectData = JSON.parse(step4);
      if (redirectData && redirectData.o) {
        return atob(redirectData.o);
      }
    } catch (e) {
      console.log(`[4KHDHub] Error resolving redirect: ${e.message}`);
    }
    return null;
  });
}
function extractSourceResults($, el) {
  return __async(this, null, function* () {
    const localHtml = $(el).html();
    const sizeMatch = localHtml.match(/([\d.]+ ?[GM]B)/);
    const heightMatch = localHtml.match(/\d{3,}p/);
    const title = $(el).find(".file-title, .episode-file-title").text().trim();
    let height = heightMatch ? parseInt(heightMatch[0]) : 0;
    if (height === 0 && (title.includes("4K") || title.includes("4k") || localHtml.includes("4K") || localHtml.includes("4k"))) {
      height = 2160;
    }
    const meta = {
      bytes: sizeMatch ? parseBytes(sizeMatch[1]) : 0,
      height,
      title
    };
    const hubCloudLink = $(el).find("a").filter((_, a) => $(a).text().includes("HubCloud")).attr("href");
    if (hubCloudLink) {
      const resolved = yield resolveRedirectUrl(hubCloudLink);
      return { url: resolved, meta };
    }
    const hubDriveLink = $(el).find("a").filter((_, a) => $(a).text().includes("HubDrive")).attr("href");
    if (hubDriveLink) {
      const resolvedDrive = yield resolveRedirectUrl(hubDriveLink);
      if (resolvedDrive) {
        const hubDriveHtml = yield fetchText(resolvedDrive);
        if (hubDriveHtml) {
          const $2 = cheerio2.load(hubDriveHtml);
          const innerCloudLink = $2('a:contains("HubCloud")').attr("href");
          if (innerCloudLink) {
            return { url: innerCloudLink, meta };
          }
        }
      }
    }
    return null;
  });
}
function extractHubCloud(hubCloudUrl, baseMeta) {
  return __async(this, null, function* () {
    if (!hubCloudUrl)
      return [];
    const redirectHtml = yield fetchText(hubCloudUrl, { headers: { Referer: hubCloudUrl } });
    if (!redirectHtml)
      return [];
    const redirectUrlMatch = redirectHtml.match(/var url ?= ?'(.*?)'/);
    if (!redirectUrlMatch)
      return [];
    const finalLinksUrl = redirectUrlMatch[1];
    const linksHtml = yield fetchText(finalLinksUrl, { headers: { Referer: hubCloudUrl } });
    if (!linksHtml)
      return [];
    const $ = cheerio2.load(linksHtml);
    const results = [];
    const sizeText = $("#size").text();
    const titleText = $("title").text().trim();
    const currentMeta = __spreadProps(__spreadValues({}, baseMeta), {
      bytes: parseBytes(sizeText) || baseMeta.bytes,
      title: ""
    });
    $("a").each((_, el) => {
      const text = $(el).text();
      const href = $(el).attr("href");
      if (!href)
        return;
      if (text.includes("FSL") || text.includes("Download File")) {
        results.push({
          source: "FSL",
          url: href,
          meta: currentMeta
        });
      } else if (text.includes("PixelServer")) {
        const pixelUrl = href.replace("/u/", "/api/file/");
        results.push({
          source: "PixelServer",
          url: pixelUrl,
          meta: currentMeta
        });
      }
    });
    return results;
  });
}

// src/4khdhub/index.js
var cheerio3 = require("cheerio-without-node-native");
function getStreams(tmdbId, type, season, episode) {
  return __async(this, null, function* () {
    const tmdbDetails = yield getTmdbDetails(tmdbId, type);
    if (!tmdbDetails)
      return [];
    const { title, year } = tmdbDetails;
    console.log(`[4KHDHub] Search: ${title} (${year})`);
    const isSeries = type === "series" || type === "tv";
    const pageUrl = yield fetchPageUrl(title, year, isSeries);
    if (!pageUrl) {
      console.log("[4KHDHub] Page not found");
      return [];
    }
    console.log(`[4KHDHub] Found page: ${pageUrl}`);
    const html = yield fetchText(pageUrl);
    if (!html)
      return [];
    const $ = cheerio3.load(html);
    const itemsToProcess = [];
    if (isSeries && season && episode) {
      const seasonStr = "S" + String(season).padStart(2, "0");
      const episodeStr = "Episode-" + String(episode).padStart(2, "0");
      $(".episode-item").each((_, el) => {
        if ($(".episode-title", el).text().includes(seasonStr)) {
          const downloadItems = $(".episode-download-item", el).filter((_2, item) => $(item).text().includes(episodeStr));
          downloadItems.each((_2, item) => {
            itemsToProcess.push(item);
          });
        }
      });
    } else {
      $(".download-item").each((_, el) => {
        itemsToProcess.push(el);
      });
    }
    console.log(`[4KHDHub] Processing ${itemsToProcess.length} items`);
    const streamPromises = itemsToProcess.map((item) => __async(this, null, function* () {
      try {
        const sourceResult = yield extractSourceResults($, item);
        if (sourceResult && sourceResult.url) {
          console.log(`[4KHDHub] Extracting from HubCloud: ${sourceResult.url}`);
          const cardInfo = parseCardInfo($, item);
          const extractedLinks = yield extractHubCloud(sourceResult.url, sourceResult.meta);
          return extractedLinks.map((link) => {
            // Line 1: title · S01E03 (for TV) + quality
            let titleLine = title;
            if (isSeries && season && episode) {
              titleLine += ` \u00B7 S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
            }
            if (sourceResult.meta.height) titleLine += ` ${sourceResult.meta.height}p`;
            const lines = [titleLine];

            // Line 3: source · codec
            const techParts = [];
            if (cardInfo.source) techParts.push(cardInfo.source);
            if (cardInfo.codec)  techParts.push(cardInfo.codec);
            if (techParts.length) lines.push("\uD83D\uDCFA " + techParts.join(" \u00B7 "));

            // Line 4: languages
            if (cardInfo.languages && cardInfo.languages.length) {
              lines.push("\uD83D\uDD0A " + cardInfo.languages.join(" + "));
            }

            // Line 5: audio (no space after emoji)
            if (cardInfo.audio) lines.push("\uD83C\uDFB5" + cardInfo.audio);

            return {
              name: `4KHDHub - ${link.source}${sourceResult.meta.height ? ` ${sourceResult.meta.height}p` : ""}`,
              title: lines.join("\n"),
              url: link.url,
              quality: sourceResult.meta.height ? `${sourceResult.meta.height}p` : void 0,
              size: formatBytes(link.meta.bytes || 0),
              behaviorHints: {
                bingeGroup: `4khdhub-${link.source}`
              }
            };
          });
        }
        return [];
      } catch (err) {
        console.log(`[4KHDHub] Item processing error: ${err.message}`);
        return [];
      }
    }));
    const results = yield Promise.all(streamPromises);
    return results.reduce((acc, val) => acc.concat(val), []);
  });
}
module.exports = { getStreams };
  
