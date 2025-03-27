import express from "express";
import User from "../models/User.js";

const router = express.Router();

const createUser = async (req, res) => {
  const userName = req.body.userName;
  try {
    const userExist = await User.findOne({ userName });
    if (userExist) {
      return res.status(400).json({ message: "User already exist" });
    }
    const user = await User.create({ userName: userName });
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const checkUser = async (req, res) => {
  const { userName } = req.params;
  try {
    const userExist = await User.findOne({ userName });
    if (userExist) {
      return res.status(201).json(userExist);
    }
    const user = await User.create({ userName: userName });
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

router.post("/", createUser);
router.get("/:userName", checkUser);

export default router;
