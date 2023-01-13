import { asyncEach } from "starless-async";
import { Container } from "starless-docker";
import ContainerData from "../models/ContainerData";

export default async function updateContainersStatus() {
  const data = await ContainerData.find();
  await asyncEach(data, async (containerData) => {
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
      log: true,
    });
    const status = await container.state();
    await ContainerData.updateOne(
      {
        _id: containerData._id,
      },
      { $set: { status } }
    );
  });
}
