// ============================================================
// 京东APP · 商品详情页比价注入（查表版）
// 目标接口: https://api.m.jd.com/client.action?functionId=wareBusiness
//
// 背景（抓包实证，2026-10-15）：
//   慢慢买 priceRemark 接口返回完整比价（历史最低/当前价位置/购买建议），
//   但其 sign/token 与具体请求参数绑定——实测改动任一字段即返回
//   token校验失败，且需要 App 动态签名。因此脚本无法"现开现算"。
//   结论：改用【按 skuId 查表】。每盯一个商品，抓一次慢慢买响应，
//   把比价摘要固化到下方 TRACKED 即可，无需签名/Cookie。
//
// 流程：
//   1. 拦截 wareBusiness 响应 → 取 skuId
//   2. 在 TRACKED 命中 → 拼比价文案 → 注入响应 + 可选弹 QX 通知
//   3. 未命中 → 原样放行
//
// 订阅用法：QX → 订阅资源 → 填 raw 地址（见 jd-price.conf）
// 临时关闭：在原 URL 后加 &__price=0
// ============================================================

const CONFIG = {
  // 每个想盯的商品一条：{ skuId: 摘要 }。数据来自慢慢买 priceRemark 响应。
  TRACKED: {
    "10081811486701": {
      name: "外语/语言文字类目商品",
      currentPrice: "59",
      status: "持平常卖价",
      lowestPrice: "52.5",
      lowestDate: "2026-01-31",
      lowPct: "16%",
      advice: "价格偏高",
      star: 1.0,
      expectPrice: "52.5",
      rows: [
        { label: "当前价",  price: "¥59",  tip: "低于历史价中16%的时段" },
        { label: "历史最低", price: "¥52.5", date: "2026-01-31", diff: "省6.5" },
        { label: "双11价",  price: "¥52.7", date: "2025-10-24", diff: "省6.3" },
      ],
    },
  },

  // 命中后是否弹 QX 通知（不依赖页面结构，必现）
  POST_NOTIFY: true,

  // 注入到响应的字段名。默认空 = 只通知+日志，不改响应（避免破坏页面）。
  // 要真正显示在详情页上，需要你抓一次京东详情页(wareBusiness)响应，
  // 告诉我价格区块渲染的字段路径，我填这里。
  INJECT_FIELD: "",
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
    $done({});
    return;
  }

  var skuId = findSku(obj);
  log("顶层键: " + Object.keys(obj).join(",") + " | skuId=" + skuId);

  if (!skuId || !CONFIG.TRACKED[skuId]) {
    log(skuId ? ("未收录该 sku(" + skuId + ")，放行") : "未取到 skuId，放行");
    $done({});
    return;
  }

  var item = CONFIG.TRACKED[skuId];
  var note = buildNote(item);
  log(note);

  if (CONFIG.POST_NOTIFY) {
    try {
      $notification.post("京东比价 · " + item.currentPrice + "元", note, item.name || "");
    } catch (e) {}
  }

  if (CONFIG.INJECT_FIELD) {
    obj[CONFIG.INJECT_FIELD] = note;
    $done({ body: JSON.stringify(obj) });
  } else {
    $done({});
  }
}

// 从 wareBusiness 响应里尽力找 skuId（路径以实际抓包为准，先多试几个）
function findSku(o) {
  var paths = [
    "wareInfo.skuId", "wareInfo.wareId", "data.wareInfo.skuId", "data.wareInfo.wareId",
    "item.skuId", "skuId", "wareId", "sku", "basicInfo.skuId", "data.basicInfo.skuId",
  ];
  for (var i = 0; i < paths.length; i++) {
    var v = getPath(o, paths[i]);
    if (v !== undefined && v !== null && v !== "") return String(v);
  }
  return "";
}

function getPath(o, path) {
  var parts = path.split(".");
  var cur = o;
  for (var i = 0; i < parts.length; i++) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = cur[parts[i]];
  }
  return cur;
}

// 拼比价文案
function buildNote(item) {
  var lines = [];
  if (item.rows) {
    item.rows.forEach(function (r) {
      var s = r.label + " " + r.price;
      if (r.date) s += " @" + r.date;
      if (r.diff) s += " (" + r.diff + ")";
      if (r.tip) s += " ·" + r.tip;
      lines.push(s);
    });
  }
  if (item.lowestPrice) lines.push("历史最低 " + item.lowestPrice + (item.lowestDate ? " @" + item.lowestDate : ""));
  if (item.status) lines.push("状态 " + item.status);
  if (item.advice) lines.push("建议 " + item.advice + (item.expectPrice ? "（期望到手价 " + item.expectPrice + "）" : ""));
  return lines.join(" ｜ ");
}
