import { Schema, model } from "mongoose";

export interface DatabaseModel {
  _id: string;
  ref: string;
  name: string;
  image: string;
  tag: string;
  port: string;
  environments: any;
  volumes: string[];
  status: string;
}

const databaseSchema = new Schema(
  {
    ref: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
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
    status: {
      type: String,
      default: "stop",
      enum: ["start", "stop", "restart", "ready"],
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

databaseSchema.index({ ref: 1, ame: 1, version: 1 }, { unique: true });
databaseSchema.index({ "$**": "text" });

export default model<DatabaseModel>("Database", databaseSchema);
