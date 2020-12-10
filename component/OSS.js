let OSS = require('ali-oss')
let { aliyun} = require("../app/config")

let client = new OSS(aliyun.oss)

module.exports = client
