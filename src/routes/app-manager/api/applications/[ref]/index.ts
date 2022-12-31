import { brewExpressFuncFindOneOrUpdateOrDeleteByParam } from "code-alchemy";
import { Container } from "starless-docker";
import Application, {
  ApplicationModel,
} from "../../../../../models/Application";
import ApplicationVersion from "../../../../../models/ApplicationVersion";
import connectMongoose from "../../../../../utils/connect-mongoose";
import handleAuthorization from "../../../../../utils/handle-authorization";

export default brewExpressFuncFindOneOrUpdateOrDeleteByParam(
  Application,
  {
    afterFunctionStart: async (req, res) => {
      (req as any).payload = await handleAuthorization(req);
      await connectMongoose();
    },
    beforeUpdate(data, req, res) {
      if (req.body.version) {
        delete req.body.version;
      }
      req.body.ref = req.body.name.trim().replace(/\s+/g, "-");
    },
    beforeDelete: async (data: ApplicationModel, req, res) => {
      const container = new Container({
        name: data.name,
        image: data.name,
        tag: data.version,
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
      await ApplicationVersion.deleteMany({
        application: data._id,
      });
    },
    beforeQuery: async (options, req, res) => {
      const { username, userId } = (req as any).payload;
      if (username != (process.env.admin_username || "admin")) {
        options["createdby"] = userId;
      }
    },
    beforeResponse: async (defaultBody, req, res) => {
      const method = req.method.toLowerCase();
      if (method == "get") {
        defaultBody["versions"] = await ApplicationVersion.find({
          application: defaultBody.data._id,
        });
      }
      return defaultBody;
    },
  },
  "Application not found!",
  "ref",
  "mongoose"
);
