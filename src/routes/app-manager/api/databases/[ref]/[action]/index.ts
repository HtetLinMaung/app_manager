import { brewBlankExpressFunc } from "code-alchemy";
import connectMongoose from "../../../../../../utils/connect-mongoose";
import { Container } from "starless-docker";
import handleAuthorization from "../../../../../../utils/handle-authorization";
import Database from "../../../../../../models/Database";

export default brewBlankExpressFunc(async (req, res) => {
  await handleAuthorization(req);
  await connectMongoose();
  const { ref, action } = req.params;
  if (
    action != "start" &&
    action != "stop" &&
    action != "restart" &&
    action != "change-version" &&
    action != "logs"
  ) {
    return res.sendStatus(404);
  }
  const database = await Database.findOne({
    ref,
  });
  if (!database) {
    return res.status(404).json({
      code: 404,
      message: "Application not found!",
    });
  }

  const version = req.query.version as string;
  const container = new Container({
    name: `database_${database.ref}`,
    image: database.image,
    tag: version,
    autoRemove: true,
    detach: true,
    network: process.env.docker_network,
    publish: database.port,
    environments: database.environments,
    volumes: database.volumes,
  });

  let message = "";
  if (action == "start") {
    database.status = "start";
    await database.save();
    try {
      await container.stop();
    } catch (err) {
      console.log(err);
    }
    database.status = "stop";
    await database.save();
    try {
      const stdout = await container.run();
      if (stdout) {
        console.log(stdout);
      }
    } catch (err) {
      console.log(err.message);
    }
    database.status = "ready";
    await database.save();
    message = `Database start successful.`;
  } else if (action == "stop") {
    const stdout = await container.stop();
    if (stdout) {
      console.log(stdout);
    }
    database.status = "stop";
    await database.save();
    message = `Database stop successful.`;
  } else if (action == "restart") {
    database.status = "restart";
    await database.save();
    const stdout = await container.restart();
    if (stdout) {
      console.log(stdout);
    }
    database.status = "ready";
    await database.save();
    message = `Database restart successful.`;
  } else if (action == "change-version") {
    const oldContainer = new Container({
      name: `database_${database.ref}`,
      image: database.image,
      tag: database.tag,
      autoRemove: true,
      detach: true,
      network: process.env.docker_network,
      publish: database.port,
      environments: database.environments,
      volumes: database.volumes,
    });
    try {
      await oldContainer.stop();
    } catch (err) {
      console.log(err);
    }
    try {
      await container.stop();
    } catch (err) {
      console.log(err);
    }
    database.status = "stop";
    await database.save();
    try {
      const stdout = await container.run();
      if (stdout) {
        console.log(stdout);
      }
    } catch (err) {
      console.log(err.message);
    }
    database.status = "ready";
    database.tag = version;
    await database.save();
    message = `Version changed successful.`;
  } else if (action == "logs") {
    const stdout = await container.logs();
    return res.json({
      code: 200,
      message: "Logs fetched successful.",
      data: stdout,
    });
  }
  res.json({
    code: 200,
    message,
  });
});
