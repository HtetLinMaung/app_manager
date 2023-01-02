import { brewExpressFuncCreateOrFindAll } from "code-alchemy";
import { Container } from "starless-docker";
import Database, { DatabaseModel } from "../../../../models/Database";
import connectMongoose from "../../../../utils/connect-mongoose";
import handleAuthorization from "../../../../utils/handle-authorization";

export default brewExpressFuncCreateOrFindAll(
  Database,
  {
    afterFunctionStart: async (req, res) => {
      (req as any).payload = await handleAuthorization(req);
      await connectMongoose();
    },
    beforeCreate(req, res) {
      req.body.ref = req.body.name.trim().replace(/\s+/g, "_");
    },
    afterCreate: async (data: DatabaseModel, req, res) => {
      const container = new Container({
        name: `database_${data.ref}`,
        image: data.image,
        tag: data.tag,
        autoRemove: true,
        detach: true,
        network: process.env.docker_network,
        publish: data.port,
        environments: data.environments,
        volumes: data.volumes,
      });
      await container.run();
      await Database.updateOne(
        { _id: data._id },
        { $set: { status: "ready" } }
      );
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
            ? "Databases fetched successful."
            : "Database created successful.",
      };
    },
  },
  "mongoose"
);
