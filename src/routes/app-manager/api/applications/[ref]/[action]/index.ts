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

const build = async (application: ApplicationModel, version: string) => {
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
    const err: any = new Error(cmdResult.stderr);
    err.status = 500;
    err.body = {
      code: err.status,
      message: err.message,
    };
    throw err;
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
};

export default brewBlankExpressFunc(async (req, res) => {
  await connectMongoose();
  const { ref, action } = req.params;
  if (
    action != "start" &&
    action != "stop" &&
    action != "restart" &&
    action != "deploy" &&
    action != "build"
  ) {
    return res.sendStatus(404);
  }
  const application = await Application.findOne({ ref }).populate("deployment");
  if (!application) {
    return res.status(404).json({
      code: 404,
      message: "Application not found!",
    });
  }
  const applicationVersion = await ApplicationVersion.findOne({
    application: application._id,
    version: req.query.version,
  });
  if (!applicationVersion) {
    return res.status(404).json({
      code: 404,
      message: `Version ${req.query.version} not found!`,
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
    await build(application, version);
    message = `Application build successful.`;
  } else if (action == "deploy") {
    application.status = "deploy";
    application.save();
    await build(application, version);
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
    application.save();

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
    application.save();
    try {
      await container.stop();
    } catch (err) {
      console.log(err);
    }
    application.status = "stop";
    application.save();
    const stdout = await container.run();
    if (stdout) {
      console.log(stdout);
    }
    application.status = "ready";
    application.save();
    message = `Application start successful.`;
  } else if (action == "stop") {
    const stdout = await container.stop();
    if (stdout) {
      console.log(stdout);
    }
    application.status = "stop";
    application.save();
    message = `Application stop successful.`;
  } else if (action == "restart") {
    application.status = "restart";
    application.save();
    const stdout = await container.restart();
    if (stdout) {
      console.log(stdout);
    }
    application.status = "ready";
    application.save();
    message = `Application restart successful.`;
  }
  res.json({
    code: 200,
    message,
  });
});
