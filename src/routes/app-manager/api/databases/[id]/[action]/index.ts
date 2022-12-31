import { brewBlankExpressFunc } from "code-alchemy";
import { exec } from "code-alchemy/child_process";
import Database from "../../../../../../models/Database";
import connectMongoose from "../../../../../../utils/connect-mongoose";

export default brewBlankExpressFunc(async (req, res) => {
  await connectMongoose();
  const { id, action } = req.params;
  if (action != "start" && action != "stop" && action != "restart") {
    return res.sendStatus(404);
  }
  const database = await Database.findById(id);
  if (!database) {
    return res.status(404).json({
      code: 404,
      message: "Database not found!",
    });
  }

  const { stdout, stderr } = await exec(`docker ${action} ${database.name}`);
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
  res.json({
    code: 200,
    message: `Database ${action} successful.`,
  });
});
