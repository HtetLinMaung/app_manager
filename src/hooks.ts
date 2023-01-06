import { exec } from "code-alchemy/child_process";
import fs from "node:fs";
import { sourcesFolderPath, tempFolderPath } from "./constants";
import initDeployments from "./data/deployments";
import Application from "./models/Application";
import User from "./models/User";
import connectMongoose from "./utils/connect-mongoose";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { createNetwork } from "starless-docker";
import connectRedis from "./utils/connect-redis";
import { redisClient } from "starless-redis";
import initDatabaseTemplates from "./data/database-templates";
import ContainerData from "./models/ContainerData";
import jwt from "jsonwebtoken";

export const afterMasterProcessStart = async () => {
  if (!fs.existsSync(sourcesFolderPath)) {
    fs.mkdirSync(sourcesFolderPath);
  }
  if (!fs.existsSync(tempFolderPath)) {
    fs.mkdirSync(tempFolderPath);
  }
  await connectMongoose();
  await connectRedis();
  // await Application.deleteMany({});
  // await ContainerData.deleteMany({});

  const username = process.env.admin_username || "admin";
  const password =
    process.env.admin_password || crypto.randomBytes(8).toString("hex");
  console.log(`ADMIN PASSWORD: ${password}`);

  let user = await User.findOne({
    username,
  });
  if (!user) {
    user = new User({
      username,
      name: process.env.admin_name || "Admin",
    });
  }
  user.password = bcrypt.hashSync(password, 12);
  await user.save();
  await redisClient.setJson(`user:username=${username}`, user, { EX: 3 * 60 });
  await initDeployments(user._id);
  await initDatabaseTemplates(user._id);

  // const application = await Application.findOne({ ref: "nodetest" });
  // if (!application) {
  //   await new Application({
  //     ref: "nodetest",
  //     name: "nodetest",
  //     version: "1.0.0",
  //     git: "https://github.com/HtetLinMaung/nodetest.git",
  //     port: "3000:3000",
  //     environments: {},
  //     volumes: [],
  //     deployment: "63ab0457073a89a779d57af9",
  //   }).save();
  // }
};

export const afterSocketIOStart = async (io: any) => {
  io.use((socket: any, next: any) => {
    try {
      const token: string = socket.handshake.auth.token;
      console.log(`token: ${token}`);
      if (!token) {
        socket.disconnect();
      }
      const payload: any = jwt.verify(token, process.env.jwt_secret);
      console.log("token payload:");
      console.log(payload);
      socket.join(payload.userId);
    } catch (err) {
      console.error(err.message);
      socket.disconnect();
    }
    next();
  });
};
