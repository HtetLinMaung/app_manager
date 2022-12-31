import Deployment from "../models/Deployment";

const items = [
  {
    name: "node",
    version: "18.12.1",
    image: "node",
    tag: "lts-alpine3.16",
    buildSteps: [
      "WORKDIR /app",
      "COPY package.json .",
      "RUN npm i",
      "COPY . .",
      `CMD ["npm", "start"]`,
    ],
  },
];

export default async function initDeployments(createdby: string) {
  for (const item of items) {
    const deployment = await Deployment.findOne({
      name: item.name,
      version: item.version,
    });
    if (!deployment) {
      await new Deployment({ ...item, createdby }).save();
    }
  }
}
