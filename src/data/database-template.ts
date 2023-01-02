import DatabaseTemplate from "../models/DatabaseTemplate";

const items = [
  {
    name: "mongo",
    images: [
      {
        image: "mongo",
        tag: "latest",
      },
    ],
    port: "27017:27017",
    environments: {},
    volumes: ["mongodb:/data/db"],
  },
  {
    name: "postgres",
    images: [
      {
        image: "postgres",
        tag: "alpine3.17",
      },
    ],
    port: "5432:5432",
    environments: {
      POSTGRES_DB: "postgres",
      POSTGRES_PASSWORD: "P@ssword",
    },
    volumes: ["postgresdb:/var/lib/postgresql/data"],
  },
  //   {
  //     name: "pgadmin",
  //     images: [
  //       {
  //         image: "dpage/pgadmin4",
  //         tag: "latest",
  //       },
  //     ],
  //     port: "8080:80",
  //     environments: {
  //       PGADMIN_DEFAULT_EMAIL: "jsthtet96@gmail.com",
  //       PGADMIN_DEFAULT_PASSWORD: "P@ssword",
  //       PGADMIN_CONFIG_SERVER_MODE: "False",
  //     },
  //     volumes: ["pgadmin:/var/lib/pgadmin"],
  //   },
  {
    name: "azuresql",
    images: [
      {
        image: "mcr.microsoft.com/azure-sql-edge",
        tag: "latest",
      },
    ],
    port: "1433:1433",
    environments: {
      MSSQL_SA_PASSWORD: "P@ssword",
      ACCEPT_EUL: 1,
    },
    volumes: ["azuresqldb:/var/opt/mssql"],
  },
];

export default async function initDatabaseTemplates(createdby: string) {
  for (const item of items) {
    const template = await DatabaseTemplate.findOne({
      name: item.name,
    });
    if (!template) {
      await new DatabaseTemplate({ ...item, createdby }).save();
    }
  }
}
