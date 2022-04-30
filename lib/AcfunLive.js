const got = require('got')
const dayjs = require('dayjs')
const querystring =  require('querystring')
const request = require('request')
const fs = require('fs')

const acfun = require('./Acfun')
const { paths } = require('../config')
const oss = require('../component/OSS')
const logger = require('./Logger')
const nedb = require('../component/NedbConnection')
const bot = require('../component/QQBot')
const Tulin = require('../lib/Tulin')
const liveRecord = require('../models/LiveRecord')
const LabLiveUser = require('../models/LabLiveUser')
const { now } = require('../lib/Utils')
const config = require('../config')

// 开播状态
const LIVE_STATUS_ERROR = -1
const LIVE_STATUS_OFFLINE = 0
const LIVE_STATUS_ONLINE = 1

// 直播画质
const LIVE_QUALITY = ['高清', '超清', '蓝光']

/**
 * 获取 AcFun 的 cookie
 *
 * @todo 需要调整为启动后登录自动获取
 * @returns {string}
 */
function getAcFuncCookie() {
  return config.acfun.cookie
}

/**
 * 获取 AcFun 直播的 Did
 * @param { string } roomId: 直播间 ID
 */
function requestAcFunLiveDid() {
  return config.acfun.liveDid
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
  })

  return JSON.parse(res.body)
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
  })
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
  let urls = videoPlayRes.liveAdaptiveManifest[0].adaptationSet.representation
  let urlLength = urls.length
  if (urlLength === 0) {
    return LIVE_STATUS_ERROR
  }
  // 获取指定质量下最高音质
  if (quality > urlLength - 1) {
    quality = urlLength - 1
  }
  return urls[quality].url
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

/**
 * 录播
 *
 * @param roomId
 * @param quality
 * @param callback
 * @returns {Promise<*>}
 */
async function recordLive(recordID, groupQQ, roomId, quality, callback) {
  let time = (new Date()).valueOf()
  let dateDir = getFileDirByTime(time)
  let dir = paths.acfunLive + dateDir
  if (!fs.existsSync(dir)) (
    fs.mkdirSync(dir, { recursive: true })
  )
  let filename = `${dir}${roomId}_${time}.flv`
  let remoteFilename = `acfunlive/${dateDir}${roomId}_${time}.flv`
  let liveFileUrl = await getLiveUrl(roomId, quality)
  if (liveFileUrl === LIVE_STATUS_OFFLINE || liveFileUrl === LIVE_STATUS_ERROR) {
    return liveFileUrl
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
      logger.error(`文件已删除（${roomId}）：${filename}`)
    })
    // 数据入库
    callback(recordID, groupQQ, roomId, remoteFilename)
  })
  return LIVE_STATUS_ONLINE
}

/**
 * A 站 UP 直播状态检测并提醒
 *
 * @param {Object} up
 * @returns {Promise<void>}
 */
async function liveStatusCheck(up) {
  let userID = up.userID
  let groupQQ = up.groupQQ
  let userinfo = await acfun.getLiveUserinfo(userID)
  if (!userinfo) {
    // 若获取失败，则不做处理
    return
  }
  let liveStatus = userinfo.liveId !== undefined ? 1 : 0
  let status = 0
  let liveRow = await nedb.findOneASync({ docType: 'LIVE_ROOM', userID: userID })
  if (!liveRow) {
    // 若不存在，创建新记录
    await nedb.insertASync({ docType: 'LIVE_ROOM',  userID: userID, status: liveStatus })
  } else {
    status = liveRow.status
  }

  if (liveStatus !== status) {
    // 修改记录状态
    await nedb.updateASync({ docType: 'LIVE_ROOM', userID: userID }, { $set: { status: liveStatus } })
    // 发送开关播消息
    let message = liveStatus === LIVE_STATUS_ONLINE
      ? `【开播提醒】 [CQ:at,qq=all]  \n 主播开播啦，快去观看直播吧~~\n点击进入直播间：https://live.acfun.cn/live/${userID}`
      : `本次直播已结束，感谢大家观看~`
    bot('send_group_msg', {
      group_id: groupQQ,
      message: message,
    })
    if (liveStatus === LIVE_STATUS_ONLINE && LabLiveUser.isOpenAuthRecord(up.botConf)
      && !await liveRecord.isRecording(userID)) {
      // 若为开播且开启了自动录播（当前不在录播中），进行录播
      let quality = 1 // 默认画质
      let recordID = await liveRecord.newRecord(userID, userinfo.name, quality)
      recordLive(recordID, groupQQ, userID, quality, recordSuccessNotify)
      bot('send_group_msg', {
        group_id: groupQQ,
        message: '📼本次直播已开启自动录播...',
      })
    }
  }
}

/**
 * 执行 AcFun 直播群消息对应的命令并获取回复
 *
 * @param {Object} up
 * @param {String} message 消息（含 @ 信息）
 * @returns {String}
 */
