import express from "express";
import dotenv from "dotenv";
import connectToDB from "./config/db.js";
import bodyParser from "body-parser";
import userRoutes from "./routes/user.js";
import chatRoutes from "./routes/chat.js";
dotenv.config();

const app = express();

connectToDB();

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
