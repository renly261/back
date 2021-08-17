import users from '../models/users.js'
import products from '../models/products.js'
import orders from '../models/orders.js'
import md5 from 'md5'
import jwt from 'jsonwebtoken'

//! 在 middleware auth.js 裡已經把 req.user req.token 寫成一個變數
//! req.user 可以知道是哪個使用者過來的請求
//! req.token 可以知道使用者是用哪個 token 來請求東西

// 註冊 -----------------------------------------------------------------------------
//! 檢查進來的資料格式 > 使用者資料庫建立一個 rea.body 將註冊進來的資料丟進去給 mongoose 處理和驗證
// req 是進來的請求, res 是出去的回應
export const register = async (req, res) => {
  // 驗證進來的請求 req 的格式是否是 JSON, content-type 資料類型
  // 若沒有 req.headers['content-type'] 或 req.headers['content-type'] 不是JSON
  // 若要上傳圖片或檔案要使用 form-date
  if (!req.headers['content-type'] || !req.headers['content-type'].includes('multipart/form-data')) {
    // 出去的回應 res, 400 代表伺服器收到無效的語法
    res.status(400).send({ success: false, message: '資料格式不正確' })
    return
  }
  // 成功通過驗證要做的事
  try {
    // 直接把使用者傳進來的東西丟進去, users 是 models => users.js => export default mongoose.model('users', UserSchema), 有內建驗證功能
    // 讓 users 這個 models 去建立一個資料, 把使用者傳入 post 的東西丟進去給 mongoose 處理, mongoose 有內建驗證
    // 前台 await this.axios.post('/users', this.form), this.form 就是前台丟給後台的資料, 直接把 this.form 塞進 req.body
    // 將使用者註冊時在前台傳進來的東西直接丟進 req.body 然後存進 models users
    // ... 其餘運算子(解構賦值), 將 ... 後面的陣列或 Json 資料解開成一個一個獨立資料變數
    // 以這例子就是用 ...req.body 將使用者傳進來的資料解構成 account password 等一個一個獨立欄位在放進去
    await users.create({ image: req.filepath, ...req.body })
    // 通常只有失敗會丟錯誤訊息, 因為是使用者個人資料也不會 result
    res.status(200).send({ success: true, message: '' })
  } catch (error) {
    // 若錯誤訊息是 mongoose 內建的驗證錯誤(ValidationError)
    if (error.name === 'ValidationError') {
      // 因為驗證錯誤是拿資料欄位當 key 值, 所以用 Object.keys 去取第一筆當 key 值
      // 物件中 key 是屬性的名稱可以是任何字串, value 是屬性的值, 例如 {a:1}, a 就是 key, 1 就是 value
      // object.key() 會回傳一個只有 key 的陣列並從小到大排列, 若是陣列則會回傳陣列的索引(0, 1, 2 ...又叫 key 或 index)
      // 陣列可以直接 .length 取長度 或 [索引] 取第幾個資料, JSON 則無法, 所以需要 Object.keys 來幫助我們去取第幾個資料
      const key = Object.keys(error.errors)[0]
      // 取驗證失敗的訊息
      // JSON 物件可以用 . 操作屬性, 只能在 key 不包含符號的狀況下使用，因為 JavaScript 並不會知道後面的符號是 key 的一部分
      // JSON 物件也可以用 [] 操作屬性, 可接受 key 中有符號, 可以接受變數，會將變數中的值自動轉換成 string 再去讀取
      const message = error.errors[key].message
      res.status(400).send({ success: false, message: message })
      // 若錯誤訊息是 unique 的錯誤訊息, unique 沒有內建錯誤訊息, 要自己在這裡寫
    } else if (error.name === 'MongoError' && error.code === 11000) {
      // 使用者資料重複錯誤
      res.status(400).send({ success: false, message: '帳號已存在' })
    } else {
      res.status(500).send({ success: false, message: '伺服器錯誤' })
    }
  }
}

