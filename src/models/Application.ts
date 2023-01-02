import { Schema, model } from "mongoose";
import { ContainerDataModel } from "./ContainerData";
import { DeploymentModel } from "./Deployment";
import { UserModel } from "./User";

export interface ApplicationModel {
  _id: string;
  ref: string;
  name: string;
  version: string;
  git: string;
  deployment: string | DeploymentModel;
  container: string | ContainerDataModel;
  createdby: string | UserModel;
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
    deployment: {
      type: Schema.Types.ObjectId,
      ref: "Deployment",
      required: true,
    },
    container: {
      type: Schema.Types.ObjectId,
      ref: "ContainerData",
      required: true,
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
