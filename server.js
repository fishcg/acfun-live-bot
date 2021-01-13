const CQHttp = require('cqhttp')
const Acfun = require('./lib/Acfun')
const Bilibili = require('./lib/Bilibili')
const Tulin = require('./lib/Tulin')
const { findIndexByAttr, timingTask } = require('./lib/Utils')
const nedb = require('./lib/NedbConnection')

let { ups, qqSerice } = require('./config')

// 文档地址：https://github.com/cqmoe/cqhttp-node-sdk
console.log(`qq service is ${qqSerice}`)
const bot = new CQHttp({
  apiRoot: qqSerice,  // TODO: 待配置
})

const QQ = 3431290005  // self

// QQ 消息类型
const QQ_MESSAGE_TYPE_PRIVATE = 'private'
const QQ_MESSAGE_TYPE_GROUP = 'group'

// 直播平台类型
const LIVE_TYPE_AC = 1
const LIVE_TYPE_BILIBILI = 2

// 避免配置错误，默认为空
ups = ups || []

bot.on('message',async context => {
  console.log(context.message)

  if (context.message_type === QQ_MESSAGE_TYPE_GROUP
      && isAtMe(context.message) && context.message.search(/直播情况|((在|开|直)播.*(吗|没|？|\?))/i) !== -1) {
    let groupQQ = context.group_id
    let index = findIndexByAttr('groupQQ', groupQQ, ups)
    if (index === -1) {
      // 若为非直播相关 QQ 群，则不进行提醒
      return
    }
    let up = ups[index]
    let message = ''
    if (up.type === LIVE_TYPE_AC) {
      let userinfo = await Acfun.getLiveUserinfo(up.userID)
      if (!userinfo) {
        message = '[ERROR]小助手好像生病了，请及时治疗'
      } else if (userinfo.liveId === undefined) {
        message = '当前未直播，晚点再来看看吧~'
      } else {
        message = `正在放送中，点击进入直播间：https://live.acfun.cn/live/${up.userID}`
      }
    } else {
      // 检测 B站主播开播状态
      let body = await Bilibili.getLiveInfo(up.liveRoomID)
      if (!checkBody(body)) {
        message = '[ERROR]小助手好像生病了，请及时治疗'
      } else if (body.data.room_info.live_status === 1) {
        message = `直播放送中，点击进入直播间：https://live.bilibili.com/${5339362}`
      } else if (body.data.room_info.live_status === 2) {
        message = `正在回放中，点击进入直播间：https://live.bilibili.com/${5339362}`
      } else {
        message = '当前未直播，晚点再来看看吧~'
      }
    }
    bot('send_group_msg', {
      group_id: groupQQ,
      message: message,
    })
  } else if (isAtMe(context.message)) {
    let groupQQ = context.group_id
    let message = context.message.replace(`[CQ:at,qq=${QQ}] `, '')
    let replay = await Tulin.getReply(message)
    if (replay === null) {
      replay = '不要打扰我工作啦~'
    }
    bot('send_group_msg', {
      group_id: groupQQ,
      message: replay,
    })
  }
  if (context.message_type === QQ_MESSAGE_TYPE_PRIVATE && context.message === '233') {
    console.log('test' + context.message)
    let message = `success`
    bot('send_msg', {
      ...context,
      message: message,
    })
  }
})

function isAtMe(message) {
  let atMe = message.substr(0, 12 + QQ.toString().length)
  return atMe === `[CQ:at,qq=${QQ}] `
}

function checkBody(body) {
  if (!body || body.code !==0) {
    return false
  }
  return true
}
// 每 30 秒检测是否开播
if (ups.length > 0) {
  console.log('开始开播检测')
} else {
  console.log('未配置需要检测的直播 up')
}

timingTask(checkTask, 30)
async function checkTask() {
  for (let up of ups) {
    if (up.type === LIVE_TYPE_AC) {
      await acLiveCheck(up.userID, up.groupQQ)
    } else {
      await biliLiveCheck(up.liveRoomID, up.groupQQ, up.username)
    }
  }
}

/**
 * B 站 UP 直播状态检测
 *
 * @param userID
 * @param groupQQ
 * @returns {Promise<void>}
 */
async function acLiveCheck(userID, groupQQ) {
  let userinfo = await Acfun.getLiveUserinfo(userID)
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
    // 发送消息
    let message = liveStatus === 1
      ? `【开播提醒】\n ${userinfo.name}开播啦，快去观看直播吧~~\n点击进入直播间：https://live.acfun.cn/live/${userID}`
      : `本次直播已结束，感谢大家观看~`
    bot('send_group_msg', {
      group_id: groupQQ,
      message: message,
    })
  }
}

/**
 * B 站 UP 直播状态检测
 *
 * @param liveRoomID
 * @param groupQQ
 * @returns {Promise<void>}
 */
async function biliLiveCheck(liveRoomID, groupQQ, UPName) {
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
  liveStatus = body.data.room_info.live_status === 1 ? 1 : 0
  if (liveStatus !== status) {
    // 修改记录状态
    await nedb.updateASync({ docType: 'LIVE_ROOM', roomID: liveRoomID }, { $set: { status: liveStatus } })
    // 发送消息
    let message = liveStatus === 1
      ? `【开播提醒】\n ${UPName}开播啦，快去观看直播吧~~\n点击进入直播间：https://live.bilibili.com/${liveRoomID}`
      : `本次直播已结束，感谢大家观看~`
    bot('send_group_msg', {
      group_id: groupQQ,
      message: message,
    })
  }
}

bot.listen(5701)
console.log('qqbot start in 5701')
/*{ font: 0,
  message: '哈哈哈',
  message_id: 243355940,
  message_type: 'private',
  post_type: 'message',
  raw_message: '哈哈哈',
  self_id: 3431290005,
  sender:
  { age: 0, nickname: '‎', sex: 'unknown', user_id: 353740902 },
  sub_type: 'friend',
    time: 1607620570,
  user_id: 353740902 }
开始开播检测
开始开播检测
{ anonymous: null,
  font: 0,
  group_id: 1577034,
  message: '[CQ:at,qq=3431290005] 开播了吗',
  message_id: 1721027800,
  message_type: 'group',
  post_type: 'message',
  raw_message: '[CQ:at,qq=3431290005] 开播了吗',
  self_id: 3431290005,
  sender:
  { age: 0,
    area: '',
    card: '',
    level: '',
    nickname: '‎',
    role: 'member',
    sex: 'unknown',
    title: '',
    user_id: 353740902 },
  sub_type: 'normal',
    time: 1607620615,
  user_id: 353740902 }*/
