const Bilibili = require('./Bilibili')
const nedb = require('../component/NedbConnection')
const bot = require('../component/QQBot')

// 开播状态
const LIVE_STATUS_ERROR = -1
const LIVE_STATUS_OFFLINE = 0
const LIVE_STATUS_ONLINE = 1

/**
 * B 站 UP 直播状态检测
 *
 * @param {Object} up
 * @returns {Promise<void>}
 */
async function liveStatusCheck(up) {
  let liveRoomID = up.userID
  let groupQQ = up.groupQQ
  let status = 0
  let liveStatus = 0
  let body = await Bilibili.getLiveInfo(liveRoomID)
  if (!checkBody(body)) {
    return
  }
  let liveRow = await nedb.findOneASync({ docType: 'LIVE_ROOM', roomID: liveRoomID })
  if (!liveRow) {
    // 若不存在，创建新记录
    await nedb.insertASync({ docType: 'LIVE_ROOM',  roomID: liveRoomID, status: status })
  } else {
    status = liveRow.status
  }
  liveStatus = body.data.room_info.live_status === LIVE_STATUS_ONLINE ? LIVE_STATUS_ONLINE : LIVE_STATUS_OFFLINE
  if (liveStatus !== status) {
    // 修改记录状态
    await nedb.updateASync({ docType: 'LIVE_ROOM', roomID: liveRoomID }, { $set: { status: liveStatus } })
    // 发送消息
    let message = liveStatus === 1
      ? `【开播提醒】\n ${up.username}开播啦，快去观看直播吧~~\n点击进入直播间：https://live.bilibili.com/${liveRoomID}`
      : `本次直播已结束，感谢大家观看~`
    bot('send_group_msg', {
      group_id: groupQQ,
      message: message,
    })
  }
}

/**
 * 执行阿B直播群消息对应的命令并获取回复
 *
 * @param {Object} up
 * @param {String} message 消息（不含 @ 信息）
 * @returns {String}
 */
async function bilibiliCmd(up, message) {
  // 去掉 @ 信息
  message = bot.getMessage(message)
  if (isAskLiveStatus(message)) {
    // 检测 B站主播开播状态
    let roomID = up.liveRoomID
    let body = await Bilibili.getLiveInfo(roomID)
    if (!checkBody(body)) {
      return '[ERROR]小助手好像生病了，请及时治疗'
    } else if (body.data.room_info.live_status === 1) {
      return `直播放送中，点击进入直播间：https://live.bilibili.com/${roomID}`
    } else if (body.data.room_info.live_status === 2) {
      return `正在回放中，点击进入直播间：https://live.bilibili.com/${roomID}`
    }
    return '当前未直播，晚点再来看看吧~'
  }
  // TODO: 支持阿B直播录播等
  return ''
}

/**
 * 是否为询问开播状态的消息
 */
function isAskLiveStatus(msg) {
  return msg.search(/直播情况|((在|开|直)播.*(吗|没|？|\?))/i) !== -1
}


/**
 * 检测响应是否正常
 *
 * @param {Object} body
 * @returns {Boolean}
 */
function checkBody(body) {
  if (!body || body.code !==0) {
    return false
  }
  return true
}

exports.liveStatusCheck = liveStatusCheck
exports.bilibiliCmd = bilibiliCmd
