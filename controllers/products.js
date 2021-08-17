import products from '../models/products.js'

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
    // 將使用者或管理者的請求直接塞進 models 資料表的 products
    const result = await products.create({
      name: req.body.name,
      price: req.body.price,
      description: req.body.description,
      sell: req.body.sell,
      image: req.filepath
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
    // 去找 models products 裡 sell 是 true 也就是上架中的商品資料
    const result = await products.find({ sell: true })
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
    // 去找 models products 裡的所有資料
    const result = await products.find()
    res.status(200).send({ success: true, message: '', result })
  } catch (error) {
    res.status(500).send({ success: false, message: '伺服器錯誤' })
  }
}

// 根據商品 id 找到該商品 -------------------------------------------------------------------
export const getProductById = async (req, res) => {
  try {
    // 去 models products 裡面找 有 params.id
    // params.id 是根據每個商品的 _id 去加到網址後面, 在前台路由 path : '/:id' 去將不同商品的資料顯示在同一 paages 上
    const result = await products.findById(req.params.id)
    res.status(200).send({ success: true, message: '', result })
  } catch (error) {
    if (error.name === 'CastError') {
      res.status(404).send({ success: false, message: '查無商品' })
    } else {
      res.status(500).send({ success: false, message: '伺服器錯誤' })
    }
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
      sell: req.body.sell
    }
    if (req.filepath) data.image = req.filepath
    const result = await products.findByIdAndUpdate(req.params.id, data, { new: true })
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
