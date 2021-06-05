const acfunLive = require('../lib/AcfunLive')
const bilibiliLive = require('../lib/BilbiliLive')
const { findIndexByAttr } = require('../lib/Utils')
const LabLiveUser = require('../models/LabLiveUser')

// 直播平台类型
const LIVE_TYPE_AC = 1
const LIVE_TYPE_BILIBILI = 2

let livesCache = {
  ups: [],
  expireTime: 0, // 过期时间
}

/**
 * 获取可用直播间信息
 *
 * @returns {livesCache} 直播间信息
 */
async function getLives() {
  let now = Date.parse(new Date()) / 1000
  if (now > livesCache.expireTime) {
    // 若过期，则更新
    let lives = await LabLiveUser.findAllRecords()
    let ups = []
    for (let live of lives) {
      ups.push({
        'type': live.type,
        'userID': live.live_id,
        'username': live.username,
        'groupQQ': live.group_qq,
        'botConf': live.bot_conf,
      })
    }
    livesCache = {
      ups: ups,
      expireTime: now + 30, // 缓存 30s
    }
  }
  return livesCache
}

/**
 * 检测直播状态并通知
 *
 * @returns {Promise<void>}
 */
async function liveStatusCheck() {
  let lives = await getLives()
  for (let up of lives.ups) {
    if (!LabLiveUser.isNotify(up.botConf)) {
      // 未开启开关播提醒时，略过
      continue
    }
    if (up.type === LIVE_TYPE_AC) {
      await acfunLive.liveStatusCheck(up)
    } else {
      await bilibiliLive.liveStatusCheck(up)
    }
  }
}

/**
 * 获取直播群消息回复
 *
 * @param context QQ 消息上下文
 * @returns {String}
 */
async function getReplay(context) {
  let groupQQ = context.group_id
  let lives = await getLives()
  let index = findIndexByAttr('groupQQ', groupQQ, lives.ups)
  if (index === -1) {
    // 若为非直播相关 QQ 群，则不进行回复
    return ''
  }
  let up = lives.ups[index]
  let message = context.message
  if (up.type === LIVE_TYPE_AC) {
    return await acfunLive.acfunCmd(up, message)
  } else if (up.type === LIVE_TYPE_BILIBILI) {
    return await bilibiliLive.bilibiliCmd(up, message)
  }
  // TODO: 支持其他直播网站
  return ''
}

exports.liveStatusCheck = liveStatusCheck
exports.getLives = getLives
exports.getReplay = getReplay
