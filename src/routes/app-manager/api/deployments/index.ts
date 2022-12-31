import { brewExpressFuncCreateOrFindAll } from "code-alchemy";
import Deployment from "../../../../models/Deployment";
import connectMongoose from "../../../../utils/connect-mongoose";
import handleAuthorization from "../../../../utils/handle-authorization";

export default brewExpressFuncCreateOrFindAll(
  Deployment,
  {
    afterFunctionStart: async (req, res) => {
      await handleAuthorization(req);
      await connectMongoose();
    },
    beforeResponse: (defaultBody, req, res) => {
      return {
        ...defaultBody,
        message:
          req.method.toLowerCase() == "get"
            ? "Deployments fetched successful."
            : "Deployment created successful.",
      };
    },
  },
  "mongoose"
);
