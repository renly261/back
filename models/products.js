import mongoose from 'mongoose'

const Schema = mongoose.Schema

// 商品資料庫要儲存的資料
const productSchema = new Schema({
  // 商品資料庫的名稱欄位 -------------------------------------------------------------------------------
  name: {
    type: String,
    required: [true, '品名不能為空'],
    minlength: [1, '品名不能為空']
  },
  // 商品資料庫的說明欄位 -------------------------------------------------------------------------------
  description: {
    type: String
  },
  detail: {
    type: String
  },
  // 商品資料庫的價格欄位 -------------------------------------------------------------------------------
  price: {
    type: Number,
    min: [0, '價格格式不正確'],
    required: [true, '價格不能為空']
  },
  // 商品資料庫的圖片欄位 -------------------------------------------------------------------------------
  image: {
    type: String
  },
  brand: {
    type: String
    // required: [true, '品牌不能為空']
  },
  cate: {
    type: String
    // required: [true, '類別不能為空']
  },
  // 商品資料庫的上架欄位 -------------------------------------------------------------------------------
  sell: {
    type: Boolean,
    default: true
  }
  // 商品資料庫的分類欄位 -------------------------------------------------------------------------------
  // category: {
  //   type: String,
  //   // 這個欄位只能放哪幾種資料
  //   enum: ['鞋子', '背包']
  // }

}, { versionKey: false })

export default mongoose.model('products', productSchema)
