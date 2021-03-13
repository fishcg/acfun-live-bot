let OSS = require('ali-oss')
let { aliyun } = require("../config")

let client = new OSS(aliyun.oss)
client.getFileUrl = function (filepath) {
  return aliyun.oss.publicUrl + filepath
}
module.exports = client
