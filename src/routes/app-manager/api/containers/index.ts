import { brewExpressFuncCreateOrFindAll } from "code-alchemy";
import { Container } from "starless-docker";
import ContainerData, {
  ContainerDataModel,
} from "../../../../models/ContainerData";
import connectMongoose from "../../../../utils/connect-mongoose";
import handleAuthorization from "../../../../utils/handle-authorization";

export default brewExpressFuncCreateOrFindAll(
  ContainerData,
  {
    afterFunctionStart: async (req, res) => {
      (req as any).payload = await handleAuthorization(req);
      await connectMongoose();
    },
    beforeQuery: async (options, req, res) => {
      const { username, userId } = (req as any).payload;
      if (username != (process.env.admin_username || "admin")) {
        options["createdby"] = userId;
      }
    },
    afterCreate: async (data: ContainerDataModel, req, res) => {
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
        log: true,
      });
      try {
        await container.run();
      } catch (err) {
        console.log(err.message);
      }

      await ContainerData.updateOne(
        {
          _id: data._id,
        },
        {
          $set: {
            status: "ready",
          },
        }
      );
    },
    beforeResponse: (defaultBody, req, res) => {
      const method = req.method.toLowerCase();
      return {
        ...defaultBody,
        message:
          method == "get"
            ? "Containers fetched successful."
            : "Container created successful.",
      };
    },
  },
  "mongoose"
);
