import express from 'express'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import bodyParser from 'body-parser'
import cors from 'cors'

// import router, 在下方也要 app.user()
import userRouter from './routes/users.js'
import productRouter from './routes/products.js'
import fileRouter from './routes/files.js'

dotenv.config()

// 連接資料庫
mongoose.connect(process.env.MONGODB)

// 網頁伺服器
const app = express()

// 設定跨域套件
// 設定前端來的跨域請求
app.use(
  cors({
    // origin 為請求來源網域, callback 為是否允許的回應
    // 用 .env 檔裡的 DEV 是 true 或 false 來判斷是否在開發環境
    origin (origin, callback) {
      // 若是在開發環境的話(測試階段自己使用)
      if (process.env.DEV === 'true') {
        // 允許任何來源網域的請求
        callback(null, true)
        // 若要拒絕請求則是
        // callback(new Error('cors error'), false)

        // 若不是在開發環境(成品階段給別人使用)
        // 之後後台上 heroku 之後只接受 github 過來的請求
      } else {
        // origin === undefined 代表 postman
        if (origin !== undefined && origin.includes('github')) {
          callback(null, true)
        } else {
          callback(new Error('Not allowed'), false)
        }
      }
    }
  })
)

// 處理 cors 錯誤
app.use((_, req, res, next) => {
  res.status(403).send({ success: false, message: '請求被拒絕' })
})

// express 無法直接讀 post 的東西, 要用 body-parser 來處理 post 的資料
app.use(bodyParser.json())

// 處理 body-parser 錯誤
// function 一定要放四個東西 error, req, res, next
// _ = error = Express 發生的錯誤
// error 一定要寫，但是不使用的話 可以 _ 替代
// next = 是否要繼續下一個步驟，使用方式為 next()
app.use((_, req, res, next) => {
  res.status(400).send({ success: false, message: '內容格式錯誤' })
})

// 將路由分類，所有進到 /users 路徑的請求(req)使用 users 的路由
// 根據傳進來的路由判斷由哪個預設的請求來回應
app.use('/users', userRouter)
app.use('/products', productRouter)
app.use('/files', fileRouter)

// 最後擋住 404 不要顯示 express 內建的 404
app.all('*', (req, res) => {
  res.status(404).send({ success: false, message: '找不到內容' })
})

// 在 3000 port 啟用
app.listen(process.env.PORT, () => {
  console.log('server start')
})