// 登入 -----------------------------------------------------------------------------
//! 檢查進來的資料格式 > 去使用者資料庫查詢有無進來的那個帳號的使用者 > 去使用者資料庫查詢有無進來的那個密碼的使用者 > 給一組 token push 進使用者資料庫 > 儲存
// models users 資料去 findOne({ account: req.body.account }, '') 查詢 models users 裡有無該使用者登入時傳來的東西
// 註冊時會把該使用者輸入的資料丟進 req.body 然後存進 models users 裡, 所以用 req.body.account .password 去看該使用者登入時傳進來的東西和 models users 裡當初該使用者註冊存進來的東西一不一樣
export const login = async (req, res) => {
  // 一樣先檢查進來的資料有沒有 req.headers['content-type'] 或 req.headers['content-type'] 不是JSON
  if (!req.headers['content-type'] || !req.headers['content-type'].includes('application/json')) {
    res.status(400).send({ success: false, message: '資料格式不正確' })
    // 使用者丟進來的資料格式對的話就繼續, 不對的話就 return function 就在這裡停住不繼續往下執行
    return
  }
  // 通過上方驗證要做的事
  try {
    // 去使用者資料庫撈出有沒有符合新增(post) 進來帳號的使用者, 簡單來說就是去 models users 檢查有無使用者輸入的那個帳號的使用者
    // 查詢使用者資料庫 models users 的 account 欄位是否有該使用者當初註冊的 req.body.account, 找到一筆有沒有符合傳進來的帳號的東西
    const user = await users.findOne({ account: req.body.account }, '')
    // 若該 user 的 account 就是當初該 user 註冊時 users.create(req.body) 進來的資料 account 的話
    if (user) {
      // 同上如果該 user 的 password 就是當初該 user 註冊時 users.create(req.body) 進來的資料 password 的話
      // 要 md5 是因為在 models users 在驗證後準備把資料存入使用者資料庫前有做 md5 密碼加密
      // 若有該帳號的使用者, 檢查使用者資料庫的密碼是否和你進來的的密碼加密之後一樣, md5 同一個東西加密後的東西會一樣所以可以用 md5 加密後一不一樣來驗證進來的密碼是否一樣
      // http://www.md5.cz/
      if (user.password === md5(req.body.password)) {
        // 若帳號密碼都正確, 使用者登入時給一個簽證 token, 該簽證持續 7 天
        const token = jwt.sign(
          // 使用者的 _id
          { _id: user._id.toString() },
          // 加密用的 key
          process.env.SECRET,
          // 一次簽證維持多久
          { expiresIn: '7 days' })
        // 將該簽證 token 資料 push 進 models users tokens 欄位
        user.tokens.push(token)
        // 將上面的資料存回去
        // validateBeforeSave: false 先暫時停用內建的驗證
        user.save({ validateBeforeSave: false })
        res.status(200).send({
          success: true,
          message: '登入成功',
          token,
          email: user.email,
          account: user.account,
          role: user.role,
          image: user.image
        })
        // 若該 user 的 password 不是當初該 user 註冊時 users.create(req.body) 進來的資料 password 的話
      } else {
        res.status(400).send({ success: false, message: '密碼錯誤' })
      }
      // 若該 user 的 account 不是當初該 user 註冊時 users.create(req.body) 進來的資料 account 的話
    } else {
      res.status(400).send({ success: false, message: '帳號錯誤' })
    }
  } catch (error) {
    console.log(error)
    res.status(500).send({ success: false, message: '伺服器錯誤' })
  }
}

// 登出 -----------------------------------------------------------------------------
//! 將該使用者的 token 從使用者資料庫中拿掉 > 儲存
export const logout = async (req, res) => {
  try {
    // 將這次請求的 JWT 從使用者資料移除
    // filter(傳進去的 function 的參數 => 這個參數要做甚麼去篩出你要的東西), true 的留著 false 的踢掉, filter 會建立一個新陣列, 不會去改變原本的陣列資料
    // 把該使用者傳進來 models 裡 tokens 欄位(是陣列)的 tokens 從陣列裡拿掉拿掉, 只留下不是的
    // 這個判斷條件是 models users 的 tokens 欄位資料(是陣列)裡面的每個東西如果不是該使用者傳進來的就留著, 是的踢掉
    // 登出 api 時把該使用者傳過來的 tokens 拿掉, 這樣那組 tokens 就沒用了, 因為我們在 middleware auth.js 裡面驗證的時候是去查說該使用者資料去 findOne({ _id, tokens: token }) 看有沒有符合該使用者的東西
    // 登出流程, 用 filter 將該使用著傳進來的 tokens 拿掉, 之後用那組序號去做需要登入才能做的事或請求就會沒有權限
    req.user.tokens = req.user.tokens.filter(token => token !== req.token)
    // .save() 將上面更改後的資料存回去
    // validateBeforeSave: false 先暫時停用內建的驗證
    req.user.save({ validateBeforeSave: false })
    res.status(200).send({ success: true, message: '' })
  } catch (error) {
    console.log(error)
    res.status(500).send({ success: false, message: '伺服器錯誤' })
  }
}

// 加入購物車 -----------------------------------------------------------------------------
export const addCart = async (req, res) => {
  try {
    // 驗證商品是否存在, 去 models products 找當初新增商品
    const result = await products.findById(req.body.product)
    // 如果找不到或已下架
    if (!result || !result.sell) {
      res.status(404).send({ success: false, message: '資料不存在' })
      return
    }
    // 找出該使用者的購物車內有沒有這個商品
    const idx = req.user.cart.findIndex(item => item.product.toString() === req.body.product)
    // 找到就數量 += 傳入的新增數量，沒找到就 push
    if (idx > -1) {
      req.user.cart[idx].amount += req.body.amount
    } else {
      req.user.cart.push({ product: req.body.product, amount: req.body.amount })
    }
    await req.user.save({ validateBeforeSave: false })
    res.status(200).send({ success: true, message: '' })
  } catch (error) {
    console.log(error)
    res.status(500).send({ success: false, message: '伺服器錯誤' })
  }
}

