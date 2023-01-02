import { Schema, model } from "mongoose";

export interface DatabaseTemplateModel {
  _id: string;
  name: string;
  image: string;
  tag: string;
  port: string;
  environments: any;
  volumes: string[];
}

const databaseTemplateSchema = new Schema(
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
  },
  {
    timestamps: true,
  }
);

databaseTemplateSchema.index({ "$**": "text" });

export default model<DatabaseTemplateModel>(
  "DatabaseTemplate",
  databaseTemplateSchema
);
