import express from 'express'
import auth from '../middleware/auth.js'
import upload from '../middleware/upload.js'
import { addCarousel } from '../controllers/homes.js'

const router = express.Router()

// router.增改刪查('路徑', 是否要驗證, controllers 裡的 function)
// auth 就是用使用者登入時的 token 來做驗證, 所有跟該使用者有關的事情都要先用 auth 驗證在進 controllers
// 有 auth 的話前台要做驗證, 前台來的資料或請求可以在 controllers 用 req.前台來的資料 來處理, 若前台沒送資料或請求可以 {} 空的
// 通常只有新增 post 或更新 patch 前台才會傳資料或資料給後台

// 註冊, 前台的路徑為 await this.axios.post('/users', 前台要給後台的資料或請求)
router.post('/', auth, upload, addCarousel)

export default router
