import users from '../models/users.js'
import products from '../models/products.js'
import orders from '../models/orders.js'
import md5 from 'md5'
import jwt from 'jsonwebtoken'

//! 在 middleware auth.js 裡已經把 req.user req.token 寫成一個變數
//! req.user 可以知道是哪個使用者過來的請求
//! req.token 可以知道使用者是用哪個 token 來請求東西

// 註冊 -----------------------------------------------------------------------------
//! 檢查進來的資料格式 > 使用者資料庫建立一個資料 > 將使用者傳入的註冊資料 req.body 丟進去給 mongoose 處理和驗證
// req 是前台進來的請求, res 是後台出去的回應
export const register = async (req, res) => {
  // 驗證前台進來的請求 req 的格式是否是 form-data, content-type 資料類型
  // 若沒有 req.headers['content-type'] 或 req.headers['content-type'] 不是 form-data
  // 若要上傳圖片或檔案要使用 form-date
  if (!req.headers['content-type'] || !req.headers['content-type'].includes('multipart/form-data')) {
    // 出去的回應 res, 400 代表伺服器收到無效的語法
    res.status(400).send({ success: false, message: '資料格式不正確' })
    return
  }
  // 成功通過驗證要做的事
  try {
    // 讓 users 這個 models 去建立一個資料, 把使用者傳入 post 的東西 req.body 丟進去給 mongoose 處理, mongoose 有內建驗證
    // ... 其餘運算子(解構賦值), 將 ... 後面的陣列或 Json 資料解開成一個一個獨立資料變數
    // 以這例子就是用 ...req.body 將使用者傳進來的資料解構成 account password 等一個一個獨立欄位在存進資料庫
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
      // JSON 用 JSON[key] 來取值
      const key = Object.keys(error.errors)[0]
      // 取驗證失敗的訊息
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
  try {
    // 去使用者資料庫撈出有沒有符合新增(post) 進來帳號的使用者, 簡單來說就是去 models users 檢查有無使用者輸入的那個帳號的使用者
    // 查詢使用者資料庫 models users 的 account 欄位是否有該使用者當初註冊的 req.body.account, 找到一筆有沒有符合傳進來的帳號的東西
    const user = await users.findOne({ account: req.body.account }, '')
    // 若該 user 的 account 就是當初該 user 註冊時 users.create(req.body) 傳進來的資料 account 的話
    if (user) {
      // 同上如果該 user 的 password 就是當初該 user 註冊時 users.create(req.body) 傳進來的資料 password 的話
      // 要 md5 是因為在 models users 在驗證後準備把資料存入使用者資料庫前有做 md5 密碼加密
      // 若有該帳號的使用者, 檢查使用者資料庫的密碼是否和你進來的的密碼加密之後一樣, md5 同一個東西加密後的東西會一樣所以可以用 md5 加密後是否一樣來驗證進來的密碼是否一樣
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
        // 將上面的資料存回去, validateBeforeSave: false 先暫時停用內建的驗證
        user.save({ validateBeforeSave: false })
        res.status(200).send({
          success: true,
          message: '登入成功',
          token,
          email: user.email,
          account: user.account,
          role: user.role,
          image: user.image,
          address: user.address
        })
        // 若該 user 的 password 不是當初該 user 註冊時 users.create(req.body) 傳進來的資料 password 的話
      } else {
        res.status(400).send({ success: false, message: '密碼錯誤' })
      }
      // 若該 user 的 account 不是當初該 user 註冊時 users.create(req.body) 傳進來的資料 account 的話
    } else {
      res.status(400).send({ success: false, message: '帳號錯誤' })
    }
  } catch (error) {
    res.status(500).send({ success: false, message: '伺服器錯誤' })
  }
}

