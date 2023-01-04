import { brewBlankExpressFunc } from "code-alchemy";
import connectMongoose from "../../../../../../utils/connect-mongoose";
import { Container, LogOptions } from "starless-docker";
import handleAuthorization from "../../../../../../utils/handle-authorization";
import ContainerData from "../../../../../../models/ContainerData";
import { ChildProcessWithoutNullStreams } from "node:child_process";
import server from "starless-server";
import kill from "tree-kill";

export default brewBlankExpressFunc(async (req, res) => {
  const { userId } = await handleAuthorization(req);
  await connectMongoose();
  const { _id: id, action } = req.params;
  if (
    action != "start" &&
    action != "stop" &&
    action != "restart" &&
    action != "logs" &&
    action != "cancel-logs-stream"
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
    const follow = req.query.follow == "yes" || false;
    const until = req.query.until || "";
    const since = req.query.since || "";
    const io = server.getIO();

    const resultOrChild = await container.logs(
      {
        follow,
        until,
        since,
      } as LogOptions,
      (stdout, stderr, error, code) => {
        if (io) {
          io.to(userId).emit("logs", {
            containerId: id,
            stdout,
            stderr,
            error: error ? error.message : null,
            code,
          });
        }
      }
    );
    let data = null;
    if (typeof resultOrChild != "string") {
      server.sharedMemory.set(
        id,
        (resultOrChild as ChildProcessWithoutNullStreams).pid
      );
    } else {
      data = resultOrChild;
    }

    return res.json({
      code: 200,
      message: "Logs fetched successful.",
      data,
    });
  } else if (action == "cancel-logs-stream") {
    const pid = server.sharedMemory.get(id);
    if (!pid) {
      return res.status(404).json({
        code: 404,
        message: "Process ID not found!",
      });
    }

    kill(pid);
    return res.json({
      code: 200,
      message: `Process ID ${pid} killed successful.`,
    });
  }
  res.json({
    code: 200,
    message,
  });
});
