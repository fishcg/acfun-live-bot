const mysql  = require('mysql')
const config = require('../config')

const DB_POOL = mysql.createPool(config.mysql)

class Model {
  // 构造函数
  constructor() {
    this.queryObj = {
      select: '*',
      where: '',
      params: [],
      order: '',
      limit: null,
    }
    this.attrs = {}
  }
  attributeLabels() {
    return {}
  }
  fields() {
    return []
  }
  getTable() {
    return ''
  }
  getDb() {
    return config.mysql.database
  }
  find() {
    this.queryObj = {
      select: '*',
      where: '',
      params: [],
      order: '',
      limit: null,
    }
    return this
  }
  select(str) {
    // @TODO: 需要预处理查询语句
    this.queryObj.select = str
    return this
  }
  where(str, params) {
    params = params || this.queryObj.params
    // @TODO: 需要预处理查询语句
    this.queryObj.where = str
    if (params.length > 0) {
      this.queryObj.params = params
    }
    return this
  }
  limit(offset, count) {
    offset = parseInt(offset)
    count = count || null
    if (offset < 0) offset = 0
    if (!count) {
      this.queryObj.limit = offset
    } else {
      this.queryObj.limit = `${offset}, ${count}`
    }
    return this
  }
  order(str) {
    this.queryObj.order = str
    return this
  }
  async one() {
    this.queryObj.limit = 1
    let data = await this.query()
    data = data[0]
    return data
  }

  async exits() {
    this.queryObj.select = '1'
    this.queryObj.limit = 1
    let data = await this.query()
    data = data[0]
    return !!data
  }

  async all() {
    return await this.query()
  }
  async save() {
    return await this.saveData()
  }

  async updateByPk(id, updateAttr) {
    let table = this.getTable()
    let db = this.getDb()
    let updateArr = []
    for (let key in updateAttr) {
      updateArr.push(`${key} = ${updateAttr[key]}`)
    }
    let update = updateArr.join(', ')
    let sql = `UPDATE ${db}.${table} SET ${update} WHERE id = ${id}`
    return await this.queryDB(sql)
  }

  async saveAsync(db) {
    let data = await this.saveData()
    db(data)
  }
  //
  async saveData() {
    let table = this.getTable()
    let db = this.getDb()
    let fieldsArr = this.fields()
    let fields = ''
    let values = ''
    let attrsNameArr = []
    let valuesArr = []
    let attrs = this.attrs
    for (let attr in attrs) {
      if (fieldsArr.indexOf(attr) !== -1) {
        attrsNameArr.push(attr)
        valuesArr.push(`'${attrs[attr]}'`)
      }
    }
    fields = attrsNameArr.join(', ')
    values = valuesArr.join(', ')
    let sql = 'INSERT INTO `' + db + '`.`' + table + '` (' + fields + ') VALUES (' + values + ')'
    let data = await this.queryDB(sql, this.queryObj.params)
    return data
  }

  async query() {
    let table = this.getTable()
    let db = this.getDb()
    let sql = 'SELECT ' + this.queryObj.select + ' FROM `' + db + '`.`' + table + '`';
    if (this.queryObj.where) {
      sql += ' WHERE ' + this.queryObj.where
    }
    if (this.queryObj.order) {
      sql += ' ORDER BY ' + this.queryObj.order
    }
    if (this.queryObj.limit !== null) {
      sql += ' LIMIT ' + this.queryObj.limit
    }
    let data = await this.queryDB(sql, this.queryObj.params)
    return data
  }
  async queryDB(sql, params = []) {
    // console.log([sql, params])
    return new Promise((resolve, reject) => {
      DB_POOL.getConnection(function(err, connection) {
        if (err) {
          reject(err)
        } else {
          connection.query(sql, params, (err, rows) => {
            if (err) {
              reject(err)
            } else {
              // that.data = rows
              resolve(rows)
            }
            // 结束会话
            connection.release()
          })
        }
      })
    })
  }
}
exports.model = Model
