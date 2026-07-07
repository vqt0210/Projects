# MovieTime

Website đặt vé xem phim, xây dựng theo hướng dẫn (tutorial) trực tuyến để thực hành quy trình phát triển full-stack, có tích hợp nhiều dịch vụ/API bên ngoài.

## Công nghệ sử dụng

### Frontend (client)
- **React 19** + **Vite** — nền tảng xây dựng giao diện
- **React Router DOM** — điều hướng trang
- **Tailwind CSS v4** — styling
- **Radix UI** (Dialog, Label, Slot) — component UI có sẵn, dễ tùy biến
- **Framer Motion** — hiệu ứng chuyển động, animation
- **Clerk (@clerk/clerk-react)** — xác thực người dùng (đăng nhập/đăng ký)
- **Socket.io-client** — nhận cập nhật theo thời gian thực (VD: trạng thái ghế đã được đặt)
- **Axios** — gọi API tới backend
- **React Player** — phát trailer/video phim
- **Recharts** — biểu đồ (có thể dùng cho trang thống kê/quản trị)
- **React Hot Toast, Sonner, SweetAlert2** — thông báo/popup cho người dùng
- **date-fns** — xử lý ngày giờ
- **Lucide React** — bộ icon

### Backend (server)
- **Node.js + Express 5** — xây dựng API
- **MongoDB (Mongoose)** — cơ sở dữ liệu
- **Clerk (@clerk/express, @clerk/clerk-sdk-node)** — xác thực phía server
- **Stripe** — xử lý thanh toán trực tuyến
- **Socket.io** — giao tiếp thời gian thực giữa server và client
- **Cloudinary** — lưu trữ và quản lý hình ảnh (poster phim,...)
- **QRCode** — tạo mã QR cho vé sau khi đặt thành công
- **Google Generative AI (Gemini) & OpenAI** — tích hợp AI (gợi ý phim hoặc tính năng liên quan)
- **Nodemailer & Resend** — gửi email (xác nhận đặt vé,...)
- **Inngest** — xử lý tác vụ nền / job (background jobs)
- **Helmet** — bảo mật HTTP header cơ bản
- **Svix** — xử lý webhook (thường dùng để đồng bộ dữ liệu người dùng từ Clerk)

## Tính năng chính

- Đăng nhập / đăng ký tài khoản
- Xem danh sách phim, chi tiết phim, xem trailer
- Chọn suất chiếu, chọn ghế ngồi
- Đặt vé và thanh toán trực tuyến qua Stripe
- Nhận vé kèm mã QR sau khi đặt thành công
- Cập nhật trạng thái ghế/đặt vé theo thời gian thực (Socket.io)
- Gửi email xác nhận sau khi đặt vé
- Tích hợp AI hỗ trợ (gợi ý/tìm kiếm phim)

## Ghi chú

Project được xây dựng chủ yếu theo một khóa học/tutorial trực tuyến, nhằm thực hành xây dựng một ứng dụng full-stack có tích hợp nhiều dịch vụ bên ngoài thực tế (xác thực, thanh toán, realtime, AI, email). Một số phần nâng cao (thanh toán Stripe, tích hợp AI, xử lý webhook, tác vụ nền) được tìm hiểu và thêm vào trong quá trình luyện tập, hiện vẫn đang được tiếp tục tìm hiểu sâu hơn để nắm rõ bản chất hoạt động của từng phần.
