import mongoose from 'mongoose'

// 單純是因為 mongoose.Schema 太長, 設定成一個變數少打一點字
const Schema = mongoose.Schema

// 編寫資料表綱要, 設定使用者 collection 欄位結構, Schema 代表你網頁要存那些資料
// 建立後 mongoose 會自動產生一個 "_id" 欄位, 每個新增的使用者都會自動產生一個 _id 欄位, _id 欄位為這個資料在資料庫中的身分證字號
// "__v" 是 mongoose 幫我們新增的欄位, 計算這個資料的更新次數
// schema 的資料類型 https://mongoosejs.com/docs/schematypes.html
const HomeSchema = new Schema(
  {
    image: {
      type: String
    },
    title: {
      type: String
    },
    description: {
      type: String
    },
    link: {
      type: String
    },
    date: {
      type: Date
    }
  },
  // 停用 mongoose 內建計算更新次數的功能 "__v"
  { versionKey: false }
)

// 建立 mongoose 的資料 model, 將欄位結構 collection 變成 mongoose 處理資料的變數型態, 就可以直接用 users.find() 去找資料或 users.update() 去更新資料等等
// mongoose.model(), 幫你去跟 MongoDB 要資料做事情的變數
// mongoose.model('collection 名稱', schema), collection 名稱一定要用英文複數
export default mongoose.model('homes', HomeSchema)
