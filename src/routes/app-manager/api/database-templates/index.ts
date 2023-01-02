import { brewBlankExpressFunc } from "code-alchemy";
import DatabaseTemplate from "../../../../models/DatabaseTemplate";
import connectMongoose from "../../../../utils/connect-mongoose";
import handleAuthorization from "../../../../utils/handle-authorization";

export default brewBlankExpressFunc(async (req, res) => {
  await handleAuthorization(req);
  await connectMongoose();
  const data = await DatabaseTemplate.find();
  res.json({
    code: 200,
    message: "Database Templates fetched successful.",
    data,
  });
});
