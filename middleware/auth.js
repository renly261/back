import jwt from 'jsonwebtoken'
import users from '../models/users.js'

// middleware 多了 next, 如果這個 middleware 通過之後你的下一步接後續資料的處理, 沒有通過的話只要遇到 res.send 整個流程就結束
// middleware 就像篩選器, 通過才讓你執行下一步
export default async (req, res, next) => {
  try {
    // 去檢查有沒有 headers 的認證, 若有的話把它 replace 把前面多的字刪掉 只把我們的 token 拉出來, 沒有的話就是空的
    // replace('舊的字串', '要替換成的新的字串'), 只會回傳 replace() 後的結果, 不會改變原本的資料
    // 要這樣做是因為如果通過驗證 token 前面會多一串 Bearer 空格 的字, 所以要把要把前面的 Bearer 空格 刪掉只留 token
    // 這裡的就是原本 req.headers.authorization 會是 Bearer token, 用 replace('Bearer ', '') 把前面的 Bearer 刪除只留 token
    // https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/String/replace
    const token = req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : ''
    // 若有這個 token
    if (token.length > 0) {
      // 解碼 jwt
      const decoded = jwt.decode(token)
      // 取出裡面紀錄的使用者 _id
      const _id = decoded._id
      //! 查詢是否有使用者資料有 jwt 紀錄的 _id 以及該 jwt
      //! 把 user 的資料和這次請求用的 token 放進 req 這個變數裡面, 在 controllers 可以直接用 req.user 知道是哪個使用者過來的請求
      req.user = await users.findOne({ _id, tokens: token })
      //! 寫入 req 裡以便後續使用
      //! 把 token 這個東西直接放進 req 裡面, 在 controllers 可以直接用 req.token 知道該使用者是用甚麼 token 來請求東西
      req.token = token
      // 若有找到此使用者
      if (req.user !== null) {
        if (req.baseUrl === '/users' && req.path === '/extend') {
          next()
        } else {
          jwt.verify(token, process.env.SECRET)
          next()
        }
      // 若找不到此使用者
      } else {
        // 觸發錯誤讓程式進 catch
        throw new Error()
      }
    // 若沒有這個 token
    } else {
      // 觸發錯誤讓程式進 catch
      throw new Error()
    }
  } catch (error) {
    console.log(error)
    res.status(401).send({ success: false, message: '驗證錯誤' })
  }
}
