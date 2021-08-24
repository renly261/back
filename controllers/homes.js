// util node js 內建套件, console.log() 時終端機可以顯示 object, 原生 node 會把 object 折疊起來
import util from 'util'
import homes from '../models/homes.js'

// 新增商品 -------------------------------------------------------------------
export const newProduct = async (req, res) => {
  // 若這個人不是管理者或使用者
  if (req.user.role !== 1) {
    res.status(403).send({ success: false, message: '沒有權限' })
    return
  }
  // 檢查進來的資料格式
  if (!req.headers['content-type'] || !req.headers['content-type'].includes('multipart/form-data')) {
    res.status(400).send({ success: false, message: '資料格式不正確' })
    return
  }
  try {
    // 將使用者或管理者的請求直接塞進 models 資料表的 homes
    const result = await homes.create({
      title: req.body.name,
      description: req.body.description,
      image: req.filepath,
      date: new Date(),
      link: req.body.link
    })
    res.status(200).send({ success: true, message: '', result })
  } catch (error) {
    if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      const message = error.errors[key].message
      res.status(400).send({ success: false, message: message })
    } else {
      res.status(500).send({ success: false, message: '伺服器錯誤' })
    }
  }
}

// 取得上架中的商品資料 -------------------------------------------------------------------
export const getProduct = async (req, res) => {
  try {
    // 去找 models homes 裡 sell 是 true 也就是上架中的商品資料
    const result = await homes.find({ sell: true })
    res.status(200).send({ success: true, message: '', result })
  } catch (error) {
    res.status(500).send({ success: false, message: '伺服器錯誤' })
  }
}

// 取得所有商品(上架下架都包含)的資料, 只限管理者 -------------------------------------------------------------------
export const getAllProduct = async (req, res) => {
  // 若不是管理者
  if (req.user.role !== 1) {
    res.status(403).send({ success: false, message: '沒有權限' })
    return
  }
  try {
    // 去找 models homes 裡的所有資料
    const result = await homes.find()
    res.status(200).send({ success: true, message: '', result })
  } catch (error) {
    res.status(500).send({ success: false, message: '伺服器錯誤' })
  }
}

// 根據商品 id 找到該商品 -------------------------------------------------------------------
export const getProductById = async (req, res) => {
  try {
    // 去 models homes 裡面找 有 params.id
    // params.id 是根據每個商品的 _id 去加到網址後面, 在前台路由 path : '/:id' 去將不同商品的資料顯示在同一 pages 上
    const result = await homes.findById(req.params.id)
    res.status(200).send({ success: true, message: '', result })
  } catch (error) {
    if (error.name === 'CastError') {
      res.status(404).send({ success: false, message: '查無商品' })
    } else {
      res.status(500).send({ success: false, message: '伺服器錯誤' })
    }
  }
}

// 根據商品品牌或類型找到商品
export const getProductByCate = async (req, res) => {
  try {
    // 去 models homes 裡面找 有 params.id
    // params.id 是根據每個商品的 _id 去加到網址後面, 在前台路由 path : '/:id' 去將不同商品的資料顯示在同一 pages 上
    const result = await homes.findOne({ brand: req.body.brand }, '')
    if (result) {
      res.status(200).send({ success: true, message: '', name: result.name })
    }
  } catch (error) {
    if (error.name === 'CastError') {
      res.status(404).send({ success: false, message: '查無商品' })
    } else {
      res.status(500).send({ success: false, message: '伺服器錯誤' })
    }
  }
}

// 根據 query 找到商品 -------------------------------------------------------------------
export const gethomes = async (req, res) => {
  try {
    const query = {}

    // 不能這樣先預設空的 {}，因為 price 欄位類型是數字, 預設空的 {} 會讓 price 欄位變陣列
    // const query = {
    //   price: {}
    // }

    // 價格 >= --------------------------------------------------
    if (req.query.pricegte) {
      // 如果沒有判斷可能會出現 query.price undefined 錯誤
      if (!query.price) {
        query.price = {}
      }
      // gte >=, .find( { price: {$gte:200 } } ), parseInt() 函式能將輸入的字串轉成整數。
      const gte = parseInt(req.query.pricegte)
      // 檢查是不是數字
      if (!isNaN(gte)) {
        query.price.$gte = gte
      }
    }

    // 價格 <= --------------------------------------------------
    if (req.query.pricelte) {
      if (!query.price) {
        query.price = {}
      }
      // lte <=, .find( { price: {$lte:200 } } )
      const lte = parseInt(req.query.pricelte)
      if (!isNaN(lte)) {
        query.price.$lte = lte
      }
    }

    // 關鍵字搜尋 --------------------------------------------------
    if (req.query.keywords) {
      if (!query.$or) {
        // $or 或, .find( { $or: [ { price: { $lt: 200 } }, { name: "ABCD"} ] } ), 搜尋價格 > 200 或名字是 ABCD
        // $or 裡面放陣列, 陣列裡放搜尋的條件
        query.$or = []
      }
      // $in 裡面的陣列, 將要搜尋的關鍵字放進陣列
      const names = []
      const descriptions = []
      // split(',') 用 , 將進來的關鍵字用 , 切隔, 關鍵字搜尋的網址的查詢方法要用 , 分隔
      const keywords = req.query.keywords.split(',')
      // 跑迴圈將正則表達式的結果塞進 names 和 descriptions 的陣列中
      for (const keyword of keywords) {
        // RegExp 正則表達式, 'i' 不分大小寫, 正則表達式的用途是當你要搜尋的東西名稱叫 aaa 的話你打 a 或 aa 或 aaa 都可以搜尋到
        // 若沒有用正則表達式, 你要搜尋 aaa 的話就一定要打 aaa 完全符合才能搜尋到
        const re = new RegExp(keyword, 'i')
        names.push(re)
        descriptions.push(re)
      }
      // $in 包含, .find( { type: {$in:["food"]} } )
      // 組合 $or 和 $in 變成查詢語法, $or: [ { name: { $in: [names] } } ]
      query.$or.push({ name: { $in: names } })
      query.$or.push({ description: { $in: descriptions } })
    }
    // node 原生會將 object 折疊起來, 用 util.inspect() 來將他展開並顯示在終端機裡
    console.log(util.inspect(query, { depth: null }))
    const result = await homes.find(query)
    res.status(200).send({ success: true, message: '', result })
  } catch (error) {
    console.log(error)
    res.status(500).send({ success: false, message: '伺服器錯誤' })
  }
}

// 編輯管理者商品資料 -------------------------------------------------------------------
export const editProduct = async (req, res) => {
  if (req.user.role !== 1) {
    res.status(403).send({ success: false, message: '沒有權限' })
    return
  }
  if (!req.headers['content-type'] || !req.headers['content-type'].includes('multipart/form-data')) {
    res.status(400).send({ success: false, message: '資料格式不正確' })
    return
  }
  try {
    const data = {
      name: req.body.name,
      price: req.body.price,
      description: req.body.description,
      brand: req.body.brand,
      cate: req.body.cate,
      sell: req.body.sell
    }
    if (req.filepath) data.image = req.filepath
    const result = await homes.findByIdAndUpdate(req.params.id, data, { new: true })
    res.status(200).send({ success: true, message: '', result })
  } catch (error) {
    if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      const message = error.errors[key].message
      res.status(400).send({ success: false, message: message })
    } else {
      res.status(500).send({ success: false, message: '伺服器錯誤' })
    }
  }
}
