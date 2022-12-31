import { Schema, model } from "mongoose";

export interface Database {
  _id: string;
  name: string;
  version: string;
  port: string;
  environments: any;
  volumes: string[];
  status: string;
}

const databaseSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    version: {
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
    // deployment: {
    //   type: Schema.Types.ObjectId,
    //   ref: "Deployment",
    //   required: true,
    // },
    status: {
      type: String,
      default: "stop",
      enum: ["stop", "start", "ready"],
    },
  },
  {
    timestamps: true,
  }
);

databaseSchema.index({ name: 1, version: 1 }, { unique: true });
databaseSchema.index({ "$**": "text" });

export default model<Database>("Database", databaseSchema);
