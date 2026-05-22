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

// src/moviesdrive/index.js
var cheerio = require("cheerio-without-node-native");
var PROVIDER = "MoviesDrive";
var MAIN_URL = "https://new2.moviesdrives.my";
var TMDB_KEY = "439c478a771f35c05022f9feabcca01c";
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
var BASE_HEADERS = {
  "User-Agent": UA,
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5"
};
function log(msg) {
  console.log("[" + PROVIDER + "] " + msg);
}
function err(msg) {
  console.error("[" + PROVIDER + "] " + msg);
}
function get(url, opts, timeout) {
  return __async(this, null, function* () {
    timeout = timeout || 12e3;
    try {
      var sig = null;
      if (typeof AbortSignal !== "undefined" && AbortSignal.timeout)
        sig = AbortSignal.timeout(timeout);
      var hdrs = {};
      for (var k in BASE_HEADERS) hdrs[k] = BASE_HEADERS[k];
      if (opts && opts.headers) {
        for (var k2 in opts.headers) hdrs[k2] = opts.headers[k2];
      }
      var merged = __spreadProps(__spreadValues({}, opts || {}), { headers: hdrs });
      if (sig) merged.signal = sig;
      return yield fetch(url, merged);
    } catch (e) {
      err("fetch: " + url.substring(0, 80) + " -> " + (e.message || e.name || "unknown"));
      return null;
    }
  });
}
function getText(url, opts, timeout) {
  return __async(this, null, function* () {
    var r = yield get(url, opts, timeout);
    if (!r) {
      err("text: null response for " + url.substring(0, 80));
      return null;
    }
    if (!r.ok) {
      err("text: status " + r.status + " for " + url.substring(0, 80));
      return null;
    }
    return yield r.text();
  });
}
function getJson(url, opts, timeout) {
  return __async(this, null, function* () {
    var t = yield getText(url, opts, timeout);
    if (!t) return null;
    try {
      return JSON.parse(t);
    } catch (e) {
      return null;
    }
  });
}
function getHtml(url, opts, timeout) {
  return __async(this, null, function* () {
    var t = yield getText(url, opts, timeout);
    if (!t) {
      err("html: no text for " + url.substring(0, 80));
      return null;
    }
    return cheerio.load(t);
  });
}
function parseQ(t) {
  t = (t || "").toUpperCase();
  if (t.indexOf("2160") >= 0 || t.indexOf("4K") >= 0) return "2160p";
  if (t.indexOf("1080") >= 0) return "1080p";
  if (t.indexOf("720") >= 0) return "720p";
  if (t.indexOf("480") >= 0) return "480p";
  return "HD";
}
function dedupe(arr) {
  var seen = {};
  return (arr || []).filter(function(s) {
    if (!s || !s.url || seen[s.url]) return false;
    seen[s.url] = true;
    return true;
  });
}
function makeStream(name, label, url, quality, hdrs) {
  return {
    name: PROVIDER + " | " + name,
    title: label,
    url,
    quality,
    behaviorHints: {
      notWebReady: true,
      proxyHeaders: {
        request: hdrs || {}
      }
    }
  };
}
function getMedia(id, type) {
  return __async(this, null, function* () {
    var s = String(id || "").trim();
    var isImdb = s.indexOf("tt") === 0;
    var t = type === "tv" || type === "series" ? "tv" : "movie";
    try {
      if (isImdb) {
        var data = yield getJson("https://api.themoviedb.org/3/find/" + s + "?api_key=" + TMDB_KEY + "&external_source=imdb_id", {}, 1e4);
        var list = data ? t === "tv" ? data.tv_results : data.movie_results : null;
        if (list && list.length > 0) {
          var it = list[0];
          return {
            title: t === "tv" ? it.name : it.title,
            year: (it.first_air_date || it.release_date || "").split("-")[0],
            imdb: s
          };
        }
      } else {
        var data = yield getJson("https://api.themoviedb.org/3/" + t + "/" + s + "?api_key=" + TMDB_KEY + "&append_to_response=external_ids", {}, 1e4);
        if (data) {
          return {
            title: t === "tv" ? data.name : data.title,
            year: (data.first_air_date || data.release_date || "").split("-")[0],
            imdb: data.imdb_id || data.external_ids && data.external_ids.imdb_id || null
          };
        }
      }
    } catch (e) {
      err("tmdb: " + e.message);
    }
    return { title: s, year: null, imdb: null };
  });
}
function searchSite(query) {
  return __async(this, null, function* () {
    var q = encodeURIComponent(query);
    var url = MAIN_URL + "/search.php?q=" + q + "&per_page=10";
    var data = yield getJson(url, {
      headers: { "Referer": MAIN_URL + "/" }
    }, 1e4);
    if (!data || !data.hits || data.hits.length === 0) {
      log("search zero results for '" + query + "'");
      return [];
    }
    var out = [];
    for (var i = 0; i < data.hits.length; i++) {
      var doc = data.hits[i].document;
      if (doc && doc.permalink && doc.post_title) {
        var ym = doc.post_title.match(/\((\d{4})\)/);
        out.push({
          title: doc.post_title,
          href: doc.permalink,
          year: ym ? parseInt(ym[0]) : null,
          imdb: doc.imdb_id || null
        });
      }
    }
    log("search found " + out.length + " results for '" + query + "'");
    return out;
  });
}
function parsePage(url, season) {
  return __async(this, null, function* () {
    log("parsing page: " + url);
    var $ = yield getHtml(url, { headers: { "Referer": MAIN_URL + "/" } }, 12e3);
    if (!$) return [];
    var links = [];
    var isTv = season != null;
    if (isTv) {
      var inSeason = false;
      $("h5").each(function(i, el) {
        var txt = $(el).text();
        var sm = txt.match(/Season\s+(\d+)/i);
        if (sm) {
          inSeason = parseInt(sm[1]) === season;
          return;
        }
        if (inSeason) {
          $(el).find('a[href*="mdrive.lol/archive/"]').each(function() {
            var href = $(this).attr("href");
            var label = $(this).text().trim();
            if (!href || label.toLowerCase().indexOf("zip") >= 0) return;
            var mid2 = href.match(/archive\/(\d+)/);
            if (mid2) links.push({ id: mid2[1], url: href, label, q: parseQ(label) });
          });
        }
      });
    }
    if (links.length === 0) {
      $('a[href*="mdrive.lol/archive/"], a[href*="mdrive.lol/"]').each(function(i, el) {
        var href = $(el).attr("href");
        var label = $(el).text().trim() || "HD";
        if (label.toLowerCase().indexOf("zip") >= 0 && isTv) return;
        var mid2 = href.match(/archive\/(\d+)/);
        if (mid2) links.push({ id: mid2[1], url: href, label, q: parseQ(label) });
      });
    }
    if (links.length === 0) {
      var bodyHtml = $.html();
      var bodyMatches = bodyHtml.match(/https?:\/\/mdrive\.lol\/archive\/(\d+)/g);
      if (bodyMatches) {
        var seen = {};
        for (var bi = 0; bi < bodyMatches.length; bi++) {
          var murl = bodyMatches[bi];
          if (seen[murl]) continue;
          seen[murl] = true;
          var mid = murl.match(/archive\/(\d+)/);
          if (mid) {
            var lbl = "Archive " + mid[1];
            links.push({ id: mid[1], url: murl, label: lbl, q: "HD" });
          }
        }
      }
    }
    if (links.length === 0) {
      var srLinks = [];
      $("a").each(function(i, el) {
        var href = $(el).attr("href");
        if (!href) return;
        if (href.indexOf("search-recover.php") >= 0) {
          var dup = false;
          for (var di = 0; di < srLinks.length; di++) {
            if (srLinks[di].url === href) {
              dup = true;
              break;
            }
          }
          if (!dup) {
            var txt = $(el).text().trim() || "HD";
            srLinks.push({ url: href, label: txt });
          }
        }
      });
      if (srLinks.length > 0) {
        log("page: found " + srLinks.length + " search-recover links, resolving...");
        var sTasks = [];
        for (var si = 0; si < srLinks.length; si++) {
          sTasks.push(resolveSearchRecover(srLinks[si].url, srLinks[si].label));
        }
        var sResults = yield Promise.all(sTasks);
        for (var si = 0; si < sResults.length; si++) {
          if (sResults[si]) {
            links.push({
              url: sResults[si].url,
              label: sResults[si].label || "search-recover",
              q: sResults[si].q || parseQ(sResults[si].label || ""),
              type: "direct"
              // skip parseArchive, go straight to resolveHubcloud
            });
          }
        }
        log("page: resolved " + links.length + " drive links from search-recover");
      }
    }
    log("page: found " + links.length + " archive links");
    return links;
  });
}
function resolveSearchRecover(srUrl, label) {
  return __async(this, null, function* () {
    try {
      srUrl = srUrl.replace(/&amp;/g, "&");
      var fromAc = null;
      var fa = srUrl.match(/[?&]from_ac=([a-zA-Z0-9_\-]+)/);
      if (fa) fromAc = fa[1];
      var qParam = null;
      var qm = srUrl.match(/[?&]q=([^&]+)/);
      if (qm) qParam = qm[1];
      if (!fromAc || !qParam) {
        log("search-recover: missing from_ac or q");
        return null;
      }
      var decodedQ = qParam;
      try {
        var padded = qParam;
        var m = padded.length % 4;
        if (m === 2) padded += "==";
        else if (m === 3) padded += "=";
        decodedQ = atob(padded);
      } catch (e) {
      }
      var baseUrl = srUrl.split("?")[0];
      var apiUrl = baseUrl + "?api=search&q=" + encodeURIComponent(decodedQ) + "&page=1&from_ac=" + encodeURIComponent(fromAc);
      log("search-recover: api call for '" + decodedQ + "'");
      var res = yield getText(apiUrl, {
        headers: {
          "Accept": "application/json",
          "Referer": srUrl,
          "User-Agent": UA
        }
      }, 12e3);
      if (!res) {
        log("search-recover: no response");
        return null;
      }
      var results = null;
      try {
        var parsed = JSON.parse(res);
        if (Array.isArray(parsed)) results = parsed;
        else if (parsed.data && Array.isArray(parsed.data)) results = parsed.data;
        else if (parsed.results && Array.isArray(parsed.results)) results = parsed.results;
        else if (parsed.hits) results = parsed.hits;
      } catch (e) {
        log("search-recover: json parse failed, trying raw url");
        var res2 = yield getText(srUrl, {
          headers: {
            "Accept": "application/json",
            "Referer": srUrl,
            "User-Agent": UA
          }
        }, 12e3);
        if (res2) {
          try {
            var parsed2 = JSON.parse(res2);
            if (Array.isArray(parsed2)) results = parsed2;
            else if (parsed2.data && Array.isArray(parsed2.data)) results = parsed2.data;
            else if (parsed2.results && Array.isArray(parsed2.results)) results = parsed2.results;
          } catch (e2) {
          }
        }
      }
      if (!results || results.length === 0) {
        log("search-recover: no results");
        return null;
      }
      for (var ri = 0; ri < results.length; ri++) {
        var doc = results[ri].document || results[ri];
        var driveUrl = doc.url || doc.link || doc.drive;
        if (driveUrl && driveUrl.indexOf("/drive/") >= 0) {
          log("search-recover: resolved to " + driveUrl.substring(0, 50));
          var q = parseQ(label || "");
          return { url: driveUrl, label, q: q || "HD" };
        }
      }
      log("search-recover: no drive url in results");
      return null;
    } catch (e) {
      err("search-recover: " + e.message);
      return null;
    }
  });
}
function parseArchive(url, episode) {
  return __async(this, null, function* () {
    log("archive: " + url);
    var $ = yield getHtml(url, { headers: { "Referer": MAIN_URL + "/" } }, 12e3);
    if (!$) {
      err("archive: html null for " + url.substring(0, 60));
      return [];
    }
    var htmlLen = ($.html() || "").length;
    log("archive: html length=" + htmlLen);
    var hosts = [];
    var isEp = episode != null;
    var totalLinks = 0;
    $("a").each(function(i, el) {
      totalLinks++;
      var h = $(el).attr("href");
      if (!h) return;
      if (isEp) {
        var blockText = $(el).parent().parent().text() || "";
        if (!blockText) blockText = $(el).parent().text() || "";
        var epMatch = blockText.match(/(?:EP|Episode|E)[^a-zA-Z0-9]*0*(\d+)/i);
        if (epMatch) {
          var epNum = parseInt(epMatch[1]);
          if (epNum !== episode) {
            log("Skipping wrong episode link: " + epNum + " (wanted " + episode + ")");
            return;
          }
        }
      }
      if (isHostLink(h)) extractHostLink(h, hosts);
    });
    log("archive: scanned " + totalLinks + " <a> tags, found " + hosts.length + " hoster links");
    if (hosts.length === 0 && htmlLen > 200) {
      log("archive: scanning raw HTML for hubcloud/gdflix patterns");
      var raw = $.html() || "";
      var hcMatches = raw.match(/https?:\/\/hubcloud\.[a-z]+\/drive\/[a-z0-9]+/g);
      if (hcMatches) {
        for (var hi = 0; hi < hcMatches.length; hi++) {
          var u = hcMatches[hi];
          var dup = false;
          for (var di = 0; di < hosts.length; di++) {
            if (hosts[di].url === u) {
              dup = true;
              break;
            }
          }
          if (!dup) {
            var idm = u.match(/drive\/([a-z0-9]+)/);
            if (idm) hosts.push({ type: "hubcloud", url: u, id: idm[1] });
          }
        }
      }
      var gfMatches = raw.match(/https?:\/\/gdflix\.[a-z]+\/file\/[a-zA-Z0-9]+/g);
      if (gfMatches) {
        for (var gi = 0; gi < gfMatches.length; gi++) {
          var u = gfMatches[gi];
          var dup = false;
          for (var di = 0; di < hosts.length; di++) {
            if (hosts[di].url === u) {
              dup = true;
              break;
            }
          }
          if (!dup) {
            var idm = u.match(/file\/([a-zA-Z0-9]+)/);
            if (idm) hosts.push({ type: "gdflix", url: u, id: idm[1] });
          }
        }
      }
    }
    log("archive: returning " + hosts.length + " hosts");
    return hosts;
  });
}
function isHostLink(href) {
  if (!href) return false;
  return href.indexOf("hubcloud.") >= 0 || href.indexOf("gdflix.") >= 0;
}
function extractHostLink(href, arr) {
  if (!href || !arr) return;
  var hm = href.match(/(?:hubcloud\.[a-z]+\/drive\/([a-z0-9]+))/i);
  if (hm) {
    for (var di = 0; di < arr.length; di++) {
      if (arr[di].url === href) return;
    }
    arr.push({ type: "hubcloud", url: href, id: hm[1] });
    return;
  }
  var gm = href.match(/(?:gdflix\.[a-z]+\/file\/([a-zA-Z0-9]+))/i);
  if (gm) {
    for (var di = 0; di < arr.length; di++) {
      if (arr[di].url === href) return;
    }
    arr.push({ type: "gdflix", url: href, id: gm[1] });
    return;
  }
}
function minutes() {
  var d = /* @__PURE__ */ new Date();
  return String(d.getMinutes());
}
function resolveHubcloud(url, label) {
  return __async(this, null, function* () {
    try {
      log("hubcloud: " + url.substring(0, 60));
      var html = yield getText(url, {
        headers: {
          "Referer": "https://hubcloud.foo/",
          "Cookie": "xla=s4t"
        }
      }, 12e3);
      if (!html) return [];
      var bridgeUrl = null;
      var vm = html.match(/var\s+url\s*=\s*'([^']+)'/);
      if (vm) bridgeUrl = vm[1];
      if (!bridgeUrl) {
        var hm = html.match(/<a[^>]*id=["']download["'][^>]*href=["']([^"']+)["']/);
        if (hm) bridgeUrl = hm[1];
      }
      if (!bridgeUrl) {
        log("hubcloud: no bridge url found");
        return [];
      }
      log("hubcloud: bridge=" + bridgeUrl.substring(0, 60));
      var bridgeHtml = yield getText(bridgeUrl, {
        headers: {
          "Referer": url,
          "Cookie": "xla=s4t"
        }
      }, 15e3);
      if (!bridgeHtml) return [];
      var fslUrl = null;
      var tm = bridgeHtml.match(/https?:\/\/[^\s"'<>]+\?token=\d+/);
      if (tm) {
        var mUrl = tm[0].replace(/["'].*$/, "").replace(/[<>].*$/, "");
        if (mUrl.indexOf("hubcloud.php") === -1) {
          fslUrl = mUrl + "1" + minutes();
        }
      }
      if (!fslUrl) {
        var r2m = bridgeHtml.match(/https?:\/\/pub-[a-zA-Z0-9\-]+\.r2\.dev[^\s"'<>]*/);
        if (r2m) {
          fslUrl = r2m[0].replace(/["'].*$/, "").replace(/[<>].*$/, "");
        }
      }
      var streams = [];
      if (fslUrl) {
        var q = parseQ(label);
        log("hubcloud: fsl found (" + q + ")");
        streams.push(makeStream("FSL | " + q, label + " [FSL]", fslUrl, q, {
          "Referer": "https://gamerxyt.com/",
          "Origin": "https://gamerxyt.com/",
          "User-Agent": UA
        }));
      }
      log("hubcloud: returning " + streams.length + " streams");
      return streams;
      log("hubcloud: returning " + streams.length + " streams");
      return streams;
    } catch (e) {
      err("hubcloud: " + e.message);
      return [];
    }
  });
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      let pad22 = function(n) {
        return n != null && n < 10 ? "0" + n : String(n);
      };
      var pad2 = pad22;
      log("request: id=" + tmdbId + " type=" + mediaType + " s=" + season + " e=" + episode);
      var info = yield getMedia(tmdbId, mediaType);
      if (!info || !info.title) {
        log("no media info resolved, returning []");
        return [];
      }
      var isTv = mediaType === "tv" || mediaType === "series";
      log('resolved: "' + info.title + '" (' + (info.year || "?") + ")");
      var safeSeason = season != null ? Number(season) : null;
      var safeEpisode = episode != null ? Number(episode) : null;
      var best = null;
      if (info.imdb) {
        log("searching by imdb id: " + info.imdb);
        var results = yield searchSite(info.imdb);
        if (results.length > 0) {
          best = results[0];
          log("imdb exact match: " + best.title + " (id=" + info.imdb + ")");
        }
      }
      if (!best) {
        log("searching by title: " + info.title);
        var results = yield searchSite(info.title);
        if (results.length > 0) {
          best = results[0];
          log("title match fallback: " + best.title);
        }
      }
      if (!best) {
        log("no match found, returning []");
        return [];
      }
      var pageUrl = MAIN_URL + best.href;
      var archLinks = yield parsePage(pageUrl, safeSeason);
      if (archLinks.length === 0) {
        log("no archive links found on page, returning []");
        return [];
      }
      archLinks = archLinks.filter(function(al) {
        return al.q === "720p" || al.q === "1080p" || al.q === "2160p";
      });
      if (archLinks.length === 0) {
        log("no 720p/1080p/2160p links found, returning []");
        return [];
      }
      log("keeping " + archLinks.length + " archive links (720p/1080p/2160p only)");
      var epLabel = isTv ? " S" + pad22(safeSeason) + " E" + pad22(safeEpisode) : "";
      var allStreams = [];
      archLinks.forEach(function(al) {
        var task = function() {
          return __async(this, null, function* () {
            try {
              var hcHosts = [];
              var gfHosts = [];
              if (al.type === "direct") {
                hcHosts.push({ url: al.url, type: "hubcloud" });
              } else {
                var hosts = yield parseArchive(al.url, safeEpisode);
                hcHosts = hosts.filter(function(h) {
                  return h.type === "hubcloud";
                });
              }
              if (hcHosts.length === 0) return [];
              var fullTitle = info.title + epLabel + " " + al.q;
              var hcTasks = hcHosts.map(function(h) {
                return resolveHubcloud(h.url, fullTitle);
              });
              var hcResults = yield Promise.all(hcTasks);
              var allStreamsOut = [];
              hcResults.forEach(function(arr) {
                arr.forEach(function(s) {
                  allStreamsOut.push(s);
                });
              });
              return allStreamsOut;
            } catch (e) {
              return [];
            }
          });
        };
        allStreams.push(task());
      });
      var resolved = yield Promise.all(allStreams);
      var flat = [];
      resolved.forEach(function(arr) {
        arr.forEach(function(s) {
          flat.push(s);
        });
      });
      var finalStreams = dedupe(flat);
      log("returning " + finalStreams.length + " streams");
      return finalStreams;
    } catch (e) {
      err("fatal: " + e.message);
      return [];
    }
  });
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
