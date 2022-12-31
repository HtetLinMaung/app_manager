import { Schema, model } from "mongoose";

export interface DeploymentModel {
  _id: string;
  name: string;
  version: string;
  image: string;
  tag: string;
  buildSteps: string[];
  createdby: string;
}

const deploymentSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    version: {
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
    buildSteps: [String],
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

deploymentSchema.index({ name: 1, version: 1 }, { unique: true });
deploymentSchema.index({ "$**": "text" });

export default model<DeploymentModel>("Deployment", deploymentSchema);
