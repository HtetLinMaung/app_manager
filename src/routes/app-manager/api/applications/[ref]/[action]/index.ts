import { brewBlankExpressFunc } from "code-alchemy";
import Application, {
  ApplicationModel,
} from "../../../../../../models/Application";
import { exec } from "code-alchemy/child_process";
import { sourcesFolderPath } from "../../../../../../constants";
import path from "node:path";
import fs from "node:fs";
import connectMongoose from "../../../../../../utils/connect-mongoose";
import { buildImage, Container } from "starless-docker";
import { DeploymentModel } from "../../../../../../models/Deployment";
import ApplicationVersion from "../../../../../../models/ApplicationVersion";
import handleAuthorization from "../../../../../../utils/handle-authorization";
import { timeout } from "starless-async";

const build = async (
  application: ApplicationModel,
  version: string,
  createdby: string
) => {
  const sourceFolderPath = path.join(
    sourcesFolderPath,
    path.basename(application.git).replace(".git", "")
  );

  let cmdResult = null;
  if (fs.existsSync(sourceFolderPath)) {
    cmdResult = await exec("git pull", {
      cwd: sourceFolderPath,
    });
  } else {
    cmdResult = await exec(`git clone ${application.git}`, {
      cwd: sourcesFolderPath,
    });
  }

  if (cmdResult.stderr) {
    console.log(cmdResult.stderr);
  }
  if (cmdResult.stdout) {
    console.log(cmdResult.stdout);
  }

  const deployment = application.deployment as DeploymentModel;
  if (!fs.existsSync(path.join(sourceFolderPath, "Dockerfile"))) {
    fs.writeFileSync(
      path.join(sourceFolderPath, "Dockerfile"),
      [
        `FROM ${deployment.image}:${deployment.tag || "latest"}`,
        ...deployment.buildSteps,
      ].join("\n\n")
    );
  }

  let stdout = await buildImage({
    image: application.name,
    tag: version,
    cwd: sourceFolderPath,
  });
  if (stdout) {
    console.log(stdout);
  }
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
  const { ref, action } = req.params;
  if (
    action != "start" &&
    action != "stop" &&
    action != "restart" &&
    action != "deploy" &&
    action != "build" &&
    action != "change-version" &&
    action != "logs"
  ) {
    return res.sendStatus(404);
  }
  const application = await Application.findOne({
    ref,
  }).populate("deployment");
  if (!application) {
    return res.status(404).json({
      code: 404,
      message: "Application not found!",
    });
  }

  const version = req.query.version as string;
  const container = new Container({
    name: application.name,
    image: application.name,
    tag: version,
    autoRemove: true,
    detach: true,
    network: process.env.docker_network,
    publish: application.port,
    environments: application.environments,
    volumes: application.volumes,
  });
  let message = "";
  if (action == "build") {
    await build(application, version, userId);
    message = `Application build successful.`;
  } else if (action == "deploy") {
    application.status = "deploy";
    await application.save();
    if (version == application.version) {
      return res.status(400).json({
        code: 400,
        message: `Version ${version} already deployed.`,
      });
    }

    const oldContainer = new Container({
      name: application.name,
      image: application.name,
      tag: application.version,
      autoRemove: true,
      detach: true,
      network: process.env.docker_network,
      publish: application.port,
      environments: application.environments,
      volumes: application.volumes,
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
    application.status = "stop";
    await application.save();

    await build(application, version, userId);

    let stdout = await container.run();
    if (stdout) {
      console.log(stdout);
    }
    application.status = "ready";
    application.version = version;
    await application.save();
    message = "Deployment successful.";
  } else if (action == "start") {
    application.status = "start";
    await application.save();
    try {
      await container.stop();
    } catch (err) {
      console.log(err);
    }
    application.status = "stop";
    await application.save();
    const stdout = await container.run();
    if (stdout) {
      console.log(stdout);
    }
    application.status = "ready";
    await application.save();
    message = `Application start successful.`;
  } else if (action == "stop") {
    const stdout = await container.stop();
    if (stdout) {
      console.log(stdout);
    }
    application.status = "stop";
    await application.save();
    message = `Application stop successful.`;
  } else if (action == "restart") {
    application.status = "restart";
    await application.save();
    const stdout = await container.restart();
    if (stdout) {
      console.log(stdout);
    }
    application.status = "ready";
    await application.save();
    message = `Application restart successful.`;
  } else if (action == "change-version") {
    const oldContainer = new Container({
      name: application.name,
      image: application.name,
      tag: application.version,
      autoRemove: true,
      detach: true,
      network: process.env.docker_network,
      publish: application.port,
      environments: application.environments,
      volumes: application.volumes,
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
    // await timeout(3);
    application.status = "stop";
    await application.save();
    let stdout = await container.run();
    if (stdout) {
      console.log(stdout);
    }
    application.status = "ready";
    application.version = version;
    await application.save();
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
