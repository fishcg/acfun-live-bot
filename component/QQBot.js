const CQHttp = require('cqhttp')
const { qqBot } = require('../config')

const QQ = qqBot.botQQ  // self

// 文档地址：https://github.com/cqmoe/cqhttp-node-sdk
const bot = new CQHttp({
  apiRoot: qqBot.url,
})

/**
 * 是否为 @ 机器人
 *
 * @param context
 * @returns {Boolean}
 */
bot.isAtMe = function (context) {
  let atMe = context.message.substr(0, 12 + QQ.toString().length)
  return atMe === `[CQ:at,qq=${QQ}] `
}

/**
 * 获取消息信息（去除 @ 信息后的消息）
 *
 * @param context
 * @returns {String}
 */
bot.getMessage = function (context) {
  return context.message.replace(`[CQ:at,qq=${QQ}] `, '')
}

console.log(`QQ service is ${qqBot.url}`)
module.exports = bot
