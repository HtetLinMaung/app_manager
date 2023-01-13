import { Schema, model } from "mongoose";
import { UserModel } from "./User";

export interface ContainerDataModel {
  _id: string;
  name: string;
  image: string;
  tag: string;
  port: string;
  environments: any;
  volumes: string[];
  network: string;
  status: string;
  createdby: string | UserModel;
}

const containerDataSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    image: {
      type: String,
      required: true,
    },
    tag: {
      type: String,
      required: true,
    },
    port: {
      type: String,
      default: "",
    },
    environments: {
      type: Schema.Types.Mixed,
      default: {},
    },
    volumes: [String],
    network: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      default: "unknown",
      // enum: ["start", "stop", "deploy", "restart", "ready"],
    },
    createdby: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

containerDataSchema.index({ "$**": "text" });

export default model<ContainerDataModel>("ContainerData", containerDataSchema);
