import { Schema, model } from "mongoose";
import { DatabaseModel } from "./Database";

export interface DatabaseVersionModel {
  _id: string;
  database: string | DatabaseModel;
  tag: string;
  createdby: string;
}

const databaseVersionSchema = new Schema(
  {
    database: {
      type: Schema.Types.ObjectId,
      ref: "Database",
      required: true,
    },
    tag: {
      type: String,
      default: "latest",
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

databaseVersionSchema.index({ database: 1, tag: 1 }, { unique: true });
databaseVersionSchema.index({ "$**": "text" });

export default model<DatabaseVersionModel>(
  "DatabaseVersion",
  databaseVersionSchema
);