// 查詢購物車 -----------------------------------------------------------------------------
//! 去使用者資料庫查詢該 _id 使用者的 cart 欄位 > populate('cart.product') 用商品 _id 去關聯出該商品的 models products 裡的資料
export const getCart = async (req, res) => {
  try {
    // populate('models 裡面使用 ref 的欄位', '該 ref 裡要取那些欄位')
    // 去 models users 用使用者 _id 查詢使用者, 並將該使用者在 models users 裡的 cart 欄位抓出來, cart 欄位裡有 ref: 'products' 連結到 models products 的資料也一併帶出來
    // result 的東西可以在前台 pages/front/Cart.vue mounted 裡用 map 等方式將 this.cart 或 this.prodcts 等前台 data () {} 內的資料和後台做同步, 就可以在前台實時更新資料
    // findById(req.user._id, 'cart'), 前面是要依據甚麼東西去找 後面是要找那些東西, 以這個範例就是用 models users 的 _id 去找那個使用者的 cart 欄位, cart 欄位有連結到 models products 的資料用 populate(ref') 帶出來
    const { cart } = await users.findById(req.user._id, 'cart').populate('cart.product')
    res.status(200).send({ success: true, message: '', result: cart })
  } catch (error) {
    res.status(500).send({ success: false, message: '伺服器錯誤' })
  }
}

// 編輯購物車 -----------------------------------------------------------------------------
export const editCart = async (req, res) => {
  try {
    // 如果傳入的數量小於等於 0，刪除
    // 如果大於 0，修改數量
    if (req.body.amount <= 0) {
      await users.findOneAndUpdate(
        { 'cart.product': req.body.product },
        {
          $pull: {
            cart: {
              product: req.body.product
            }
          }
        }
      )
    } else {
      await users.findOneAndUpdate(
        // 找到 cart.product 裡符合傳入的商品 ID
        {
          'cart.product': req.body.product
        },
        // 將該筆改為傳入的數量，$ 代表符合查詢條件的索引
        {
          $set: {
            'cart.$.amount': req.body.amount
          }
        }
      )
    }
    res.status(200).send({ success: true, message: '' })
  } catch (error) {
    res.status(500).send({ success: false, message: '伺服器錯誤' })
  }
}

// 購物車結帳 -----------------------------------------------------------------------------
export const checkout = async (req, res) => {
  try {
    if (req.user.cart.length > 0) {
      await orders.create({ user: req.user._id, products: req.user.cart, date: new Date() })
      req.user.cart = []
      req.user.save({ validateBeforeSave: false })
    }
    res.status(200).send({ success: true, message: '' })
  } catch (error) {
    console.log(error)
    res.status(500).send({ success: false, message: '伺服器錯誤' })
  }
}

// 取得使用者訂單 -----------------------------------------------------------------------------
export const getorders = async (req, res) => {
  try {
    const result = await orders.find({ user: req.user._id }).populate('user', 'account').populate('products.product').lean()
    res.status(200).send({ success: true, message: '', result })
  } catch (error) {
    res.status(500).send({ success: false, message: '伺服器錯誤' })
  }
}

// 取得所有會員的訂單資料 -----------------------------------------------------------------------------
export const getallorders = async (req, res) => {
  if (req.user.role !== 1) {
    res.status(403).send({ success: false, message: '沒有權限' })
    return
  }
  try {
    // .populate('models 裡使用 ref 的欄位', '該 ref 關聯到的資料庫裡要取那些欄位')
    const result = await orders.find().populate('user', 'account').populate('products.product').lean()
    res.status(200).send({ success: true, message: '', result })
  } catch (error) {
    console.log(error)
    res.status(500).send({ success: false, message: '伺服器錯誤' })
  }
}

// 延長登入給的簽證 token -----------------------------------------------------------------------------
export const extend = async (req, res) => {
  try {
    const idx = req.user.tokens.findIndex(token => req.token === token)
    const token = jwt.sign({ _id: req.user._id.toString() }, process.env.SECRET, { expiresIn: '7 days' })
    req.user.tokens[idx] = token
    // 標記陣列文字已修改過，不然不會更新
    req.user.markModified('tokens')
    req.user.save({ validateBeforeSave: false })
    res.status(200).send({ success: true, message: '', result: token })
  } catch (error) {
    console.log(error)
    res.status(500).send({ success: false, message: '伺服器錯誤' })
  }
}

// 取的所有會員資料 -----------------------------------------------------------------------------
export const getuserinfo = async (req, res) => {
  try {
    res.status(200).send({
      success: true,
      message: '',
      result: { account: req.user.account, role: req.user.role, email: req.user.email, image: req.user.image }
    })
  } catch (error) {
    console.log(error)
    res.status(500).send({ success: false, message: '伺服器錯誤' })
  }
}
