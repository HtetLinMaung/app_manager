import { brewBlankExpressFunc } from "code-alchemy";
import { exec } from "code-alchemy/child_process";
import Database from "../../../../models/Database";
import connectMongoose from "../../../../utils/connect-mongoose";

export default brewBlankExpressFunc(async (req, res) => {
  await connectMongoose();
  const method = req.method.toLowerCase();
  if (method == "post") {
    const database = new Database(req.body);
    await database.save();
    const { stdout, stderr } = await exec(
      `docker run --rm -d --network=${process.env.docker_network} --name ${
        database.name
      } ${database.port ? `-p ${database.port}` : ""} ${Object.entries(
        database.environments
      )
        .map(([k, v]) => `-e ${k}=${v}`)
        .join(" ")} ${database.volumes.map((v) => `-v ${v}`).join(" ")} ${
        database.name
      }:${database.version}`
    );
    if (stderr) {
      const err: any = new Error(stderr);
      err.status = 500;
      err.body = {
        code: err.status,
        message: err.message,
      };
      throw err;
    }
    if (stdout) {
      console.log(stdout);
    }
    res.status(201).json({
      code: 201,
      message: "Database created successful.",
      data: database,
    });
  }
});
