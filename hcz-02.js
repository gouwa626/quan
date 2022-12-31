
/**
 * @fileoverview Template to compose HTTP reqeuest.
 * 
 */

const url = `https://icore-hczhd.pingan.com.cn/micro-api/activity-module-draw/onTimeGo/win?xDF731Zj=LuLcMGEqEoR.z.16WFyc_c8Gm13Jd3y2zB1XaGBnh7emp28qUnnJGQcKG2anIkFHR9WroLayLR7pZQbSl5AMaC51qF7FX4rq04HV7HZpYmCv0BD9Q6OjOiaoVMZ0XjvUuFwgm2AwFJDAOl85NSd1jIkI4VOKRJOmzEu5MYikTAiOm0sBLTYxrU8Rgz8bGzHu.Iqy6bj3HGeZb.r6yKTCEtpoT1C82HjSJraxzDG8g2opLVuWXig5hXhUAst.2Ah4ArATRS462A3D7bBXoxIZeDYjATDGg_wjqY0mjvcAkshgMk7i9AKNdBnx3Eo9lwcSllZcRwbCWLCXlkJKJgIU3wf2kNwdIqgAoeV1kE3tOL18ZgP96gzhfwu8VXth4iNIFJ3xN6ZFwOmhjGt178hcvqtoXAEyLcVnx8.NDUdPzy92hhhxi8h.mORM9iEs15EqCr5P4O58UxOzyWaImhl.43dQ3q3r4Xf9czeBajQK9Zd3ELMjPWOEhKb71bLukndwPamlusa1ng8vYfZ5MC.T_6pk4KsAbcfatnhLaE_EA3zlcFa22HsrG4iAmgdOMc_43lIrLONCk46Tdm1E7MrrSuolrWPii.75KO9y6E0QFC1mUDHw2kqc5kpM5C6nT21mY1dLf6L3DR1e`;
const method = `POST`;
const headers = {
'appSource' : `hcz`,
'aopsID' : `159061355`,
'X-PA-SIGN-V' : `v3`,
'Host' : `icore-hczhd.pingan.com.cn`,
'Accept-Encoding' : `gzip, deflate, br`,
'webversion' : `1.0.0`,
'Origin' : `https://hcz-static.pingan.com.cn`,
'versionNo' : `5.08.1`,
'X-PA-SIGN' : `D561F201D61E5770EE0D987C61B10181EEA0169F63B68163E966C7FD963EDC44`,
'Connection' : `keep-alive`,
'X-PA-VERSION' : `5.08.1`,
'X-PA-TIMESTAMP' : `1672448783`,
'Accept-Language' : `zh-CN,zh-Hans;q=0.9`,
'activityId' : `2006884288729835666`,
'User-Agent' : `Mozilla/5.0 (iPhone; CPU iPhone OS 16_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 hczIos/5.08.1 datatist-sdk-ios`,
'Referer' : `https://hcz-static.pingan.com.cn/`,
'X-PA-UUID' : `3BB7F71E-C4AF-4AA7-8A11-7DD5BFE540A3`,
'Content-Type' : `application/json`,
'Accept' : `application/json`,
'X-PA-AGENT' : `ios`,
'X-PA-SIGN-ALG' : `1`,
'access_token' : `575FCEEF115E1E89E00C81151A3963DF`,
'spartaId' : `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`,
'X-PA-UDID' : `4BA1624B-0FB1-40C2-A207-062D6DFE3188`
};
const body = `{"activityId":"2006884288729835666","componentId":"1592787530892369920","onTimeGoStageId":"1605471922177581056","deviceNo":"4BA1624B-0FB1-40C2-A207-062D6DFE3188","X-PA-NONCESTR":"18264FE25-AA07-4665-ABCE-827A2895CD5D","X-PA-NEEDEXECUTIONID":1}`;

const myRequest = {
    url: url,
    method: method,
    headers: headers,
    body: body
};

$task.fetch(myRequest).then(response => {
    console.log(response.statusCode + "\n\n" + response.body);
    $done();
}, reason => {
    console.log(reason.error);
    $done();
});
