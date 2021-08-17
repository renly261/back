import express from 'express'
import auth from '../middleware/auth.js'
import upload from '../middleware/upload.js'
import { register, login, logout, addCart, getCart, editCart, checkout, getorders, getallorders, extend, getuserinfo } from '../controllers/users.js'

const router = express.Router()

// router.增改刪查('路徑', 是否要驗證, controllers 裡的 function)
// auth 就是用使用者登入時的 token 來做驗證, 所有跟該使用者有關的事情都要先用 auth 驗證在進 controllers
// 有 auth 的話前台要做驗證, 前台來的資料或請求可以在 controllers 用 req.前台來的資料 來處理, 若前台沒送資料或請求可以 {} 空的
// 通常只有新增 post 或更新 patch 前台才會傳資料或資料給後台

// 註冊, 前台的路徑為 await this.axios.post('/users', 前台要給後台的資料或請求)
router.post('/', upload, register)

// 查詢使用者資料, 前台的路徑為 await this.axios.get('/users/', {前台做驗證})
router.get('/', auth, getuserinfo)

// 登入, 前台的路徑為 await this.axios.post('/users/login', 前台要給後台的資料或請求)
router.post('/login', login)

// 登出, 前台的路徑為 await this.axios.delete('/users/logout', {前台做驗證})
// delete 不會帶任何資料過來, 但可以帶 jwt 去把它登出
router.delete('/logout', auth, logout)

// 加入購物車, 前台的路徑為 await this.axios.post('/users/cart', {前台要給後台的資料或請求}, {前台做驗證})
router.post('/cart', auth, addCart)

// 取得購物車資料, 前台的路徑為 await this.axios.get('/users/cart', {前台做驗證})
router.get('/cart', auth, getCart)

// 編輯購物車, 前台的路徑為 await this.axios.patch('/users/cart', {前台要給後台的資料或請求}, {前台做驗證})
router.patch('/cart', auth, editCart)

// 購物車結帳, 前台的路徑為 await this.axios.post('/users/checkout', {前台要給後台的資料或請求}, {前台做驗證})
router.post('/checkout', auth, checkout)

// 取得使用者的訂單資料, 前台的路徑為
router.get('/orders', auth, getorders)

// 取得所有會員的訂單資料, 前台的路徑為 await this.axios.get('/users/orders/all', {前台做驗證})
router.get('/orders/all', auth, getallorders)

// 延長簽證 jwt, 前台的路徑為 await this.axios.post('/users/extend', {前台要給後台的資料或請求}, {前台做驗證})
router.post('/extend', auth, extend)

export default router
