import mongoose from "mongoose";

export default async function connectMongoose() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(process.env.connection_string);
}
