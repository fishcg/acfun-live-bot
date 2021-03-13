const baseModel = require('./BaseModel')
const Utils = require('../lib/Utils')

// 状态，-1： 失败，0：录播中，1：录播完成
const STATUS_ERROR = -1
const STATUS_PENDING = 0
const STATUS_SUCCESS = 1

// 直播类型
const LIVE_TYPE_ACFUN = 1 // acfun

class LiveRecord extends baseModel.model {
  getTable() {
    return 'lab_live_record'
  }
  fields() {
    let fields = ['id', 'live_type', 'room_id', 'title', 'path', 'status', 'quality', 'create_time', 'modified_time']
    return fields
  }
  attributeLabels() {
    return {
      id: '用户 ID',
      live_type: '直播类型',  // 1：acfun
      room_id: '直播间 ID',
      title: '直播标题',
      path: '文件地址',
      status: '状态',  // -1：失败，0：录播中，1：录播完成
      quality: '视频质量',  // 0：高清，1：超清；2：蓝光 4M，3：蓝光 8M',
      create_time: '创建时间',
      modified_time: '修改时间',
    }
  }

  /**
   * 创建新的录播记录
   *
   * @param roomID
   * @param title
   * @param quality
   * @return {Number} 新增 ID
   */
  async newRecord(roomID, title, quality) {
    // 查找 24 小时内是否有正在录制的直播
    let now = Utils.now()
    this.attrs = {
      live_type: LIVE_TYPE_ACFUN,
      room_id: roomID,
      title: title,
      path: '',
      status: STATUS_PENDING,
      quality: quality,
      create_time: now,
      modified_time: now,
    }
    let newRow = await this.save()
    return newRow ? newRow.insertId : 0
  }

  /**
   * 查找 24 小时内是否有正在录制的直播
   *
   * @param roomID
   * @return {Promise<*>}
   */
  async isRecording(roomID) {
    // 查找 24 小时内是否有正在录制的直播
    let now = Utils.now()
    let mixTime = now - 86400
    return await this.find()
      .where('room_id = ? AND status = ? AND live_type = ? AND create_time > ?', [roomID, STATUS_PENDING, LIVE_TYPE_ACFUN, mixTime]).exits()
  }

  /**
   * 更新录播文件地址
   *
   * @param id
   * @param path
   * @return {Promise<any>}
   */
  async updatePath(id, path) {
    // 查找 24 小时内是否有正在录制的直播
    let now = Utils.now()
    return await this.updateByPk(id, { path: `'${path}'`, modified_time: now, status: STATUS_SUCCESS })
  }

  /**
   * 获取某段时间内的录播记录
   *
   * @param roomID
   * @param startTime
   * @param endTime
   * @return {Promise<*>}
   */
  async getRecords(roomID, startTime, endTime) {
    // 查找 24 小时内是否有正在录制的直播
    return await this.find()
      .where('room_id = ? AND status = ? AND live_type = ? AND create_time >= ? AND create_time < ?',
        [roomID, STATUS_SUCCESS, LIVE_TYPE_ACFUN, startTime, endTime]).all()
  }

}

module.exports = new LiveRecord()
