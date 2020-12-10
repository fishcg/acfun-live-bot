const fs = require("fs")
const path = require("path")

// PATH
const BASE_PATH = path.join(__dirname, '/..');
const RUNTIME_PATH = path.join(BASE_PATH, ".runtime");
const TEMP_PATH = path.join(RUNTIME_PATH, "temp");
const LOG_PATH = path.join(RUNTIME_PATH, "log");
const DB_PATH = path.join(RUNTIME_PATH, "db");
const DB_FILE = path.join(DB_PATH, "datafile");
const PROTO_ROOT = path.join(BASE_PATH, "protos");

let PATHS = [RUNTIME_PATH, TEMP_PATH, LOG_PATH, DB_PATH, PROTO_ROOT];
for (let PATH of PATHS) {
  if (!fs.existsSync(PATH)) fs.mkdirSync(PATH);
}

exports.PYTHON = 'python3';
exports.ENV = "prod"; // dev or prod
exports.TEMP_PATH = TEMP_PATH;
exports.LOG_PATH = LOG_PATH;
exports.DB_FILE = DB_FILE;
exports.PROTO_ROOT = PROTO_ROOT
exports.BASE_PATH = BASE_PATH
