import { Request } from "express";
import jwt from "jsonwebtoken";

export default async function handleAuthorization(req: Request) {
  let token = "";
  const authHeader = req.get("authorization");
  if (!authHeader) {
    token = req.query.token as string;
  } else {
    token = authHeader.replace("Bearer ", "").trim();
  }

  if (!token) {
    const err: any = new Error("Token is required!");
    err.status = 401;
    err.body = {
      code: err.status,
      message: err.message,
    };
    throw err;
  }
  let payload: any = null;
  try {
    payload = jwt.verify(token, process.env.jwt_secret);
  } catch (err) {
    err.status = 401;
    err.body = {
      code: err.status,
      message: err.message,
    };
    throw err;
  }
  req.body.createdby = payload.userId;
  return payload;
}
