'use strict';
/* 该数据库仅用作临时数据保存用，总大小不能超过 1 G */

const Datastore = require('nedb')
const { promisify } = require('util')
const { DB_FILE } = require('../config/system')

let db = new Datastore({ filename: DB_FILE, autoload: true })

db.insertASync = promisify(db.insert)
db.removeASync = promisify(db.remove)
db.updateASync = promisify(db.update)
db.findASync = promisify(db.find)
db.findOneASync = promisify(db.findOne)
db.count = promisify(db.count)
db.docTypes = {
  PIXIV: 'pixiv',
  NEWS: 'news',
}

module.exports = db