import { brewExpressFuncFindOneOrUpdateOrDeleteByParam } from "code-alchemy";
import { Container } from "starless-docker";
import Database, { DatabaseModel } from "../../../../../models/Database";
import connectMongoose from "../../../../../utils/connect-mongoose";
import handleAuthorization from "../../../../../utils/handle-authorization";

export default brewExpressFuncFindOneOrUpdateOrDeleteByParam(
  Database,
  {
    afterFunctionStart: async (req, res) => {
      (req as any).payload = await handleAuthorization(req);
      await connectMongoose();
    },
    beforeUpdate(data, req, res) {
      if (req.body.tag) {
        delete req.body.tag;
      }
      req.body.ref = req.body.name.trim().replace(/\s+/g, "_");
    },
    beforeDelete: async (data: DatabaseModel, req, res) => {
      const container = new Container({
        name: `database_${data.ref}`,
        image: data.name,
        tag: data.tag,
        autoRemove: true,
        detach: true,
        network: process.env.docker_network,
        publish: data.port,
        environments: data.environments,
        volumes: data.volumes,
      });
      try {
        await container.stop();
      } catch (err) {
        console.log(err.message);
      }
    },
    beforeQuery: async (options, req, res) => {
      const { username, userId } = (req as any).payload;
      if (username != (process.env.admin_username || "admin")) {
        options["createdby"] = userId;
      }
    },
  },
  "Database not found!",
  "ref",
  "mongoose"
);
