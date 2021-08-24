import mongoose from 'mongoose'
import md5 from 'md5'
import validator from 'validator'

// 單純是因為 mongoose.Schema 太長, 設定成一個變數少打一點字
const Schema = mongoose.Schema

// 編寫資料表綱要, 設定使用者 collection 欄位結構, Schema 代表你網頁要存那些資料
// 建立後 mongoose 會自動產生一個 "_id" 欄位, 每個新增的使用者都會自動產生一個 _id 欄位, _id 欄位為這個資料在資料庫中的身分證字號
// "__v" 是 mongoose 幫我們新增的欄位, 計算這個資料的更新次數
// schema 的資料類型 https://mongoosejs.com/docs/schematypes.html
const UserSchema = new Schema(
  {
    // 使用者資料庫的帳號欄位 -------------------------------------------------------------------------------
    account: {
      // 資料類型是文字
      type: String,
      // minlength maxlength unique required 是 mongoose 內驗的驗證
      // 最小長度，自訂錯誤訊息
      minlength: [4, '帳號必須 4 個字以上'],
      // 最大長度，自訂錯誤訊息
      maxlength: [20, '帳號不能超過 20 個字'],
      // 設定不可重複, unique 無法自訂錯誤訊息, 需額外安裝套件
      unique: true,
      // 必填欄位，自訂錯誤訊息
      required: [true, '帳號不能為空']
    },
    // 使用者資料庫的密碼欄位 -------------------------------------------------------------------------------
    password: {
      // 資料類型是文字
      type: String,
      // 最小長度，自訂錯誤訊息
      minlength: [4, '密碼必須 4 個字以上'],
      // 最大長度，自訂錯誤訊息
      maxlength: [20, '密碼不能超過 20 個字'],
      // 必填欄位，自訂錯誤訊息
      required: [true, '密碼不能為空']
    },
    // 使用者資料庫的信箱 -------------------------------------------------------------------------------
    email: {
      // 資料類型是文字
      type: String,
      // 必填欄位，自訂錯誤訊息
      required: [true, '信箱不能為空'],
      // 設定不可重複, unique 無法自訂錯誤訊息, 需額外安裝套件
      unique: true,
      // 不是 mongoose 內驗的驗證, 信箱要用套件 validate 驗證信箱格式
      validate: {
        validator: email => {
          return validator.isEmail(email)
        },
        message: '信箱格式不正確'
      }
    },
    // 使用者資料庫的的權限欄位 -------------------------------------------------------------------------------
    role: {
      // 資料類型是數字
      type: Number,
      // 0 = 一般會員
      // 1 = 管理員
      // 預設值
      default: 0,
      // 必填欄位，自訂錯誤訊息
      required: [true, '沒有使用者分類']
    },
    // 使用者資料庫的的 jwt 欄位 -------------------------------------------------------------------------------
    tokens: {
      // 資料類型是文字且是陣列
      type: [String]
    },
    // 使用者資料庫的大頭貼欄位 -------------------------------------------------------------------------------
    image: {
      type: String
    },
    // 使用者地址
    address: {
      type: String
    },
    // 使用者資料庫的的購物車欄位 -------------------------------------------------------------------------------
    // 這裡是把購物車放在資料庫裡面, 可以視情況修改
    cart: {
      // 資料類型是陣列裡面包 JSON
      // 陣列的東西不一定要獨立寫一個 schema, 可以像這裡直接寫在 type 裡面
      type: [
        {
          // 使用者資料庫的的購物車欄位裡面的商品資料欄位
          product: {
            // 資料型態是符合該商品 _id 的 _id
            type: Schema.Types.ObjectId,
            // 用商品的 _id 去關聯符合該 _id 的商品資料
            // schema type ref https://mongoosejs.com/docs/api.html#schematype_SchemaType-ref
            ref: 'products',
            required: [true, '缺少商品 ID']
          },
          // 使用者資料庫的的購物車欄位裡面的商品數量欄位
          amount: {
            type: Number,
            required: [true, '缺少商品數量']
          }
        }
      ]
    },
    favorite: {
      // 資料類型是陣列裡面包 JSON
      // 陣列的東西不一定要獨立寫一個 schema, 可以像這裡直接寫在 type 裡面
      type: [
        {
          // 使用者資料庫的的購物車欄位裡面的商品資料欄位
          product: {
            // 資料型態是符合該商品 _id 的 _id
            type: Schema.Types.ObjectId,
            // 用商品的 _id 去關聯符合該 _id 的商品資料
            // schema type ref https://mongoosejs.com/docs/api.html#schematype_SchemaType-ref
            ref: 'products',
            required: [true, '缺少商品 ID']
          },
          // 使用者資料庫的的購物車欄位裡面的商品數量欄位
          amount: {
            type: Number,
            default: 0,
            required: [true, '缺少商品數量']
          }
        }
      ]
    }
  },
  // 停用 mongoose 內建計算更新次數的功能 "__v"
  { versionKey: false }
)

// 在驗證後準備把資料存入資料庫前要做的事, 不能使用箭頭函式, md5 密碼加密
UserSchema.pre('findOneAndUpdate', function (next) {
  if (this._update.password) {
    this._update.password = md5(this._update.password)
  }
  next()
})

// 在驗證後準備把資料存入資料庫前要做的事, 不能使用箭頭函式, md5 密碼加密
UserSchema.pre('save', function (next) {
  // this 代表即將存入的資料
  const user = this
  // 若這筆資料的密碼有修改過
  if (user.isModified('password')) {
    // 將密碼使用 md5 加密法加密
    user.password = md5(user.password)
  }
  // 完成後繼續動作
  next()
})

// 建立 mongoose 的資料 model, 將欄位結構 collection 變成 mongoose 處理資料的變數型態, 就可以直接用 users.find() 去找資料或 users.update() 去更新資料等等
// mongoose.model(), 幫你去跟 MongoDB 要資料做事情的變數
// mongoose.model('collection 名稱', schema), collection 名稱一定要用英文複數
export default mongoose.model('users', UserSchema)
