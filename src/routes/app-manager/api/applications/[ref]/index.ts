import { brewExpressFuncFindOneOrUpdateOrDeleteByParam } from "code-alchemy";
import { Container } from "starless-docker";
import Application, {
  ApplicationModel,
} from "../../../../../models/Application";
import ApplicationVersion from "../../../../../models/ApplicationVersion";
import ContainerData from "../../../../../models/ContainerData";
import connectMongoose from "../../../../../utils/connect-mongoose";
import handleAuthorization from "../../../../../utils/handle-authorization";

export default brewExpressFuncFindOneOrUpdateOrDeleteByParam(
  Application,
  {
    afterFunctionStart: async (req, res) => {
      (req as any).payload = await handleAuthorization(req);
      await connectMongoose();
    },
    beforeUpdate: async (data: ApplicationModel, req, res) => {
      await ContainerData.updateOne(
        { _id: data.container },
        {
          $set: {
            port: req.body.port,
            environments: req.body.environments,
            volumes: req.body.volumes,
            network: req.body.network,
          },
        }
      );
      if (req.body.container) {
        delete req.body.container;
      }
      if (req.body.version) {
        delete req.body.version;
      }
      if (req.body.ref) {
        delete req.body.ref;
      }
    },
    beforeDelete: async (data: ApplicationModel, req, res) => {
      const containerData = await ContainerData.findById(data.container);
      const container = new Container({
        name: containerData.name,
        image: containerData.image,
        tag: containerData.tag,
        autoRemove: true,
        detach: true,
        network: containerData.network,
        publish: containerData.port,
        environments: containerData.environments,
        volumes: containerData.volumes,
        log: true,
        restartContainer: "always",
      });
      try {
        await container.stop();
      } catch (err) {
        console.log(err.message);
      }
      await containerData.remove();
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
        }).sort({ createdAt: -1 });
        defaultBody["container"] = await ContainerData.findById(
          defaultBody.data.container
        );
      }
      return defaultBody;
    },
  },
  "Application not found!",
  "ref",
  "mongoose"
);