async function acfunCmd(up, message) {
  let roomID = up.userID
  let groupQQ = up.groupQQ
  // 去掉 @ 信息
  message = bot.getMessage(message)
  let replay = ''
  if (message === 'help') {
    return getHelp()
  } if (message.substring(0, 4) === '获取录播') {
    let day = message.substring(5, 16)
    if (!day) {
      return "获取录播指令错误\n" + getHelp()
    }
    let startTime = now(day)
    if (!startTime) {
      return "获取录播指令错误\n" + getHelp()
    }
    let endTime = startTime + 86400
    let records = await liveRecord.getRecords(roomID, startTime, endTime)
    if (records.length === 0) {
      return `过咩啦塞~指定日期内无录播记录`
    }
    let replay = `获取录播下载地址如下：`
    for (let record of records) {
      let startTime = dayjs(record.create_time * 1000).format('YYYY-MM-DD HH:mm:ss')
      let pathUrl = oss.getFileUrl(record.path)
      replay += `\n【${startTime}】：${pathUrl}`
    }
    return replay
  } else if (isAskLiveStatus(message)) {
    // 询问开播状态
    let userinfo = await acfun.getLiveUserinfo(roomID)
    if (!userinfo) {
      return '[ERROR]小助手好像生病了，请及时治疗'
    } else if (userinfo.liveId === undefined) {
      return '当前未直播，晚点再来看看吧~'
    }
    return `正在放送中，点击进入直播间：https://live.acfun.cn/live/${roomID}`
  } else if (message === '录播' || message.substring(0, 4) === '开始录播') {
    let qualityParam = message.substring(5, 7)
    let quality = LIVE_QUALITY.indexOf(qualityParam)
    if (qualityParam && quality === -1) {
      return "录播指令错误\n" + getHelp()
    }
    if (!LabLiveUser.isOpenRecord(up.botConf)) {
      return "本直播间未开启录播功能，需要开启请联系群主及 @色鬼领袖"
    }
    let userinfo = await acfun.getLiveUserinfo(roomID)
    if (!userinfo) {
      return '[ERROR]小助手好像生病了，请及时治疗'
    } else if (userinfo.liveId === undefined) {
      return '当前未直播，晚点再来看看吧~'
    }
    if (await liveRecord.isRecording(roomID)) {
      return "📼正在录播中...\n"
    }
    quality = quality === -1 ? 1 : quality
    // 新建录播记录
    let recordID = await liveRecord.newRecord(roomID, userinfo.name, quality)
    if (!recordID) {
      return '[ERROR]小助手好像生病了（病因：新增录播数据出错），请及时治疗'
    }
    let status = await recordLive(recordID, groupQQ, roomID, quality, recordSuccessNotify)
    if (status === 0) {
      return '当前未直播，晚点再来看看吧~'
    } else if (status === -1) {
      return '[ERROR] 录播出错，请及时治疗'
    }
    return '📼宝宝开始干活了，嘿咻~录播开始...'
  }
  // 获取自动回复
  replay = await Tulin.getReply(message)
  if (replay === null) {
    replay = '不要打扰我工作啦~'
  }
  return replay
}

/**
 * 获取直播群帮助指令
 *
 * @returns {String}
 */
function getHelp() {
  return "@本宝宝+空格+[文字指令] 可进行相关操作\n"
    + "  [help]  获取小助手可执行的任务，如：“@本宝宝 help”\n"
    + "  [主播开播了吗]  获取主播当前开播状态，如：“@本宝宝 主播开播了吗”\n"
    + "  [开始录播 高清|超清|蓝光]  对直播进行录播，如：”@本宝宝 开始录播 蓝光“，不填写质量时默认录播超清质量\n"
    + "  [获取录播 YYYY-mm-dd]  获取某日录播视频，如：”@本宝宝 获取录播 2021-05-20“\n"
}

/**
 * 是否为询问开播状态的消息
 */
function isAskLiveStatus(msg) {
  return msg.search(/直播情况|((在|开|直)播.*(吗|没|？|\?))/i) !== -1
}

/**
 * 下载完成后回调方法
 *
 * @param recordID
 * @param groupQQ
 * @param roomID
 * @param remoteFilename
 * @returns {Promise<void>}
 */
async function recordSuccessNotify(recordID, groupQQ, roomID, remoteFilename) {
  await liveRecord.updatePath(recordID, remoteFilename)
  logger.info(`acfun 录播完成，录播直播间：${roomID}，文件地址：${remoteFilename}`)
  let fileUrl = oss.getFileUrl(remoteFilename)
  bot('send_group_msg', {
    group_id: groupQQ,
    message: `💐💐💐直播录播完成，录播下载地址：\n${fileUrl}`,
  })
}
exports.recordLive = recordLive
exports.liveStatusCheck = liveStatusCheck
exports.acfunCmd = acfunCmd
