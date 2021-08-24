import mongoose from 'mongoose'

const Schema = mongoose.Schema

// 訂單的資料有 models users products 的資料, 拉出單獨寫一個 models 比較方便, 可以直接用  orders 抓訂單資料
// controllers 可以用 orders.populate('ref', 'ref 裡要抓出來的欄位') 去抓別的 models 裡的資料

const productSchema = new Schema({
  // 訂單資料庫的使用者欄位 -------------------------------------------------------------------------------
  user: {
    // 資料型態是符合該 _id 的使用者資料庫裡使用者的 _id
    type: Schema.Types.ObjectId,
    // 用使用者的 _id 去關聯該 models users 的資料
    ref: 'users'
  },
  // 訂單資料庫的商品資料欄位 -------------------------------------------------------------------------------
  products: [{
    // 訂單資料庫的商品資料欄位裡面的商品資料欄位
    product: {
      // 商品資料庫裡商品的 _id
      type: Schema.Types.ObjectId,
      // 用商品的 _id 去關聯該 _id models products 的資料, 這樣 controllers 可以用 orders.populate('product.products') 去拉出該 _id models products 的資料
      ref: 'products',
      required: [true, '缺少商品 ID']
    },
    // 訂單資料庫的商品資料欄位裡的商品數量欄位
    amount: {
      type: Number,
      required: [true, '缺少商品數量']
    }
  }],
  // 訂單資料庫的日期欄位 -------------------------------------------------------------------------------
  date: {
    type: Date,
    required: [true, '缺少訂單日期']
  },
  // 訂單收貨地址 -------------------------------------------------------------------------------
  address: {
    type: String,
    required: [true, '缺少收貨地址']
  },
  // 訂單進度 -------------------------------------------------------------------------------
  progress: {
    type: String,
    default: '已收到訂單'
  }

}, { versionKey: false })

export default mongoose.model('orders', productSchema)
