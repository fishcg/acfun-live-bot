const CQHttp = require('cqhttp')
const Bilibili = require('./lib/Bilibili')
const { timingTask } = require('./lib/Utils')
const nedb = require('./lib/NedbConnection')

// 文档地址：https://github.com/cqmoe/cqhttp-node-sdk

const bot = new CQHttp({
  apiRoot: 'http://127.0.0.1:5700/',
})
const QQ = 3431290005
const LIVE_ROOM_ID = 5339362
const GROUP_ID = 1577034
const UPName = '女宅'

/*
let message = `[CQ:at,qq=836869045] \n`
message += 'test'
bot('send_group_msg', {
  group_id: GROUP_ID,
  message: message,
})
*/

bot.on('message',async context => {
  console.log(context.message)
  if (isAtMe(context.message) && context.message.search(/直播情况|((在|开|直)播.*(吗|没|？|\?))/i) !== -1) {
    let body = await Bilibili.getLiveInfo(LIVE_ROOM_ID)
    let message = ''
    if (!checkBody(body)) {
      message = '[ERROR]小助手好像生病了，请及时治疗'
    } else if (body.data.room_info.live_status === 1) {
      message = `直播放送中，点击进入直播间：https://live.bilibili.com/${LIVE_ROOM_ID}`
    } else if (body.data.room_info.live_status === 2) {
      message = `正在回放中，点击进入直播间：https://live.bilibili.com/${LIVE_ROOM_ID}`
    } else {
      message = '当前未直播，晚点再来看看吧~'
    }
    bot('send_group_msg', {
      group_id: GROUP_ID,
      message: message,
    })
  }
  if (context.message == '[CQ:at,qq=3431290005] 晚上好'){
    let message = `你也好~`
    bot('send_group_msg', {
      group_id: GROUP_ID,
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
// timingTask(checkTask, 30)

async function checkTask() {
  let liveRoomID = LIVE_ROOM_ID
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
      ? `【开播提醒】\n ${UPName}开播啦，快去观看直播吧~~\n点击进入直播间：https://live.bilibili.com/${LIVE_ROOM_ID}`
      : `本次直播已结束，感谢大家观看~`
    bot('send_group_msg', {
      group_id: GROUP_ID,
      message: message,
    })
  }
}

bot.listen(5701)
