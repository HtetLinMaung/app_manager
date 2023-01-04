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
  },
  "Deploy not found!",
  "_id",
  "mongoose"
);