// 登出 -----------------------------------------------------------------------------
//! 將該使用者的 token 從使用者資料庫中拿掉 > 儲存
export const logout = async (req, res) => {
  try {
    // 將這次請求的 JWT 從使用者資料移除
    // 用 filter 將該使用著傳進來的 tokens 拿掉, 之後用那組序號去做需要登入才能做的事或請求就會沒有權限
    // filter(傳進去的 function 的參數 => 這個參數要做甚麼去篩出你要的東西), true 的留著 false 的踢掉, filter 會建立一個新陣列, 不會去改變原本的陣列資料
    // 把該使用者傳進來 models 裡 tokens 欄位(是陣列)的 tokens 從陣列裡拿掉拿掉, 只留下不是的
    // 這個判斷條件是 models users 的 tokens 欄位資料(是陣列)裡面的每個東西如果不是該使用者傳進來的就留著, 是的踢掉
    // 登出 api 時把該使用者傳過來的 tokens 拿掉, 這樣那組 tokens 就沒用了, 因為我們在 middleware auth.js 裡面驗證的時候是去查說該使用者資料去 findOne({ _id, tokens: token }) 看有沒有符合該使用者的東西
    req.user.tokens = req.user.tokens.filter(token => token !== req.token)
    // .save() 將上面更改後的資料存回去, validateBeforeSave: false 先暫時停用內建的驗證
    req.user.save({ validateBeforeSave: false })
    res.status(200).send({ success: true, message: '' })
  } catch (error) {
    console.log(error)
    res.status(500).send({ success: false, message: '伺服器錯誤' })
  }
}

// 取得符合該 _id 的使用者資料 -----------------------------------------------------------------------------
export const getUserInfo = async (req, res) => {
  try {
    res.status(200).send({
      success: true,
      message: '',
      result: { account: req.user.account, password: req.user.password, email: req.user.email, address: req.user.address, image: req.user.image, role: req.user.role, _id: req.user.id }
    })
  } catch (error) {
    console.log(error)
    res.status(500).send({ success: false, message: '伺服器錯誤' })
  }
}

// 取得所有會員資料 -----------------------------------------------------------------------------
export const getAllUserInfo = async (req, res) => {
  try {
    // 直接將 models users 資料庫的資料不管有幾筆有幾個會員使用者全部拉出來
    const result = await users.find()
    res.status(200).send({
      success: true,
      message: '',
      result
    })
  } catch (error) {
    console.log(error)
    res.status(500).send({ success: false, message: '伺服器錯誤' })
  }
}

// 刪除會員 -----------------------------------------------------------------------------
export const delUser = async (req, res) => {
  try {
    // 去使用者資料庫找到符合該 _id 的會員並刪除
    const result = await users.findByIdAndDelete(req.params.id)
    // 若使用者資料庫找不到這個 _id
    if (result === null) {
      res.status(404)
      res.send({ success: false, message: '找不到使用者' })
    } else {
      res.status(200)
      res.send({ success: true, message: '' })
    }
  } catch (error) {
    // 若 ID 格式不是 mongodb 格式
    if (error.name === 'CastError') {
      res.status(404)
      res.send({ success: false, message: '找不到資料' })
    } else {
      res.status(500)
      res.send({ success: false, message: '伺服器發生錯誤' })
    }
  }
}

