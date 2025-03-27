import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
    pdfBlob: {
      type: Buffer,
      required: false,
    },
    prescriptionData: {
      type: Object,
      required: false,
    },
  },
  { timestamps: true }
);

const chatSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    messages: [messageSchema],
    userName: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Chat = mongoose.model("Chat", chatSchema);
export default Chat;
