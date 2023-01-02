import { Schema, model } from "mongoose";

export interface UserModel {
  _id: string;
  name: string;
  username: string;
  password: string;
  createdby: string | UserModel;
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
    createdby: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ "$**": "text" });

export default model<UserModel>("User", userSchema);
