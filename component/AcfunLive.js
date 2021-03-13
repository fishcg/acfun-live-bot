const got = require('got')
const dayjs = require('dayjs')
const querystring =  require('querystring')
const request = require('request')
const fs = require('fs')

const { paths } = require('../config')
const oss = require('./OSS')
const logger = require('../lib/Logger')

// 开播状态
const LIVE_STATUS_ERROR = -1
const LIVE_STATUS_OFFLINE = 0
const LIVE_STATUS_ONLINE = 1

/* 获取acfun的cookie */
function getAcFuncCookie() {
  return "_did=web_7890798013257F33; analytics=GA1.2.1536901869.1564211663; sign_remind=1; didv=1605884180361; acPasstoken=ChVpbmZyYS5hY2Z1bi5wYXNzdG9rZW4ScPjTcwnDOlwO8jWaOK1hjsPrLXv522HSVkNdP06vPm-w1BWvf4DuXaOim9vSEnWO3eH9Ko6z47x_ZIon9aIrR98EL9pqOu4vk2NfGAPEuGE64_wME3Fjfbnpvunw_gdtigsE7hR3IrDmdUMrheIG5A0aEpKwM4kzPw4j0kKfbi78eidLwiIgEwb6KDOeoQXqZlm7zA_BJjLljHGkiCEIplWxIkBiMZQoBTAB; auth_key=494754; ac_username=%E8%89%B2%E9%AC%BC%E9%A2%86%E8%A2%96; acPostHint=9b5d3a9a9fe7af9659e71b05e05092e34f17; ac_userimg=https%3A%2F%2Fimgs.aixifan.com%2Fstyle%2Fimage%2F201907%2FUe8Bg2zvAOPpWObXXuVnIwD85so3wpJu.jpg; Hm_lvt_2af69bc2b378fb58ae04ed2a04257ed1=1615386142,1615468570,1615555388,1615623085; safety_id=AAJdxFcbjyGwiJhz5iY9pcLk; Hm_lpvt_2af69bc2b378fb58ae04ed2a04257ed1=1615632316";
}

/**
 * 获取acfun直播的html和cookie
 * @param { string } roomId: 直播间 ID
 */
function requestAcFunLiveDid(roomID) {
  return "web_7890798013257F33"
}

// 已登录时，获取acfun的token，直接使用登陆后得到的cookie
async function requestWebTokenGet() {
  const res  = await got('https://id.app.acfun.cn/rest/web/token/get', {
    method: 'POST',
    responseType: 'text',
    headers: {
      Referer: 'https://live.acfun.cn/',
      Cookie: getAcFuncCookie(),
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    body: 'sid=acfun.midground.api',
  });

  return JSON.parse(res.body);
}

/**
 * 获取地址
 * @param { string } didCookie: cookie里did的值
 * @param { string } st: 前面获取的token
 * @param { number } userId: 用户id，未登陆时为临时获取的id
 * @param { boolean } isVisitor: 是否为未登陆状态
 * @param { string } authorId: 直播间id
 */
async function requestPlayUrl(
  didCookie,
  st,
  userId,
  isVisitor,
  authorId
){
  const query = querystring.stringify({
    subBiz: 'mainApp',
    kpn: 'ACFUN_APP',
    kpf: 'PC_WEB',
    userId,
    did: didCookie,
    [isVisitor ? 'acfun.api.visitor_st' : 'acfun.midground.api_st']: st,
  });
  const res = await got(`https://api.kuaishouzt.com/rest/zt/live/web/startPlay?${ query }`, {
    method: 'POST',
    responseType: 'text',
    headers: {
      Referer: 'https://live.acfun.cn/',
      Cookie: getAcFuncCookie(),
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    },
    body: querystring.stringify({
      authorId,
      pullStreamType: 'FLV',
    }),
  })
  return JSON.parse(res.body)
}

/**
 * 生成适合文件路径的时间
 * @param { number | string } value: 时间戳
 */
function getFileDirByTime(value){
  const fileTimeFormat = 'YYYYMM/DD/'
  if (value) {
    return dayjs(typeof value === 'string' ? Number(value) : value).format(fileTimeFormat)
  } else {
    return dayjs().format(fileTimeFormat)
  }
}

async function getLiveUrl(roomId, quality = 1) {
  const cookie = getAcFuncCookie()
  const didCookie = requestAcFunLiveDid()
  const tokenRes = await requestWebTokenGet()
  let userId = tokenRes.userId
  let token = tokenRes['acfun.midground.api_st']
  let playerRes = await requestPlayUrl(didCookie, token, userId, !cookie, roomId)
  if (playerRes.result !== 1) {
    return LIVE_STATUS_OFFLINE
  }
  const videoPlayRes = JSON.parse(playerRes.data.videoPlayRes)
  return videoPlayRes.liveAdaptiveManifest[0].adaptationSet.representation[quality].url
}

/*
* url 网络文件地址
* filename 文件名
* callback 回调函数
*/
function downloadFile(uri, filename, callback){
  let stream = fs.createWriteStream(filename)
  request(uri).pipe(stream).on('close', callback)
}
async function recordLive(roomId, quality, callback) {
  let time = (new Date()).valueOf()
  let dateDir = getFileDirByTime(time)
  let dir = paths.acfunLive + dateDir
  if (!fs.existsSync(dir)) (
    fs.mkdirSync(dir, { recursive: true })
  )
  let filename = `${dir}${roomId}_${time}.flv`
  let remoteFilename = `acfunlive/${dateDir}${roomId}_${time}.flv`
  let liveFileUrl = await getLiveUrl(roomId, quality)
  if (liveFileUrl === LIVE_STATUS_OFFLINE) {
    return LIVE_STATUS_OFFLINE
  }
  downloadFile(liveFileUrl, filename, async function () {
    // 文件下载完后
    // 上传文件
    let body =  await oss.put(remoteFilename, filename)
    if (200 !== body.res.status) {
      logger.error(`acfun 录播（${roomId}）文件上传 OSS 失败：${filename}`)
      return LIVE_STATUS_ERROR
    }
    // 删除本地文件
    fs.unlink(filename, () => {
      console.log('文件已删除')
    })
    // 数据入库
    callback(roomId, remoteFilename)
  })
  return LIVE_STATUS_ONLINE
}

exports.recordLive = recordLive
