const R = require('ramda')
const crypto = require('crypto')

/**
 * 定时任务
 *
 * @param func 定时执行的函数
 * @param seconds 时间周期（单位：秒）
 */
async function timingTask(func, seconds) {
  let delay = seconds * 1000
  await func()
  setInterval(func, delay)
}

/**
 * 通过数组中某个元素（对象）的属性值查找元素在数组中的索引位置
 *
 * @param {String} attrName 属性名
 * @param {mixed} attrValue 属性值
 * @param {Object[]} array 多个对象组成的数组
 * @return int 对应元素在数组中的索引位置，若不存在返回 -1
 */
function findIndexByAttr(attrName, attribute, array) {
  return R.findIndex(R.propEq(attrName, attribute))(array)
}

/**
 * base64 加密
 *
 * @param {String} str 需要加密的字符串
 * @return {String} 已加密的字符串
 */
function base64_encode(str) {
  return new Buffer(str).toString('base64')
}

/**
 * base64 解密（以 utf-8 编码解密）
 *
 * @param {String} str 需要解密的字符串
 * @return {String} 已解密的字符串
 */
function base64_decode(str) {
  return new Buffer(str, 'base64').toString('utf8')
}

/**
 * 使用 hash 加密
 *
 * @param {String} algorithm 加密算法名  (i.e. "md5", "sha256", "haval160,4", etc..)
 * @param {String} data 需要进行加密的信息
 * @param {String} key 加密密钥
 * @return {Buffer | string}
 */
function hash_hmac(algorithm, data, key = '') {
  return crypto.createHmac(algorithm, key).update(data).digest('hex')
}

/**
 * 格式化时间
 *
 * @param {Object} time 时间戳
 * @param {Object} fmt 格式
 * @return {String} 格式化后的日期时间
 */
function date(time, fmt) {
  time = time === undefined ? new Date() : time * 1000;
  /* var now = new Date();
  if( (now - time)<=80000){
      return '刚刚'
  }
  if ((now - time) < 3600000) {
      return Math.ceil((now - time)/60000) + '分钟前'
  } */
  time = typeof time == 'number' ? new Date(time) : time;
  fmt = fmt || 'yyyy-MM-dd HH:mm:ss';
  var obj = {
    'y': time.getFullYear(), // 年份，注意必须用getFullYear
    'M': time.getMonth() + 1, // 月份，注意是从0-11
    'd': time.getDate(), // 日期
    'q': Math.floor((time.getMonth() + 3) / 3), // 季度
    'w': time.getDay(), // 星期，注意是0-6
    'H': time.getHours(), // 24小时制
    'h': time.getHours() % 12 == 0 ? 12 : time.getHours() % 12, // 12小时制
    'm': time.getMinutes(), // 分钟
    's': time.getSeconds(), // 秒
    'S': time.getMilliseconds(), // 毫秒
  }
  var week = ['天', '一', '二', '三', '四', '五', '六'];
  for(var i in obj) {
    fmt = fmt.replace(new RegExp(i+'+', 'g'), function (m) {
      var val = obj[i] + ''
      if(i == 'w') return (m.length > 2 ? '星期' : '周') + week[val]
      for(var j = 0, len = val.length; j < m.length - len; j++) val = '0' + val
      return m.length == 1 ? val : val.substring(val.length - m.length)
    })
  }
  return fmt
}

exports.timingTask = timingTask
exports.findIndexByAttr = findIndexByAttr
exports.hash_hmac = hash_hmac
exports.base64_decode = base64_decode
exports.base64_encode = base64_encode
exports.date = date
