// ============================================================
// 京东APP · 商品详情页比价注入
// 目标接口: https://api.m.jd.com/client.action?functionId=wareBusiness
//
// 作用：抓商品详情页响应，取「当前价」+ 商品ID(skuId)，
//       调慢慢买(manmanbuy.com)历史价格接口做对比，
//       把比价结论写回响应字段，让页面展示。
//
// 依赖：
//   · 慢慢买历史价格 → 需登录 Cookie（登录 manmanbuy.com 后复制整段）
//   · 未配 Cookie 时降级为「安全模式」：只打日志，不注入
//
// 背景（抓包实证）：
//   · wareBusiness 响应是 JSON；商品ID、当前价的取值路径以你实际抓包为准
//     （下方已标 TODO）
//   · 慢慢买按 skuId 查历史最低/最高/均价
//
// 订阅用法：QX → 订阅资源 → 填 raw 地址（见 jd-price.conf）
// 临时关闭：在原 URL 后加 &__price=0
// ============================================================

// ── 配置区（订阅时可覆盖） ──
const CONFIG = {
  // 慢慢买 Cookie：登录 www.manmanbuy.com，浏览器开发者工具里复制整段
  // "Cookie: xxx" 的 xxx 部分。留空 = 安全模式（不比价）。
  MANMANBU_COOKIE: "",

  // 慢慢买历史价格接口：形如 https://www.manmanbuy.com/xxx?skuId={skuId}
  // TODO(待抓包确认): 用抓包工具抓一次比价请求，替换下面模板
  PRICE_API_TEMPLATE: "https://www.manmanbuy.com/price?skuId=",
};

function log() {
  console.log("[京东比价] " + Array.prototype.join.call(arguments, " "));
}

// 开关：URL 带 __price=0 时跳过（注意 QX 顶层不能用 return）
if (/[?&]__price=0/.test($request.url)) {
  log("检测到 __price=0，跳过比价");
  $done({});
} else {
  main();
}

function main() {
  var body = $response.body;
  var obj = null;
  try {
    obj = JSON.parse(body);
  } catch (e) {
    log("响应不是 JSON：" + (e && e.message));
    log("前 120 字符: " + String(body).substring(0, 120));
    $done({});
    return;
  }

  // TODO(待抓包确认): 下面两行取值路径，按你抓到的 wareBusiness 实际结构改
  var skuId = (obj.wareInfo && obj.wareInfo.skuId) || "";
  var price = (obj.price && obj.price.price) || "";

  log("skuId=" + skuId + " 当前价=" + price);

  if (!CONFIG.MANMANBU_COOKIE) {
    log("未配置慢慢买 Cookie → 安全模式：仅记录当前价，不注入");
    $done({});
    return;
  }
  if (!skuId) {
    log("未取到 skuId，无法比价");
    $done({});
    return;
  }

  fetchHistoryPrice(skuId, function (hist) {
    var note = buildNote(price, hist);
    log(note);

    // TODO(待抓包确认): 把 note 注入到页面会渲染的字段，例如：
    //   obj.priceNote = note;  或 obj.wareInfo.xxx = note;
    obj.priceNote = note;

    $done({ body: JSON.stringify(obj) });
  });
}

// 调慢慢买历史价格接口（QX 的 $httpClient 支持在响应脚本里发请求）
function fetchHistoryPrice(skuId, cb) {
  var url = CONFIG.PRICE_API_TEMPLATE + skuId;
  log("请求慢慢买: " + url);

  $httpClient.get({
    url: url,
    headers: {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      "Cookie": CONFIG.MANMANBU_COOKIE,
    },
  }, function (err, resp, data) {
    if (err || (resp && resp.statusCode !== 200)) {
      log("慢慢买请求失败: " + (err || (resp && resp.statusCode)));
      cb(null);
      return;
    }
    // TODO(待抓包确认): 解析慢慢买返回里的 最低价/最高价/均价
    // 形如 { low: "xx", high: "xx", avg: "xx" }，解析失败传 null
    try {
      var j = JSON.parse(data);
      cb({
        low: j.low || "",
        high: j.high || "",
        avg: j.avg || "",
      });
    } catch (e) {
      log("慢慢买返回非 JSON（前 200 字符）: " + String(data).substring(0, 200));
      cb(null);
    }
  });
}

// 拼比价文案
function buildNote(price, hist) {
  if (!hist) {
    return "当前价 " + price + "（比价数据不可用）";
  }
  var parts = ["当前价 " + price];
  if (hist.low) parts.push("历史最低 " + hist.low);
  if (hist.high) parts.push("最高 " + hist.high);
  if (hist.avg) parts.push("均价 " + hist.avg);
  return parts.join(" ｜ ");
}
