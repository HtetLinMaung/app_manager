import { brewExpressFuncFindOneOrUpdateOrDeleteByParam } from "code-alchemy";
import { Container } from "starless-docker";
import ContainerData, {
  ContainerDataModel,
} from "../../../../../models/ContainerData";
import connectMongoose from "../../../../../utils/connect-mongoose";
import handleAuthorization from "../../../../../utils/handle-authorization";

export default brewExpressFuncFindOneOrUpdateOrDeleteByParam(
  ContainerData,
  {
    afterFunctionStart: async (req, res) => {
      await handleAuthorization(req);
      await connectMongoose();
    },
    beforeUpdate: async (data: ContainerDataModel, req, res) => {
      const container = new Container({
        name: data.name,
        image: data.image,
        tag: data.tag,
        autoRemove: true,
        detach: true,
        network: data.network,
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
    afterUpdate: async (data: ContainerDataModel, req, res) => {
      const container = new Container({
        name: data.name,
        image: data.image,
        tag: data.tag,
        autoRemove: true,
        detach: true,
        network: data.network,
        publish: data.port,
        environments: data.environments,
        volumes: data.volumes,
      });
      await container.run();
    },
    beforeDelete: async (data: ContainerDataModel, req, res) => {
      const container = new Container({
        name: data.name,
        image: data.image,
        tag: data.tag,
        autoRemove: true,
        detach: true,
        network: data.network,
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
  "Container not found!",
  "id",
  "mongoose"
);
