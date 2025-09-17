import mongoose from "mongoose";

const connectDB = async () =>{
  try {
    // Khi kết nối thành công thì mongoose phát ra event 'connected'
    mongoose.connection.on('connected', ()=> console.log('Database connected'));

    // Thực hiện kết nối tới MongoDB
    await mongoose.connect(`${process.env.MONGODB_URI}/movietime`)
  } catch (error) {
    // Nếu có lỗi khi kết nối thì in ra
    console.log(error.message);
  }
}

export default connectDB;