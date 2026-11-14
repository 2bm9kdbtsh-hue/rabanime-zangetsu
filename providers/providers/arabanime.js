var SOURCE_ID = (typeof __SOURCE_ID !== "undefined" && __SOURCE_ID) ? String(__SOURCE_ID) : "arabanime";
var SITE = "https://www.arabanime.net";
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36";

function getInfo() {
  return { name: "ArabAnime", lang: "ar", baseUrl: SITE, logo: SITE + "/favicon.ico", type: "anime", version: "0.1.0" };
}
function _get(url, ref, extra) {
  var h = { "User-Agent": UA, "Referer": ref || SITE + "/" };
  if (extra) Object.keys(extra).forEach(function(k) { h[k] = extra[k]; });
  return fetch(url, { headers: h, timeoutMs: 15000 }).then(function(r) { return r.body || ""; });
}
function _post(url, data) {
  var body = Object.keys(data).map(function(k) { return encodeURIComponent(k) + "=" + encodeURIComponent(data[k]); }).join("&");
  return fetch(url, { method: "POST", headers: { "User-Agent": UA, "Referer": SITE + "/", "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" }, body: body, timeoutMs: 15000 }).then(function(r) { return r.body || ""; });
}
function _b64(s) {
  try {
    var b = base64ToBytes(String(s || "")), out = "", i = 0;
    while (i < b.length) {
      var c = b[i++];
      if (c < 128) out += String.fromCharCode(c);
      else if (c < 224) out += String.fromCharCode(((c & 31) << 6) | (b[i++] & 63));
      else if (c < 240) out += String.fromCharCode(((c & 15) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63));
      else { var cp = (((c & 7) << 18) | ((b[i++] & 63) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63)) - 65536; out += String.fromCharCode(55296 + (cp >> 10), 56320 + (cp & 1023)); }
    }
    return out;
  } catch(e) { return ""; }
}
function _clean(s) { return htmlText(String(s || "").replace(/<[^>]*>/g, "")).trim(); }
function _abs(s) { if (!s) return ""; return /^https?:\/\//i.test(s) ? s : SITE + (s.charAt(0) === "/" ? "" : "/") + s; }
function _jsonB64(s) { try { return JSON.parse(_b64(s)); } catch(e) { return null; } }
function _item(x) {
  if (!x || !x.info_src) return null;
  return { id: x.info_src, url: x.info_src, title: x.anime_name || "بدون عنوان", englishTitle: x.anime_name || "", cover: _abs(x.anime_cover_image_url || ""), type: "anime", sourceId: SOURCE_ID };
}
function _listing(body) {
  var j; try { j = JSON.parse(body || "{}"); } catch(e) { return []; }
  return (j.Shows || []).map(function(x) { return _item(_jsonB64(x)); }).filter(Boolean);
}
function getHome() {
  return _get(SITE + "/api?page=1", SITE + "/").then(function(b) {
    var items = _listing(b); return items.length ? [{ title: "جديد الأنمي", items: items }] : [];
  }).catch(function() { return []; });
}
function search(query, page) {
  var q = String(query || "").trim(), p = Math.max(1, parseInt(page || 1, 10));
  if (!q) return _get(SITE + "/api?page=" + p, SITE + "/").then(_listing).catch(function() { return []; });
  return _post(SITE + "/searchq", { searchq: q }).then(function(html) {
    var out = [], chunks = String(html).split(/<div[^>]+class=["'][^"']*\bshow\b[^"']*["'][^>]*>/i);
    for (var i = 1; i < chunks.length; i++) {
      var c = chunks[i].split(/<\/div>/i)[0], a = c.match(/<a\b[^>]*href=["']([^"']+)["']/i);
      var h = c.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i), im = c.match(/<img\b[^>]*>/i);
      var title = h ? _clean(h[1]) : "", cover = im ? ((im[0].match(/(?:src|data-src)=["']([^"']+)/i) || [])[1] || "") : "";
      if (a && title) out.push({ id: a[1], url: a[1], title: title, englishTitle: title, cover: _abs(cover), type: "anime", sourceId: SOURCE_ID });
    }
    return out;
  }).catch(function() { return []; });
}
function getDetail(url) {
  return _get(_abs(String(url)), SITE + "/").then(function(html) {
    var n = html.match(/<div[^>]*id=["']data["'][^>]*>([\s\S]*?)<\/div>/i);
    var d = n ? _jsonB64(_clean(n[1])) : null, show = d && d.show && d.show[0] ? d.show[0] : null;
    var title = show && show.anime_name ? show.anime_name : _clean((html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i) || [])[1] || "");
    var eps = d && d.EPS ? d.EPS : [], episodes = [];
    for (var i = 0; i < eps.length; i++) {
      var e = eps[i], epurl = e["info-src"] || e.info_src || "";
      if (epurl) episodes.push({ id: epurl, url: epurl, number: Number(e.episode_number || i + 1), title: e.episode_name || ("الحلقة " + (i + 1)) });
    }
    episodes.reverse();
    return { id: String(url), url: String(url), title: title || "ArabAnime", englishTitle: title || "", cover: _abs(show && show.anime_cover_image_url || ""), description: show && show.anime_description || "", status: show && show.anime_status || "unknown", genres: show && show.anime_genres ? String(show.anime_genres).split(/[,،]/).map(function(x) { return x.trim(); }).filter(Boolean) : [], type: "anime", sourceId: SOURCE_ID, episodes: episodes };
  });
}
function getEpisodes(url) { return getDetail(url).then(function(d) { return d.episodes || []; }); }
function getVideoSources(episodeUrl) {
  var watch = _abs(String(episodeUrl || ""));
  return _get(watch, SITE + "/").then(function(html) {
    var n = html.match(/<div[^>]*id=["']datawatch["'][^>]*>([\s\S]*?)<\/div>/i);
    var wd = n ? _jsonB64(_clean(n[1])) : null;
    var encoded = wd && wd.ep_info && wd.ep_info[0] && wd.ep_info[0].stream_servers && wd.ep_info[0].stream_servers[0];
    if (!encoded) throw new Error("ArabAnime: لا توجد بيانات خوادم");
    var server = _b64(encoded);
    if (!/^https?:\/\//i.test(server)) throw new Error("ArabAnime: رابط الخادم غير صالح");
    return _get(server, watch).then(function(sh) {
      var opts = [], re = /<option\b([^>]*)>([\s\S]*?)<\/option>/gi, m;
      while ((m = re.exec(sh)) !== null) {
        var ds = (m[1].match(/\bdata-src=["']([^"']+)["']/i) || [])[1];
        var u = _b64(ds || "");
        if (/^https?:\/\//i.test(u) && u.indexOf("/embed") >= 0) opts.push({ name: _clean(m[2]) || "Server", url: u });
      }
      return Promise.all(opts.map(function(o) {
        return _get(o.url, server).then(function(eh) {
          var found = [], sr = /<source\b([^>]*)>/gi, sm;
          while ((sm = sr.exec(eh)) !== null) {
            var at = sm[1], u = (at.match(/\bsrc=["']([^"']+)["']/i) || [])[1], q = (at.match(/\blabel=["']([^"']+)["']/i) || [])[1] || "auto";
            if (u && /^https?:\/\//i.test(u) && u.indexOf("static") < 0) found.push({ url: u, quality: /p$/i.test(q) ? q : q + "p", container: /\.m3u8(\?|$)/i.test(u) ? "hls" : "mp4", headers: { "User-Agent": UA, "Referer": o.url }, kind: "sub" });
          }
          return found;
        }).catch(function() { return []; });
      })).then(function(lists) {
        var all = []; lists.forEach(function(a) { all = all.concat(a); });
        if (!all.length) throw new Error("ArabAnime: لم يتم العثور على فيديو مباشر");
        return all;
      });
    });
  });
}
