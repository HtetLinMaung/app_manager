import { brewBlankExpressFunc } from "code-alchemy";
import connectMongoose from "../../../../../../utils/connect-mongoose";
import { Container } from "starless-docker";
import handleAuthorization from "../../../../../../utils/handle-authorization";
import ContainerData from "../../../../../../models/ContainerData";

export default brewBlankExpressFunc(async (req, res) => {
  await handleAuthorization(req);
  await connectMongoose();
  const { id, action } = req.params;
  if (
    action != "start" &&
    action != "stop" &&
    action != "restart" &&
    action != "logs"
  ) {
    return res.sendStatus(404);
  }

  const containerData = await ContainerData.findById(id);
  if (!containerData) {
    return res.status(404).json({
      code: 404,
      message: "Container not found!",
    });
  }

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
  });
  let message = "";
  if (action == "start") {
    containerData.status = "start";
    await containerData.save();
    try {
      await container.stop();
    } catch (err) {
      console.log(err);
    }
    containerData.status = "stop";
    await containerData.save();
    try {
      await container.run();
    } catch (err) {
      console.log(err.message);
    }
    containerData.status = "ready";
    await containerData.save();
    message = `Container start successful.`;
  } else if (action == "stop") {
    await container.stop();
    containerData.status = "stop";
    await containerData.save();
    message = `Container stop successful.`;
  } else if (action == "restart") {
    containerData.status = "restart";
    await containerData.save();
    await container.restart();
    containerData.status = "ready";
    await containerData.save();
    message = `Container restart successful.`;
  } else if (action == "logs") {
    let data = "";
    try {
      data = await container.logs();
    } catch (err) {
      data = err.message;
    }
    return res.json({
      code: 200,
      message: "Logs fetched successful.",
      data,
    });
  }
  res.json({
    code: 200,
    message,
  });
});
