import httpClient from "starless-http";

async function main() {
  await httpClient.get(
    "http://localhost:7070/app-manager/applications/63ab1accf73b6e0da8f53773/deploy"
  );
}

main();
