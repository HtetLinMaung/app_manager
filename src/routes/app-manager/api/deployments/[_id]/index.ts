import { brewExpressFuncFindOneOrUpdateOrDeleteByParam } from "code-alchemy";
import Deployment from "../../../../../models/Deployment";
import connectMongoose from "../../../../../utils/connect-mongoose";
import handleAuthorization from "../../../../../utils/handle-authorization";

export default brewExpressFuncFindOneOrUpdateOrDeleteByParam(
  Deployment,
  {
    afterFunctionStart: async (req, res) => {
      await handleAuthorization(req);
      await connectMongoose();
    },
    beforeResponse: (defaultBody, req, res) => {
      const method = req.method.toLowerCase();
      let message = "";
      if (method == "get") {
        message = "Deployment fetched successful.";
      } else if (method == "put") {
        message = "Deployment updated successful.";
      } else if (method == "delete") {
        message = "Deployment deleted successful.";
      }
      return {
        ...defaultBody,
        message,
      };
    },
  },
  "Deploy not found!",
  "_id",
  "mongoose"
);
