import { brewBlankExpressFunc } from "code-alchemy";
import Application, {
  ApplicationModel,
} from "../../../../../../models/Application";
import { sourcesFolderPath } from "../../../../../../constants";
import path from "node:path";
import fs from "node:fs";
import connectMongoose from "../../../../../../utils/connect-mongoose";
import { buildImage, Container, runSpawn } from "starless-docker";
import Deployment from "../../../../../../models/Deployment";
import ApplicationVersion from "../../../../../../models/ApplicationVersion";
import handleAuthorization from "../../../../../../utils/handle-authorization";
import ContainerData from "../../../../../../models/ContainerData";
import server from "starless-server";

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
          containerId: application.container,
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
      waitUntilClose: true,
    },
    (stdout, stderr, error, code) => {
      if (io) {
        io.to(createdby).emit("deploy", {
          containerId: application.container,
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
  if (action != "deploy" && action != "build" && action != "change-version") {
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
            containerId: containerData._id,
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
            containerId: containerData._id,
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
            containerId: containerData._id,
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
      log: true,
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
  }
  res.json({
    code: 200,
    message,
  });
});
