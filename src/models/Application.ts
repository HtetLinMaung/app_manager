import { Schema, model } from "mongoose";
import { DeploymentModel } from "./Deployment";

export interface ApplicationModel {
  _id: string;
  ref: string;
  name: string;
  version: string;
  git: string;
  port: string;
  environments: any;
  volumes: string[];
  deployment: string | DeploymentModel;
  status: string;
  createdby: string;
}

const applicationSchema = new Schema(
  {
    ref: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    version: {
      type: String,
      required: true,
    },
    git: {
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
    deployment: {
      type: Schema.Types.ObjectId,
      ref: "Deployment",
    },
    status: {
      type: String,
      default: "stop",
      enum: ["start", "stop", "deploy", "restart", "ready"],
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

applicationSchema.index({ ref: 1, name: 1, version: 1 }, { unique: true });
applicationSchema.index({ "$**": "text" });

export default model<ApplicationModel>("Application", applicationSchema);