// 編輯會員 -----------------------------------------------------------------------------
export const editUser = async (req, res) => {
  // 若不是管理者也不是使用者
  if (req.user.role !== 1 && req.user.role !== 0) {
    res.status(403).send({ success: false, message: '沒有權限' })
    return
  }
  // 檢查資料格式 form-data
  if (!req.headers['content-type'] || !req.headers['content-type'].includes('multipart/form-data')) {
    res.status(400).send({ success: false, message: '資料格式不正確' })
    return
  }
  try {
    // 將所有前台編輯時傳進來的資料請求 req.body 存進 data 這個變數
    const data = {
      account: req.body.account,
      email: req.body.email,
      address: req.body.address,
      role: req.body.role
    }
    // 若前台有傳圖片過來才改
    if (req.filepath) data.image = req.filepath
    // 若前台有傳密碼過來才改
    if (req.body.password) {
      data.password = req.body.password
    }
    // 找到符合該 _id 的使用者, 並將符合該 _id 的使用者資料庫裡的資料更新成所有前台編輯時傳進來的資料請求
    const result = await users.findByIdAndUpdate(req.params.id, data, { new: true })
    // 若成功將更新完的資料 result 回去給前台
    res.status(200).send({ success: true, message: '', result })
  } catch (error) {
    if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      const message = error.errors[key].message
      res.status(400).send({ success: false, message: message })
    } else {
      res.status(500).send({ success: false, message: '伺服器錯誤' })
      console.log(error)
    }
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

// 加入購物車 -----------------------------------------------------------------------------
export const addCart = async (req, res) => {
  try {
    // 驗證商品是否存在, 去 models products 找符合該 _id 的商品資料
    const result = await products.findById(req.body.product)
    // 若找不到或已下架
    if (!result || !result.sell) {
      res.status(404).send({ success: false, message: '資料不存在' })
      return
    }
    // 找出該使用者的購物車內有沒有這個商品
    // 查詢符合該 _id 使用者的購物車欄位裡面的商品 _id 是否和前台送過來的商品 _id 一樣
    // findIndex() ，尋找陣列中符合條件的第一筆資料，並返回其 index（索引） 也就是該資料是陣列中的第幾個。如果沒有符合的對象，將返回 -1
    // https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex
    const idx = req.user.cart.findIndex(item => item.product.toString() === req.body.product)
    // 若購物車裡有找到該 _id 的商品, 該 _id 的商品數量 += 傳入的新增數量
    if (idx > -1) {
      req.user.cart[idx].amount += req.body.amount
      // 若沒找到這個商品, 將使用者傳進來的商品資料及數量丟進 cart
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
//! 去使用者資料庫查詢該 _id 使用者的 cart 欄位 > populate('cart.product'), 將 cart 欄位裡面的 product 帶出來
export const getCart = async (req, res) => {
  try {
    // 用使用者 _id 查詢使用者，只取 cart 欄位並將 cart 欄位裡面 ref 的商品資料一起帶出來
    const { cart } = await users.findById(req.user._id, 'cart').populate('cart.product')
    // 只 result 購物車裡的商品資料及數量
    res.status(200).send({ success: true, message: '', result: cart })
  } catch (error) {
    res.status(500).send({ success: false, message: '伺服器錯誤' })
  }
}

// 編輯購物車------------------------------------------------------------------------------------------------------
export const editCart = async (req, res) => {
  try {
    // 若傳入的購買數量 <= 0, 從購物車刪除這筆商品資料
    if (req.body.amount <= 0) {
      await users.findOneAndUpdate(
        // 找到 cart 欄位裡的 product 符合傳入的商品 _id
        { 'cart.product': req.body.product },
        {
          // 刪除一個陣列裡的元素
          $pull: {
            // 要刪除的欄位名稱
            cart: {
              // 刪除條件, 該商品的 _id 符合前台編輯時傳入的那筆商品資料的 _id
              product: req.body.product
            }
          }
        }
      )
    // 若傳入的購買數量 > 0, 更新商品數量
    } else {
      await users.findOneAndUpdate(
        // 找到 cart 欄位裡的 product 符合傳入的商品 _id
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
// 因為每個使用者的購物車要分開, 所以用 req.user 用 _id 來判斷是哪個使用者傳進來的資料
export const checkout = async (req, res) => {
  try {
    // 若符合該使用者 _id 購物車裡面的商品資料筆數 > 0
    if (req.user.cart.length > 0) {
      // orders 資料庫建立一個資料, 將符合該 _id 的使用者傳進來的資料丟進 mongoose 處理並儲存
      await orders.create({ user: req.user._id, products: req.user.cart, date: new Date(), address: req.user.address, progress: req.user.progress })

      // 清空符合該使用者 _id 的購物車
      req.user.cart = []
      req.user.save({ validateBeforeSave: false })
    }
    const result = await users

    res.status(200).send({ success: true, message: '', result })
  } catch (error) {
    console.log(error)
    res.status(500).send({ success: false, message: '伺服器錯誤' })
  }
}

// 加入最愛清單
export const addFavorite = async (req, res) => {
  try {
    // 驗證商品是否存在, 去 models products 找符合該 _id 的商品資料
    const result = await products.findById(req.body.product)
    // 若找不到或已下架
    if (!result || !result.sell) {
      res.status(404).send({ success: false, message: '商品不存在或已下架' })
      return
    }
    // 找出該使用者的最愛內有沒有這個商品
    // 查詢符合該 _id 使用者的最愛欄位裡面的商品 _id 是否和前台送過來的商品 _id 一樣
    // findIndex() ，尋找陣列中符合條件的第一筆資料，並返回其 index（索引） 也就是該資料是陣列中的第幾個。如果沒有符合的對象，將返回 -1
    // https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex
    const idx = req.user.favorite.findIndex(item => item.product.toString() === req.body.product)
    // 若購物車裡有找到該 _id 的商品, 該 _id 的商品數量 = 傳入的新增數量
    if (idx > -1) {
      res.status(400).send({ success: false, message: '此商品已在收藏清單內' })
      // 若沒找到這個商品, 將使用者傳進來的商品資料及數量丟進 cart
    } else {
      req.user.favorite.push({ product: req.body.product, amount: 1 })
    }
    await req.user.save({ validateBeforeSave: false })
    res.status(200).send({ success: true, message: '' })
  } catch (error) {
    console.log(error)
    res.status(500).send({ success: false, message: '伺服器錯誤' })
  }
}

// 查詢最愛清單 -----------------------------------------------------------------------------
//! 去使用者資料庫查詢該 _id 使用者的 cart 欄位 > populate('cart.product'), 將 cart 欄位裡面的 product 帶出來
export const getFavorite = async (req, res) => {
  try {
    // 用使用者 _id 查詢使用者，只取 cart 欄位並將 cart 欄位裡面 ref 的商品資料一起帶出來
    const { favorite } = await users.findById(req.user._id, 'favorite').populate('favorite.product')
    // 只 result 購物車裡的商品資料及數量
    res.status(200).send({ success: true, message: '', result: favorite })
  } catch (error) {
    res.status(500).send({ success: false, message: '伺服器錯誤' })
  }
}

// 刪除最愛清單 ------------------------------------------------------------------------------------------------------
export const delFavorite = async (req, res) => {
  try {
    // 若傳入的購買數量 <= 0, 從最愛清單刪除這筆商品資料
    if (req.body.amount <= 0) {
      await users.findOneAndUpdate(
        // 找到 favorite 欄位裡的 product 符合傳入的商品 _id
        { 'favorite.product': req.body.product },
        {
          // 刪除一個陣列裡的元素
          $pull: {
            // 要刪除的欄位名稱
            favorite: {
              // 刪除條件, 該商品的 _id 符合前台編輯時傳入的那筆商品資料的 _id
              product: req.body.product
            }
          }
        }
      )
    }
    res.status(200).send({ success: true, message: '' })
  } catch (error) {
    res.status(500).send({ success: false, message: '伺服器錯誤' })
  }
}

// 取得使用者訂單 -----------------------------------------------------------------------------
export const getorders = async (req, res) => {
  try {
    // 在訂單資料庫查詢符合該使用者 _id 的訂單資料, 並將此訂單資料關聯使用者資料庫的 account address 欄位和關聯商品資料庫的所有欄位抓出來
    const result = await orders.find({ user: req.user._id }).populate('user', 'account address').populate('products.product').lean()
    res.status(200).send({ success: true, message: '', result })
  } catch (error) {
    res.status(500).send({ success: false, message: '伺服器錯誤' })
  }
}

// 取得所有會員的訂單資料 -----------------------------------------------------------------------------
export const getallorders = async (req, res) => {
  // 若不是管理者
  if (req.user.role !== 1) {
    res.status(403).send({ success: false, message: '沒有權限' })
    return
  }
  try {
    // .populate('models 裡使用 ref 的欄位', '該 ref 關聯到的資料庫裡要取那些欄位')
    // 將訂單裡關連到使用者資料庫的 account address 欄位和關連到商品資料庫的所有欄位抓出來
    const result = await orders.find().populate('user', 'account address').populate('products.product').lean()
    res.status(200).send({ success: true, message: '', result })
  } catch (error) {
    console.log(error)
    res.status(500).send({ success: false, message: '伺服器錯誤' })
  }
}

// 刪除訂單 -----------------------------------------------------------------------------
export const delOrders = async (req, res) => {
  try {
    // 查詢訂單資料庫裡符合該使用者 _id 的訂單資料並刪除
    const result = await orders.findByIdAndDelete(req.params.id)
    if (result) {
      res.status(200).send({ success: true, message: '' })
    } else {
      res.status(404).send({ success: false, message: '查無此訂單' })
    }
  } catch (error) {
    console.log(error)
    res.status(500).send({ success: false, message: '伺服器錯誤' })
  }
}

// 編輯訂單 -----------------------------------------------------------------------------
export const editOrders = async (req, res) => {
  try {
    // 將所有前台編輯時傳進來的資料請求 req.body 存進 data 這個變數
    const data = {
      address: req.body.address,
      amount: req.body.amount,
      progress: req.body.progress
    }
    console.log(req.body.address)

    // 找到符合該 _id 的使用者, 並將符合該 _id 的使用者資料庫裡的資料更新成所有前台編輯時傳進來的資料請求
    const result = await orders.findByIdAndUpdate(req.params.id, data, { new: true })
    // 若成功將更新完的資料 result 回去給前台
    res.status(200).send({ success: true, message: '', result })
  } catch (error) {
    if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      const message = error.errors[key].message
      res.status(400).send({ success: false, message: message })
    } else {
      res.status(500).send({ success: false, message: '伺服器錯誤' })
      console.log(error)
    }
  }
}
