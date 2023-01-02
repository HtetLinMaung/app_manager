import { Schema, model } from "mongoose";
import { ApplicationModel } from "./Application";
import { UserModel } from "./User";

export interface ApplicationVersionModel {
  _id: string;
  application: string | ApplicationModel;
  version: string;
  createdby: string | UserModel;
}

const applicationVersionSchema = new Schema(
  {
    application: {
      type: Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },
    version: {
      type: String,
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

applicationVersionSchema.index(
  { application: 1, version: 1 },
  { unique: true }
);
applicationVersionSchema.index({ "$**": "text" });

export default model<ApplicationVersionModel>(
  "ApplicationVersion",
  applicationVersionSchema
);
