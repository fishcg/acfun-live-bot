const { timingTask } = require('./lib/Utils')
const bot = require('./component/QQBot')
const liveBot = require('./tasks/liveBot')

// QQ 消息类型
const QQ_MESSAGE_TYPE_PRIVATE = 'private'
const QQ_MESSAGE_TYPE_GROUP = 'group'

// 监听 QQ 信息
bot.on('message', async context => {
  if (context.message_type === QQ_MESSAGE_TYPE_GROUP && bot.isAtMe(context)) {
    // 对群消息中 @bot 的消息进行处理
    let groupQQ = context.group_id
    let replay = await getGroupReplay(context)
    if (!replay) {
      return
    }
    bot('send_group_msg', {
      group_id: groupQQ,
      message: replay,
    })
  } else if (context.message_type === QQ_MESSAGE_TYPE_PRIVATE && context.message === '233') {
    // 对群消息中 @bot 的消息进行处理
    // NOTICE: 目前仅进行 DEBUG，输入“233”时回应“success”
    console.log('test msg: ' + context.message)
    let message = `success`
    bot('send_msg', {
      ...context,
      message: message,
    })
  }
})

async function getGroupReplay(context) {
  // NOTICE: 目前仅对直播消息进行回复
  return await liveBot.getReplay(context)
}

// 每 30 秒检测是否开播
console.log('qqbot live status check is start')
timingTask(liveBot.liveStatusCheck, 30)

bot.listen(5701)
console.log('qqbot listen in 5701')
