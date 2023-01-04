import { brewBlankExpressFunc } from "code-alchemy";
import Application, {
  ApplicationModel,
} from "../../../../../../models/Application";
import { exec } from "code-alchemy/child_process";
import { sourcesFolderPath } from "../../../../../../constants";
import path from "node:path";
import fs from "node:fs";
import connectMongoose from "../../../../../../utils/connect-mongoose";
import { buildImage, Container, LogOptions, runSpawn } from "starless-docker";
import Deployment from "../../../../../../models/Deployment";
import ApplicationVersion from "../../../../../../models/ApplicationVersion";
import handleAuthorization from "../../../../../../utils/handle-authorization";
import ContainerData from "../../../../../../models/ContainerData";
import { ChildProcessWithoutNullStreams } from "node:child_process";
import server from "starless-server";
import kill from "tree-kill";

const build = async (
  application: ApplicationModel,
  version: string,
  createdby: string
) => {
  const io = server.getIO();
  const sourceFolderPath = path.join(
    sourcesFolderPath,
    path.basename(application.git).replace(".git", "")
  );

  await runSpawn(
    fs.existsSync(sourceFolderPath)
      ? "git pull"
      : `git clone ${application.git}`,
    {
      cwd: fs.existsSync(sourceFolderPath)
        ? sourceFolderPath
        : sourcesFolderPath,
    },
    (stdout, stderr, error, code) => {
      if (io) {
        io.to(createdby).emit("deploy", {
          ref: application.ref,
          stdout,
          stderr,
          error,
          code,
        });
      }
    },
    true,
    true
  );

  const deployment = await Deployment.findById(application.deployment);
  if (!fs.existsSync(path.join(sourceFolderPath, "Dockerfile"))) {
    fs.writeFileSync(
      path.join(sourceFolderPath, "Dockerfile"),
      [
        `FROM ${deployment.image}:${deployment.tag || "latest"}`,
        ...deployment.buildSteps,
      ].join("\n\n")
    );
  }

  await buildImage(
    {
      image: application.ref,
      tag: version,
      cwd: sourceFolderPath,
      log: true,
    },
    (stdout, stderr, error, code) => {
      if (io) {
        io.to(createdby).emit("deploy", {
          ref: application.ref,
          stdout,
          stderr,
          error,
          code,
        });
      }
    }
  );

  // if (fs.existsSync(sourceFolderPath)) {
  //   fs.rmSync(sourceFolderPath, { recursive: true });
  // }
  const applicationVersion = await ApplicationVersion.findOne({
    application: application._id,
    version,
  });
  if (!applicationVersion) {
    await new ApplicationVersion({
      application: application._id,
      version,
      createdby,
    }).save();
  }
};

export default brewBlankExpressFunc(async (req, res) => {
  const { userId } = await handleAuthorization(req);
  await connectMongoose();
  const io = server.getIO();
  const { ref, action } = req.params;
  if (
    action != "start" &&
    action != "stop" &&
    action != "restart" &&
    action != "deploy" &&
    action != "build" &&
    action != "change-version" &&
    action != "logs" &&
    action != "cancel-logs-stream"
  ) {
    return res.sendStatus(404);
  }
  const application = await Application.findOne({
    ref,
  });
  if (!application) {
    return res.status(404).json({
      code: 404,
      message: "Application not found!",
    });
  }
  const containerData = await ContainerData.findById(application.container);
  if (!containerData) {
    return res.status(404).json({
      code: 404,
      message: "Container not found!",
    });
  }

  const version = req.query.version as string;
  const container = new Container({
    name: containerData.name,
    image: containerData.image,
    tag: version,
    autoRemove: true,
    detach: true,
    network: containerData.network,
    publish: containerData.port,
    environments: containerData.environments,
    volumes: containerData.volumes,
    log: true,
  });
  let message = "";
  if (action == "build") {
    await build(application, version, userId);
    message = `Application build successful.`;
  } else if (action == "deploy") {
    containerData.status = "deploy";
    await containerData.save();
    // if (version == application.version) {
    //   return res.status(400).json({
    //     code: 400,
    //     message: `Version ${version} already deployed.`,
    //   });
    // }

    const oldContainer = new Container({
      name: containerData.name,
      image: containerData.image,
      tag: containerData.tag,
      autoRemove: true,
      detach: true,
      network: containerData.network,
      publish: containerData.port,
      environments: containerData.environments,
      volumes: containerData.volumes,
      log: true,
    });
    try {
      await oldContainer.stop((stdout, stderr, error, code) => {
        if (io) {
          io.to(userId).emit("deploy", {
            ref: application.ref,
            stdout,
            stderr,
            error,
            code,
          });
        }
      });
    } catch (err) {
      console.error(err);
    }

    try {
      await container.stop((stdout, stderr, error, code) => {
        if (io) {
          io.to(userId).emit("deploy", {
            ref: application.ref,
            stdout,
            stderr,
            error,
            code,
          });
        }
      });
    } catch (err) {
      console.error(err);
    }
    containerData.status = "stop";
    await containerData.save();

    await build(application, version, userId);

    try {
      await container.run((stdout, stderr, error, code) => {
        if (io) {
          io.to(userId).emit("deploy", {
            ref: application.ref,
            stdout,
            stderr,
            error,
            code,
          });
        }
      });
    } catch (err) {
      console.error(err.message);
    }
    containerData.status = "ready";
    containerData.tag = version;
    await containerData.save();
    application.version = version;
    await application.save();
    message = "Deployment successful.";
  } else if (action == "start") {
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
    message = `Application start successful.`;
  } else if (action == "stop") {
    await container.stop();
    containerData.status = "stop";
    await containerData.save();
    message = `Application stop successful.`;
  } else if (action == "restart") {
    containerData.status = "restart";
    await containerData.save();
    await container.restart();
    containerData.status = "ready";
    await containerData.save();
    message = `Application restart successful.`;
  } else if (action == "change-version") {
    const oldContainer = new Container({
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

    containerData.status = "stop";
    await containerData.save();
    try {
      await container.run();
    } catch (err) {
      console.log(err.message);
    }
    containerData.status = "ready";
    containerData.tag = version;
    await containerData.save();
    application.version = version;
    await application.save();
    message = `Version changed successful.`;
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
          io.to(userId).emit("applications:logs", {
            ref: application.ref,
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
        application.ref,
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
    const pid = server.sharedMemory.get(application.ref);
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
