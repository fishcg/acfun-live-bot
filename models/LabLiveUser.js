const baseModel = require('./BaseModel')

// 状态，失败，0：停用，1：使用中
const STATUS_UNUSEFULE = 0
const STATUS_USEING = 1

// 直播类型
const LIVE_TYPE_ACFUN = 1 // acfun

// 直播机器人配置开关比特位
const BOT_CONF_BROADCAST = 1 // 广播
const BOT_CONF_NOTIFY = 2 // 自动开关播
const BOT_CONF_RECORD = 4 // 录播
const BOT_CONF_AUTH_RECORD = 8 // 自动录播

/*
CREATE TABLE `lab_live_user` (
  `id` bigint NOT NULL COMMENT '主键',
  `create_time` bigint NOT NULL DEFAULT '0' COMMENT '创建时间',
  `modified_time` bigint NOT NULL DEFAULT '0' COMMENT '更新时间',
  `type` tinyint NOT NULL DEFAULT '0' COMMENT '直播类型，1：acfun；2：bilibili',
  `live_id` bigint NOT NULL DEFAULT '0' COMMENT '直播间 ID',
  `username` varchar(125) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '' COMMENT '用户名称',
  `group_qq` bigint NOT NULL DEFAULT '0' COMMENT 'QQ 群号',
  `bot_conf` int NOT NULL DEFAULT '0' COMMENT '直播机器人配置，比特位第一位为 1 表示开启广播公告；比特位第二位为 1 表示开启自动开关播提醒；比特位第三位为 1 表示开启录播功能；比特位第四位为 1 表示开启自动录播功能；',
  `status` tinyint NOT NULL DEFAULT '0' COMMENT '直播间状态，0：停用；1：开启',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_type_liveid` (`type`,`live_id`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
*/
class LabLiveUser extends baseModel.model {
  getTable() {
    return 'lab_live_user'
  }
  fields() {
    let fields = ['id', 'create_time', 'modified_time', 'type', 'live_id', 'username', 'group_qq', 'bot_conf', 'status']
    return fields
  }
  attributeLabels() {
    return {
      id: '主键',
      create_time: '创建时间',
      modified_time: '更新时间',
      type: '直播类型', // 1：acfun；2：bilibili
      live_id: '直播间 ID',
      username: '用户名称',
      group_qq: 'QQ 群号',
      // 比特位第一位为 1 表示开启广播公告；比特位第二位为 1 表示开启自动开关播提醒；比特位第三位为 1 表示开启录播功能；
      // 比特位第四位为 1 表示开启自动录播功能；
      bot_conf: '直播机器人配置',
      status: '直播间状态', // 0：停用；1：开启
    }
  }

  /**
   * 获取全部直播间
   *
   * @param roomID
   * @param startTime
   * @param endTime
   * @return {Promise<*>}
   */
  async findAllRecords() {
    // 查找 24 小时内是否有正在录制的直播
    return await this.find().where('status = ? ', [STATUS_USEING]).all()
  }

  /**
   * 是否开启开关播提醒
   *
   * @param botConf
   */
  isNotify(botConf) {
    return Boolean(botConf & BOT_CONF_NOTIFY)
  }

  /**
   * 是否开启录播功能
   *
   * @param botConf
   */
  isOpenRecord(botConf) {
    return Boolean(botConf & BOT_CONF_RECORD)
  }

  /**
   * 是否开启自动录播
   *
   * @param botConf
   */
  isOpenAuthRecord(botConf) {
    return Boolean(botConf & BOT_CONF_AUTH_RECORD)
  }
}

module.exports = new LabLiveUser()
