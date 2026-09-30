import type { Config } from "@netlify/functions";
import { runFollowUps } from "../../src/lib/followup";

export default async () => {
  const result = await runFollowUps();
  console.log("Follow-up run complete", result);
};

export const config: Config = {
  schedule: "@hourly",
};
