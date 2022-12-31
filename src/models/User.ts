import { Schema, model } from "mongoose";

export interface User {
  _id: string;
  name: string;
  username: string;
  password: string;
}

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ "$**": "text" });

export default model<User>("User", userSchema);
