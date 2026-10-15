// ============================================================
// 京东秒送骑士 · 骑士餐厅入口注入（请求改写版）
// 目标接口: https://color.imdada.cn/?functionId=getBizActivityInfo
//
// 原理：改请求而非改响应。
//   抓包对比发现，同账号同设备下两次请求唯一实质差异是 cipher 里的
//   City-Id / Ad-Code（城市归属）。把这两个值换成"有数据"那次的，
//   服务端就会按已开通城市返回 detailList，前端自然渲染按钮。
//
//   cipher 是确定性加密（无随机 IV）——同一明文恒得同一密文，
//   因此可以直接复用已抓到的可用密文，无需解密算法。
//
// 附带好处：拿到的是服务端【真实下发的数据】，而不是本地伪造的 mock。
//
// 订阅：https://raw.githubusercontent.com/gouwa626/quan/main/jd-dada-req.conf
// 临时关闭：原 URL 后加 &__norq=0
// ============================================================

// 「有列表」那次的 cipher（2026-10-15 11:44 抓包实测可用）
const KNOWN_GOOD_CIPHER = {
  "User-Id": "DJG2CtY5CNc=",
  "Platform": "aU9J",
  "City-Id": "CzC4",
  "Ad-Code": "DNCmDJKy",
  "UUID": "CtS1CtO1CUOjEUPNEI00HJu0BUO5CNCjCOZPENO4Dzq2GJG2",
  "Lat": "CK==",
  "Lng": "CK=="
};

function log() {
  console.log("[骑士餐厅-请求] " + Array.prototype.join.call(arguments, " "));
}

// 开关：URL 带 __norq=0 时不改写
if (/[?&]__norq=0/.test($request.url)) {
  log("检测到 __norq=0，跳过请求改写");
  $done($request);
} else {
  var body = $request.body;
  var obj = null;
  var ok = true;
  var failReason = "";

  if (!body || body === "") {
    failReason = "$request.body 为空";
  } else {
    try {
      obj = JSON.parse(body);
    } catch (e) {
      ok = false;
      failReason = "JSON 解析失败: " + (e && e.message);
    }
  }

  if (obj && typeof obj === "object" && !obj.cipher) {
    ok = false;
    failReason = "有 JSON 但无 cipher 字段（顶层键: " + Object.keys(obj).join(",") + "）";
  }

  if (!ok || !obj || typeof obj !== "object" || !obj.cipher) {
    log("★ 未改写：" + failReason);
    log("  body 长度=" + (body ? body.length : 0));
    log("  body 前 200 字符=" + (body ? String(body).substring(0, 200) : "(空)"));
    log("  【排查】conf 须用 script-request-body 关键字（不加 requires-body）");
    log("  【排查】MITM 域名需含 color.imdada.cn，证书要完全信任");
    $done($request);
  } else {
    var c = obj.cipher;
    var beforeCity = c["City-Id"];
    var beforeAd = c["Ad-Code"];
    var beforeLat = c["Lat"];
    var beforeLng = c["Lng"];

    // 只替换城市相关字段，身份类字段（User-Id/UUID/Platform）保持原样
    c["City-Id"] = KNOWN_GOOD_CIPHER["City-Id"];
    c["Ad-Code"] = KNOWN_GOOD_CIPHER["Ad-Code"];
    // 坐标一并置空：实测有列表时坐标就是空的（单字节 0x08 哨兵）
    c["Lat"] = KNOWN_GOOD_CIPHER["Lat"];
    c["Lng"] = KNOWN_GOOD_CIPHER["Lng"];

    // ts 刷新为当前毫秒时间戳，避免被判为重放
    obj.ts = Date.now();

    log("City-Id : " + beforeCity + " -> " + c["City-Id"]);
    log("Ad-Code : " + beforeAd + " -> " + c["Ad-Code"]);
    log("Lat/Lng : (" + (beforeLat || "") + "," + (beforeLng || "") + ") -> (空)");
    log("ts      : -> " + obj.ts);

    // 请求体脚本的正确输出方式：改 $request.body 后 $done($request)
    // （$done({body}) 是响应体脚本的写法，请求体脚本用错会导致 body 读不到）
    $request.body = JSON.stringify(obj);
    $done($request);
  }
}
