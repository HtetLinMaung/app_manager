import { brewBlankExpressFunc } from "code-alchemy";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import connectMongoose from "../../../../utils/connect-mongoose";
import User from "../../../../models/User";
import { redisClient } from "starless-redis";
import connectRedis from "../../../../utils/connect-redis";

export default brewBlankExpressFunc(async (req, res) => {
  await connectMongoose();
  await connectRedis();

  const user = await redisClient.getJsonOrDefault(
    `user:username=${req.body.username}`,
    async () => {
      const data = await User.findOne({
        username: req.body.username,
      });
      if (data) {
        redisClient.setJson(`user:username=${req.body.username}`, data, {
          EX: 3 * 60,
        });
      }
      return data;
    }
  );
  if (!user) {
    return res.status(404).json({
      code: 404,
      message: "User not found!",
    });
  }
  if (!bcrypt.compareSync(req.body.password, user.password)) {
    return res.status(401).json({
      code: 401,
      message: "Password is incorrect!",
    });
  }
  const token = jwt.sign(
    {
      userId: user._id,
      username: user.username,
    },
    process.env.jwt_secret,
    { expiresIn: "1d" }
  );
  res.json({
    code: 200,
    message: "Login successful.",
    data: {
      token,
      name: user.name,
    },
  });
});
