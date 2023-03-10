import { brewExpressFuncFindOneOrUpdateOrDeleteByParam } from "code-alchemy";
import { Container } from "starless-docker";
import Application from "../../../../../models/Application";
import ApplicationVersion from "../../../../../models/ApplicationVersion";
import ContainerData, {
  ContainerDataModel,
} from "../../../../../models/ContainerData";
import connectMongoose from "../../../../../utils/connect-mongoose";
import handleAuthorization from "../../../../../utils/handle-authorization";

export default brewExpressFuncFindOneOrUpdateOrDeleteByParam(
  ContainerData,
  {
    afterFunctionStart: async (req, res) => {
      (req as any).payload = await handleAuthorization(req);
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
        log: true,
      });
      try {
        await container.stop();
      } catch (err) {
        console.log(err.message);
      }
    },
    afterUpdate: async (data: ContainerDataModel, req, res) => {
      await Application.updateOne(
        {
          container: data._id,
        },
        {
          $set: {
            ref: data.name,
            version: data.tag,
          },
        }
      );
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
    },
    beforeDelete: async (data: ContainerDataModel, req, res) => {
      const application = await Application.findOne({
        container: data._id,
      });
      if (application) {
        const err: any = new Error("Container is protected!");
        err.status = 400;
        err.body = {
          code: 400,
          message: err.message,
        };
        throw err;
        // await ApplicationVersion.deleteMany({
        //   application: application._id,
        // });
        // await application.remove();
      }
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
    beforeResponse: (defaultBody, req, res) => {
      const method = req.method.toLowerCase();
      let message = "";
      if (method == "get") {
        message = "Container fetched successful.";
      } else if (method == "put") {
        message = "Container updated successful.";
      } else if (method == "delete") {
        message = "Container deleted successful.";
      }
      return {
        ...defaultBody,
        message,
      };
    },
  },
  "Container not found!",
  "_id",
  "mongoose"
);
