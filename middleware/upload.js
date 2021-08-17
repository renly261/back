// 上傳東西的套件
import multer from 'multer'
import FTPStorage from 'multer-ftp'
// 內建的套件, 處理和路徑有關的所有東西
import path from 'path'
// node.js 內建的檔案系統套件 https://nodejs.org/api/fs.html#fs_file_system
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

// 收到檔案後的儲存設定
let storage
// 若是要存在 ftp
if (process.env.FTP === 'true') {
  storage = new FTPStorage({
    ftp: {
      host: process.env.FTP_HOST,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASS,
      secure: false
    },
    // 收到使用者上傳的檔案存放的位置, (req , 進來的檔案, options, 是否有錯誤)
    destination (req, file, options, callback) {
      // callback 第一個欄位放的都是錯誤, null 代表不放錯誤讓上傳動作繼續, 放錯誤的話就把上傳擋掉
      // 用時間當檔名，這裡的檔名是完整的路徑
      callback(null, '/' + Date.now() + path.extname(file.originalname))
    }
  })
  // 若是要存在本地
} else {
  storage = multer.diskStorage({
    // 存放位置
    destination (req, file, callback) {
      // 用 path 套件 path.join() 將目前 node.js 執行的資料夾和 upload 組成路徑
      // path.join() https://nodejs.org/api/path.html#path_path_join_paths, 可以將好幾個路徑組合成一個字串, 會幫你自動組成正確的路徑, 不用擔心有沒有 /
      // process.cwd() 回傳 node.js 目前正在執行的資料夾 http://nodejs.cn/api/process/process_cwd.html
      // 因為 upload 是放使用者上傳的圖片並不屬於 code 的一部份, 所以會放在 .gitignore 裡, 但若之後換電腦或把 code 載下來要開開看的時候會發現 upload 資料夾不見了, 所以寫一個程式讓他自動建立 upload 資料夾避免錯誤
      const folder = path.join(process.cwd(), '/upload')
      // 檢查有無此資料夾, 若路徑不存在 https://nodejs.org/api/fs.html#fs_fs_existssync_path
      // 用 existsSync 和 mkdirSync 是因為它可以同步的回, 否則要寫 callback function
      if (!fs.existsSync(folder)) {
        // 建立資料夾 https://nodejs.org/api/fs.html#fs_fs_mkdirsync_path_options
        fs.mkdirSync(folder)
      }
      // 若有 upload 資料夾就將資料存進 upload 資料夾
      // callback(第一個放有無錯誤, 第二個放路徑)
      callback(null, 'upload/')
    },
    // 檔案命名規則, 避免檔名名稱相同後面的蓋掉前面的檔案
    filename (req, file, callback) {
      // 使用 Date.now() 目前的時間戳記當檔名，加上 path.extname(file.originalname) 原始檔案的副檔名
      // https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/Date/now
      callback(null, Date.now() + path.extname(file.originalname))
    }
  })
}

// 設定 multer
const upload = multer({
  // 使用上面的設定
  storage,
  // 過濾檔案，因為內建的 limits 無法過濾檔案類型所以要自己寫
  fileFilter (req, file, callback) {
    // 檢查檔案類型是不是圖片
    // mimetype 檔案的媒體類別 https://developer.mozilla.org/zh-TW/docs/Web/HTTP/Basics_of_HTTP/MIME_types
    if (!file.mimetype.includes('image')) {
      // multer 套件的錯誤訊息格式 https://github.com/expressjs/multer/blob/master/lib/multer-error.js, 可以限制數量或檢查上傳欄位名稱對不對等等
      // 因為 multer 套件沒有檢查圖片格是否錯誤的代碼, 所以自己建立一個
      // 觸發一個自訂的 LIMIT_FORMAT 錯誤，因為套件內建的錯誤都是 LIMIT 開頭，所以跟隨套件風格
      // callback(第一個欄位都是放錯誤, false(不過) true(過))
      callback(new multer.MulterError('LIMIT_FORMAT'), false)
      // 若檔案類型是圖片, callback(錯誤為空, true(給過))
    } else {
      callback(null, true)
    }
  },
  // 限制上傳檔案
  limits: {
    // 大小 10MB, 單位是 b
    fileSize: 10240 * 10240
  }
})

export default async (req, res, next) => {
  // 只接受上傳一個 models 裡面欄位名稱是 image 的檔案
  upload.single('image')(req, res, async error => {
    if (error instanceof multer.MulterError) {
      // 如果上傳發生錯誤
      let message = '上傳錯誤'
      if (error.code === 'LIMIT_FILE_SIZE') {
        message = '檔案太大'
      } else if (error.code === 'LIMIT_FORMAT') {
        message = '格式不符'
      }
      res.status(400).send({ success: false, message })
    } else if (error) {
      console.log(error)
      // 其他錯誤
      res.status(500).send({ success: false, message: '伺服器錯誤' })
    } else {
      // 沒有錯誤就繼續
      // req.file 是傳入的檔案資訊
      if (req.file) {
        console.log(req.file)
        req.filepath = process.env.FTP ? path.basename(req.file.path) : req.file.filename
      }
      next()
    }
  })
}
