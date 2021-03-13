const CQHttp = require('cqhttp')
const dayjs = require('dayjs')
const Acfun = require('./lib/Acfun')
const Bilibili = require('./lib/Bilibili')
const Tulin = require('./lib/Tulin')
const { findIndexByAttr, timingTask, now } = require('./lib/Utils')
const nedb = require('./lib/NedbConnection')
const logger = require('./lib/Logger')
const { ups, qqSerice } = require('./config')
const { recordLive } = require('./component/AcfunLive')
const oss = require('./component/OSS')

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

const LIVE_QUALITY = ['高清', '超清', '蓝光']

// 避免配置错误，默认为空
ups = ups || []

bot.on('message',async context => {
  // console.log(context.message)
  if (context.message_type === QQ_MESSAGE_TYPE_GROUP && isAtMe(context.message)) {
    let groupQQ = context.group_id
    let replay = await getReplay(context)
    if (!replay) {
      return
    }
    bot('send_group_msg', {
      group_id: groupQQ,
      message: replay,
    })
  } else if (context.message_type === QQ_MESSAGE_TYPE_PRIVATE && context.message === '233') {
    console.log('test' + context.message)
    let message = `success`
    bot('send_msg', {
      ...context,
      message: message,
    })
  }
})

async function getReplay(context) {
  let groupQQ = context.group_id
  let index = findIndexByAttr('groupQQ', groupQQ, ups)
  if (index === -1) {
    // 若为非直播相关 QQ 群，则不进行提醒
    return ''
  }
  let up = ups[index]
  let message = context.message.replace(`[CQ:at,qq=${QQ}] `, '')
  let roomID = 0
  let replay = ''
  if (up.type === LIVE_TYPE_AC) {
    roomID = up.userID
    if (message === 'help') {
      return getHelp()
    } if (message.substring(0, 5) === '获取录播 ') {
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
    } else if (message.search(/直播情况|((在|开|直)播.*(吗|没|？|\?))/i) !== -1) {
      let userinfo = await Acfun.getLiveUserinfo(roomID)
      if (!userinfo) {
        return '[ERROR]小助手好像生病了，请及时治疗'
      } else if (userinfo.liveId === undefined) {
        return '当前未直播，晚点再来看看吧~'
      }
      return `正在放送中，点击进入直播间：https://live.acfun.cn/live/${roomID}`
    } else if (message.substring(0, 5) === '开始录播 ') {
      let qualityParam = message.substring(5, 7)
      let quality = LIVE_QUALITY.indexOf(qualityParam)
      if (qualityParam && quality === -1) {
        return "录播指令错误\n" + getHelp()
      }
      let userinfo = await Acfun.getLiveUserinfo(roomID)
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
      let status = await recordLive(roomID, quality, async function (roomID, remoteFilename) {
        await liveRecord.updatePath(recordID, remoteFilename)
        logger.info(`acfun 录播完成，录播直播间：${roomID}，文件地址：${remoteFilename}`)
        let fileUrl = oss.getFileUrl(remoteFilename)
        bot('send_group_msg', {
          group_id: groupQQ,
          message: `💐💐💐直播录播完成，录播下载地址：\n${fileUrl}`,
        })
      })
      if (status !== 1) {
        return '当前未直播，晚点再来看看吧~'
      }
      return '📼宝宝开始干活了，嘿咻~录播开始...'
    }
    replay = await Tulin.getReply(message)
    if (replay === null) {
      replay = '不要打扰我工作啦~'
    }
    return replay
  } else {
    // 检测 B站主播开播状态
    roomID = up.liveRoomID
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
}

function getHelp() {
  return "@本宝宝+空格+[文字指令]可进行相关操作\n"
    + "  [help]  获取小助手可执行的任务，如：“@本宝宝 help”\n"
    + "  [主播开播了吗]  获取主播当前开播状态，如：“@本宝宝 主播开播了吗”\n"
    + "  [开始录播 高清|超清|蓝光]  对直播进行录播，如：”@本宝宝 开始录播 蓝光“，不填写质量时默认录播超清质量\n"
    + "  [获取录播 YYYY-mm-dd]  获取某日录播视频，如：”@本宝宝 获取录播 2021-05-20“\n"
}

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
      ? `[CQ:at,qq=all]  \n【开播提醒】\n ${userinfo.name}开播啦，快去观看直播吧~~\n点击进入直播间：https://live.acfun.cn/live/${userID}`
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
