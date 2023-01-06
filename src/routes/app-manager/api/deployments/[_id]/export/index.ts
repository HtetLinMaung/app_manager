import { brewBlankExpressFunc } from "code-alchemy";
import Deployment from "../../../../../../models/Deployment";
import connectMongoose from "../../../../../../utils/connect-mongoose";
import handleAuthorization from "../../../../../../utils/handle-authorization";

export default brewBlankExpressFunc(async (req, res) => {
  await handleAuthorization();
  await connectMongoose();
  const deployment = await Deployment.findById(req.params._id);
  if (!deployment) {
    return res.status(404).json({
      code: 404,
      message: "Deployment not found!",
    });
  }
  let contents =
    `FROM ${deployment.image}:${deployment.tag}\n\n` +
    deployment.buildSteps.join("\n\n");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${deployment.name}_Dockerfile`
  );
  res.write(contents);
  res.end();
});
