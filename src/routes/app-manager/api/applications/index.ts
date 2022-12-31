import { brewExpressFuncCreateOrFindAll } from "code-alchemy";
import Application, { ApplicationModel } from "../../../../models/Application";
import ApplicationVersion from "../../../../models/ApplicationVersion";
import connectMongoose from "../../../../utils/connect-mongoose";
import handleAuthorization from "../../../../utils/handle-authorization";

export default brewExpressFuncCreateOrFindAll(
  Application,
  {
    afterFunctionStart: async (req, res) => {
      (req as any).payload = await handleAuthorization(req);
      await connectMongoose();
    },
    beforeCreate(req, res) {
      req.body.ref = req.body.name.trim().replace(/\s+/g, "-");
    },
    afterCreate: async (data: ApplicationModel, req, res) => {
      await new ApplicationVersion({
        application: data._id,
        version: data.version,
        createdby: req.body.createdby,
      }).save();
    },
    beforeQuery: async (options, req, res) => {
      const { username, userId } = (req as any).payload;
      if (username != (process.env.admin_username || "admin")) {
        options["createdby"] = userId;
      }
    },
    beforeResponse: (defaultBody, req, res) => {
      const method = req.method.toLowerCase();
      return {
        ...defaultBody,
        message:
          method == "get"
            ? "Applications fetched successful."
            : "Application created successful.",
      };
    },
  },
  "mongoose"
);
