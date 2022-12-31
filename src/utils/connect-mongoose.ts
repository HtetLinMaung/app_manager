import mongoose from "mongoose";

export default async function connectMongoose() {
  await mongoose.connect(process.env.connection_string);
}
